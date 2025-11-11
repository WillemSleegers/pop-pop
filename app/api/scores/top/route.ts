import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Get top 10 scores of all time
    const scores = await sql`
      SELECT player_name, score, created_at
      FROM scores
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
