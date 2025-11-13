import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameMode = searchParams.get('mode') || 'relax';

    // Validate game mode
    if (gameMode !== 'relax' && gameMode !== 'speed') {
      return NextResponse.json(
        { error: 'mode must be either "relax" or "speed"' },
        { status: 400 }
      );
    }

    // Get top 10 scores of all time for the specified mode
    const scores = await sql`
      SELECT player_name, score, game_mode, created_at
      FROM scores
      WHERE game_mode = ${gameMode}
      ORDER BY score DESC, created_at ASC
      LIMIT 10
    `;

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error fetching top scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top scores' },
      { status: 500 }
    );
  }
}
