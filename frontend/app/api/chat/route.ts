import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, userId, sessionId, clarifications, skipQuestions, originalQuery } = body;

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
        clarifications: clarifications || undefined,
        skipQuestions: skipQuestions || false,
        originalQuery: originalQuery || undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend returned ${response.status} ${response.statusText}: ${errorText}`);
    }

    const data = await response.json();

    // Pass through the new discriminated union format
    // The backend now returns: { mode: 'clarifying' | 'recommendations' | 'recommendations_with_refinement', ... }
    if (data.mode === 'clarifying') {
      // Return questions format
      return NextResponse.json({
        mode: 'clarifying',
        naturalLanguage: data.naturalLanguage,
        questions: data.questions,
        encouragement: data.encouragement,
        showEscapeHatch: data.showEscapeHatch,
        partialContext: data.partialContext,
        reasoning: data.reasoning,
        sessionId: data.sessionId,
        timestamp: data.timestamp,
        performance: data.performance,
        executionTrace: data.executionTrace,
      });
    } else {
      // Return recommendations format (backward compatible)
      return NextResponse.json({
        mode: data.mode || 'recommendations',
        intro: data.finalRecommendations?.conversationalIntro || 'Here are some recommendations:',
        outro: data.finalRecommendations?.conversationalOutro || 'Hope these help!',
        recommendations: data.finalRecommendations?.recommendations || [],
        executionTime: data.performance?.totalExecutionTimeMs || 0,
        agentTimings: data.performance?.agentTimings || {},
        naturalLanguage: data.naturalLanguage,
        performance: data.performance,
        executionTrace: data.executionTrace,
      });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
