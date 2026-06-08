// Auto-export approved PA-generated prompts from Firebase to prompts.js
const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// ── Firebase init ──────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID || 'promptaholics-534d3',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  })
});
const db = admin.firestore();

async function run(){
  console.log('🔍 Fetching approved, unexported prompts from Firebase...');

  // Get approved + unexported prompts
  const snap = await db.collection('pending-prompts')
    .where('status','==','approved')
    .where('exported','==',false)
    .orderBy('approvedAt','asc')
    .get();

  if(snap.empty){
    console.log('✅ No new prompts to export.');
    process.exit(0);
  }

  console.log(`📦 Found ${snap.size} prompts to export.`);

  // Read current prompts.js
  const promptsPath = path.join(process.cwd(), 'prompts.js');
  const current = fs.readFileSync(promptsPath, 'utf8');

  // Find highest existing ID
  const existingIds = [...current.matchAll(/id:'(\d+)'/g)].map(m=>parseInt(m[1]));
  let nextId = Math.max(...existingIds, 1485) + 1;

  // Build new prompt entries
  const newEntries = [];
  const docIds = [];

  snap.forEach(docSnap => {
    const p = docSnap.data();
    docIds.push(docSnap.id);

    const id     = String(nextId++);
    const name   = (p.name||'PA Prompt').replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    const cat    = (p.cat||'AI Agents').replace(/"/g,'\\"');
    const text   = (p.text||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,' ');
    const desc   = (p.desc||text.slice(0,80)+'...').replace(/"/g,'\\"');
    const tags   = (p.tags||['ai-generated']).map(t=>JSON.stringify(t)).join(',');

    newEntries.push(
      `{id:'${id}',name:"${name}",tool:"chatgpt",cat:"${cat}",tags:[${tags}],feat:false,text:"${text}",desc:"${desc}"}`
    );
  });

  // Insert before closing ];
  const insertPoint = current.lastIndexOf('];');
  const updated = current.slice(0, insertPoint)
    + ',\n'
    + newEntries.join(',\n')
    + '\n'
    + current.slice(insertPoint);

  fs.writeFileSync(promptsPath, updated, 'utf8');
  console.log(`✅ Added ${newEntries.length} prompts to prompts.js`);

  // Mark prompts as exported in Firebase
  const batch = db.batch();
  docIds.forEach(id => {
    batch.update(db.collection('pending-prompts').doc(id), {
      exported: true,
      exportedAt: new Date().toISOString(),
    });
  });
  await batch.commit();
  console.log(`🏷  Marked ${docIds.length} prompts as exported in Firebase`);
  console.log(`📈 New prompt count: ${existingIds.length + newEntries.length}`);

  process.exit(0);
}

run().catch(err => {
  console.error('❌ Export failed:', err);
  process.exit(1);
});
