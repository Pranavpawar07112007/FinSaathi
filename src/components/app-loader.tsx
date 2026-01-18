
'use client';

import { useState, useEffect } from 'react';
import { SplashScreen } from './splash-screen';
import { AnimatePresence } from 'framer-motion';

export function AppLoader({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const hasLoaded = sessionStorage.getItem('hasLoaded');
        if(hasLoaded) {
            setIsLoading(false);
            return;
        }

        const timer = setTimeout(() => {
            setIsLoading(false);
            sessionStorage.setItem('hasLoaded', 'true');
        }, 3000); // Duration of the splash screen

        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <AnimatePresence>
                {isLoading && <SplashScreen />}
            </AnimatePresence>
            {!isLoading && children}
        </>
    );
}
