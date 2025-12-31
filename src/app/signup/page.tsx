
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleDollarSign, Chrome, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { initiateEmailSignUp, useAuth, useFirestore, initiateGoogleSignIn, useUser, setDocumentNonBlocking } from '@/firebase';
import { FormEventHandler, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { Alert, AlertDescription } from '@/components/ui/alert';


export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const seedAchievements = async () => {
    if (!firestore) return;
    const achievementsRef = collection(firestore, 'achievements');
    const snapshot = await getDocs(achievementsRef);
    if (snapshot.empty) {
      const batch = writeBatch(firestore);
      
      const achievements = [
        { id: 'first-transaction', name: 'First Transaction', description: 'Record your first income or expense.', points: 10, icon: 'DollarSign' },
        { id: 'budget-setter', name: 'Budget Setter', description: 'Create your first monthly budget.', points: 20, icon: 'Target' },
        { id: 'goal-getter', name: 'Goal Getter', description: 'Create your first savings goal.', points: 20, icon: 'Flag' },
        { id: 'investment-starter', name: 'Investment Starter', description: 'Add your first investment to your portfolio.', points: 30, icon: 'TrendingUp' },
        { id: 'savvy-saver', name: 'Savvy Saver', description: 'Add funds to a savings goal for the first time.', points: 15, icon: 'PiggyBank' },
        { id: 'budget-champion', name: 'Budget Champion', description: 'Stay within your budget for a full month.', points: 50, icon: 'Trophy' }
      ];

      achievements.forEach(ach => {
        const ref = doc(firestore, 'achievements', ach.id);
        batch.set(ref, ach);
      });
      
      await batch.commit();
    }
  };


  const handleEmailSignup: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setError(null);
    const target = event.currentTarget;
    const email = (target.elements.namedItem('email') as HTMLInputElement).value;
    const password = (target.elements.namedItem('password') as HTMLInputElement).value;
    const firstName = (target.elements.namedItem('firstName') as HTMLInputElement).value;
    const lastName = (target.elements.namedItem('lastName') as HTMLInputElement).value;

    try {
      const userCredential = await initiateEmailSignUp(auth, email, password);
      
      if (userCredential?.user) {
        const profileRef = doc(firestore, 'users', userCredential.user.uid, 'profile', userCredential.user.uid);
        const profileData = {
          id: userCredential.user.uid,
          firstName: firstName,
          lastName: lastName,
          email: email,
          signupDate: new Date().toISOString(),
          points: 0,
        };
        setDocumentNonBlocking(profileRef, profileData, { merge: false });
        await seedAchievements();
      }

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please log in or use a different email.');
      } else {
        setError('An unexpected error occurred during signup. Please try again.');
        console.error('Error signing up with email:', error);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await initiateGoogleSignIn(auth);
      if (userCredential?.user && firestore) {
        const profileRef = doc(firestore, 'users', userCredential.user.uid, 'profile', userCredential.user.uid);
        const [firstName, ...lastNameParts] = userCredential.user.displayName?.split(' ') || ['', ''];
        const lastName = lastNameParts.join(' ');
        const profileData = {
          id: userCredential.user.uid,
          firstName: firstName,
          lastName: lastName,
          email: userCredential.user.email,
          signupDate: new Date().toISOString(),
          points: 0,
        };
         setDocumentNonBlocking(profileRef, profileData, { merge: true });
         await seedAchievements();
      }
    } catch(error) {
       // Error is already logged in the initiateGoogleSignIn function,
       // and popup-closed-by-user is ignored.
    }
  };
  
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <form onSubmit={handleEmailSignup}>
          <CardHeader className="space-y-1 text-center">
            <div className="inline-flex items-center justify-center gap-2">
              <CircleDollarSign className="size-8" />
              <CardTitle className="text-3xl">FinSaathi</CardTitle>
            </div>
            <CardDescription>
              Create an account to start managing your finances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
            )}
             <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={handleGoogleSignIn}
            >
              <Chrome className="mr-2 h-4 w-4" />
              Sign up with Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="m@example.com"
                required
                onChange={() => setError(null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" name="password" required onChange={() => setError(null)} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit">
              Sign up
            </Button>
            <div className="text-center text-sm">
              Already have an account?
              <Link href="/login" className="ml-1 underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
