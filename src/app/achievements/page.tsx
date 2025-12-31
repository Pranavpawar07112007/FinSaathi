
'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Award, Lock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function AchievementsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const achievementsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'achievements'));
  }, [firestore]);
  const { data: allAchievements, isLoading: isLoadingAchievements } =
    useCollection(achievementsQuery);

  const userAchievementsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/achievements`)
    );
  }, [user, firestore]);
  const { data: userAchievements, isLoading: isLoadingUserAchievements } =
    useCollection(userAchievementsQuery);

  const earnedAchievementIds =
    userAchievements?.map((ua) => ua.achievementId) || [];

  const isLoading = isLoadingAchievements || isLoadingUserAchievements;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Financial Challenges</CardTitle>
            <CardDescription>
              Complete these challenges to earn points, unlock badges, and build healthy financial habits.
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <div className="flex gap-6 pb-4 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="p-4 min-w-[200px] sm:min-w-0">
                    <Skeleton className="h-16 w-16 rounded-full mx-auto" />
                    <Skeleton className="h-5 w-3/4 mx-auto mt-4" />
                    <Skeleton className="h-4 w-full mx-auto mt-2" />
                    <Skeleton className="h-4 w-full mx-auto mt-1" />
                  </Card>
                ))
              : allAchievements?.map((ach) => {
                  const isUnlocked = earnedAchievementIds.includes(ach.id);
                  const Icon = isUnlocked ? Award : Lock;

                  return (
                    <Card
                      key={ach.id}
                      className={cn(
                        'flex flex-col items-center justify-start p-6 text-center transition-all duration-300 h-full min-w-[200px] sm:min-w-0',
                        isUnlocked
                          ? 'bg-yellow-100/20 dark:bg-yellow-900/30 border-yellow-500/50'
                          : 'bg-muted/50 filter grayscale'
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-full p-4 mb-4',
                          isUnlocked
                            ? 'bg-yellow-500/20'
                            : 'bg-muted-foreground/20'
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-10',
                            isUnlocked
                              ? 'text-yellow-500'
                              : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <h3 className="font-semibold text-lg">
                        {ach.name}
                      </h3>
                       <p className="text-xs text-muted-foreground mb-2">
                        {ach.points} Points
                      </p>
                      <p className="text-sm text-muted-foreground flex-grow">
                        {ach.description}
                      </p>
                    </Card>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
