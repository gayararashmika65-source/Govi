const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const sb = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function seedDemoData() {
  console.log('🌾 Seeding full demo data & chat messages into Supabase...\n');

  // 1. Fetch user IDs
  const { data: profiles, error: pErr } = await sb.from('profiles').select('id, email, role, name');
  if (pErr || !profiles) {
    console.error('Error fetching profiles:', pErr);
    return;
  }

  const farmer = profiles.find(p => p.email === 'farmer@demo.lk');
  const expert = profiles.find(p => p.email === 'expert@demo.lk');
  const enterprise = profiles.find(p => p.email === 'enterprise@demo.lk');
  const worker = profiles.find(p => p.email === 'worker@demo.lk');
  const buyer = profiles.find(p => p.email === 'buyer@demo.lk');

  if (!farmer || !expert) {
    console.error('Farmer or Expert demo account missing. Please run scripts/seed-supabase.js first.');
    return;
  }

  console.log(`Found Farmer: ${farmer.name} (${farmer.id})`);
  console.log(`Found Expert: ${expert.name} (${expert.id})`);

  // 2. Update Role Profiles
  console.log('\nPopulating role profiles...');
  await sb.from('farmer_profiles').upsert({
    id: farmer.id,
    district: 'Anuradhapura',
    location: 'Kekirawa',
    farm_size_acres: 3.5,
    crops: 'Rice (Paddy), Big Onion, Chilli',
    bio: 'Paddy and vegetable grower for 15+ years in Anuradhapura dry zone.',
  });

  await sb.from('expert_profiles').upsert({
    id: expert.id,
    title: 'Senior Agricultural Officer',
    qualifications: 'BSc Agriculture (Peradeniya), MSc Plant Pathology',
    expertise: 'Plant Pathology, Pest Management, Rice Cultivation',
    crops: 'Rice (Paddy), Onion, Chilli, Vegetables',
    languages: 'Sinhala, English',
    service_areas: 'Anuradhapura, Polonnaruwa, Kurunegala',
    bio: '20+ years advising dry-zone paddy farmers on crop diseases and pest outbreaks.',
    hourly_rate: 1500,
    verified: true,
    available: true,
    rating: 4.9,
  });

  if (enterprise) {
    await sb.from('enterprise_profiles').upsert({
      id: enterprise.id,
      business_name: 'GreenGrow Agro Supplies (Pvt) Ltd',
      business_type: 'Fertilizer & Seed Supplier',
      registration_no: 'PV-2018-4567',
      district: 'Kurunegala',
      address: 'No. 45, Dambulla Rd, Kurunegala',
      verified: true,
    });
  }

  if (worker) {
    await sb.from('worker_profiles').upsert({
      id: worker.id,
      skills: 'Harvesting, Tractor Operation, Chemical Spraying',
      experience: '8 years farm labour in dry zone paddy and vegetables',
      district: 'Anuradhapura',
      available: true,
      bio: 'Reliable experienced farm labourer and equipment operator.',
    });
  }

  if (buyer) {
    await sb.from('buyer_profiles').upsert({
      id: buyer.id,
      buyer_type: 'Exporter',
      company: 'Ceylon Fresh Exports (Pvt) Ltd',
      district: 'Colombo',
    });
  }
  console.log('✓ Role profiles updated.');

  // 3. Create Demo Case
  console.log('\nCreating demo agricultural case...');
  let caseId;
  const { data: existingCases } = await sb.from('agricultural_cases').select('id').eq('farmer_id', farmer.id);
  if (existingCases && existingCases.length > 0) {
    caseId = existingCases[0].id;
    console.log(`Using existing case ID: ${caseId}`);
  } else {
    const { data: newCase, error: cErr } = await sb.from('agricultural_cases').insert({
      farmer_id: farmer.id,
      expert_id: expert.id,
      crop: 'Rice (Paddy)',
      category: 'PEST',
      title: 'Yellowing patches in paddy field (Hopper burn)',
      description: 'Several patches in the centre of my paddy field are turning yellow and drying. I noticed small brown insects at the base of the stems.',
      status: 'IN_PROGRESS',
      district: 'Anuradhapura',
    }).select('id').single();

    if (cErr) {
      console.error('Error creating case:', cErr.message);
    } else {
      caseId = newCase.id;
      console.log(`✓ Created case ID: ${caseId}`);
    }
  }

  // 4. Create Demo Consultation & Messages
  if (caseId) {
    console.log('\nSetting up demo consultation chat...');
    let consultationId;
    const { data: existingConsultations } = await sb.from('consultations').select('id').eq('case_id', caseId);
    if (existingConsultations && existingConsultations.length > 0) {
      consultationId = existingConsultations[0].id;
      console.log(`Using existing consultation ID: ${consultationId}`);
    } else {
      const { data: newConsultation, error: conErr } = await sb.from('consultations').insert({
        case_id: caseId,
        farmer_id: farmer.id,
        expert_id: expert.id,
        type: 'CHAT',
        status: 'ACCEPTED',
        price: 1500,
      }).select('id').single();

      if (conErr) {
        console.error('Error creating consultation:', conErr.message);
      } else {
        consultationId = newConsultation.id;
        console.log(`✓ Created consultation ID: ${consultationId}`);
      }
    }

    if (consultationId) {
      // Clean existing messages if any
      await sb.from('messages').delete().eq('consultation_id', consultationId);

      const demoMessages = [
        {
          sender_id: farmer.id,
          body: 'Good morning Doctor Anura. Several patches in my Kekirawa paddy field are turning yellow and drying. I noticed small brown insects at the base of the stems. Please advise.',
        },
        {
          sender_id: expert.id,
          body: 'Good morning Saman. From your description and symptoms, this is a clear sign of Brown Plant Hopper (BPH) damage. Are the yellowing patches spreading in a circular pattern?',
        },
        {
          sender_id: farmer.id,
          body: 'Yes Doctor, exactly circular and spreading rapidly over the last 2 days. The leaves are beginning to dry out completely.',
        },
        {
          sender_id: expert.id,
          body: 'First, drain excess standing water from the field for 2 to 3 days to reduce humidity at the base. Avoid applying any urea fertilizer right now as high nitrogen accelerates hopper reproduction.',
        },
        {
          sender_id: expert.id,
          body: 'If hopper counts exceed 5–10 per hill, apply Buprofezin 25% SC or Pymetrozine at the Department of Agriculture recommended dosage. Direct the spray towards the base of the plants, not just the canopy.',
        },
        {
          sender_id: farmer.id,
          body: 'Thank you very much Doctor! I will drain the field this afternoon and visit the agrarian service center for the spray.',
        },
        {
          sender_id: expert.id,
          body: 'You are welcome Saman. Follow the safety precautions on the label and let me know the status after 3 days. We will monitor until your harvest is safe.',
        },
      ];

      for (const m of demoMessages) {
        await sb.from('messages').insert({
          consultation_id: consultationId,
          sender_id: m.sender_id,
          body: m.body,
          read: true,
        });
      }
      console.log(`✓ Added ${demoMessages.length} back-and-forth chat messages to the consultation.`);
    }
  }

  // 5. Seed Crop Listings
  console.log('\nSeeding crop listings...');
  const { count: cropCount } = await sb.from('crop_listings').select('*', { count: 'exact', head: true });
  if (!cropCount || cropCount === 0) {
    const crops = [
      {
        owner_id: farmer.id,
        crop_name: 'Rice (Paddy)',
        variety: 'BG 352 (Nadu)',
        quantity: 1500,
        unit: 'kg',
        district: 'Anuradhapura',
        asking_price: 115,
        grade: 'A',
        available: true,
        expected_harvest_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      },
      {
        owner_id: farmer.id,
        crop_name: 'Big Onion',
        variety: 'Dambulla Red',
        quantity: 500,
        unit: 'kg',
        district: 'Anuradhapura',
        asking_price: 195,
        grade: 'A',
        available: true,
        expected_harvest_date: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
      },
      {
        owner_id: farmer.id,
        crop_name: 'Green Chilli',
        variety: 'MI-2',
        quantity: 250,
        unit: 'kg',
        district: 'Anuradhapura',
        asking_price: 320,
        grade: 'A',
        available: true,
        expected_harvest_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      },
    ];
    await sb.from('crop_listings').insert(crops);
    console.log(`✓ Added ${crops.length} crop listings.`);
  } else {
    console.log(`Crop listings already present (${cropCount}).`);
  }

  // 6. Seed Product Listings
  if (enterprise) {
    console.log('\nSeeding product listings...');
    const { count: prodCount } = await sb.from('product_listings').select('*', { count: 'exact', head: true });
    if (!prodCount || prodCount === 0) {
      const products = [
        {
          owner_id: enterprise.id,
          title: 'Premium Urea Fertilizer (50kg)',
          description: 'High-purity nitrogen fertilizer ideal for dry zone paddy and vegetables.',
          category: 'Fertilizer',
          price: 9500,
          unit: 'bag',
          district: 'Kurunegala',
          available: true,
        },
        {
          owner_id: enterprise.id,
          title: 'Hybrid Seed Paddy BG 352 (25kg)',
          description: 'Certified Department of Agriculture approved seed paddy with high germination rate.',
          category: 'Seeds',
          price: 4900,
          unit: 'bag',
          district: 'Kurunegala',
          available: true,
        },
        {
          owner_id: enterprise.id,
          title: 'Heavy Duty 16L Knapsack Sprayer',
          description: 'Manual knapsack sprayer with adjustable brass nozzle and comfortable back straps.',
          category: 'Equipment',
          price: 8800,
          unit: 'unit',
          district: 'Kurunegala',
          available: true,
        },
        {
          owner_id: enterprise.id,
          title: 'Complete 1-Acre Drip Irrigation Kit',
          description: 'Gravity-fed drip irrigation system including disc filter, mainline and dripper tape.',
          category: 'Irrigation',
          price: 45000,
          unit: 'kit',
          district: 'Kurunegala',
          available: true,
        },
      ];
      await sb.from('product_listings').insert(products);
      console.log(`✓ Added ${products.length} product listings.`);
    } else {
      console.log(`Product listings already present (${prodCount}).`);
    }
  }

  // 7. Seed Job Listings
  console.log('\nSeeding job listings...');
  const { count: jobCount } = await sb.from('job_listings').select('*', { count: 'exact', head: true });
  if (!jobCount || jobCount === 0) {
    const jobs = [
      {
        owner_id: farmer.id,
        title: 'Paddy Harvesting Labourers Needed',
        description: 'Need 6 experienced workers for paddy harvesting across 3.5 acres. Meals provided daily.',
        required_skills: 'Harvesting, Bundling, Threshing',
        location: 'Kekirawa, Anuradhapura',
        start_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        payment_terms: 'Daily Cash',
        wage: 3500,
        status: 'OPEN',
      },
      {
        owner_id: farmer.id,
        title: 'Vegetable Plot Chemical Sprayer',
        description: 'Need a certified sprayer with experience handling knapsack sprayers for chilli plot.',
        required_skills: 'Spraying, Safety gear compliance',
        location: 'Kekirawa, Anuradhapura',
        start_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        payment_terms: 'Per task',
        wage: 5000,
        status: 'OPEN',
      },
    ];
    await sb.from('job_listings').insert(jobs);
    console.log(`✓ Added ${jobs.length} job listings.`);
  } else {
    console.log(`Job listings already present (${jobCount}).`);
  }

  // 8. Seed Buyer Requirements
  if (buyer) {
    console.log('\nSeeding buyer requirements...');
    const { count: reqCount } = await sb.from('buyer_requirements').select('*', { count: 'exact', head: true });
    if (!reqCount || reqCount === 0) {
      const requirements = [
        {
          owner_id: buyer.id,
          crop_name: 'Rice (Paddy)',
          quantity: 10000,
          unit: 'kg',
          preferred_district: 'Anuradhapura',
          target_price: 120,
          delivery_req: 'Delivery to Colombo warehouse or mill pickup',
          closing_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          status: 'OPEN',
        },
        {
          owner_id: buyer.id,
          crop_name: 'Big Onion',
          quantity: 3000,
          unit: 'kg',
          preferred_district: 'Anuradhapura',
          target_price: 200,
          delivery_req: 'Colombo wholesale market',
          closing_date: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
          status: 'OPEN',
        },
      ];
      await sb.from('buyer_requirements').insert(requirements);
      console.log(`✓ Added ${requirements.length} buyer requirements.`);
    } else {
      console.log(`Buyer requirements already present (${reqCount}).`);
    }
  }

  // 9. Seed Knowledge Articles
  console.log('\nSeeding knowledge articles...');
  const { count: artCount } = await sb.from('knowledge_articles').select('*', { count: 'exact', head: true });
  if (!artCount || artCount === 0) {
    const articles = [
      {
        title: 'Managing Brown Plant Hopper (BPH) Outbreaks in Rice',
        summary: 'Essential identification, water management and biological control tactics for Sri Lankan paddy farmers.',
        content: 'The Brown Plant Hopper (Nilaparvata lugens) causes hopper burn in susceptible varieties. Monitor fields twice weekly at tiller level. Maintain alternating wet and dry irrigation to reduce reproduction. Never overuse broad-spectrum synthetic pyrethroids which kill natural mirid bug predators. Consult Department of Agriculture advisories before applying systemic insecticides.',
        category: 'Pest Management',
        author_name: 'Dr. Anura Perera',
        tags: 'paddy, bph, pest, rice, disease',
      },
      {
        title: 'Organic Soil Enrichment with Farmyard Compost',
        summary: 'A step-by-step practical guide to preparing quality compost from agricultural residues.',
        content: 'Layer green nitrogen materials (weed clippings, crop residues) with brown carbon materials (straw, dry leaves). Maintain 50-60% moisture and turn weekly for aeration. Proper composting eliminates weed seeds and pathogens, creating organic matter that improves soil water retention by up to 30%.',
        category: 'Soil & Fertility',
        author_name: 'Prof. Niluka Fernando',
        tags: 'organic, compost, soil health, fertility',
      },
      {
        title: 'Maha Season Cultivation Calendar for Dry Zone Districts',
        summary: 'Recommended sowing dates, seed selection, basal fertilization and water rationing.',
        content: 'Land preparation for Maha begins in late September. Select 3.5-month varieties such as BG 352 or BG 360. Apply basal fertilizers before second ploughing. Top dress with nitrogen strictly at 35–45 days after sowing and ensure proper water leveling during panicle initiation.',
        category: 'Cultivation Guide',
        author_name: 'Dr. Anura Perera',
        tags: 'maha, calendar, paddy, dry zone, cultivation',
      },
    ];
    await sb.from('knowledge_articles').insert(articles);
    console.log(`✓ Added ${articles.length} knowledge articles.`);
  } else {
    console.log(`Knowledge articles already present (${artCount}).`);
  }

  console.log('\n======================================================');
  console.log('🎉 Full demo database & chat successfully seeded in Supabase!');
  console.log('You can now log in as:');
  console.log('  • Farmer: farmer@demo.lk (password: password123)');
  console.log('    -> Check "Messages" to see the active consultation chat with Dr. Anura Perera!');
  console.log('  • Expert: expert@demo.lk (password: password123)');
  console.log('    -> Check "Consultations" to reply to the chat with Saman Bandara!');
  console.log('======================================================\n');
}

seedDemoData().catch(console.error);
