'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Score {
  player_name: string;
  score: number;
  created_at: string;
}

interface LeaderboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Leaderboard({ open, onOpenChange }: LeaderboardProps) {
  const [topScores, setTopScores] = useState<Score[]>([]);
  const [weeklyScores, setWeeklyScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchScores();
    }
  }, [open]);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const [topResponse, weeklyResponse] = await Promise.all([
        fetch('/api/scores/top'),
        fetch('/api/scores/weekly'),
      ]);

      if (topResponse.ok) {
        const topData = await topResponse.json();
        setTopScores(topData);
      }

      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        setWeeklyScores(weeklyData);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderScoreList = (scores: Score[]) => {
    if (loading) {
      return (
        <div className="text-center py-8 text-muted-foreground h-[400px] flex items-center justify-center">
          Loading...
        </div>
      );
    }

    if (scores.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground h-[400px] flex items-center justify-center">
          No scores yet!
        </div>
      );
    }

    return (
      <div className="space-y-2 h-[400px] overflow-y-auto">
        {scores.map((score, index) => (
          <div
            key={`${score.player_name}-${score.created_at}-${index}`}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                  index === 0
                    ? 'bg-yellow-500 text-yellow-950'
                    : index === 1
                    ? 'bg-gray-400 text-gray-900'
                    : index === 2
                    ? 'bg-amber-600 text-amber-950'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <span className="font-medium">{score.player_name}</span>
            </div>
            <span className="font-bold tabular-nums">{score.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Leaderboard</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="all-time">All Time</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly" className="mt-4">
            {renderScoreList(weeklyScores)}
          </TabsContent>
          <TabsContent value="all-time" className="mt-4">
            {renderScoreList(topScores)}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
