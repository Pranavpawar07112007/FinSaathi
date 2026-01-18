
'use client';

import { motion } from 'framer-motion';
import { CircleDollarSign } from 'lucide-react';

export function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 2.5 }}
    >
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.2, 1, 120] }}
        transition={{
          duration: 2.5,
          times: [0, 0.4, 0.8, 1],
          ease: "easeInOut",
        }}
      >
        <CircleDollarSign className="h-24 w-24 text-primary" />
      </motion.div>
    </motion.div>
  );
}
