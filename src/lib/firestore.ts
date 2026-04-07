'use client';

import { getFirebaseDb } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  QueryConstraint,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { CategoryCode, FilterOptions, Transaction, Project, PeriodLock } from '@/types';
import { getMonthString, getWeekNumber } from '@/constants';

export const getTransactionsRef = () => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  return collection(db, 'transactions');
};

export const getPeriodLocksRef = () => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  return collection(db, 'periodLocks');
};

export const addTransaction = async (
  data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'month' | 'weekNumber' | 'isLocked'>
): Promise<string> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  
  const transactionsRef = collection(db, 'transactions');
  const now = Timestamp.now();
  
  const dateValue = data.date;
  let dateObj: Date;
  if (dateValue instanceof Timestamp) {
    dateObj = dateValue.toDate();
  } else if (dateValue instanceof Date) {
    dateObj = dateValue;
  } else {
    dateObj = new Date(dateValue);
  }
  
  const transactionData = {
    ...data,
    month: getMonthString(dateObj),
    weekNumber: getWeekNumber(dateObj),
    isLocked: false,
    createdAt: now,
    updatedAt: now,
  };
  
  const docRef = await addDoc(transactionsRef, transactionData);
  return docRef.id;
};

export const updateTransaction = async (id: string, data: Partial<Transaction>): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  
  const transactionRef = doc(db, 'transactions', id);
  await updateDoc(transactionRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  
  const transactionRef = doc(db, 'transactions', id);
  await deleteDoc(transactionRef);
};

export const getTransaction = async (id: string): Promise<Transaction | null> => {
  const db = getFirebaseDb();
  if (!db) return null;
  
  const transactionDoc = await getDoc(doc(db, 'transactions', id));
  if (transactionDoc.exists()) {
    return { id: transactionDoc.id, ...transactionDoc.data() } as Transaction;
  }
  return null;
};

export const getTransactions = async (filters?: FilterOptions): Promise<Transaction[]> => {
  const db = getFirebaseDb();
  if (!db) return [];
  
  const transactionsRef = collection(db, 'transactions');
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')];
  
  if (filters?.projectCode) {
    constraints.unshift(where('projectCode', '==', filters.projectCode));
  }
  
  if (filters?.month) {
    constraints.unshift(where('month', '==', filters.month));
  }
  
  if (filters?.categoryCode) {
    constraints.unshift(where('categoryCode', '==', filters.categoryCode));
  }
  
  if (filters?.performedBy) {
    constraints.unshift(where('performedBy', '==', filters.performedBy));
  }
  
  const q = query(transactionsRef, ...constraints);
  const snapshot = await getDocs(q);
  
  let transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  
  if (filters?.startDate) {
    transactions = transactions.filter(t => {
      const txDate = t.date instanceof Timestamp ? t.date.toDate() : new Date(t.date);
      return txDate >= filters.startDate!;
    });
  }
  
  if (filters?.endDate) {
    transactions = transactions.filter(t => {
      const txDate = t.date instanceof Timestamp ? t.date.toDate() : new Date(t.date);
      return txDate <= filters.endDate!;
    });
  }
  
  return transactions;
};

// Projects
export const addProject = async (data: Project): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  // Use project code as document ID for easier references
  await setDoc(doc(db, 'projects', data.code), data);
};

export const updateProject = async (code: string, data: Partial<Project>): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  await updateDoc(doc(db, 'projects', code), data);
};

export const deleteProject = async (code: string): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  
  const batch = writeBatch(db);
  
  // 1. Mark the project document for deletion
  batch.delete(doc(db, 'projects', code));
  
  // 2. Fetch all transactions associated with this project to cascade delete
  const transactionsQuery = query(
    collection(db, 'transactions'),
    where('projectCode', '==', code)
  );
  
  const snapshot = await getDocs(transactionsQuery);
  snapshot.docs.forEach(docSnap => {
    batch.delete(docSnap.ref);
  });
  
  // 3. Commit the batched deletions
  await batch.commit();
};

// Users
export const addUser = async (data: any): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  await addDoc(collection(db, 'users'), data);
};

export const updateUser = async (id: string, data: Partial<any>): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  await updateDoc(doc(db, 'users', id), data);
};

export const deleteUser = async (id: string): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  await deleteDoc(doc(db, 'users', id));
};

export const subscribeToTransactions = (
  filters: FilterOptions,
  callback: (transactions: Transaction[]) => void
) => {
  const db = getFirebaseDb();
  if (!db) return () => {};
  
  const transactionsRef = collection(db, 'transactions');
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')];
  
  if (filters.projectCode) {
    constraints.unshift(where('projectCode', '==', filters.projectCode));
  }
  
  if (filters.month) {
    constraints.unshift(where('month', '==', filters.month));
  }
  
  const q = query(transactionsRef, ...constraints);
  
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    callback(transactions);
  });
};

export const subscribeToAllTransactions = (callback: (transactions: Transaction[]) => void) => {
  const db = getFirebaseDb();
  if (!db) return () => {};
  const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
  });
};

export const subscribeToAllProjects = (callback: (projects: any[]) => void) => {
  const db = getFirebaseDb();
  if (!db) return () => {};
  return onSnapshot(collection(db, 'projects'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const subscribeToAllUsers = (callback: (users: any[]) => void) => {
  const db = getFirebaseDb();
  if (!db) return () => {};
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const lockTransaction = async (id: string, userId: string): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  
  const transactionRef = doc(db, 'transactions', id);
  await updateDoc(transactionRef, {
    isLocked: true,
    lockedAt: Timestamp.now(),
    lockedBy: userId,
    updatedAt: Timestamp.now(),
  });
};

export const unlockTransaction = async (id: string): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  
  const transactionRef = doc(db, 'transactions', id);
  await updateDoc(transactionRef, {
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    updatedAt: Timestamp.now(),
  });
};

export const lockPeriod = async (
  periodId: string,
  type: 'month' | 'week',
  userId: string,
  projectCode?: string
): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  
  const lockData = {
    id: periodId,
    type,
    isLocked: true,
    lockedAt: Timestamp.now(),
    lockedBy: userId,
    projectCode: projectCode || null,
  };
  
  const periodRef = doc(db, 'periodLocks', periodId);
  await setDoc(periodRef, lockData);
  
  const transactionsQuery = query(
    collection(db, 'transactions'),
    where('month', '==', periodId)
  );
  const transactionDocs = await getDocs(transactionsQuery);
  
  for (const txDoc of transactionDocs.docs) {
    await updateDoc(doc(db, 'transactions', txDoc.id), {
      isLocked: true,
      lockedAt: Timestamp.now(),
      lockedBy: userId,
      updatedAt: Timestamp.now(),
    });
  }
};

export const unlockPeriod = async (periodId: string): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase chưa được khởi tạo');
  
  const periodRef = doc(db, 'periodLocks', periodId);
  await updateDoc(periodRef, {
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
  });
  
  const transactionsQuery = query(
    collection(db, 'transactions'),
    where('month', '==', periodId)
  );
  const transactionDocs = await getDocs(transactionsQuery);
  
  for (const txDoc of transactionDocs.docs) {
    await updateDoc(doc(db, 'transactions', txDoc.id), {
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
      updatedAt: Timestamp.now(),
    });
  }
};

export const getPeriodLock = async (periodId: string): Promise<PeriodLock | null> => {
  const db = getFirebaseDb();
  if (!db) return null;
  
  const lockDoc = await getDoc(doc(db, 'periodLocks', periodId));
  if (lockDoc.exists()) {
    return lockDoc.data() as PeriodLock;
  }
  return null;
};

export const getDashboardSummary = async (projectCode?: string): Promise<{
  totalIncome: number;
  totalExpense: number;
  byCategory: Record<CategoryCode, number>;
}> => {
  const db = getFirebaseDb();
  if (!db) return { totalIncome: 0, totalExpense: 0, byCategory: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 } };
  
  const constraints: QueryConstraint[] = [];
  
  if (projectCode) {
    constraints.push(where('projectCode', '==', projectCode));
  }
  
  const q = query(collection(db, 'transactions'), ...constraints);
  const snapshot = await getDocs(q);
  
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<CategoryCode, number> = {
    A: 0, B: 0, C: 0, D: 0, E: 0, F: 0
  };
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    totalIncome += data.income || 0;
    totalExpense += data.expense || 0;
    if (data.categoryCode && data.expense > 0) {
      byCategory[data.categoryCode as CategoryCode] += data.expense;
    }
  });
  
  return { totalIncome, totalExpense, byCategory };
};
