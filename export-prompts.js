/**
 * Promptaholics — Export Approved Prompts to prompts.js
 * Runs via GitHub Action every Monday at 2PM UTC
 *
 * What it does:
 *  1. Connects to Firebase using service account credentials
 *  2. Reads all docs from 'prompts' collection (approved and live)
 *  3. Reads current prompts.js to get existing IDs + highest ID number
 *  4. Appends only NEW prompts (not already in prompts.js)
 *  5. Writes updated prompts.js back to repo
 *  6. GitHub Action then commits + pushes automatically
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Firebase Admin init (uses GitHub Secrets) ────────────────────
const serviceAccount = {
  type: 'service_account',
  project_id: 'promptaholics-534d3',
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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
  return `  {id:"${sanitize(p.id)}",name:"${sanitize(p.name)}",tool:"${sanitize(p.tool || 'chatgpt')}",cat:"${sanitize(p.cat || p.category || 'General')}",tags:${tags},feat:${p.feat === true},text:"${sanitize(p.text)}",desc:"${sanitize(p.desc || p.text?.slice(0, 80) || '')}"}`;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('📦 Fetching approved prompts from Firestore...');

  // 1. Get all docs from live prompts collection
  const snap = await db.collection('prompts').get();
  const firestorePrompts = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  console.log(`Found ${firestorePrompts.length} prompts in Firestore`);

  // 2. Read current prompts.js
  const filePath = resolve(process.cwd(), 'prompts.js');
  const currentContent = readFileSync(filePath, 'utf8');

  // 3. Extract existing IDs from prompts.js
  const existingIds = new Set();
  const idMatches = currentContent.matchAll(/id:"([^"]+)"/g);
  for (const match of idMatches) existingIds.add(match[1]);
  console.log(`Current prompts.js has ${existingIds.size} prompts`);

  // 4. Find highest existing numeric ID
  let maxId = 0;
  for (const id of existingIds) {
    const num = parseInt(id, 10);
    if (!isNaN(num) && num > maxId) maxId = num;
  }
  console.log(`Highest existing ID: ${maxId}`);

  // 5. Filter to only NEW prompts not already in prompts.js
  // Match by Firestore doc ID or by name+text to avoid duplicates
  const existingNames = new Set();
  const nameMatches = currentContent.matchAll(/name:"([^"]+)"/g);
  for (const match of nameMatches) existingNames.add(match[1].toLowerCase().trim());

  const newPrompts = firestorePrompts.filter(p => {
    const name = (p.name || '').toLowerCase().trim();
    return !existingNames.has(name);
  });

  if (newPrompts.length === 0) {
    console.log('✅ No new prompts to add. prompts.js is up to date.');
    process.exit(0);
  }

  console.log(`Adding ${newPrompts.length} new prompts...`);

  // 6. Assign sequential IDs to new prompts
  const promptsToAdd = newPrompts.map((p, i) => ({
    ...p,
    id: String(maxId + i + 1),
    tool: p.tool || 'chatgpt',
    cat: p.cat || p.category || 'General',
    feat: p.feat === true,
    desc: p.desc || (p.text || '').slice(0, 80),
  }));

  // 7. Build new entries as JS object strings
  const newEntries = promptsToAdd.map(promptToJs).join(',\n');

  // 8. Inject into prompts.js before the closing ];
  // Handles both `];` and `\n];` endings
  const updatedContent = currentContent.replace(
    /(\s*\];?\s*)$/,
    `,\n${newEntries}\n];\n`
  );

  // 9. Write back to file
  writeFileSync(filePath, updatedContent, 'utf8');
  console.log(`✅ prompts.js updated — added ${newPrompts.length} prompts`);
  console.log('New IDs:', promptsToAdd.map(p => p.id).join(', '));

  // 10. Mark exported prompts in Firestore so we know they're in prompts.js
  const batch = db.batch();
  for (const p of promptsToAdd) {
    const ref = db.collection('prompts').doc(p._docId);
    batch.update(ref, { exportedToJs: true, exportedAt: new Date().toISOString() });
  }
  await batch.commit();
  console.log('✅ Firestore export flags updated');
}

main().catch(err => {
  console.error('❌ Export failed:', err);
  process.exit(1);
});
