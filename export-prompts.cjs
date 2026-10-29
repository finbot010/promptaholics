'use strict';

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore }        = require('firebase-admin/firestore');
const fs   = require('fs');
const path = require('path');

// ── Firebase init ─────────────────────────────────────────────────
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey  = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!clientEmail || !privateKey) {
  console.error('Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId:   'promptaholics-534d3',
    clientEmail: clientEmail,
    privateKey:  privateKey,
  })
});

const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────
// FIXED: prompts.js uses single-quoted string values as its established
// convention (id:'1', name:'...', etc.). This function previously escaped
// double quotes only, which was correct for the double-quote template that
// used to be below — but that template is what introduced the inconsistency
// in the first place (ids 1486-2038 all got double-quoted while the
// original 1485 entries used single quotes). Now that the template below
// uses single quotes throughout, this must escape SINGLE quotes instead,
// or any prompt text containing an apostrophe ("don't", "it's") would break
// the array syntax.
function sanitize(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function promptToJs(p) {
  const tags = Array.isArray(p.tags)
    ? '[' + p.tags.map(function(t){ return "'" + sanitize(t) + "'"; }).join(',') + ']'
    : '[]';
  return "  {id:'" + sanitize(p.id) +
    "',name:'"  + sanitize(p.name) +
    "',tool:'"  + sanitize(p.tool || 'chatgpt') +
    "',cat:'"   + sanitize(p.cat || p.category || 'General') +
    "',tags:"   + tags +
    ',feat:'    + (p.feat === true) +
    ",text:'"   + sanitize(p.text || '') +
    "',desc:'"  + sanitize(p.desc || (p.text || '').slice(0, 80)) + "'}";
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching approved prompts from Firestore...');

  const snap = await db.collection('prompts').get();
  const firestorePrompts = snap.docs.map(function(d){
    return Object.assign({ _docId: d.id }, d.data());
  });
  console.log('Found ' + firestorePrompts.length + ' prompts in Firestore');

  const filePath = path.resolve(process.cwd(), 'prompts.js');
  const currentContent = fs.readFileSync(filePath, 'utf8');

  // Parse prompts.js properly instead of regex-scraping it. The old regex
  // (/name:["']([^"']+)["']/) stopped at the first apostrophe, so any name
  // like "Children's Book Story Writer" never matched and was re-exported
  // EVERY week — that's how some prompts ended up with 17-27 copies.
  let existing;
  try {
    existing = new Function(currentContent.replace('const PROMPTS', 'var PROMPTS') + '\nreturn PROMPTS;')();
  } catch (e) {
    console.error('Could not parse prompts.js (' + e.message + ') — aborting');
    process.exit(1);
  }
  const norm = function(t){ return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  const existingNames = new Set(existing.map(function(p){ return norm(p && p.name); }));
  const existingTexts = new Set(existing.map(function(p){ return norm(p && p.text); }));
  console.log('Current prompts.js has ' + existing.length + ' prompts');

  // Never reuse an ID. IDs up to RETIRED_MAX_ID were used by duplicate copies
  // removed on 2026-10-28; library.html redirects those old links, so a new
  // prompt must not take one of those numbers.
  const RETIRED_MAX_ID = 2400;
  let maxId = RETIRED_MAX_ID;
  existing.forEach(function(p){
    const num = parseInt(p && p.id, 10);
    if (!isNaN(num) && num > maxId) maxId = num;
  });
  console.log('Highest existing ID: ' + maxId);

  // New = not already exported, and not matching an existing name or text.
  // Also de-dupe within this batch.
  const seenNames = new Set(existingNames), seenTexts = new Set(existingTexts);
  const newPrompts = firestorePrompts.filter(function(p) {
    const n = norm(p.name), t = norm(p.text);
    if (!t) return false;
    if (seenNames.has(n) || seenTexts.has(t)) return false;
    seenNames.add(n); seenTexts.add(t);
    return true;
  });

  if (newPrompts.length === 0) {
    console.log('No new prompts to add. prompts.js is up to date.');
    process.exit(0);
  }

  console.log('Adding ' + newPrompts.length + ' new prompts...');

  const promptsToAdd = newPrompts.map(function(p, i) {
    return Object.assign({}, p, {
      id:   String(maxId + i + 1),
      tool: p.tool || 'chatgpt',
      cat:  p.cat || p.category || 'General',
      feat: p.feat === true,
      desc: p.desc || (p.text || '').slice(0, 80),
    });
  });

  const newEntries = promptsToAdd.map(promptToJs).join(',\n');

  // Inject before closing ]; — match only the TRUE end-of-file closing bracket
  // Strategy: find the last }); or just }  followed by whitespace then ]; at end of file
  const lastBracketPos = currentContent.lastIndexOf('\n];');
  if(lastBracketPos === -1){
    console.error('Could not find closing ]; in prompts.js — aborting');
    process.exit(1);
  }
  // Strip any trailing whitespace/comma before appending. Without this, a file
  // that already ended in "},\n];" became "},,\n{" — an empty array slot that
  // made PROMPTS.find() throw for every prompt after it (View/Share broke for
  // all newer prompts).
  const head = currentContent.slice(0, lastBracketPos).replace(/[\s,]+$/, '');
  const updatedContent = head
    + ',\n' + newEntries
    + '\n];\n';

  // Safety check: the written file must parse and contain no empty slots.
  try {
    const check = new Function(updatedContent.replace('const PROMPTS', 'var PROMPTS') + '\nreturn PROMPTS;')();
    for (let i = 0; i < check.length; i++) {
      if (!check[i] || !check[i].id) throw new Error('empty or id-less entry at index ' + i);
    }
  } catch (e) {
    console.error('prompts.js would be invalid (' + e.message + ') — aborting, nothing written');
    process.exit(1);
  }

  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('prompts.js updated — added ' + newPrompts.length + ' prompts');
  console.log('New IDs: ' + promptsToAdd.map(function(p){ return p.id; }).join(', '));

  // Keep prompt-count.json in sync automatically, every run. This is the
  // tiny (~40 byte) file creationstation.html fetches to show a live,
  // accurate prompt count without loading the full 1.2MB+ prompts.js just
  // to read one number. Counting actual "{id:" occurrences in the final
  // written content (not the running existingNames/newPrompts math) so
  // this is self-verifying against what's really in the file, the same
  // way the real count has been checked by hand throughout this project.
  const finalCount = (updatedContent.match(/\{id:/g) || []).length;
  const countFilePath = path.resolve(process.cwd(), 'prompt-count.json');
  fs.writeFileSync(
    countFilePath,
    JSON.stringify({ count: finalCount, updated: new Date().toISOString().slice(0, 10) }, null, 0) + '\n',
    'utf8'
  );
  console.log('prompt-count.json updated — count: ' + finalCount);

  // Mark as exported in Firestore
  const batch = db.batch();
  promptsToAdd.forEach(function(p) {
    const ref = db.collection('prompts').doc(p._docId);
    batch.update(ref, {
      exportedToJs: true,
      exportedAt: new Date().toISOString()
    });
  });
  await batch.commit();
  console.log('Firestore export flags updated. Done!');
}

main().catch(function(err) {
  console.error('Export failed:', err.message || err);
  process.exit(1);
});
