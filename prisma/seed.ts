// Seed script: creates demo accounts for all roles + sample data.
// Run with: bun run db:seed
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  console.log('🌱 Seeding GoviSahana...')

  const password = hashPassword('password123')

  const users = [
    { email: 'farmer@demo.lk', name: 'Saman Bandara', role: 'FARMER', phone: '0771234567', avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80' },
    { email: 'farmer2@demo.lk', name: 'Kumari Silva', role: 'FARMER', phone: '0772222333', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80' },
    { email: 'expert@demo.lk', name: 'Dr. Anura Perera', role: 'EXPERT', phone: '0712345678', avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80' },
    { email: 'ngrashmika1@gmail.com', name: 'Prof. Hasitha Wijebandara', role: 'EXPERT', phone: '0706688150', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
    { email: 'expert2@demo.lk', name: 'Prof. Niluka Fernando', role: 'EXPERT', phone: '0718765432', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80' },
    { email: 'sivanesan.expert@demo.lk', name: 'Dr. S. Sivanesan', role: 'EXPERT', phone: '0773344556', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
    { email: 'priyantha.expert@demo.lk', name: 'Dr. Priyantha Jayasundara', role: 'EXPERT', phone: '0715566778', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
    { email: 'thilini.expert@demo.lk', name: 'Mrs. Thilini Wickramarachchi', role: 'EXPERT', phone: '0779988776', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80' },
    { email: 'bandaranayake.expert@demo.lk', name: 'Mr. K. M. Bandaranayake', role: 'EXPERT', phone: '0714455667', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80' },
    { email: 'enterprise@demo.lk', name: 'GreenGrow Supplies', role: 'ENTERPRISE', phone: '0751112222', avatarUrl: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80' },
    { email: 'worker@demo.lk', name: 'Mahinda Gunasena', role: 'WORKER', phone: '0763334444', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80' },
    { email: 'buyer@demo.lk', name: 'Ceylon Fresh Exports', role: 'BUYER', phone: '0705556666', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80' },
    { email: 'admin@demo.lk', name: 'Platform Admin', role: 'ADMIN', phone: '0789990000', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80' },
  ]

  const created: Record<string, string> = {}
  for (const u of users) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, phone: u.phone, avatarUrl: u.avatarUrl },
      create: { ...u, passwordHash: password, status: 'ACTIVE' },
    })
    created[u.role] = user.id
    created[u.email] = user.id
    console.log(`  ✓ ${u.role}: ${u.email}`)
  }

  // ---- Farmer profiles ----
  await db.farmerProfile.upsert({
    where: { userId: created['farmer@demo.lk'] },
    update: {},
    create: {
      userId: created['farmer@demo.lk'],
      district: 'Anuradhapura', location: 'Kekirawa', farmSizeAcres: 3.5,
      crops: 'Rice (Paddy),Onion,Chilli', bio: 'Traditional paddy farmer for 15 years in the dry zone.',
    },
  })
  await db.farmerProfile.upsert({
    where: { userId: created['farmer2@demo.lk'] },
    update: {},
    create: {
      userId: created['farmer2@demo.lk'],
      district: 'Kandy', location: 'Peradeniya', farmSizeAcres: 1.5,
      crops: 'Vegetables,Potato', bio: 'Vegetable grower specialising in up-country crops.',
    },
  })

  // ---- Expert profiles (verified) ----
  const expertProfiles = [
    {
      userId: created['expert@demo.lk'],
      title: 'Senior Agricultural Officer & Plant Pathologist',
      qualifications: 'BSc Agriculture (Peradeniya), MSc Plant Pathology',
      expertise: 'Plant Pathology,Pest Management,Rice Cultivation,Crop Protection',
      crops: 'Rice (Paddy),Big Onion,Chilli,Vegetables,Maize',
      languages: 'Sinhala,English',
      serviceAreas: 'Anuradhapura,Polonnaruwa,Kurunegala,Matale',
      bio: 'Over 20 years advising dry-zone paddy farmers on disease and pest control. Specializes in Brown Plant Hopper management.',
      hourlyRate: 1500, verified: true, available: true, rating: 4.9,
    },
    {
      userId: created['ngrashmika1@gmail.com'],
      title: 'Professor of Agricultural Entomology & Crop Protection',
      qualifications: 'B.Sc Agriculture (Hons), M.Sc Applied Entomology, Ph.D. Pest Ecology',
      expertise: 'Pest Management,Biological Control,Paddy & Coconut Diseases,Organic Solutions',
      crops: 'Rice (Paddy),Coconut,Banana,Maize,Vegetables',
      languages: 'Sinhala,English',
      serviceAreas: 'Anuradhapura,Kurunegala,Gampaha,Colombo,Puttalam',
      bio: 'Senior university professor and agricultural researcher with extensive field advisory experience for smallholder farmers.',
      hourlyRate: 1800, verified: true, available: true, rating: 4.9,
    },
    {
      userId: created['expert2@demo.lk'],
      title: 'Professor of Horticulture & Protected Agriculture',
      qualifications: 'PhD Horticulture (University of Peradeniya), Certified Soil Scientist',
      expertise: 'Horticulture,Protected Agriculture,Greenhouse Vegetables,Soil Fertility & Nutrition',
      crops: 'Tomato,Potato,Cabbage,Carrot,Capsicum,Strawberry',
      languages: 'Sinhala,English,Tamil',
      serviceAreas: 'Kandy,Nuwara Eliya,Matale,Badulla',
      bio: 'University researcher focused on up-country vegetable production, greenhouse climate control, and soil health.',
      hourlyRate: 2500, verified: true, available: true, rating: 4.9,
    },
    {
      userId: created['sivanesan.expert@demo.lk'],
      title: 'Senior Agronomist & Dry Zone Irrigation Specialist',
      qualifications: 'B.Sc Agriculture (University of Jaffna), M.Sc Water Resource Management',
      expertise: 'Drip Irrigation,Salinity Management,Red Onion & Chilli Cultivation,Precision Fertigation',
      crops: 'Red Onion,Chilli,Brinjal,Groundnut,Watermelon,Pulses',
      languages: 'Tamil,English,Sinhala',
      serviceAreas: 'Jaffna,Kilinochchi,Vavuniya,Mannar,Mullaitivu',
      bio: 'Dedicated agronomist serving Northern and Eastern province farmers. Specializes in micro-irrigation and red onion farming.',
      hourlyRate: 1500, verified: true, available: true, rating: 4.8,
    },
    {
      userId: created['priyantha.expert@demo.lk'],
      title: 'Principal Plantation & Export Crop Specialist',
      qualifications: 'B.Sc Agriculture, M.Phil Plantation Agriculture, Diploma in Export Agriculture',
      expertise: 'Tea Cultivation,Cinnamon Processing,Rubber Tapping,Pepper & Spices,Organic Certification',
      crops: 'Tea,Cinnamon,Pepper,Cardamom,Rubber,Coconut',
      languages: 'Sinhala,English',
      serviceAreas: 'Ratnapura,Galle,Matara,Kalutara,Kegalle',
      bio: 'Over 25 years advising smallholder tea growers and spice estates in southern and Sabaragamuwa provinces.',
      hourlyRate: 2000, verified: true, available: true, rating: 4.9,
    },
    {
      userId: created['thilini.expert@demo.lk'],
      title: 'Greenhouse & Hydroponics Consultant',
      qualifications: 'B.Sc Agriculture, M.Sc Protected Agriculture & Agri-Technology',
      expertise: 'Hydroponics,Greenhouse Management,Vertical Farming,Pest Exclusion,Nutrient Solutions',
      crops: 'Bell Pepper,Salad Cucumber,Lettuce,Strawberry,Cherry Tomato',
      languages: 'Sinhala,English',
      serviceAreas: 'Nuwara Eliya,Badulla,Kandy,Colombo,Gampaha',
      bio: 'Pioneering consultant helping commercial and urban farmers build automated, climate-resilient greenhouses.',
      hourlyRate: 2200, verified: true, available: true, rating: 4.9,
    },
    {
      userId: created['bandaranayake.expert@demo.lk'],
      title: 'Post-Harvest Technology & Cold Chain Advisor',
      qualifications: 'B.Sc Food Science & Agriculture, M.Sc Post-Harvest Technology',
      expertise: 'Post-Harvest Loss Prevention,Cold Storage,Produce Grading,Safe Packaging & Transport',
      crops: 'Mango,Papaya,Banana,Vegetables,Rice',
      languages: 'Sinhala,English',
      serviceAreas: 'Kurunegala,Anuradhapura,Dambulla,Hambantota,Monaragala',
      bio: 'Former government agricultural officer working directly with farmer cooperatives and economic centres.',
      hourlyRate: 1600, verified: true, available: true, rating: 4.8,
    },
  ]

  for (const ep of expertProfiles) {
    if (ep.userId) {
      await db.expertProfile.upsert({
        where: { userId: ep.userId },
        update: ep,
        create: ep,
      })
    }
  }

  // ---- Enterprise profile ----
  await db.enterpriseProfile.upsert({
    where: { userId: created['enterprise@demo.lk'] },
    update: {},
    create: {
      userId: created['enterprise@demo.lk'],
      businessName: 'GreenGrow Supplies (Pvt) Ltd', businessType: 'Fertilizer & Seed Supplier',
      registrationNo: 'PV-2018-4567', district: 'Kurunegala', address: 'No. 45, Dambulla Rd, Kurunegala',
      verified: true,
    },
  })

  // ---- Worker profile ----
  await db.workerProfile.upsert({
    where: { userId: created['worker@demo.lk'] },
    update: {},
    create: {
      userId: created['worker@demo.lk'],
      skills: 'Harvesting,Spraying,Tractor Operation', experience: '8 years farm labour across dry zone',
      district: 'Anuradhapura', available: true,
      bio: 'Experienced farm worker available for paddy harvesting and chemical spraying.',
    },
  })

  // ---- Buyer profile ----
  await db.buyerProfile.upsert({
    where: { userId: created['buyer@demo.lk'] },
    update: {},
    create: {
      userId: created['buyer@demo.lk'],
      buyerType: 'Exporter', company: 'Ceylon Fresh Exports (Pvt) Ltd', district: 'Colombo',
    },
  })

  // ---- Knowledge articles ----
  const articles = [
    { title: 'Identifying & Managing Brown Plant Hopper in Paddy', summary: 'A practical guide for rice farmers on recognising BPH outbreaks and timely control measures.', content: 'The Brown Plant Hopper (BPH) is one of the most destructive pests of rice in Sri Lanka. Early signs include hopper burn — yellowing and drying of patches in the centre of the field. Regular field monitoring is essential. Maintain recommended plant spacing, avoid excessive nitrogen application, and avoid the misuse of broad-spectrum insecticides that kill natural enemies. When thresholds are exceeded, apply recommended insecticides strictly as directed by the Department of Agriculture.', category: 'Pest Management', authorName: 'Dr. Anura Perera', tags: 'paddy,pest,bph,rice' },
    { title: 'Organic Compost Preparation at Home', summary: 'Step-by-step method to produce high-quality compost from farm waste.', content: 'Composting converts farm waste into valuable organic manure. Layer green (nitrogen-rich) and brown (carbon-rich) materials, keep moist like a squeezed sponge, and turn every 7–10 days. Mature compost is dark, crumbly, and earthy-smelling. Apply 2–5 tons per hectare to improve soil structure and fertility.', category: 'Soil & Fertility', authorName: 'Prof. Niluka Fernando', tags: 'soil,compost,organic' },
    { title: 'Maha Season Paddy Calendar for Dry Zone', summary: 'A month-by-month cultivation guide for the Maha season in Anuradhapura and surrounding districts.', content: 'Land preparation should begin in late September. Use recommended varieties such as BG 352 or BG 360 for the dry zone. Apply basal fertilizer at 7–10 days after sowing, top-dress at 35–45 days, and monitor water levels closely. Harvest when 85% of grains are golden.', category: 'Cultivation Calendar', authorName: 'Dr. Anura Perera', tags: 'paddy,maha,calendar,dry-zone' },
    { title: 'Safe Use of Pesticides & Sprayer Calibration', summary: 'Protect your health and crop by using pesticides correctly and calibrating your knapsack sprayer.', content: 'Always read the label, wear protective clothing, and observe pre-harvest intervals. Calibrate your sprayer by measuring output over a known area to ensure the correct dose reaches the crop. Never mix pesticides with bare hands and never reuse empty containers.', category: 'Good Practices', authorName: 'Prof. Niluka Fernando', tags: 'pesticide,safety,sprayer' },
    { title: 'Drip Irrigation for Vegetable Plots', summary: 'Conserve water and boost yields with low-cost drip systems for up-country vegetables.', content: 'Drip irrigation delivers water directly to the root zone, reducing evaporation and weed growth. For small plots, a simple gravity-fed system using a raised tank and drip tape is affordable. Filter water to prevent emitter clogging and flush lines monthly.', category: 'Irrigation', authorName: 'Prof. Niluka Fernando', tags: 'irrigation,drip,vegetables' },
    { title: 'Recognising Nutrient Deficiencies in Crops', summary: 'Visual symptoms to identify nitrogen, potassium and micronutrient deficiencies.', content: 'Yellowing of older leaves often signals nitrogen deficiency. Purple coloration may indicate phosphorus deficiency. Potassium deficiency appears as scorching on leaf margins. Confirm with a soil test before applying fertilizers, and follow Department of Agriculture recommendations.', category: 'Soil & Fertility', authorName: 'Dr. Anura Perera', tags: 'nutrient,deficiency,fertilizer' },
  ]
  for (const a of articles) {
    await db.knowledgeArticle.create({ data: a })
  }
  console.log(`  ✓ ${articles.length} knowledge articles`)

  // ---- Product listings ----
  const products = [
    { ownerId: created['enterprise@demo.lk'], title: 'Urea Fertilizer (50kg)', description: 'High-quality imported urea, ideal for paddy and vegetable top-dressing.', category: 'Fertilizer', price: 9500, unit: 'bag', district: 'Kurunegala' },
    { ownerId: created['enterprise@demo.lk'], title: 'Hybrid Paddy Seed BG 352 (25kg)', description: 'Certified seed paddy suitable for dry zone Maha cultivation. High yield potential.', category: 'Seeds', price: 4800, unit: 'bag', district: 'Kurunegala' },
    { ownerId: created['enterprise@demo.lk'], title: 'Knapsack Sprayer 16L', description: 'Manual knapsack sprayer with adjustable nozzle for pesticide and foliar application.', category: 'Equipment', price: 8500, unit: 'unit', district: 'Kurunegala' },
    { ownerId: created['enterprise@demo.lk'], title: 'Drip Irrigation Kit (1 acre)', description: 'Complete drip irrigation kit with filter, mainline and drip tape for 1 acre.', category: 'Irrigation', price: 42000, unit: 'kit', district: 'Kurunegala' },
  ]
  for (const p of products) await db.productListing.create({ data: { ...p, available: true } })

  // ---- Crop listings ----
  const crops = [
    { ownerId: created['farmer@demo.lk'], cropName: 'Rice (Paddy)', variety: 'BG 352 (Nadu)', quantity: 1200, unit: 'kg', district: 'Anuradhapura', askingPrice: 105, grade: 'A' },
    { ownerId: created['farmer@demo.lk'], cropName: 'Big Onion', variety: 'Local Red', quantity: 350, unit: 'kg', district: 'Anuradhapura', askingPrice: 180, grade: 'A' },
    { ownerId: created['farmer2@demo.lk'], cropName: 'Potato', variety: 'Granola', quantity: 800, unit: 'kg', district: 'Kandy', askingPrice: 220, grade: 'A' },
    { ownerId: created['farmer2@demo.lk'], cropName: 'Cabbage', variety: 'Green Express', quantity: 400, unit: 'kg', district: 'Kandy', askingPrice: 90, grade: 'B' },
  ]
  for (const c of crops) {
    await db.cropListing.create({
      data: { ...c, available: true, expectedHarvestDate: new Date(Date.now() + 14 * 86400000) },
    })
  }

  // ---- Service listings ----
  await db.serviceListing.create({ data: { ownerId: created['worker@demo.lk'], title: 'Combine Harvester Rental', description: 'Brand new combine harvester for paddy. Operated by experienced driver.', category: 'Machinery', price: 18000, district: 'Anuradhapura', available: true } })
  await db.serviceListing.create({ data: { ownerId: created['worker@demo.lk'], title: 'Farm Labour — Harvesting', description: 'Skilled labour team for paddy and vegetable harvesting.', category: 'Labour', price: 3500, district: 'Anuradhapura', available: true } })

  // ---- Job listings ----
  await db.jobListing.create({
    data: {
      ownerId: created['farmer@demo.lk'], title: 'Paddy Harvesting Workers Needed',
      description: 'Need 5 workers for paddy harvesting over 3.5 acres. Lunch provided.',
      requiredSkills: 'Harvesting', location: 'Kekirawa, Anuradhapura',
      startDate: new Date(Date.now() + 10 * 86400000), endDate: new Date(Date.now() + 13 * 86400000),
      paymentTerms: 'Daily', wage: 3500, status: 'OPEN',
    },
  })
  await db.jobListing.create({
    data: {
      ownerId: created['farmer2@demo.lk'], title: 'Vegetable Plot Spraying',
      description: 'Experienced sprayer needed for cabbage plot pesticide application.',
      requiredSkills: 'Spraying', location: 'Peradeniya, Kandy',
      startDate: new Date(Date.now() + 5 * 86400000),
      paymentTerms: 'Per task', wage: 5000, status: 'OPEN',
    },
  })

  // ---- Buyer requirements ----
  await db.buyerRequirement.create({
    data: {
      ownerId: created['buyer@demo.lk'], cropName: 'Rice (Paddy)', quantity: 5000, unit: 'kg',
      preferredDistrict: 'Anuradhapura', targetPrice: 110, deliveryReq: 'Colombo warehouse',
      closingDate: new Date(Date.now() + 30 * 86400000), status: 'OPEN',
    },
  })
  await db.buyerRequirement.create({
    data: {
      ownerId: created['buyer@demo.lk'], cropName: 'Big Onion', quantity: 2000, unit: 'kg',
      preferredDistrict: 'Anuradhapura', targetPrice: 190, deliveryReq: 'Colombo',
      closingDate: new Date(Date.now() + 21 * 86400000), status: 'OPEN',
    },
  })

  // ---- A sample case + consultation for demo flow ----
  const sampleCase = await db.agriculturalCase.create({
    data: {
      farmerId: created['farmer@demo.lk'], expertId: created['expert@demo.lk'],
      crop: 'Rice (Paddy)', category: 'PEST', title: 'Yellowing patches in paddy field',
      description: 'Several patches in the centre of my paddy field are turning yellow and drying. Noticed brown insects at the base of the plants.',
      status: 'IN_PROGRESS', district: 'Anuradhapura',
    },
  })
  const consultation = await db.consultation.create({
    data: {
      caseId: sampleCase.id, farmerId: created['farmer@demo.lk'], expertId: created['expert@demo.lk'],
      type: 'CHAT', status: 'ACCEPTED', price: 1500,
    },
  })
  await db.message.create({ data: { consultationId: consultation.id, senderId: created['farmer@demo.lk'], body: 'Good morning doctor, I am seeing yellow patches in my field as described. Could you advise?' } })
  await db.message.create({ data: { consultationId: consultation.id, senderId: created['expert@demo.lk'], body: 'Good morning Saman. From your description this looks like Brown Plant Hopper (BPH) damage. Can you check the base of the tillers for small brown insects?' } })
  await db.message.create({ data: { consultationId: consultation.id, senderId: created['farmer@demo.lk'], body: 'Yes doctor, there are many small brown insects. What should I do now?' } })

  // ---- Notifications ----
  await db.notification.create({ data: { userId: created['farmer@demo.lk'], type: 'CONSULTATION', title: 'Consultation accepted', body: 'Dr. Anura Perera accepted your consultation request.', link: 'cases' } })
  await db.notification.create({ data: { userId: created['expert@demo.lk'], type: 'CASE', title: 'New case assigned', body: 'A paddy pest case from Anuradhapura has been shared with you.', link: 'expert-cases' } })

  // ---- A pending expert verification for admin to review ----
  await db.expertVerification.create({
    data: { expertProfileId: (await db.expertProfile.findUnique({ where: { userId: created['expert@demo.lk'] } }))!.id, documentPath: '/uploads/sample-degree.pdf', note: 'BSc Agriculture certificate', status: 'APPROVED', reviewedBy: created['admin@demo.lk'] },
  })

  console.log('\n✅ Seed complete. Demo accounts (password: password123):')
  console.log('   farmer@demo.lk | expert@demo.lk | enterprise@demo.lk | worker@demo.lk | buyer@demo.lk | admin@demo.lk')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
