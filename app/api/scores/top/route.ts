import { NextRequest } from 'next/server';
import { leaderboardResponse } from '@/lib/leaderboard';

// Get top scores of all time for the specified mode
export async function GET(request: NextRequest) {
  return leaderboardResponse(request, null, 'top');
}
