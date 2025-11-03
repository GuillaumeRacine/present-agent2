import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, userId, sessionId } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Call the backend orchestrator
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/api/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userQuery: query,
        userId: userId || 'anonymous',
        sessionId: sessionId || `session-${Date.now()}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    // Transform the response for the frontend
    return NextResponse.json({
      intro: data.finalRecommendations?.conversationalIntro || 'Here are some recommendations:',
      outro: data.finalRecommendations?.conversationalOutro || 'Hope these help!',
      recommendations: data.finalRecommendations?.recommendations || [],
      executionTime: data.performance?.totalExecutionTimeMs || 0,
      agentTimings: data.performance?.agentTimings || {},
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
