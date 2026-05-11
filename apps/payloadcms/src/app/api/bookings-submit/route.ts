import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Form-data POST handler for the public booking form. We don't use the Payload
// auto-generated /api/bookings endpoint directly because we want a
// formData-friendly endpoint that 303-redirects to /prenotazioni/thanks.
export async function POST(request: Request) {
  const form = await request.formData()
  const name = String(form.get('name') ?? '').trim()
  const email = String(form.get('email') ?? '').trim()
  const datetime = String(form.get('datetime') ?? '').trim()
  const notes = String(form.get('notes') ?? '').trim() || undefined

  if (!name || !email || !datetime) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 422 })
  }

  const isoDateTime = new Date(datetime).toISOString()

  try {
    const payload = await getPayload({ config: await config })
    await payload.create({
      collection: 'bookings',
      data: {
        name,
        email,
        datetime: isoDateTime,
        notes,
        status: 'new',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 502 },
    )
  }

  const url = new URL('/prenotazioni/thanks', request.url)
  return NextResponse.redirect(url, { status: 303 })
}
