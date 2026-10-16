import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding GoviSahana Community data...')

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

  if (!saman || !drAnura || !kumari || !profNiluka) {
    console.log('Required users not found. Skipping seed.')
    return
  }

  // 1. Seed Community Profiles
  await prisma.communityProfile.upsert({
    where: { userId: drAnura.id },
    create: {
      userId: drAnura.id,
      coverUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
      bio: 'Senior Plant Pathologist at Rice Research Station. Advising Sri Lankan farmers on disease management and sustainable IPM practices.',
      district: 'Anuradhapura',
      languages: 'Sinhala, English',
      interests: 'IPM, Bio-control, Plant Pathology, Paddy Soil Health',
      crops: 'Rice (Paddy), Big Onion, Chilli, Maize',
      profession: 'Senior Agricultural Officer & Plant Pathologist',
    },
    update: {},
  })

  await prisma.communityProfile.upsert({
    where: { userId: saman.id },
    create: {
      userId: saman.id,
      coverUrl: 'https://images.unsplash.com/photo-1592982537447-6f2a6a0c5c1c?auto=format&fit=crop&w=1200&q=80',
      bio: 'Paddy and big onion farmer cultivating 5 acres in Nachchaduwa, Anuradhapura. Passionate about modern irrigation and high yield varieties.',
      district: 'Anuradhapura',
      languages: 'Sinhala',
      interests: 'Drip Irrigation, High-yield Paddy, Crop Rotation',
      crops: 'Rice (Paddy), Big Onion, Chilli',
      profession: 'Commercial Farmer',
    },
    update: {},
  })

  await prisma.communityProfile.upsert({
    where: { userId: kumari.id },
    create: {
      userId: kumari.id,
      coverUrl: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80',
      bio: 'Highland vegetable grower in Welimada. Specializing in potato seed production, cabbage, and organic vermicompost.',
      district: 'Badulla',
      languages: 'Sinhala, English',
      interests: 'Organic mulching, Seed Potato multiplication, Compost preparation',
      crops: 'Potato, Cabbage, Carrot, Beetroot',
      profession: 'Horticulture Farmer',
    },
    update: {},
  })

  await prisma.communityProfile.upsert({
    where: { userId: profNiluka.id },
    create: {
      userId: profNiluka.id,
      coverUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
      bio: 'Professor of Horticulture. Researching poly-tunnel microclimate management, strawberry hydroponics, and precision fertilization.',
      district: 'Kandy',
      languages: 'Sinhala, English, Tamil',
      interests: 'Protected Agriculture, Hydroponics, Foliar Feeding, Substrate Optimization',
      crops: 'Bell Pepper, Tomato, Strawberry, Salad Cucumber',
      profession: 'Professor of Horticulture & Protected Agriculture',
    },
    update: {},
  })

  // Clear existing community posts to ensure clean idempotent seed
  await prisma.postComment.deleteMany()
  await prisma.postLike.deleteMany()
  await prisma.postSave.deleteMany()
  await prisma.postShare.deleteMany()
  await prisma.communityPost.deleteMany()

  // 2. Seed Posts
  const post1 = await prisma.communityPost.create({
    data: {
      authorId: drAnura.id,
      category: 'CROP_DISEASES',
      content: '🚨 ALERT FOR RAJAGATA PADDY FARMERS: We are observing early signs of Brown Planthopper (BPH - Nil Messa) nymph populations in wet zones and dense stands. \n\nBefore spraying chemical insecticides, drain your field water for 3 to 4 days ("Hisa gala harima"). Avoid heavy nitrogen top-dressing. If threshold exceeds 5-10 hoppers per hill, apply approved targeted insect growth regulators instead of broad-spectrum synthetic pyrethroids which kill natural predators like wolf spiders and mirid bugs. \n\nShare your field symptoms below if you notice yellowing base stems.',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#BrownPlanthopper', '#PaddyFarming', '#PlantPathology', '#SriLankaAgri']),
      visibility: 'PUBLIC',
      pinned: true,
      likesCount: 18,
      commentsCount: 3,
      sharesCount: 5,
    },
  })

  const post2 = await prisma.communityPost.create({
    data: {
      authorId: kumari.id,
      category: 'SUCCESS_STORIES',
      content: 'Delighted to share our first harvest of Granola seed potatoes in Welimada! We achieved 4.2 metric tons per acre this season by shifting to raised seed beds with straw mulching and drip fertigation. \n\nZero blight damage observed thanks to preventive copper spray during the high mist period. Thank you to the Department of Agriculture extension officers for regular guidance! 🌱🥔',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#PotatoHarvest', '#WelimadaFarmers', '#HighlandAgri', '#FarmerSuccess']),
      visibility: 'PUBLIC',
      likesCount: 24,
      commentsCount: 2,
      sharesCount: 3,
    },
  })

  const post3 = await prisma.communityPost.create({
    data: {
      authorId: saman.id,
      category: 'QA',
      content: 'Any fellow chilli growers in Anuradhapura experiencing leaf curl and stunted terminal shoots this week? The leaves are cupping upward and flowers are dropping. \n\nIs this whitefly-transmitted Chilli Leaf Curl Virus or broad mite damage? What organic or bio-pesticide spray has worked best for you in the dry season?',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1592982537447-6f2a6a0c5c1c?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#ChilliCultivation', '#PestAlert', '#DryZoneAgri', '#AskTheCommunity']),
      visibility: 'PUBLIC',
      likesCount: 9,
      commentsCount: 2,
      sharesCount: 1,
    },
  })

  const post4 = await prisma.communityPost.create({
    data: {
      authorId: profNiluka.id,
      category: 'AGRITECH',
      content: 'Proper fertigation scheduling in protected poly-tunnels: Maintaining EC (Electrical Conductivity) between 1.8 to 2.2 mS/cm and pH between 5.8 - 6.2 during fruit set is critical to prevent Blossom End Rot in bell peppers and tomatoes. \n\nEnsure adequate Calcium Nitrate injection during the morning irrigation cycle rather than late evening. High humidity combined with poor airflow reduces calcium transpiration to developing fruit tips.',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
      ]),
      hashtags: JSON.stringify(['#ProtectedAgri', '#Hydroponics', '#BellPepper', '#AgritechSriLanka']),
      visibility: 'PUBLIC',
      likesCount: 31,
      commentsCount: 1,
      sharesCount: 8,
    },
  })

  // 3. Seed Comments
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

  await prisma.postComment.create({
    data: {
      postId: post3.id,
      authorId: drAnura.id,
      content: 'Saman, upward leaf curling in dry weather is typically caused by Chilli Thrips (Scirtothrips dorsalis), whereas downward curling is broad mites. Inspect underside with a 10x hand lens. Spray neem seed kernel extract (NSKE 5%) or mineral oil in early mornings.',
    },
  })

  // 4. Seed Likes
  await prisma.postLike.createMany({
    data: [
      { postId: post1.id, userId: saman.id },
      { postId: post1.id, userId: kumari.id },
      { postId: post2.id, userId: saman.id },
      { postId: post2.id, userId: drAnura.id },
      { postId: post3.id, userId: drAnura.id },
      { postId: post4.id, userId: saman.id },
      { postId: post4.id, userId: kumari.id },
    ],
  })

  // 5. Seed Connections (Friend requests)
  await prisma.friendRequest.deleteMany()
  await prisma.friendRequest.createMany({
    data: [
      { senderId: saman.id, receiverId: drAnura.id, status: 'ACCEPTED' },
      { senderId: kumari.id, receiverId: profNiluka.id, status: 'ACCEPTED' },
      { senderId: kumari.id, receiverId: saman.id, status: 'ACCEPTED' },
      { senderId: worker ? worker.id : drAnura.id, receiverId: saman.id, status: 'PENDING' },
    ],
  })

  // 6. Seed Follows
  await prisma.userFollow.deleteMany()
  await prisma.userFollow.createMany({
    data: [
      { followerId: saman.id, followingId: drAnura.id },
      { followerId: saman.id, followingId: profNiluka.id },
      { followerId: kumari.id, followingId: drAnura.id },
      { followerId: kumari.id, followingId: profNiluka.id },
    ],
  })

  // 7. Seed Direct Message Conversation
  await prisma.directMessage.deleteMany()
  await prisma.directConversation.deleteMany()

  const [u1, u2] = saman.id < drAnura.id ? [saman.id, drAnura.id] : [drAnura.id, saman.id]
  const conv = await prisma.directConversation.create({
    data: {
      user1Id: u1,
      user2Id: u2,
      lastMessageAt: new Date(),
    },
  })

  await prisma.directMessage.createMany({
    data: [
      {
        conversationId: conv.id,
        senderId: saman.id,
        body: 'Ayubowan Dr. Anura, my paddy field is looking healthy after following your soil nutrition schedule. Thank you!',
        read: true,
      },
      {
        conversationId: conv.id,
        senderId: drAnura.id,
        body: 'Ayubowan Saman! Glad to hear. Remember to inspect the panicle initiation stage in 10 days for any stem borer presence.',
        read: false,
      },
    ],
  })

  console.log('✅ GoviSahana Community seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
