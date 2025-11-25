import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sessionId, productId, event, rank, rating, comment } = body || {};

    if (!userId || !sessionId || !productId || !event) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

    const resp = await fetch(`${backendUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId, productId, event, rank, rating, comment }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: text || 'Backend error' }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

