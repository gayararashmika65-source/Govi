const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const sb = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function seedDemoDataWithPhotos() {
  console.log('📸 Seeding high-quality demo photos, chat attachments & listings into Supabase...\n');

  // 1. Fetch user profiles
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

  // 2. Assign high-resolution avatars to profiles
  console.log('Setting realistic profile avatars...');
  await sb.from('profiles').update({
    avatar_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
  }).eq('id', farmer.id);

  await sb.from('profiles').update({
    avatar_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
  }).eq('id', expert.id);

  if (enterprise) {
    await sb.from('profiles').update({
      avatar_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=400&q=80',
    }).eq('id', enterprise.id);
  }

  if (worker) {
    await sb.from('profiles').update({
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    }).eq('id', worker.id);
  }

  if (buyer) {
    await sb.from('profiles').update({
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    }).eq('id', buyer.id);
  }
  console.log('✓ Avatars updated.');

  // 3. Update Role Profiles
  console.log('\nPopulating role profile details...');
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
  console.log('✓ Role profiles updated.');

  // 4. Create or Update Demo Agricultural Case with Photo Attachments
  console.log('\nSetting up demo case with crop damage photos...');
  let caseId;
  const { data: existingCases } = await sb.from('agricultural_cases').select('id').eq('farmer_id', farmer.id);
  if (existingCases && existingCases.length > 0) {
    caseId = existingCases[0].id;
  } else {
    const { data: newCase } = await sb.from('agricultural_cases').insert({
      farmer_id: farmer.id,
      expert_id: expert.id,
      crop: 'Rice (Paddy)',
      category: 'PEST',
      title: 'Yellowing patches in paddy field (Hopper burn)',
      description: 'Several patches in the centre of my paddy field are turning yellow and drying. I noticed small brown insects at the base of the stems.',
      status: 'IN_PROGRESS',
      district: 'Anuradhapura',
    }).select('id').single();
    caseId = newCase.id;
  }

  if (caseId) {
    // Clean and insert photos into case_attachments
    await sb.from('case_attachments').delete().eq('case_id', caseId);
    await sb.from('case_attachments').insert([
      {
        case_id: caseId,
        file_path: 'https://images.unsplash.com/photo-1599818816942-d615f21223fa?auto=format&fit=crop&w=800&q=80',
      },
      {
        case_id: caseId,
        file_path: 'https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=800&q=80',
      },
    ]);
    console.log('✓ Added 2 crop damage photographs to the agricultural case.');
  }

  // 5. Create or Update Demo Consultation & Messages with Photo Sharing
  if (caseId) {
    console.log('\nSetting up demo consultation chat with photo messages...');
    let consultationId;
    const { data: existingConsultations } = await sb.from('consultations').select('id').eq('case_id', caseId);
    if (existingConsultations && existingConsultations.length > 0) {
      consultationId = existingConsultations[0].id;
    } else {
      const { data: newConsultation } = await sb.from('consultations').insert({
        case_id: caseId,
        farmer_id: farmer.id,
        expert_id: expert.id,
        type: 'CHAT',
        status: 'ACCEPTED',
        price: 1500,
      }).select('id').single();
      consultationId = newConsultation.id;
    }

    if (consultationId) {
      await sb.from('messages').delete().eq('consultation_id', consultationId);

      const demoMessages = [
        {
          sender_id: farmer.id,
          body: 'Good morning Doctor Anura. Several patches in my Kekirawa paddy field are turning yellow and drying. I noticed small brown insects at the base of the stems.',
        },
        {
          sender_id: farmer.id,
          body: '[PHOTO:https://images.unsplash.com/photo-1599818816942-d615f21223fa?auto=format&fit=crop&w=800&q=80] Close-up of the infected plant base showing small hopper insects and drying tillers.',
        },
        {
          sender_id: expert.id,
          body: 'Good morning Saman. Thank you for the photograph — this confirms Brown Plant Hopper (BPH) damage. The brown discoloration at the stem base is characteristic.',
        },
        {
          sender_id: expert.id,
          body: 'First step: immediately drain excess standing water from the field for 2–3 days. This lowers the humidity at the canopy base and slows down egg hatching.',
        },
        {
          sender_id: expert.id,
          body: 'Please target the base of the tillers when applying any recommended spray, rather than spraying the top leaves: [PHOTO:https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&w=800&q=80]',
        },
        {
          sender_id: farmer.id,
          body: 'Understood Doctor! I will drain the water this afternoon and use the knapsack sprayer with low nozzle pressure as shown.',
        },
        {
          sender_id: expert.id,
          body: 'Great. Please check the hopper population in 3 days and send me an update photograph. We will ensure the crop recovers in time for harvest.',
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
      console.log(`✓ Added ${demoMessages.length} chat messages including photo attachments.`);
    }
  }

  // 6. Update Crop Listings with High-Quality Photos
  console.log('\nUpdating crop listings with photos...');
  await sb.from('crop_listings').delete().eq('owner_id', farmer.id);
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
      image_url: 'https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=800&q=80',
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
      image_url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80',
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
      image_url: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80',
      available: true,
      expected_harvest_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    },
  ];
  await sb.from('crop_listings').insert(crops);
  console.log(`✓ Added ${crops.length} crop listings with photos.`);

  // 7. Update Product Listings with High-Quality Photos
  if (enterprise) {
    console.log('\nUpdating product listings with photos...');
    await sb.from('product_listings').delete().eq('owner_id', enterprise.id);
    const products = [
      {
        owner_id: enterprise.id,
        title: 'Premium Urea Fertilizer (50kg)',
        description: 'High-purity nitrogen fertilizer ideal for dry zone paddy and vegetable top-dressing.',
        category: 'Fertilizer',
        price: 9500,
        unit: 'bag',
        image_url: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=800&q=80',
        district: 'Kurunegala',
        available: true,
      },
      {
        owner_id: enterprise.id,
        title: 'Hybrid Seed Paddy BG 352 (25kg)',
        description: 'Certified Department of Agriculture approved seed paddy with 98% germination rate.',
        category: 'Seeds',
        price: 4900,
        unit: 'bag',
        image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
        district: 'Kurunegala',
        available: true,
      },
      {
        owner_id: enterprise.id,
        title: 'Heavy Duty 16L Knapsack Sprayer',
        description: 'Manual knapsack sprayer with adjustable brass nozzle, pressure valve and padded straps.',
        category: 'Equipment',
        price: 8800,
        unit: 'unit',
        image_url: 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&w=800&q=80',
        district: 'Kurunegala',
        available: true,
      },
      {
        owner_id: enterprise.id,
        title: 'Complete 1-Acre Drip Irrigation Kit',
        description: 'Gravity-fed drip system including disc filter, 16mm mainline and inline dripper tape.',
        category: 'Irrigation',
        price: 45000,
        unit: 'kit',
        image_url: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=800&q=80',
        district: 'Kurunegala',
        available: true,
      },
    ];
    await sb.from('product_listings').insert(products);
    console.log(`✓ Added ${products.length} product listings with photos.`);
  }

  // 8. Update Knowledge Articles with Hero Images
  console.log('\nUpdating knowledge articles with hero images...');
  await sb.from('knowledge_articles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const articles = [
    {
      title: 'Managing Brown Plant Hopper (BPH) Outbreaks in Rice',
      summary: 'Essential identification, water management and biological control tactics for Sri Lankan paddy farmers.',
      content: 'The Brown Plant Hopper (Nilaparvata lugens) causes hopper burn in susceptible varieties. Monitor fields twice weekly at tiller level. Maintain alternating wet and dry irrigation to reduce reproduction. Never overuse broad-spectrum synthetic pyrethroids which kill natural mirid bug predators. Consult Department of Agriculture advisories before applying systemic insecticides.',
      category: 'Pest Management',
      author_name: 'Dr. Anura Perera',
      image_url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
      tags: 'paddy, bph, pest, rice, disease',
    },
    {
      title: 'Organic Soil Enrichment with Farmyard Compost',
      summary: 'A step-by-step practical guide to preparing quality compost from agricultural residues.',
      content: 'Layer green nitrogen materials (weed clippings, crop residues) with brown carbon materials (straw, dry leaves). Maintain 50-60% moisture and turn weekly for aeration. Proper composting eliminates weed seeds and pathogens, creating organic matter that improves soil water retention by up to 30%.',
      category: 'Soil & Fertility',
      author_name: 'Prof. Niluka Fernando',
      image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=800&q=80',
      tags: 'organic, compost, soil health, fertility',
    },
    {
      title: 'Maha Season Cultivation Calendar for Dry Zone Districts',
      summary: 'Recommended sowing dates, seed selection, basal fertilization and water rationing.',
      content: 'Land preparation for Maha begins in late September. Select 3.5-month varieties such as BG 352 or BG 360. Apply basal fertilizers before second ploughing. Top dress with nitrogen strictly at 35–45 days after sowing and ensure proper water leveling during panicle initiation.',
      category: 'Cultivation Guide',
      author_name: 'Dr. Anura Perera',
      image_url: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
      tags: 'maha, calendar, paddy, dry zone, cultivation',
    },
  ];
  await sb.from('knowledge_articles').insert(articles);
  console.log(`✓ Added ${articles.length} knowledge articles with hero images.`);

  console.log('\n======================================================');
  console.log('🎉 All demo photos & media successfully uploaded to Supabase!');
  console.log('======================================================\n');
}

seedDemoDataWithPhotos().catch(console.error);
