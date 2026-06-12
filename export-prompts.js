/**
 * Promptaholics — Export Approved Prompts to prompts.js
 * Uses CommonJS (require) — no package.json or ESM flags needed
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

// ── Firebase Admin init ──────────────────────────────────────────
const serviceAccount = {
  type: 'service_account',
  project_id: 'promptaholics-534d3',
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────
function sanitize(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function promptToJs(p) {
  const tags = Array.isArray(p.tags)
    ? '[' + p.tags.map(t => `"${sanitize(t)}"`).join(',') + ']'
    : '[]';
  return `  {id:"${sanitize(p.id)}",name:"${sanitize(p.name)}",tool:"${sanitize(p.tool||'chatgpt')}",cat:"${sanitize(p.cat||p.category||'General')}",tags:${tags},feat:${p.feat===true},text:"${sanitize(p.text||'')}",desc:"${sanitize(p.desc||(p.text||'').slice(0,80))}"}`;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching approved prompts from Firestore...');

  const snap = await db.collection('prompts').get();
  const firestorePrompts = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  console.log(`Found ${firestorePrompts.length} prompts in Firestore`);

  const filePath = resolve(process.cwd(), 'prompts.js');
  const currentContent = readFileSync(filePath, 'utf8');

  // Get existing names to avoid duplicates
  const existingNames = new Set();
  const nameMatches = currentContent.matchAll(/name:"([^"]+)"/g);
  for (const match of nameMatches) existingNames.add(match[1].toLowerCase().trim());
  console.log(`Current prompts.js has ${existingNames.size} prompts`);

  // Find highest existing numeric ID
  let maxId = 0;
  const idMatches = currentContent.matchAll(/id:"([^"]+)"/g);
  for (const match of idMatches) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > maxId) maxId = num;
  }

  // Filter new prompts only
  const newPrompts = firestorePrompts.filter(p => {
    const name = (p.name || '').toLowerCase().trim();
    return !existingNames.has(name);
  });

  if (newPrompts.length === 0) {
    console.log('No new prompts to add. prompts.js is up to date.');
    process.exit(0);
  }

  console.log(`Adding ${newPrompts.length} new prompts...`);

  const promptsToAdd = newPrompts.map((p, i) => ({
    ...p,
    id: String(maxId + i + 1),
    tool: p.tool || 'chatgpt',
    cat: p.cat || p.category || 'General',
    feat: p.feat === true,
    desc: p.desc || (p.text || '').slice(0, 80),
  }));

  const newEntries = promptsToAdd.map(promptToJs).join(',\n');

  // Inject before closing ];
  const updatedContent = currentContent.replace(
    /(\n?\];?\s*)$/,
    `,\n${newEntries}\n];\n`
  );

  writeFileSync(filePath, updatedContent, 'utf8');
  console.log(`prompts.js updated — added ${newPrompts.length} prompts`);
  console.log('New IDs:', promptsToAdd.map(p => p.id).join(', '));

  // Mark as exported in Firestore
  const batch = db.batch();
  for (const p of promptsToAdd) {
    const ref = db.collection('prompts').doc(p._docId);
    batch.update(ref, { exportedToJs: true, exportedAt: new Date().toISOString() });
  }
  await batch.commit();
  console.log('Firestore export flags updated');
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
