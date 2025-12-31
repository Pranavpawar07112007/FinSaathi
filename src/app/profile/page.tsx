
'use client';

import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Settings, Award, Languages, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  useEffect(() => {
    const initializeGoogleTranslate = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,hi,bn,te,mr,ta,gu,kn,ml,pa,as,ur'
        }, 'google_translate_element');
      }
    };
    
    // Define the callback function on the window object
    window.googleTranslateElementInit = initializeGoogleTranslate;

    // Check if the script is already loaded
    if (document.querySelector('script[src*="translate.google.com"]')) {
      initializeGoogleTranslate();
    } else {
      // Add the script dynamically if it's not there
      const script = document.createElement('script');
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
    
    // Cleanup function
    return () => {
      const googleTranslateScript = document.querySelector('script[src*="translate.google.com"]');
      if (googleTranslateScript) {
        // It's tricky to fully clean up Google's widget, but we can try
        // to remove what we added if needed on component unmount.
      }
    };
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid, 'profile', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const handleLogout = () => {
    auth.signOut();
  };

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>
                This is your profile page. You can view your information here.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings">
                <Settings className="mr-2" />
                Edit Profile & Settings
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center space-x-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.photoURL ?? userProfile?.photoURL ?? ''} />
                  <AvatarFallback>
                    {userProfile?.firstName?.[0]}
                    {userProfile?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">
                    {user?.displayName || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {userProfile?.email || user.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Award className="size-4 text-yellow-500" />
                    <p className="text-sm font-semibold text-muted-foreground">{userProfile?.points || 0} Points</p>
                  </div>
                  {userProfile?.signupDate && (
                    <p className="text-sm text-muted-foreground">
                        Joined on: {new Date(userProfile.signupDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
               <p>No user profile found.</p>
            )}
            
            <Button onClick={handleLogout} variant="destructive">
              Log out
            </Button>
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Languages />
                        Language Settings
                    </CardTitle>
                    <CardDescription>
                        Choose your preferred language for the application interface.
                    </CardDescription>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <HelpCircle className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60" side="top">
                    <p className="text-sm">
                      If the language selector doesn't appear, please try reloading the page.
                    </p>
                  </PopoverContent>
                </Popover>
            </CardHeader>
            <CardContent>
                <div id="google_translate_element"></div>
            </CardContent>
        </Card>
        
      </main>
    </div>
  );
}
