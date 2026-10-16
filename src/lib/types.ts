// Shared domain types for GoviSahana
export type Role = 'FARMER' | 'EXPERT' | 'ENTERPRISE' | 'WORKER' | 'BUYER' | 'ADMIN'

export const ROLE_LABELS: Record<Role, string> = {
  FARMER: 'Farmer',
  EXPERT: 'Agricultural Expert',
  ENTERPRISE: 'Agricultural Enterprise',
  WORKER: 'Agricultural Worker',
  BUYER: 'Crop Buyer',
  ADMIN: 'Administrator',
}

export type SessionUser = {
  id: string
  email: string
  name: string
  role: Role
  status: string
  avatarUrl: string | null
}

export type District =
  | 'Colombo' | 'Gampaha' | 'Kalutara' | 'Kandy' | 'Matale' | 'Nuwara Eliya'
  | 'Galle' | 'Matara' | 'Hambantota' | 'Jaffna' | 'Kilinochchi' | 'Mannar'
  | 'Vavuniya' | 'Mullaitivu' | 'Batticaloa' | 'Ampara' | 'Trincomalee'
  | 'Kurunegala' | 'Puttalam' | 'Anuradhapura' | 'Polonnaruwa' | 'Badulla'
  | 'Monaragala' | 'Ratnapura' | 'Kegalle'

export const SRI_LANKAN_DISTRICTS: District[] = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
]

export const COMMON_CROPS = [
  'Rice (Paddy)', 'Coconut', 'Tea', 'Rubber', 'Vegetables', 'Potato',
  'Onion', 'Chilli', 'Banana', 'Mango', 'Papaya', 'Pineapple',
  'Cashew', 'Pepper', 'Cinnamon', 'Cardamom', 'Betel', 'Maize',
  'Groundnut', 'Soybean', 'Green Gram', 'Fruits', 'Floriculture',
]

export const CASE_CATEGORIES = [
  { value: 'PEST', label: 'Pest Attack' },
  { value: 'DISEASE', label: 'Crop Disease' },
  { value: 'NUTRIENT', label: 'Nutrient Deficiency' },
  { value: 'WATER', label: 'Water / Irrigation' },
  { value: 'WEATHER', label: 'Weather Damage' },
  { value: 'SOIL', label: 'Soil Problem' },
  { value: 'OTHER', label: 'Other' },
]

export const CASE_STATUS = {
  OPEN: { label: 'Open', color: 'bg-blue-100 text-blue-700' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-amber-100 text-amber-700' },
  ASSIGNED: { label: 'Assigned', color: 'bg-violet-100 text-violet-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-cyan-100 text-cyan-700' },
  RESOLVED: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700' },
  CLOSED: { label: 'Closed', color: 'bg-slate-100 text-slate-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-100 text-rose-700' },
} as const

export const CONSULTATION_STATUS = {
  REQUESTED: { label: 'Requested', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
  DECLINED: { label: 'Declined', color: 'bg-rose-100 text-rose-700' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-violet-100 text-violet-700' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-100 text-slate-600' },
} as const

export const ROLE_OPTIONS = [
  { value: 'FARMER', label: 'Farmer', desc: 'Report crop problems & get expert advice', icon: 'Sprout' },
  { value: 'EXPERT', label: 'Agricultural Expert', desc: 'Advise farmers & build your practice', icon: 'GraduationCap' },
  { value: 'ENTERPRISE', label: 'Agricultural Enterprise', desc: 'Sell products & services to farmers', icon: 'Store' },
  { value: 'WORKER', label: 'Agricultural Worker', desc: 'Find jobs & offer your services', icon: 'HardHat' },
  { value: 'BUYER', label: 'Crop Buyer', desc: 'Source crops directly from farmers', icon: 'ShoppingBasket' },
] as const

export const COMMUNITY_CATEGORIES = [
  { value: 'ALL', label: 'All Topics', labelSi: 'සියලු මාතෘකා', labelTa: 'அனைத்து தலைப்புகளும்', color: 'bg-muted text-foreground border-border' },
  { value: 'CROP_DISEASES', label: 'Crop Diseases & Pests', labelSi: 'බෝග රෝග සහ පළිබෝධ', labelTa: 'பயிர் நோய்கள் மற்றும் பூச்சிகள்', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { value: 'CULTIVATION', label: 'Cultivation Techniques', labelSi: 'වගා ක්‍රමවේද', labelTa: 'பயிர்ச்செய்கை நுட்பங்கள்', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { value: 'HARVESTING', label: 'Harvesting & Post-Harvest', labelSi: 'අස්වනු නෙළීම සහ සැකසුම', labelTa: 'அறுவடை மற்றும் பதப்படுத்தல்', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { value: 'AGRITECH', label: 'Agri-Tech & Equipment', labelSi: 'කෘෂි තාක්ෂණය සහ උපකරණ', labelTa: 'விவசாய தொழில்நுட்பம்', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  { value: 'MARKET_INFO', label: 'Market Prices & Trends', labelSi: 'වෙළඳපොළ මිල ගණන් සහ ප්‍රවණතා', labelTa: 'சந்தை விலைகள் மற்றும் போக்குகள்', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { value: 'RESEARCH', label: 'Research & Innovation', labelSi: 'පර්යේෂණ සහ නවෝත්පාදන', labelTa: 'ஆராய்ச்சி மற்றும் கண்டுபிடிப்பு', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { value: 'EXPERIENCES', label: 'Farming Experiences', labelSi: 'ගොවිතැන් අත්දැකීම්', labelTa: 'விவசாய அனுபவங்கள்', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  { value: 'QA', label: 'Questions & Answers', labelSi: 'ප්‍රශ්න සහ පිළිතුරු', labelTa: 'கேள்விகள் மற்றும் பதில்கள்', color: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  { value: 'SUCCESS_STORIES', label: 'Success Stories', labelSi: 'සාර්ථකත්ව කතා', labelTa: 'வெற்றிக் கதைகள்', color: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800' },
] as const

export type CommunityCategoryValue = typeof COMMUNITY_CATEGORIES[number]['value']

export type PostAuthor = {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl: string | null
  verified?: boolean
  district?: string | null
  title?: string | null
}

export type CommunityPostItem = {
  id: string
  authorId: string
  author: PostAuthor
  content: string
  category: string
  mediaUrls: string[]
  hashtags: string[]
  visibility: 'PUBLIC' | 'CONNECTIONS'
  pinned: boolean
  sharedPostId?: string | null
  sharedPost?: CommunityPostItem | null
  sharedCaption?: string | null
  likesCount: number
  commentsCount: number
  sharesCount: number
  savesCount: number
  likedByMe: boolean
  savedByMe: boolean
  isAuthor: boolean
  createdAt: string
  updatedAt: string
}

export type PostCommentItem = {
  id: string
  postId: string
  authorId: string
  author: PostAuthor
  parentId?: string | null
  content: string
  createdAt: string
  updatedAt: string
  replies?: PostCommentItem[]
}

export type FriendConnection = {
  id: string
  userId: string
  name: string
  role: Role
  avatarUrl: string | null
  district?: string | null
  crops?: string | null
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  direction: 'INCOMING' | 'OUTGOING' | 'MUTUAL'
  createdAt: string
}

