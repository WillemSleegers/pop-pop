import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { player_name, score, game_mode = 'relax' } = body;

    // Validate input
    if (!player_name || typeof player_name !== 'string') {
      return NextResponse.json(
        { error: 'player_name is required and must be a string' },
        { status: 400 }
      );
    }

    if (!score || typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'score is required and must be a positive number' },
        { status: 400 }
      );
    }

    // Validate game_mode
    if (game_mode !== 'relax' && game_mode !== 'speed') {
      return NextResponse.json(
        { error: 'game_mode must be either "relax" or "speed"' },
        { status: 400 }
      );
    }

    // Trim and limit player name length (arcade style: 3 chars)
    const trimmedName = player_name.trim().slice(0, 3).toUpperCase();

    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: 'player_name cannot be empty' },
        { status: 400 }
      );
    }

    // Insert score into database
    const result = await sql`
      INSERT INTO scores (player_name, score, game_mode)
      VALUES (${trimmedName}, ${score}, ${game_mode})
      RETURNING id, player_name, score, game_mode, created_at
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error submitting score:', error);
    return NextResponse.json(
      { error: 'Failed to submit score' },
      { status: 500 }
    );
  }
}
