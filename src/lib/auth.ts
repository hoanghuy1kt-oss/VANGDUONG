'use client';

import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import { AppUser } from '@/types';

export const loginWithEmail = async (email: string, password: string) => {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase chưa được khởi tạo');
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signOut = async () => {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase chưa được khởi tạo');
  await firebaseSignOut(auth);
};

export const getCurrentUser = (): FirebaseUser | null => {
  const auth = getFirebaseAuth();
  return auth?.currentUser || null;
};

export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const auth = getFirebaseAuth();
  if (!auth) {
    // Demo mode - no Firebase, call callback with null
    callback(null);
    return () => {};
  }
  
  return onAuthStateChanged(auth, callback);
};

export const getUserProfile = async (uid: string): Promise<AppUser | null> => {
  try {
    const db = getFirebaseDb();
    if (!db) return null;
    
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as AppUser;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const createUserProfile = async (
  user: FirebaseUser, 
  role: 'admin' | 'user' = 'user', 
  assignedProjects: string[] = []
): Promise<void> => {
  try {
    const db = getFirebaseDb();
    if (!db) return;
    
    const { Timestamp } = await import('firebase/firestore');
    
    const userProfile: AppUser = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      role,
      assignedProjects,
      createdAt: Timestamp.now(),
    };
    await setDoc(doc(db, 'users', user.uid), userProfile);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};
