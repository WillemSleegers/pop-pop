// Leaderboard queries and validation shared by the score API routes (server-side only)

import { NextRequest, NextResponse } from 'next/server';
import { sql } from './db';
import { GameMode } from './game-config';

// Largest value the scores.score INTEGER column can hold
export const MAX_SCORE = 2_147_483_647;

const LEADERBOARD_SIZE = 10;

export function isGameMode(value: unknown): value is GameMode {
  return value === 'relax' || value === 'speed';
}

// Respond with the top scores for the requested mode, optionally limited to the last N days
export async function leaderboardResponse(
  request: NextRequest,
  sinceDays: number | null,
  label: string
): Promise<NextResponse> {
  try {
    const gameMode = request.nextUrl.searchParams.get('mode') || 'relax';

    // Validate game mode
    if (!isGameMode(gameMode)) {
      return NextResponse.json(
        { error: 'mode must be either "relax" or "speed"' },
        { status: 400 }
      );
    }

    const scores = await sql`
      SELECT player_name, score, game_mode, created_at
      FROM scores
      WHERE game_mode = ${gameMode}
        AND (${sinceDays}::int IS NULL OR created_at >= NOW() - make_interval(days => ${sinceDays}::int))
      ORDER BY score DESC, created_at ASC
      LIMIT ${LEADERBOARD_SIZE}
    `;

    return NextResponse.json(scores);
  } catch (error) {
    console.error(`Error fetching ${label} scores:`, error);
    return NextResponse.json(
      { error: `Failed to fetch ${label} scores` },
      { status: 500 }
    );
  }
}
