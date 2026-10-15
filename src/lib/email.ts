import nodemailer from 'nodemailer'
import { Resend } from 'resend'

// 1. Gmail SMTP configuration (Sends from govisahana.srilanka@gmail.com to ANY email, NO domain needed!)
const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER || 'govisahana.srilanka@gmail.com'
const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').replace(/\s+/g, '')

const gmailTransporter = gmailPass
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    })
  : null

// 2. Resend fallback configuration
const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null
const fromEmail = process.env.RESEND_FROM_EMAIL || 'GoviSahana <onboarding@resend.dev>'

interface SendOtpParams {
  to: string
  code: string
  purpose?: 'login' | 'register' | 'reset'
}

export async function sendOtpEmail({ to, code, purpose = 'login' }: SendOtpParams) {
  const subject = purpose === 'register' 
    ? 'Verify your email - GoviSahana' 
    : purpose === 'reset'
    ? 'Reset your password - GoviSahana'
    : 'Your GoviSahana Login Code'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9f6; margin: 0; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: #15803d; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">🌾 GoviSahana</h1>
            <p style="color: #bbf7d0; margin: 6px 0 0; font-size: 14px;">Smart Agriculture Platform Sri Lanka</p>
          </div>
          <div style="padding: 32px 28px;">
            <h2 style="font-size: 20px; font-weight: 600; color: #1e293b; margin-top: 0;">
              ${purpose === 'register' ? 'Verify your email address' : purpose === 'reset' ? 'Reset your account password' : 'Sign in with your verification code'}
            </h2>
            <p style="font-size: 15px; color: #475569; line-height: 1.5; margin-bottom: 24px;">
              Please use the 6-digit verification code below to ${purpose === 'register' ? 'complete your registration' : purpose === 'reset' ? 'reset your account password' : 'sign in to your GoviSahana account'}. This code is valid for <strong>10 minutes</strong>.
            </p>
            <div style="background: #f0fdf4; border: 2px dashed #86efac; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: monospace, Courier, sans-serif; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #166534; display: inline-block;">
                ${code}
              </span>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
              If you did not request this verification code, you can safely ignore this email. Someone may have typed your email by mistake.
            </p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
            © ${new Date().getFullYear()} GoviSahana. Supporting Sri Lankan agriculture.
          </div>
        </div>
      </body>
    </html>
  `

  // Priority 1: Send through Gmail SMTP if app password is provided
  if (gmailTransporter) {
    try {
      const info = await gmailTransporter.sendMail({
        from: `"GoviSahana" <${gmailUser}>`,
        to,
        subject,
        html,
      })
      console.log(`[Gmail SMTP Success]: Sent OTP email from ${gmailUser} to ${to} (Message ID: ${info.messageId})`)
      return { success: true, id: info.messageId }
    } catch (err) {
      console.error('Failed to send email via Gmail SMTP:', err)
      throw new Error('Gmail send failed: ' + (err as Error).message)
    }
  }

  // Priority 2: Send through Resend if key is provided
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
      })

      if (response.error) {
        console.error('[Resend Error]:', response.error)
        // If unverified domain limitation on Resend free tier, fall back to dev simulation
        if (
          response.error.name === 'validation_error' &&
          response.error.message?.includes('only send testing emails to your own email address')
        ) {
          console.warn(`[Resend Sandbox]: Cannot send to external recipient ${to} without a custom domain. Using simulated code: ${code}`)
          return {
            success: true,
            simulated: true,
            code,
            warning: 'Sandbox mode: to send to all emails, verify your domain in Resend dashboard.',
          }
        }
        throw new Error(response.error.message)
      }

      return { success: true, id: response.data?.id }
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      if (errorObj?.message?.includes('only send testing emails to your own email address')) {
        console.warn(`[Resend Sandbox]: Cannot send to external recipient ${to}. Using simulated code: ${code}`)
        return {
          success: true,
          simulated: true,
          code,
          warning: 'Sandbox mode: to send to all emails, verify your domain in Resend dashboard.',
        }
      }
      console.error('Failed to send email via Resend:', err)
      throw err
    }
  }

  // Fallback: simulated mode
  console.log('\n==========================================')
  console.log(`[DEV OTP EMAIL] To: ${to} | Code: ${code} | Purpose: ${purpose}`)
  console.log('Set GMAIL_APP_PASSWORD or RESEND_API_KEY in your .env to send real emails.')
  console.log('==========================================\n')
  return { success: true, simulated: true, code }
}
