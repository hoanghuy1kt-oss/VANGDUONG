'use client';

import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Force password change removed

  if (loading || !firebaseUser) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <Header />
      <main className="container flex-1 px-4 sm:px-6 lg:px-8 py-8 md:pb-8 pb-24 mx-auto max-w-[1400px]">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
