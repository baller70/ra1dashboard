import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { put } from '@vercel/blob'



// POST /api/send-assessment
// Body: { to: string, playerName: string, parentName?: string, assessmentUrl: string, pdfBase64: string, from?: string, programName?: string }
// Uses Resend HTTP API directly (no SDK) to avoid adding deps.
export async function POST(req: NextRequest) {
  try {
    const {
      to,
      playerName,
      parentName,
      assessmentUrl,
      pdfBase64,
      from,
      programName,
    } = await req.json()

    if (!to || !playerName || !assessmentUrl || !pdfBase64) {
      return NextResponse.json(
        { error: 'Missing required fields: to, playerName, assessmentUrl, pdfBase64' },
        { status: 400 }
      )
    }

    // Read and sanitize API key (trim, strip surrounding quotes, and optional 'Bearer ' prefix)
    let RESEND_API_KEY = process.env.RESEND_API_KEY || ''
    RESEND_API_KEY = RESEND_API_KEY.trim().replace(/^['"]|['"]$/g, '').replace(/^Bearer\s+/i, '')
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured on the server (check Vercel Project → Settings → Environment Variables, ensure Preview environment has this key).'},
        { status: 500 }
      )
    }
    // If format looks unexpected, continue but add a hint in response on failure

    const safeFrom = from || 'onboarding@resend.dev'
    const subject = `Basketball Assessment Results for ${playerName}`

    const greetingName = parentName ? parentName : 'Parent/Guardian'

    // Determine CTA URL: prefer public Blob URL of the PDF; fall back to provided page URL
    let ctaUrl: string = assessmentUrl
    try {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64')
      const safePlayer = (playerName || 'Assessment').replace(/\s+/g, '_')
      const baseName = `${safePlayer}_Assessment_Report`
      const token = process.env.BLOB_READ_WRITE_TOKEN
      const putOptions: any = {
        access: 'public',
        contentType: 'application/pdf',
        addRandomSuffix: true,
      }
      if (token) putOptions.token = token
      const { url } = await put(`${baseName}.pdf`, pdfBuffer, putOptions)
      if (url) ctaUrl = url as string
    } catch (e) {
      console.warn('Blob upload failed; falling back to assessment page URL', e)
    }


    const html = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
  <style>
    body { margin:0; padding:0; background:#f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#222; }
    .container { width:100%; padding: 24px 0; }
    .card { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(16,24,40,0.06); }
    .hdr { background:#111827; color:#fff; padding:20px 24px; font-weight:700; font-size:18px; }
    .content { padding: 20px 24px; font-size: 15px; line-height: 1.55; }
    /* RA1 brand button color */
    .cta { display:inline-block; background:#b91c1c; color:#fff; text-decoration:none; padding: 12px 18px; border-radius: 8px; font-weight:600; }
    .muted { color:#6b7280; font-size:13px; }
    .footer { max-width: 640px; margin: 16px auto 0; text-align:center; color:#6b7280; font-size:12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="hdr">Basketball Assessment Results</div>
      <div class="content">
        <p>Dear ${greetingName},</p>
        <p>
          We recently completed the basketball skills assessment for <strong>${playerName}</strong>.
          The report summarizes current skill levels across key areas and offers guidance on next steps for development.
        </p>
        <p>
          You can review the results online using the button below, and you will also find a PDF copy attached to this email for your records.
        </p>
        <p style="margin:24px 0; text-align:center;">
          <a class="cta" href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#b91c1c;color:#ffffff !important;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;text-transform:uppercase;">VIEW ASSESSMENT ONLINE</a>
        </p>
        <p class="muted">
          If you have any questions, reply to this email and we’ll be happy to help.
        </p>
        <p>Best regards,<br />Kevin Houston<br/>2025 RA1 Yearly Development Program</p>
      </div>
    </div>
    <div class="footer">
      © 2025 Rise as One AAU Basketball Club · This message was sent by our assessment dashboard
    </div>
  </div>
</body>
</html>`

    const text = `Dear ${greetingName},\n\nWe completed the basketball skills assessment for ${playerName}.\nThe report is attached and can also be viewed online: ${ctaUrl}\n\nBest regards,\nKevin Houston\n2025 RA1 Yearly Development Program\n\n© 2025 Rise as One AAU Basketball Club · This message was sent by our assessment dashboard`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: safeFrom,
        to: [to],
        subject,
        html,
        text,
        attachments: [
          {
            filename: `${playerName.replace(/\s+/g, '_')}_Assessment_Report.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(
        {
          error: data?.message || data?.error || 'Failed to send email',
          details: data,
          status: res.status,
        },
        { status: res.status === 401 ? 401 : 502 }
      )
    }

    return NextResponse.json({ id: data?.id || null, pdfUrl: ctaUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}

