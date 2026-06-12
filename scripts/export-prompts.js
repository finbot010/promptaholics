'use strict';

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// ── Firebase Admin init ──────────────────────────────────────────
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!privateKey || !clientEmail) {
  console.error('Missing FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL secrets');
  process.exit(1);
}

// Debug — show key format without exposing the actual key
console.log('Client email:', clientEmail);
console.log('Private key length:', privateKey.length);
console.log('Private key starts with:', privateKey.slice(0, 30));
console.log('Contains literal \\n:', privateKey.includes('\\n'));
console.log('Contains real newline:', privateKey.includes('\n'));

const formattedKey = privateKey.includes('\\n')
  ? privateKey.replace(/\\n/g, '\n')
  : privateKey;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   'promptaholics-534d3',
    clientEmail: clientEmail,
    privateKey:  formattedKey,
  })
});

const db = admin.firestore();

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
    ? '[' + p.tags.map(function(t){ return '"' + sanitize(t) + '"'; }).join(',') + ']'
    : '[]';
  return '  {id:"' + sanitize(p.id) + '",name:"' + sanitize(p.name) + '",tool:"' + sanitize(p.tool || 'chatgpt') + '",cat:"' + sanitize(p.cat || p.category || 'General') + '",tags:' + tags + ',feat:' + (p.feat === true) + ',text:"' + sanitize(p.text || '') + '",desc:"' + sanitize(p.desc || (p.text || '').slice(0, 80)) + '"}';
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching approved prompts from Firestore...');

  const snap = await db.collection('prompts').get();
  const firestorePrompts = snap.docs.map(function(d){ return Object.assign({ _docId: d.id }, d.data()); });
  console.log('Found ' + firestorePrompts.length + ' prompts in Firestore');

  const filePath = path.resolve(process.cwd(), 'prompts.js');
  const currentContent = fs.readFileSync(filePath, 'utf8');

  // Get existing names to avoid duplicates
  const existingNames = new Set();
  let nameMatch;
  const nameRe = /name:"([^"]+)"/g;
  while ((nameMatch = nameRe.exec(currentContent)) !== null) {
    existingNames.add(nameMatch[1].toLowerCase().trim());
  }
  console.log('Current prompts.js has ' + existingNames.size + ' prompts');

  // Find highest existing numeric ID
  let maxId = 0;
  let idMatch;
  const idRe = /id:"([^"]+)"/g;
  while ((idMatch = idRe.exec(currentContent)) !== null) {
    const num = parseInt(idMatch[1], 10);
    if (!isNaN(num) && num > maxId) maxId = num;
  }
  console.log('Highest existing ID: ' + maxId);

  // Filter new prompts only
  const newPrompts = firestorePrompts.filter(function(p) {
    return !existingNames.has((p.name || '').toLowerCase().trim());
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

  // Inject before closing ];
  const updatedContent = currentContent.replace(
    /(\n?\];\s*)$/,
    ',\n' + newEntries + '\n];\n'
  );

  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('prompts.js updated — added ' + newPrompts.length + ' prompts');
  console.log('New IDs: ' + promptsToAdd.map(function(p){ return p.id; }).join(', '));

  // Mark as exported in Firestore
  const batch = db.batch();
  promptsToAdd.forEach(function(p) {
    const ref = db.collection('prompts').doc(p._docId);
    batch.update(ref, { exportedToJs: true, exportedAt: new Date().toISOString() });
  });
  await batch.commit();
  console.log('Firestore export flags updated. Done!');
}

main().catch(function(err) {
  console.error('Export failed:', err.message || err);
  process.exit(1);
});
