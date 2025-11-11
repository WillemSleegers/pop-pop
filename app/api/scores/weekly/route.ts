import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Get top 10 scores from the last 7 days
    const scores = await sql`
      SELECT player_name, score, created_at
      FROM scores
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY score DESC, created_at ASC
      LIMIT 10
    `;

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error fetching weekly scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly scores' },
      { status: 500 }
    );
  }
}
