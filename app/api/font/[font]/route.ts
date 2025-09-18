import { NextRequest } from 'next/server'

const SOURCES: Record<string, string> = {
  'audiowide-regular': 'https://raw.githubusercontent.com/google/fonts/main/ofl/audiowide/Audiowide-Regular.ttf',
  'saira-regular': 'https://raw.githubusercontent.com/google/fonts/main/ofl/saira/Saira%5Bwdth%2Cwght%5D.ttf',
  'saira-bold': 'https://raw.githubusercontent.com/google/fonts/main/ofl/saira/Saira%5Bwdth%2Cwght%5D.ttf',
}

export async function GET(_req: NextRequest, context: { params: { font: string } }) {
  const key = (context.params.font || '').toLowerCase()
  const url = SOURCES[key]
  if (!url) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const upstream = await fetch(url, { cache: 'no-store' })
    if (!upstream.ok) {
      return new Response('Upstream fetch failed', { status: 502 })
    }
    const buf = await upstream.arrayBuffer()
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'font/ttf',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e) {
    return new Response('Error fetching font', { status: 500 })
  }
}

