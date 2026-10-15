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
