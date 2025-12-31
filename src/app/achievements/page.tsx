
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/firebase';
import { Award, Lock, Trophy, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { getMonthlyAchievements } from './actions';

// --- Types are now defined in the client component ---
export interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  dateEarned: string; // ISO string
}

export interface GetMonthlyAchievementsOutput {
  unlockedThisMonth: (Achievement & { dateEarned: string })[];
  challenges: Achievement[];
  error?: string;
}


// A single, reusable card component for displaying an achievement
const AchievementCard = ({
  achievement,
  isUnlocked,
  dateEarned,
}: {
  achievement: Achievement;
  isUnlocked: boolean;
  dateEarned?: string | null;
}) => {
  const Icon = isUnlocked ? Award : Lock;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border rounded-lg',
        isUnlocked
          ? 'bg-yellow-100/20 dark:bg-yellow-900/30 border-yellow-500/50'
          : 'bg-muted/50'
      )}
    >
      <div
        className={cn(
          'rounded-full p-3',
          isUnlocked ? 'bg-yellow-500/20' : 'bg-muted-foreground/20'
        )}
      >
        <Icon
          className={cn(
            'size-6',
            isUnlocked ? 'text-yellow-500' : 'text-muted-foreground'
          )}
        />
      </div>
      <div className="flex-grow">
        <h3 className="font-semibold">{achievement.name}</h3>
        <p className="text-sm text-muted-foreground">
          {achievement.description}
        </p>
        {isUnlocked && dateEarned && (
          <p className="text-xs text-muted-foreground mt-1">
            Unlocked on {format(parseISO(dateEarned), 'MMM d, yyyy')}
          </p>
        )}
      </div>
      <div className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
        {achievement.points} Points
      </div>
    </div>
  );
};

export default function AchievementsPage() {
  const { user, isUserLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockedThisMonth, setUnlockedThisMonth] = useState<
    (Achievement & { dateEarned: string })[]
  >([]);
  const [challenges, setChallenges] = useState<Achievement[]>([]);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMonthlyAchievements({ userId: user.uid });
      if (result.error) {
        throw new Error(result.error);
      }
      setUnlockedThisMonth(result.unlockedThisMonth || []);
      setChallenges(result.challenges || []);
    } catch (e: any) {
      setError(
        'Failed to load achievements. The AI service may be temporarily unavailable.'
      );
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isUserLoading && user) {
      fetchAchievements();
    }
  }, [user, isUserLoading, fetchAchievements]);

  const renderContent = () => {
    if (isUserLoading || isLoading) {
      return (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle />
              Error Loading Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button variant="destructive" onClick={fetchAchievements}>
              <RefreshCw className="mr-2" />
              Try Again
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Challenges</CardTitle>
          <CardDescription>
            Complete these challenges each month to earn points and build
            healthy financial habits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="challenges">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="challenges">
                Challenges ({challenges.length})
              </TabsTrigger>
              <TabsTrigger value="unlocked">
                Unlocked this Month ({unlockedThisMonth.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="challenges" className="mt-6">
              {challenges.length > 0 ? (
                <div className="space-y-4">
                  {challenges.map((ach) => (
                    <AchievementCard
                      key={ach.id}
                      achievement={ach}
                      isUnlocked={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Trophy className="mx-auto size-12 text-yellow-500 mb-4" />
                  <p className="font-semibold">
                    You've completed all challenges!
                  </p>
                  <p className="text-sm">Check back next month for more.</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="unlocked" className="mt-6">
              {unlockedThisMonth.length > 0 ? (
                <div className="space-y-4">
                  {unlockedThisMonth.map((ach) => (
                    <AchievementCard
                      key={ach.id}
                      achievement={ach}
                      isUnlocked={true}
                      dateEarned={ach.dateEarned}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>
                    You haven't unlocked any achievements this month. Keep
                    going!
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {renderContent()}
      </main>
    </div>
  );
}
