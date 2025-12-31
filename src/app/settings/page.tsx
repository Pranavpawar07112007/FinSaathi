'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  useAuth,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateProfile } from 'firebase/auth';

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPending, setIsPending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [photoDataUri, setPhotoDataUri] = useState<string>('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid, 'profile', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    if (userProfile) {
      setFirstName(userProfile.firstName || user.displayName?.split(' ')[0] || '');
      setLastName(userProfile.lastName || user.displayName?.split(' ').slice(1).join(' ') || '');
    } else if(user) {
      setFirstName(user.displayName?.split(' ')[0] || '');
      setLastName(user.displayName?.split(' ').slice(1).join(' ') || '');
    }
  }, [user, isUserLoading, userProfile, router]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setPhotoDataUri(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !auth.currentUser) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to update your profile.',
      });
      return;
    }

    setIsPending(true);

    try {
      // Data for Firebase Auth Profile update
      const authUpdateData: { displayName?: string } = {
        displayName: `${firstName} ${lastName}`,
      };

      // Data for Firestore Profile document update
      const firestoreUpdateData: { [key: string]: any } = {
        firstName,
        lastName,
      };

      // Only add photoURL to Firestore, not Firebase Auth
      if (photoDataUri) {
        firestoreUpdateData.photoURL = photoDataUri;
      }
      
      // Update Firebase Auth user (displayName only)
      await updateProfile(auth.currentUser, authUpdateData);

      // Update Firestore profile (including photoURL)
      setDocumentNonBlocking(userProfileRef!, firestoreUpdateData, { merge: true });

      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been successfully saved.',
      });

    } catch (error) {
       console.error("Error updating profile: ", error);
       toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was an error updating your profile.',
      });
    } finally {
      setIsPending(false);
      setPhotoDataUri('');
      setAvatarPreview(null);
    }
  };
  
  const handleRemovePicture = async () => {
     if (!user || !auth.currentUser || !userProfileRef) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to update your profile.',
      });
      return;
    }
    setIsDeleting(true);
    try {
        await updateProfile(auth.currentUser, { photoURL: null });
        updateDocumentNonBlocking(userProfileRef, { photoURL: null });

        toast({
            title: "Profile Picture Removed",
            description: "Your profile picture has been successfully removed."
        });

    } catch (error) {
        console.error("Error removing profile picture: ", error);
        toast({
            variant: "destructive",
            title: "Removal Failed",
            description: "There was an error removing your profile picture."
        });
    } finally {
        setIsDeleting(false);
        setAvatarPreview(null);
    }
  };


  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  const currentAvatarSrc = avatarPreview || userProfile?.photoURL || user?.photoURL;
  const fallbackInitial = firstName?.[0] || user?.displayName?.[0] || user?.email?.[0] || '';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Manage your account settings and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <form onSubmit={handleUpdateProfile} ref={formRef}>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={currentAvatarSrc ?? ''} />
                      <AvatarFallback>
                        {fallbackInitial}
                      </AvatarFallback>
                    </Avatar>
                     <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2" />
                        Change Picture
                     </Button>
                     <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={handleRemovePicture}
                        disabled={!currentAvatarSrc || isDeleting}
                      >
                         {isDeleting ? <Loader2 className="mr-2 animate-spin" /> : <Trash2 className="mr-2" />}
                        Remove
                     </Button>
                     <Input 
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/png, image/jpeg, image/gif"
                        onChange={handleFileChange}
                     />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      disabled
                      className="bg-muted/50"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="mr-2 animate-spin" />
                    ) : (
                      <Save className="mr-2" />
                    )}
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </form>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize the look and feel of the application.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm font-medium">Toggle Theme</p>
                <ThemeToggle />
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
