import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding GoviSahana Community data with realistic Sri Lankan agricultural posts...')

  const users = await prisma.user.findMany({
    include: {
      farmerProfile: true,
      expertProfile: true,
      enterpriseProfile: true,
    },
  })

  const saman = users.find((u) => u.name.includes('Saman'))
  const kumari = users.find((u) => u.name.includes('Kumari'))
  const drAnura = users.find((u) => u.name.includes('Anura'))
  const profNiluka = users.find((u) => u.name.includes('Niluka'))
  const enterprise = users.find((u) => u.name.includes('GreenGrow'))
  const buyer = users.find((u) => u.name.includes('Ceylon Fresh'))
  const worker = users.find((u) => u.name.includes('Mahinda'))
  const gayara = users.find((u) => u.name.includes('Gayara'))

  if (!saman || !drAnura || !kumari || !profNiluka) {
    console.log('Required users not found. Skipping seed.')
    return
  }

  // 1. Seed Community Profiles for all roles
  await prisma.communityProfile.upsert({
    where: { userId: drAnura.id },
    create: {
      userId: drAnura.id,
      coverUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
      bio: 'Senior Plant Pathologist at Rice Research Station. Advising Sri Lankan farmers on disease management and sustainable IPM practices.',
      district: 'Anuradhapura',
      languages: 'Sinhala, English',
      interests: 'IPM, Bio-control, Plant Pathology, Paddy Soil Health, Pest Forecasting',
      crops: 'Rice (Paddy), Big Onion, Chilli, Maize',
      profession: 'Senior Agricultural Officer & Plant Pathologist',
    },
    update: {
      bio: 'Senior Plant Pathologist at Rice Research Station. Advising Sri Lankan farmers on disease management and sustainable IPM practices.',
      district: 'Anuradhapura',
      crops: 'Rice (Paddy), Big Onion, Chilli, Maize',
    },
  })

  await prisma.communityProfile.upsert({
    where: { userId: saman.id },
    create: {
      userId: saman.id,
      coverUrl: 'https://images.unsplash.com/photo-1592982537447-6f2a6a0c5c1c?auto=format&fit=crop&w=1200&q=80',
      bio: 'Paddy and big onion farmer cultivating 5 acres in Nachchaduwa, Anuradhapura. Passionate about parachute transplanting and high yield varieties.',
      district: 'Anuradhapura',
      languages: 'Sinhala',
      interests: 'Drip Irrigation, High-yield Paddy, Crop Rotation, Soil Conservation',
      crops: 'Rice (Paddy), Big Onion, Chilli',
      profession: 'Commercial Farmer',
    },
    update: {
      bio: 'Paddy and big onion farmer cultivating 5 acres in Nachchaduwa, Anuradhapura. Passionate about parachute transplanting and high yield varieties.',
      district: 'Anuradhapura',
      crops: 'Rice (Paddy), Big Onion, Chilli',
    },
  })

  await prisma.communityProfile.upsert({
    where: { userId: kumari.id },
    create: {
      userId: kumari.id,
      coverUrl: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80',
      bio: 'Highland vegetable grower in Welimada. Specializing in potato seed production, cabbage, and organic vermicompost.',
      district: 'Badulla',
      languages: 'Sinhala, English',
      interests: 'Organic mulching, Seed Potato multiplication, Compost preparation, GAP certification',
      crops: 'Potato, Cabbage, Carrot, Beetroot',
      profession: 'Horticulture Farmer',
    },
    update: {
      bio: 'Highland vegetable grower in Welimada. Specializing in potato seed production, cabbage, and organic vermicompost.',
      district: 'Badulla',
      crops: 'Potato, Cabbage, Carrot, Beetroot',
    },
  })

  await prisma.communityProfile.upsert({
    where: { userId: profNiluka.id },
    create: {
      userId: profNiluka.id,
      coverUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
      bio: 'Professor of Horticulture. Researching poly-tunnel microclimate management, strawberry hydroponics, and precision fertilization.',
      district: 'Kandy',
      languages: 'Sinhala, English, Tamil',
      interests: 'Protected Agriculture, Hydroponics, Foliar Feeding, Substrate Optimization, Climate Control',
      crops: 'Bell Pepper, Tomato, Strawberry, Salad Cucumber',
      profession: 'Professor of Horticulture & Protected Agriculture',
    },
    update: {
      bio: 'Professor of Horticulture. Researching poly-tunnel microclimate management, strawberry hydroponics, and precision fertilization.',
      district: 'Kandy',
      crops: 'Bell Pepper, Tomato, Strawberry, Salad Cucumber',
    },
  })

  if (enterprise) {
    await prisma.communityProfile.upsert({
      where: { userId: enterprise.id },
      create: {
        userId: enterprise.id,
        coverUrl: 'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&w=1200&q=80',
        bio: 'Leading supplier of certified vegetable seeds, drip irrigation equipment, solar insect traps, and bio-fertilizers across Sri Lanka.',
        district: 'Gampaha',
        languages: 'Sinhala, English, Tamil',
        interests: 'Drip Systems, Bio-pesticides, Smart Greenhouses, Precision Sprayers',
        crops: 'All vegetables, Fruits, Floriculture',
        profession: 'Agricultural Input Supplier & Technology Provider',
      },
      update: {},
    })
  }

  if (buyer) {
    await prisma.communityProfile.upsert({
      where: { userId: buyer.id },
      create: {
        userId: buyer.id,
        coverUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=1200&q=80',
        bio: 'Exporting premium Ceylon fresh fruits and vegetables to European and Middle Eastern markets. Sourcing directly from SL-GAP certified farmers.',
        district: 'Colombo',
        languages: 'Sinhala, English, Tamil',
        interests: 'Export Standards, Cold Chain Logistics, SL-GAP Certification, Fair Trade',
        crops: 'Banana, Papaya, Mango, Ginger, Chilli (Nai Miris)',
        profession: 'Fresh Produce Exporter & Wholesaler',
      },
      update: {},
    })
  }

  if (worker) {
    await prisma.communityProfile.upsert({
      where: { userId: worker.id },
      create: {
        userId: worker.id,
        coverUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1200&q=80',
        bio: 'Experienced agricultural machinery operator (Combined Harvester, 4WD Tractor, Rotovator). Available for contract harvesting in North Western and North Central provinces.',
        district: 'Kurunegala',
        languages: 'Sinhala',
        interests: 'Combine Harvesting, Land Preparation, Seed Drill Planting, Precision Tillage',
        crops: 'Rice (Paddy), Maize, Groundnut',
        profession: 'Certified Agricultural Machinery Operator',
      },
      update: {},
    })
  }

  if (gayara) {
    await prisma.communityProfile.upsert({
      where: { userId: gayara.id },
      create: {
        userId: gayara.id,
        coverUrl: 'https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?auto=format&fit=crop&w=1200&q=80',
        bio: 'Urban and peri-urban organic fruit farmer cultivating dragon fruit, passion fruit, and betel leaves in Dalugama, Kelaniya. Exploring drip fertigation and natural bio-stimulants.',
        district: 'Gampaha',
        languages: 'Sinhala, English',
        interests: 'Organic Farming, Dragon Fruit Trellising, Drip Irrigation, Bio-stimulants',
        crops: 'Dragon Fruit, Passion Fruit, Betel, Vegetables',
        profession: 'Progressive Farmer & Agri-enthusiast',
      },
      update: {},
    })
  }

  // Clear existing community interactions to re-seed cleanly
  await prisma.postComment.deleteMany()
  await prisma.postLike.deleteMany()
  await prisma.postSave.deleteMany()
  await prisma.postShare.deleteMany()
  await prisma.communityPost.deleteMany()

  // 2. Seed Posts
  // Post 1: Dr. Anura Perera - Pinned Crop Diseases Alert
  const post1 = await prisma.communityPost.create({
    data: {
      authorId: drAnura.id,
      category: 'CROP_DISEASES',
      content: '🚨 ALERT FOR RAJARATA PADDY FARMERS: We are observing early signs of Brown Planthopper (BPH - Nil Messa) nymph populations in dense stands across Anuradhapura and Polonnaruwa.\n\nKey actions before spraying chemical insecticides:\n1. Drain your field water for 3 to 4 days ("Hisa gala harima"). BPH thrives in humid microclimates near water level.\n2. Avoid heavy nitrogen top-dressing during this phase.\n3. If threshold exceeds 5-10 hoppers per hill, apply approved targeted insect growth regulators instead of broad-spectrum synthetic pyrethroids which kill natural predators like wolf spiders and mirid bugs.\n\nShare your field symptoms below if you notice yellowing base stems or hopper-burn circles.',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#BrownPlanthopper', '#PaddyFarming', '#PlantPathology', '#SriLankaAgri', '#IPM']),
      visibility: 'PUBLIC',
      pinned: true,
      likesCount: 28,
      commentsCount: 3,
      sharesCount: 7,
    },
  })

  // Post 2: Kumari Silva - Success Story
  const post2 = await prisma.communityPost.create({
    data: {
      authorId: kumari.id,
      category: 'SUCCESS_STORIES',
      content: 'Delighted to share our first harvest of Granola seed potatoes in Welimada! We achieved 4.2 metric tons per acre this season by shifting to raised seed beds with straw mulching and drip fertigation. 🥔🌱\n\nZero blight damage observed thanks to preventive copper spray during the high mist period. Thank you to the Department of Agriculture extension officers for regular guidance!',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#PotatoHarvest', '#WelimadaFarmers', '#HighlandAgri', '#FarmerSuccess']),
      visibility: 'PUBLIC',
      likesCount: 36,
      commentsCount: 3,
      sharesCount: 5,
    },
  })

  // Post 3: Saman Bandara - QA Chilli Leaf Curl
  const post3 = await prisma.communityPost.create({
    data: {
      authorId: saman.id,
      category: 'QA',
      content: 'Any fellow chilli growers in Anuradhapura experiencing leaf curl and stunted terminal shoots this week? The leaves are cupping upward and flowers are dropping.\n\nIs this whitefly-transmitted Chilli Leaf Curl Virus or broad mite damage? What organic or bio-pesticide spray has worked best for you in the dry season?',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1592982537447-6f2a6a0c5c1c?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#ChilliCultivation', '#PestAlert', '#DryZoneAgri', '#AskTheCommunity']),
      visibility: 'PUBLIC',
      likesCount: 16,
      commentsCount: 3,
      sharesCount: 2,
    },
  })

  // Post 4: Prof. Niluka Fernando - AgriTech Fertigation
  const post4 = await prisma.communityPost.create({
    data: {
      authorId: profNiluka.id,
      category: 'AGRITECH',
      content: 'Proper fertigation scheduling in protected poly-tunnels: Maintaining EC (Electrical Conductivity) between 1.8 to 2.2 mS/cm and pH between 5.8 - 6.2 during fruit set is critical to prevent Blossom End Rot in bell peppers and greenhouse tomatoes.\n\nEnsure adequate Calcium Nitrate injection during the morning irrigation cycle rather than late evening. High humidity combined with poor airflow reduces calcium transpiration to developing fruit tips.',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#ProtectedAgri', '#Hydroponics', '#BellPepper', '#AgritechSriLanka', '#PrecisionFarming']),
      visibility: 'PUBLIC',
      likesCount: 42,
      commentsCount: 2,
      sharesCount: 11,
    },
  })

  // Post 5: Ceylon Fresh Exports - Market Information
  const post5 = buyer ? await prisma.communityPost.create({
    data: {
      authorId: buyer.id,
      category: 'MARKET_INFO',
      content: '📢 EXPORT SOURCING REQUIREMENT: Ceylon Fresh Exports is now contracting SL-GAP certified farmers for weekly supply of:\n- Cavendish Bananas (minimum 7-8 inch fingers, clean skin)\n- Fresh Ginger (Rangoon/Local, washed & dried)\n- Nai Miris / Scotch Bonnet (Dark green, 3-4cm)\n\nWe provide guaranteed floor prices, prompt payments within 48 hours, and returnable plastic crates. Drop-off locations available in Dambulla, Welimada, and Peliyagoda central warehouse. Contact us directly or connect on GoviSahana!',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#AgriExport', '#ProduceBuyers', '#BananaExport', '#SLGAP', '#SriLankaFarmers']),
      visibility: 'PUBLIC',
      likesCount: 51,
      commentsCount: 4,
      sharesCount: 16,
    },
  }) : null

  // Post 6: Mahinda Gunasena - Harvesting Service
  const post6 = worker ? await prisma.communityPost.create({
    data: {
      authorId: worker.id,
      category: 'HARVESTING',
      content: '🌾 Combined Harvester (Kubota DC-70 Plus) booking now open for the Maha paddy harvesting season in Kurunegala, Wariyapola, and Galgamuwa areas.\n\n- Low ground pressure crawler tracks suitable for soft muddy fields.\n- Grain separation loss guaranteed below 1.5%.\n- Digital paddy moisture check conducted before harvesting to prevent post-harvest spoilage.\n\nBook your field plot 3 to 5 days in advance so we can organize the logistics smoothly.',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#PaddyHarvesting', '#HarvesterBooking', '#KurunegalaAgri', '#FarmMachinery']),
      visibility: 'PUBLIC',
      likesCount: 23,
      commentsCount: 2,
      sharesCount: 6,
    },
  }) : null

  // Post 7: GreenGrow Supplies - AgriTech
  const post7 = enterprise ? await prisma.communityPost.create({
    data: {
      authorId: enterprise.id,
      category: 'AGRITECH',
      content: '☀️ Solar-Powered Insect Traps are now in stock! Tested in collaboration with Mahailluppallama Field Crop Research Station.\n\nThese automated traps turn on automatically at dusk, using UV frequency wavelengths that specifically attract harmful moths, armyworms, and stem borers into an enclosed water basin, while leaving beneficial pollinators unharmed. Zero electricity bill, zero chemical pesticide residue!',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#SolarAgri', '#EcoFriendlyPestControl', '#GreenGrow', '#AgriTech']),
      visibility: 'PUBLIC',
      likesCount: 31,
      commentsCount: 3,
      sharesCount: 8,
    },
  }) : null

  // Post 8: Prof. Niluka Fernando - Research Innovation
  const post8 = await prisma.communityPost.create({
    data: {
      authorId: profNiluka.id,
      category: 'RESEARCH',
      content: '🔬 Recent trial findings on Biochar Soil Amendments: In our 2-year trial in Jaffna and Puttalam sandy loam soils, incorporating rice husk biochar at 5 tons/ha increased soil organic carbon by 40% and improved water retention by 28% during prolonged dry spells.\n\nMicrobial respiration tests showed a 2.4x surge in mycorrhizal colonization. This is a game-changer for cost-effective drought resilience in dry zone horticulture.',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1584473457406-6240486418e9?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#SoilScience', '#Biochar', '#AgriResearch', '#DroughtResilience']),
      visibility: 'PUBLIC',
      likesCount: 35,
      commentsCount: 2,
      sharesCount: 12,
    },
  })

  // Post 9: Gayara Rashmika - Cultivation Techniques
  const post9 = gayara ? await prisma.communityPost.create({
    data: {
      authorId: gayara.id,
      category: 'CULTIVATION',
      content: 'Sharing progress from our peri-urban organic fruit plot in Kelaniya! 🐉🌸\n\nFor dragon fruit, we installed T-trellis concrete posts and switched to drip irrigation with a monthly feed of composted cow dung mixed with crushed neem seed cake and wood ash. Pruning weak hanging branches last month spurred a fresh flush of flowering buds this week!\n\nHappy to connect with fellow dragon fruit and passion fruit growers around Western province.',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#DragonFruit', '#OrganicFarming', '#KelaniyaAgri', '#DripIrrigation']),
      visibility: 'PUBLIC',
      likesCount: 27,
      commentsCount: 3,
      sharesCount: 4,
    },
  }) : null

  // Post 10: Saman Bandara - Cultivation Parachute Transplanting
  const post10 = await prisma.communityPost.create({
    data: {
      authorId: saman.id,
      category: 'CULTIVATION',
      content: 'We tested the Parachute Transplanting Method ("Parachute Thawan Kramaya") for Bg 358 paddy this season across 2 acres in Nachchaduwa. \n\nResults so far:\n- Seed requirement dropped from 35kg/acre (broadcasting) to just 12kg/acre in nursery trays.\n- Seedlings established without root shock.\n- Tillers per hill average 18 to 22 compared to 10 in direct broadcasting.\n- Weeding was much easier.\n\nVery happy with this cost-saving technique!',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#ParachuteTransplanting', '#PaddyCultivation', '#SmartFarming', '#Nachchaduwa']),
      visibility: 'PUBLIC',
      likesCount: 44,
      commentsCount: 4,
      sharesCount: 14,
    },
  })

  // Post 11: Kumari Silva - Farming Experiences
  const post11 = await prisma.communityPost.create({
    data: {
      authorId: kumari.id,
      category: 'EXPERIENCES',
      content: 'Reflecting on our 3-year journey moving our 1.5-acre highland farm towards regenerative soil health: In Year 1, stopping synthetic chemical inputs was scary and yield dipped about 10%. But we persevered with green manuring (sunn hemp), vermiwash, and fermented fruit juice (FFJ).\n\nToday in Year 3, our soil is soft, full of earthworms, and our net profit is higher than before because our input bills dropped by 65%. Quality of produce is so much crisper and sweet. Don\'t lose hope during the transition phase!',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#RegenerativeAgri', '#SoilHealth', '#OrganicSriLanka', '#FarmerJourney']),
      visibility: 'PUBLIC',
      likesCount: 62,
      commentsCount: 5,
      sharesCount: 19,
    },
  })

  // Post 12: Dr. Anura Perera - Crop Diseases Diagnostic Guide
  const post12 = await prisma.communityPost.create({
    data: {
      authorId: drAnura.id,
      category: 'CROP_DISEASES',
      content: '🌾 Diagnostic tip: How to differentiate Bacterial Leaf Blight (BLB) from Paddy Sheath Blight:\n\n1. Bacterial Leaf Blight (Xanthomonas oryzae):\n- Lesions begin at leaf margins near the tip and run wavy along the edge.\n- Lesions turn dull straw yellow, then dry to paper white.\n- In early morning dews, tiny yellow bacterial ooze droplets form on young lesions.\n\n2. Sheath Blight (Rhizoctonia solani):\n- Oval greenish-gray lesions appear on leaf sheaths just above the water level.\n- Lesions expand into irregular spots with dark brown margins (snake-skin appearance).\n\nIf you see BLB, avoid urea top-dressing and keep field water shallow. For sheath blight, spray validamycin or copper fungicide targeted at the stem base.',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#PlantPathology', '#RiceDiseases', '#BacterialLeafBlight', '#SheathBlight', '#ExpertAdvice']),
      visibility: 'PUBLIC',
      likesCount: 47,
      commentsCount: 3,
      sharesCount: 15,
    },
  })

  // Post 13: Saman Bandara - Quote Share of Kumari's potato harvest
  const post13 = await prisma.communityPost.create({
    data: {
      authorId: saman.id,
      category: 'SUCCESS_STORIES',
      content: 'Huge congratulations to Kumari Silva sister! Truly inspiring harvest from Welimada. Looking forward to connecting and sourcing some certified seed potatoes for trial planting in our high beds next season! 👏🥔',
      sharedPostId: post2.id,
      sharedCaption: 'Huge congratulations Kumari sister! Inspiring results from Welimada.',
      hashtags: JSON.stringify(['#FarmerCommunity', '#SriLankaAgriculture', '#PeerLearning']),
      visibility: 'PUBLIC',
      likesCount: 19,
      commentsCount: 2,
      sharesCount: 3,
    },
  })

  // 3. Seed Comments and Threaded Replies
  // Comments on Post 1 (BPH alert)
  const c1 = await prisma.postComment.create({
    data: {
      postId: post1.id,
      authorId: saman.id,
      content: 'Dr. Anura, thank you for this timely alert! In Nachchaduwa we had 2 days of rain and noticed slight hopper aggregation near the bunds. Draining the field today as advised.',
    },
  })

  await prisma.postComment.create({
    data: {
      postId: post1.id,
      authorId: drAnura.id,
      parentId: c1.id,
      content: 'Excellent decision Saman. Keep the field drained until soil cracks slightly, then re-flood with a shallow 2cm water layer. Monitor closely.',
    },
  })

  if (gayara) {
    await prisma.postComment.create({
      data: {
        postId: post1.id,
        authorId: gayara.id,
        content: 'Very valuable advice Dr. Anura. Does neem oil formulation help suppress egg hatching if nymphs are just emerging?',
      },
    })
  }

  // Comments on Post 2 (Potato harvest)
  const c2 = await prisma.postComment.create({
    data: {
      postId: post2.id,
      authorId: drAnura.id,
      content: 'Well done Kumari! Proper spacing on raised beds ensures good soil aeration which naturally inhibits fungal spore proliferation. Keep up the high standard.',
    },
  })

  if (buyer) {
    await prisma.postComment.create({
      data: {
        postId: post2.id,
        authorId: buyer.id,
        content: 'Excellent quality Kumari! We are purchasing Grade A table potatoes for supermarket distribution. Sending you a direct message to discuss volumes.',
      },
    })
  }

  // Comments on Post 3 (Chilli leaf curl QA)
  await prisma.postComment.create({
    data: {
      postId: post3.id,
      authorId: drAnura.id,
      content: 'Saman, upward leaf curling in dry weather is typically caused by Chilli Thrips (Scirtothrips dorsalis), whereas downward curling is broad mites. Inspect underside with a 10x hand lens. Spray neem seed kernel extract (NSKE 5%) or mineral oil in early mornings.',
    },
  })

  if (enterprise) {
    await prisma.postComment.create({
      data: {
        postId: post3.id,
        authorId: enterprise.id,
        content: 'Saman, we also have bio-certified botanical pest oil sprays in stock at Dambulla branch that are effective against thrips without killing beneficial ladybird beetles.',
      },
    })
  }

  // Comments on Post 5 (Ceylon Fresh Exports Market Info)
  await prisma.postComment.create({
    data: {
      postId: post5 ? post5.id : post1.id,
      authorId: kumari.id,
      content: 'Very glad to see export demand for SL-GAP produce. We are preparing our registration documents for the upcoming audit.',
    },
  })

  // Comments on Post 10 (Parachute transplanting)
  await prisma.postComment.create({
    data: {
      postId: post10.id,
      authorId: drAnura.id,
      content: 'Parachute transplanting is one of the most effective labour and seed-saving methods recommended by RRDI Batalagoda. Great to see Rajarata farmers adopting it with measurable yield improvements!',
    },
  })

  // 4. Seed Likes across posts
  await prisma.postLike.createMany({
    data: [
      { postId: post1.id, userId: saman.id },
      { postId: post1.id, userId: kumari.id },
      { postId: post1.id, userId: profNiluka.id },
      { postId: post2.id, userId: saman.id },
      { postId: post2.id, userId: drAnura.id },
      { postId: post2.id, userId: profNiluka.id },
      { postId: post3.id, userId: drAnura.id },
      { postId: post3.id, userId: kumari.id },
      { postId: post4.id, userId: saman.id },
      { postId: post4.id, userId: kumari.id },
      { postId: post4.id, userId: drAnura.id },
      { postId: post10.id, userId: drAnura.id },
      { postId: post10.id, userId: kumari.id },
      { postId: post11.id, userId: saman.id },
      { postId: post11.id, userId: drAnura.id },
      { postId: post11.id, userId: profNiluka.id },
      { postId: post12.id, userId: saman.id },
      { postId: post12.id, userId: kumari.id },
      { postId: post13.id, userId: kumari.id },
      { postId: post13.id, userId: drAnura.id },
      ...(buyer && post5 ? [{ postId: post5.id, userId: saman.id }, { postId: post5.id, userId: kumari.id }] : []),
      ...(worker && post6 ? [{ postId: post6.id, userId: saman.id }] : []),
      ...(enterprise && post7 ? [{ postId: post7.id, userId: saman.id }, { postId: post7.id, userId: profNiluka.id }] : []),
      ...(gayara && post9 ? [{ postId: post9.id, userId: saman.id }, { postId: post9.id, userId: drAnura.id }] : []),
    ],
  })

  // 5. Seed Post Saves (Bookmarks)
  await prisma.postSave.createMany({
    data: [
      { postId: post1.id, userId: saman.id },
      { postId: post4.id, userId: kumari.id },
      { postId: post12.id, userId: saman.id },
      ...(post5 ? [{ postId: post5.id, userId: kumari.id }] : []),
      ...(gayara ? [{ postId: post10.id, userId: gayara.id }] : []),
    ],
  })

  // 6. Seed Connections (Friend requests)
  await prisma.friendRequest.deleteMany()
  await prisma.friendRequest.createMany({
    data: [
      { senderId: saman.id, receiverId: drAnura.id, status: 'ACCEPTED' },
      { senderId: kumari.id, receiverId: profNiluka.id, status: 'ACCEPTED' },
      { senderId: kumari.id, receiverId: saman.id, status: 'ACCEPTED' },
      ...(worker ? [{ senderId: worker.id, receiverId: saman.id, status: 'ACCEPTED' }] : []),
      ...(buyer ? [{ senderId: buyer.id, receiverId: kumari.id, status: 'ACCEPTED' }] : []),
      ...(gayara ? [{ senderId: gayara.id, receiverId: saman.id, status: 'ACCEPTED' }] : []),
      ...(gayara ? [{ senderId: gayara.id, receiverId: drAnura.id, status: 'ACCEPTED' }] : []),
      ...(enterprise ? [{ senderId: enterprise.id, receiverId: profNiluka.id, status: 'ACCEPTED' }] : []),
    ],
  })

  // 7. Seed Follows
  await prisma.userFollow.deleteMany()
  await prisma.userFollow.createMany({
    data: [
      { followerId: saman.id, followingId: drAnura.id },
      { followerId: saman.id, followingId: profNiluka.id },
      { followerId: kumari.id, followingId: drAnura.id },
      { followerId: kumari.id, followingId: profNiluka.id },
      ...(buyer ? [{ followerId: saman.id, followingId: buyer.id }, { followerId: kumari.id, followingId: buyer.id }] : []),
      ...(gayara ? [{ followerId: gayara.id, followingId: drAnura.id }, { followerId: gayara.id, followingId: saman.id }] : []),
      ...(worker ? [{ followerId: worker.id, followingId: saman.id }] : []),
    ],
  })

  // 8. Seed Direct Message Conversations
  await prisma.directMessage.deleteMany()
  await prisma.directConversation.deleteMany()

  // Conversation 1: Saman & Dr. Anura
  const [u1, u2] = saman.id < drAnura.id ? [saman.id, drAnura.id] : [drAnura.id, saman.id]
  const conv1 = await prisma.directConversation.create({
    data: {
      user1Id: u1,
      user2Id: u2,
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 15),
    },
  })

  await prisma.directMessage.createMany({
    data: [
      {
        conversationId: conv1.id,
        senderId: saman.id,
        body: 'Ayubowan Dr. Anura, our paddy field is looking green and healthy after following your soil nutrition schedule. Thank you!',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
      {
        conversationId: conv1.id,
        senderId: drAnura.id,
        body: 'Ayubowan Saman! Very glad to hear. Remember to inspect the panicle initiation stage in 10 days for any stem borer presence.',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60),
      },
      {
        conversationId: conv1.id,
        senderId: saman.id,
        body: 'Will do doctor. I noticed slight hopper activity near the edge so I drained the water today as per your post alert.',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
      },
    ],
  })

  // Conversation 2: Kumari & Ceylon Fresh Exports (Buyer)
  if (buyer) {
    const [b1, b2] = kumari.id < buyer.id ? [kumari.id, buyer.id] : [buyer.id, kumari.id]
    const conv2 = await prisma.directConversation.create({
      data: {
        user1Id: b1,
        user2Id: b2,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 45),
      },
    })

    await prisma.directMessage.createMany({
      data: [
        {
          conversationId: conv2.id,
          senderId: buyer.id,
          body: 'Hello Kumari, we saw your potato harvest post. We are interested in procuring 2 tons of Grade A potatoes weekly for Colombo supermarkets. Can we discuss your pricing?',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 120),
        },
        {
          conversationId: conv2.id,
          senderId: kumari.id,
          body: 'Hello Ceylon Fresh team! Yes, we have sorted Grade A Granola potatoes ready for pickup in Welimada. We can supply up to 3 tons next week.',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 45),
        },
      ],
    })
  }

  // Conversation 3: Gayara & Dr. Anura
  if (gayara) {
    const [g1, g2] = gayara.id < drAnura.id ? [gayara.id, drAnura.id] : [drAnura.id, gayara.id]
    const conv3 = await prisma.directConversation.create({
      data: {
        user1Id: g1,
        user2Id: g2,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 5),
      },
    })

    await prisma.directMessage.createMany({
      data: [
        {
          conversationId: conv3.id,
          senderId: gayara.id,
          body: 'Dr. Anura, could you recommend the best bio-fungicide for passion fruit scab disease during rainy spells in Kelaniya?',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 30),
        },
        {
          conversationId: conv3.id,
          senderId: drAnura.id,
          body: 'Ayubowan Gayara! For passion fruit scab (Cladosporium oxysporum), apply Trichoderma viride bio-fungicide preventative spray or copper oxychloride at 2g/L. Ensure good canopy pruning for air circulation.',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 5),
        },
      ],
    })
  }

  console.log('✅ GoviSahana Community seeded with 13 realistic agricultural posts, comments, likes, saves, connections, and direct messages!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
