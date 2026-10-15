const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let combined = `-- ============================================================================
-- GoviSahana — Complete Supabase Setup (All Migrations Combined)
-- Safe to run multiple times (Idempotent)
-- ============================================================================

`;

for (const file of files) {
  let content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

  // Strip begin; and commit; so statements don't abort each other in SQL editor
  content = content.replace(/^begin;/gm, '-- begin;');
  content = content.replace(/^commit;/gm, '-- commit;');

  // Make CREATE TRIGGER idempotent with DROP TRIGGER IF EXISTS
  content = content.replace(/create\s+trigger\s+([a-zA-Z0-9_]+)\s+([\s\S]*?)\s+on\s+([a-zA-Z0-9_.]+)/gi, (match, trg, timing, tbl) => {
    return `drop trigger if exists ${trg} on ${tbl};\n${match}`;
  });

  // Make CREATE POLICY idempotent with DROP POLICY IF EXISTS
  content = content.replace(/create\s+policy\s+("?[a-zA-Z0-9_]+"?)\s+on\s+([a-zA-Z0-9_.]+)/gi, (match, pol, tbl) => {
    return `drop policy if exists ${pol} on ${tbl};\n${match}`;
  });

  combined += `
-- ============================================================================
-- START OF: ${file}
-- ============================================================================

${content}
`;
}

const targetPath = path.join(__dirname, '..', 'supabase', 'combined_migration.sql');
fs.writeFileSync(targetPath, combined, 'utf8');
console.log('Successfully generated robust combined_migration.sql at:', targetPath);
