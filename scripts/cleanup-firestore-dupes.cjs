'use strict';
// Removes duplicate documents from the Firestore `prompts` collection.
// A duplicate = same prompt text (case/whitespace-insensitive). One doc per text is kept.
// Usage: MODE=dry-run (default) only reports; MODE=delete deletes.
// Always writes firestore-dupes-backup.json with the FULL data of every doc it
// would delete, so anything removed can be restored.

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore }        = require('firebase-admin/firestore');
const fs = require('fs');

const MODE = (process.env.MODE || 'dry-run').trim();
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey  = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;
if (!clientEmail || !privateKey) { console.error('Missing Firebase credentials'); process.exit(1); }
initializeApp({ credential: cert({ projectId: 'promptaholics-534d3', clientEmail, privateKey }) });
const db = getFirestore();

const norm = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
const ms = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : (v ? Date.parse(v) || 0 : 0);
const plain = v => (v && typeof v.toDate === 'function') ? v.toDate().toISOString()
  : Array.isArray(v) ? v.map(plain)
  : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)])) : v;

(async () => {
  const lib = new Function(fs.readFileSync('prompts.js', 'utf8').replace('const PROMPTS', 'var PROMPTS') + '\nreturn PROMPTS;')();
  const libTexts = new Set(lib.map(p => norm(p.text)));

  const snap = await db.collection('prompts').get();
  const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
  console.log(`Mode: ${MODE}`);
  console.log(`Firestore prompts docs: ${docs.length} | library prompts: ${lib.length}`);

  const groups = new Map(); let noText = 0;
  for (const d of docs) {
    const t = norm(d.data.text);
    if (!t) { noText++; continue; }                 // never touch docs without text
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(d);
  }

  const toDelete = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    // Keep: already-exported first, then oldest, then lowest doc id
    g.sort((a, b) =>
      (b.data.exportedToJs === true) - (a.data.exportedToJs === true) ||
      ms(a.data.createdAt || a.data.approvedAt) - ms(b.data.createdAt || b.data.approvedAt) ||
      (a.id < b.id ? -1 : 1));
    toDelete.push(...g.slice(1));
  }

  const inLib = toDelete.filter(d => libTexts.has(norm(d.data.text))).length;
  console.log(`Unique texts: ${groups.size} | docs without text (left alone): ${noText}`);
  console.log(`Duplicate docs to remove: ${toDelete.length} (${inLib} are copies of prompts already in the library)`);
  console.log(`Docs remaining after cleanup: ${docs.length - toDelete.length}`);
  const top = [...groups.values()].filter(g => g.length > 1).sort((a, b) => b.length - a.length).slice(0, 10);
  top.forEach(g => console.log(`  ${g.length}x  ${String(g[0].data.name || '').slice(0, 70)}`));

  fs.writeFileSync('firestore-dupes-backup.json', JSON.stringify(toDelete.map(d => ({ id: d.id, data: plain(d.data) })), null, 1));
  console.log(`Backup written: firestore-dupes-backup.json (${toDelete.length} docs)`);

  if (MODE !== 'delete') { console.log('Dry run — nothing deleted.'); return; }

  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 400) {
    const batch = db.batch();
    toDelete.slice(i, i + 400).forEach(d => batch.delete(db.collection('prompts').doc(d.id)));
    await batch.commit();
    deleted += Math.min(400, toDelete.length - i);
    console.log(`Deleted ${deleted}/${toDelete.length}`);
  }
  const after = (await db.collection('prompts').get()).size;
  console.log(`Done. Firestore prompts docs now: ${after}`);
})().catch(e => { console.error('Cleanup failed:', e.message || e); process.exit(1); });
