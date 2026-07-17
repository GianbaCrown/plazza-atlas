import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { name, email, message, turnstileToken } = await req.json()

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: turnstileToken }),
  }).then((r) => r.json())

  if (!verify.success) return NextResponse.json({ error: 'Captcha failed' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('submissions').insert({ name, email, message })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}