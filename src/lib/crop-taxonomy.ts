export type CropCategory = {
  id: string
  name: string
  nameSi: string
  nameTa: string
  examples: string
  examplesSi?: string
  examplesTa?: string
  imageUrl: string
  badgeText?: string
  commonCrops: string[]
}

export const CROP_CATEGORIES: CropCategory[] = [
  {
    id: 'Coconuts',
    name: 'Coconuts',
    nameSi: 'පොල් සහ තැඹිලි',
    nameTa: 'தேங்காய் மற்றும் இளநீர்',
    examples: 'Fresh tall coconuts, Sweet King coconut (Thambili), Copra, Seed nuts',
    examplesSi: 'වගා පොල්, තැඹිලි, කොප්පරා, බීජ පොල්',
    examplesTa: 'தேங்காய், இளநீர், கொப்பரா, விதை தேங்காய்',
    imageUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=256&q=80',
    commonCrops: ['Fresh Coconuts', 'King Coconut (Thambili)', 'Copra', 'Coconut Seedlings'],
  },
  {
    id: 'Vegetables',
    name: 'Vegetables',
    nameSi: 'එළවළු වර්ග',
    nameTa: 'காய்கறிகள்',
    examples: 'Tomatoes, Carrots, Leeks, Green capsicum, Beans, Cabbage, Thumba Karawila',
    examplesSi: 'තක්කාලි, කැරට්, ලීක්ස්, මාළු මිරිස්, බෝංචි, ගෝවා, තුඹ කරවිල',
    examplesTa: 'தக்காளி, கேரட், லீக்ஸ், குடைமிளகாய், பீன்ஸ், முட்டைக்கோஸ்',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=256&q=80',
    commonCrops: ['Tomatoes', 'Carrots', 'Leeks', 'Capsicum', 'Beans', 'Cabbage', 'Bitter Gourd', 'Brinjal', 'Pumpkin'],
  },
  {
    id: 'Fruits',
    name: 'Fruits',
    nameSi: 'පලතුරු වර්ග',
    nameTa: 'பழங்கள்',
    examples: 'Red Lady Papaya, Cavendish Bananas, Mauritius Pineapple, Mangoes, Guava',
    examplesSi: 'පැපොල්, කෙසෙල්, අන්නාසි, අඹ, පේර, පැෂන් ෆෘට්',
    examplesTa: 'பப்பாளி, வாழைப்பழம், அன்னாசி, மாம்பழம், கொய்யா',
    imageUrl: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=256&q=80',
    commonCrops: ['Bananas', 'Papaya', 'Pineapple', 'Mango', 'Watermelon', 'Passion Fruit', 'Guava', 'Avocado'],
  },
  {
    id: 'Spices',
    name: 'Spices',
    nameSi: 'කුළුබඩු වර්ග',
    nameTa: 'மசாலாப் பொருட்கள்',
    examples: 'True Ceylon Cinnamon, High-density Black Pepper, Cardamom, Dried Cloves, Nutmeg',
    examplesSi: 'සත්‍ය කුරුඳු, කළු ගම්මිරිස්, එනසාල්, කරාබුනැටි, සාදික්කා',
    examplesTa: 'இலவங்கப்பட்டை, மிளகு, ஏலக்காய், கிராம்பு, ஜாதிக்காய்',
    imageUrl: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=256&q=80',
    commonCrops: ['Ceylon Cinnamon', 'Black Pepper', 'Cardamom', 'Cloves', 'Nutmeg', 'Turmeric', 'Ginger'],
  },
  {
    id: 'Rice and Paddy',
    name: 'Rice and Paddy',
    nameSi: 'වී සහ සහල්',
    nameTa: 'நெல் மற்றும் அரிசி',
    examples: 'Keeri Samba, Nadu, Samba, Ancient Suwandel, Red Raw (Kekulu), White Raw',
    examplesSi: 'කීරි සම්බා, නාඩු වී, සුවඳැල් සහල්, රතු කැකුළු, සුදු කැකුළු',
    examplesTa: 'கீரி சம்பா, நாடு நெல், சுவந்தல், சிவப்பு அரிசி, வெள்ளை அரிசி',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=256&q=80',
    commonCrops: ['Keeri Samba Paddy', 'Nadu Paddy', 'Traditional Suwandel Rice', 'Red Raw Rice', 'White Raw Rice'],
  },
  {
    id: 'Tea',
    name: 'Tea',
    nameSi: 'තේ දළු සහ තේ',
    nameTa: 'தேயிலை மற்றும் தேநீர்',
    examples: 'Up-country tender green leaf, Artisanal Ruhuna BOPF black tea, CTC, High elevation clonal',
    examplesSi: 'උඩරට අමු තේ දළු, රුහුණු කළු තේ, බොපි ස්පෙෂල්, හරිත තේ',
    examplesTa: 'உயர்நில பச்சை தேயிலை, ருஹுனு கருப்பு தேநீர், சிறப்பு தேநீர்',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=256&q=80',
    commonCrops: ['Green Leaf Tea', 'High-Grown BOPF', 'Low-Grown Black Tea', 'Organic Green Tea'],
  },
  {
    id: 'Rubber',
    name: 'Rubber',
    nameSi: 'රබර් ෂීට් සහ දියර රබර්',
    nameTa: 'ரப்பர் தாள்கள் மற்றும் பால்',
    examples: 'Ribbed Smoked Sheets (RSS 1 / RSS 2), Centrifuged 60% DRC Latex, Scrap rubber',
    examplesSi: 'දුම් ගැසූ රබර් ෂීට් (RSS 1), කිරි රබර් (Latex 60%), ස්ක්‍රැප් රබර්',
    examplesTa: 'ரப்பர் தாள்கள் (RSS 1), ரப்பர் பால் (Latex 60%), ஸ்கிராப் ரப்பர்',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=256&q=80',
    commonCrops: ['Ribbed Smoked Sheets (RSS 1)', 'Natural Latex 60%', 'Sheet Rubber (RSS 2)', 'Skim Crepe'],
  },
  {
    id: 'Grains and Pulses',
    name: 'Grains and Pulses',
    nameSi: 'ධාන්‍ය සහ පියලි බෝග',
    nameTa: 'தானியங்கள் மற்றும் பருப்பு வகைகள்',
    examples: 'Finger Millet (Kurakkan), Green Gram (Mung), Dried Corn/Maize, Cowpea, Soya beans',
    examplesSi: 'කුරක්කන්, මුං ඇට, ඉරිඟු, කවුපි, සෝයා බෝංචි',
    examplesTa: 'கேழ்வரகு, பாசிப்பயறு, மக்காச்சோளம், தட்டப்பயறு, சோயா',
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=256&q=80',
    commonCrops: ['Finger Millet (Kurakkan)', 'Green Gram (Mung)', 'Yellow Maize', 'Cowpea', 'Soybean'],
  },
  {
    id: 'Root Crops and Tubers',
    name: 'Root Crops and Tubers',
    nameSi: 'අල සහ බතල බෝග',
    nameTa: 'கிழங்கு வகைகள்',
    examples: 'Welimada Seed Potatoes, Kiribaduma Cassava/Manioc, Red Sweet Potatoes, Innala, Kiriala',
    examplesSi: 'වැලිමඩ අර්තාපල්, මඤ්ඤොක්කා, රතු බතල, ඉන්නල, කිරියල',
    examplesTa: 'உருளைக்கிழங்கு, மரவள்ளிக்கிழங்கு, சர்க்கரைவள்ளிக்கிழங்கு, கூர்க்கன் கிழங்கு',
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=256&q=80',
    commonCrops: ['Potatoes', 'Cassava (Manioc)', 'Sweet Potato', 'Innala', 'Taro (Kiriala)'],
  },
  {
    id: 'Other Crops',
    name: 'Other Crops',
    nameSi: 'වෙනත් වගා සහ බෝග',
    nameTa: 'பிற பயிர்கள்',
    examples: 'Export grade Betel leaves (Bulath), Oyster Mushrooms, Raw Ginger, Turmeric, Arecanut',
    examplesSi: 'බුලත්, පිදුරු බිම්මල්, අමු ඉඟුරු, කහ, පුවක්',
    examplesTa: 'வெற்றிலை, காளான், இஞ்சி, மஞ்சள், பாக்கு',
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=256&q=80',
    commonCrops: ['Betel Leaves', 'Oyster Mushrooms', 'Fresh Ginger', 'Turmeric', 'Arecanut'],
  },
]

export const PRESET_CROP_PHOTOS = [
  { label: 'Fresh Tomatoes', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cherry Tomatoes', url: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb7?auto=format&fit=crop&w=800&q=80' },
  { label: 'Fresh Coconuts', url: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80' },
  { label: 'King Coconut', url: 'https://images.unsplash.com/photo-1543083477-4f785aeafaa9?auto=format&fit=crop&w=800&q=80' },
  { label: 'Carrots', url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80' },
  { label: 'Capsicum', url: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=800&q=80' },
  { label: 'Leeks', url: 'https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?auto=format&fit=crop&w=800&q=80' },
  { label: 'Papaya', url: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=800&q=80' },
  { label: 'Bananas', url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Pineapples', url: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=800&q=80' },
  { label: 'Ceylon Cinnamon', url: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=800&q=80' },
  { label: 'Black Pepper', url: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cardamom', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Paddy / Rice', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80' },
  { label: 'Green Leaf Tea', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80' },
  { label: 'Rubber Sheets', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80' },
  { label: 'Corn / Maize', url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80' },
  { label: 'Potatoes', url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cassava / Manioc', url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80' },
  { label: 'Betel Leaves', url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80' },
  { label: 'Mushrooms', url: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?auto=format&fit=crop&w=800&q=80' },
]

export const QUANTITY_UNITS = [
  'kg',
  'nuts',
  'bunches',
  'fruits',
  'bundles',
  'ton',
  'bag (50kg)',
  'liters',
  'punnets',
]

export const PRICE_UNITS = [
  'per kg',
  'per nut',
  'per bunch',
  'per fruit',
  'per bundle',
  'per ton',
  'per 50kg bag',
  'per liter',
  'per punnet',
]

export const CROP_GRADES = [
  'Grade A',
  'Grade B',
  'Grade C',
  'Premium',
  'Organic Certified',
]
