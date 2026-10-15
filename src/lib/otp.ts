import crypto from 'node:crypto'

interface OtpEntry {
  code: string
  expiresAt: number
  attempts: number
  purpose: 'login' | 'register'
}

const globalForOtp = globalThis as unknown as {
  otpStore: Map<string, OtpEntry> | undefined
}

export const otpStore = globalForOtp.otpStore ?? new Map<string, OtpEntry>()
if (process.env.NODE_ENV !== 'production') globalForOtp.otpStore = otpStore

const EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export function saveOtp(email: string, code: string, purpose: 'login' | 'register' = 'login') {
  const normalized = email.toLowerCase().trim()
  otpStore.set(normalized, {
    code,
    expiresAt: Date.now() + EXPIRY_MS,
    attempts: 0,
    purpose,
  })
}

export function verifyOtp(email: string, code: string, purpose: 'login' | 'register' = 'login'): { valid: boolean; error?: string } {
  const normalized = email.toLowerCase().trim()
  const entry = otpStore.get(normalized)

  if (!entry) {
    return { valid: false, error: 'No OTP requested for this email or it has expired.' }
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalized)
    return { valid: false, error: 'OTP code has expired. Please request a new one.' }
  }

  if (entry.purpose !== purpose) {
    return { valid: false, error: 'Invalid verification purpose.' }
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(normalized)
    return { valid: false, error: 'Too many invalid attempts. Please request a new code.' }
  }

  if (entry.code !== code.trim()) {
    entry.attempts += 1
    return { valid: false, error: `Invalid code. ${MAX_ATTEMPTS - entry.attempts} attempts remaining.` }
  }

  // Consume OTP on successful verification
  otpStore.delete(normalized)
  return { valid: true }
}
