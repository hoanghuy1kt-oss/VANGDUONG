'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCAFPXLW57GQZMvy-TO9teupWug5Ubf6B0",
  authDomain: "hethongquanly-ffdbd.firebaseapp.com",
  projectId: "hethongquanly-ffdbd",
  storageBucket: "hethongquanly-ffdbd.firebasestorage.app",
  messagingSenderId: "507781882569",
  appId: "1:507781882569:web:b37b064d5316eefc59a318"
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export const initializeFirebase = () => {
  if (typeof window === 'undefined') return null;
  
  if (!app && !getApps().length) {
    app = initializeApp(firebaseConfig);
  } else if (!app) {
    app = getApps()[0];
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  return { app, auth, db, storage };
};

export const getFirebaseAuth = (): Auth | null => {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
};

export const getFirebaseDb = (): Firestore | null => {
  if (!db) {
    initializeFirebase();
  }
  return db;
};

export const getFirebaseStorage = (): FirebaseStorage | null => {
  if (!storage) {
    initializeFirebase();
  }
  return storage;
};

export { app, auth, db, storage };
