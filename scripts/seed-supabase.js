const { createClient } = require('@supabase/supabase-js');

const url = 'https://hdhywvuaekmwdhfuglkx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkaHl3dnVhZWttd2RoZnVnbGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA4MzIxOSwiZXhwIjoyMTA3NjU5MjE5fQ.Ju-f8oG4sExa-92KaaDaG_utTDtdXZuWjiiOPLOWuoo';
const admin = createClient(url, key);

const demoUsers = [
  { email: 'farmer@demo.lk', name: 'Saman Bandara', role: 'FARMER', phone: '0771234567' },
  { email: 'expert@demo.lk', name: 'Dr. Anura Perera', role: 'EXPERT', phone: '0712345678' },
  { email: 'enterprise@demo.lk', name: 'GreenGrow Supplies', role: 'ENTERPRISE', phone: '0751112222' },
  { email: 'worker@demo.lk', name: 'Mahinda Gunasena', role: 'WORKER', phone: '0763334444' },
  { email: 'buyer@demo.lk', name: 'Ceylon Fresh Exports', role: 'BUYER', phone: '0705556666' },
  { email: 'admin@demo.lk', name: 'Platform Admin', role: 'ADMIN', phone: '0789990000' },
];

async function seed() {
  console.log('Seeding demo accounts into Supabase...');

  for (const u of demoUsers) {
    // Check if user already exists
    const { data: { users } } = await admin.auth.admin.listUsers();
    const existing = users.find(x => x.email === u.email);

    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, {
        password: 'password123',
        email_confirm: true,
        user_metadata: { role: u.role, name: u.name, phone: u.phone },
      });
      // Also update role in profiles directly
      await admin.from('profiles').update({ role: u.role, name: u.name }).eq('id', existing.id);
      console.log(`  ✓ Updated existing: ${u.email} (${u.role})`);
    } else {
      // Role ADMIN is blocked at signup trigger, so create with FARMER first then promote to ADMIN
      const signupRole = u.role === 'ADMIN' ? 'FARMER' : u.role;
      const { data: authData, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { role: signupRole, name: u.name, phone: u.phone },
      });

      if (error) {
        console.error(`  ✗ Error creating ${u.email}:`, error.message);
      } else {
        if (u.role === 'ADMIN') {
          // Promote to ADMIN directly via service role
          await admin.from('profiles').update({ role: 'ADMIN' }).eq('id', authData.user.id);
        }
        console.log(`  ✓ Created: ${u.email} (${u.role})`);
      }
    }
  }

  console.log('\nAll demo accounts are ready with password: password123');
}

seed();
