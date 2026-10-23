import { NextRequest } from 'next/server';
import { leaderboardResponse } from '@/lib/leaderboard';

// Get top scores from the last 7 days for the specified mode
export async function GET(request: NextRequest) {
  return leaderboardResponse(request, 7, 'weekly');
}
