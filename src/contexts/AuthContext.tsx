'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppUser } from '@/types';
import { Timestamp } from 'firebase/firestore';

interface AuthContextType {
  firebaseUser: { uid: string; email: string } | null;
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    let unsubscribeFirestore: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currUser) => {
      setFirebaseUser(currUser);
      
      if (currUser) {
        // Lấy thông tin role/phân quyền từ Firestore Realtime
        const db = getFirebaseDb();
        if (db) {
           unsubscribeFirestore = onSnapshot(doc(db, 'users', currUser.uid), (docSnap) => {
             if (docSnap.exists()) {
               setUser({ id: currUser.uid, ...docSnap.data() } as unknown as AppUser);
             } else {
               // AUTO-HEAL: Nếu là tài khoản Sếp nhưng mất Database thì tự tạo lại ngay lập tức
               if (currUser.email === 'hoanghuy1kt@gmail.com') {
                 import('firebase/firestore').then(({ setDoc }) => {
                   const superAdmin = {
                     uid: currUser.uid,
                     email: currUser.email,
                     name: 'Hoàng Huy (Admin)',
                     displayName: 'Hoàng Huy (Admin)',
                     role: 'admin',
                     assignedProjects: [],
                     active: true,
                     joinDate: new Date().toLocaleDateString('vi-VN'),
                     mustChangePwd: false
                   };
                   setDoc(doc(db, 'users', currUser.uid), superAdmin).then(() => {
                      setUser({ id: currUser.uid, ...superAdmin } as unknown as AppUser);
                   });
                 });
               } else {
                 setUser(null);
               }
             }
             setLoading(false);
           });
        } else {
           setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
        unsubscribeFirestore();
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      firebaseUser: firebaseUser as any, 
      user, 
      loading, 
      isAdmin 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
