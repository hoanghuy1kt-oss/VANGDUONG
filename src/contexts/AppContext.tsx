'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppUser, Project, Transaction } from '@/types';
import { PROJECTS } from '@/constants';
import { DEMO_TRANSACTIONS } from '@/lib/demo-transactions';
import { Timestamp, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { subscribeToAllTransactions, subscribeToAllProjects, subscribeToAllUsers } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

// Extend models for memory state
export interface StoreUser extends AppUser {
  id: string; // firebase docs usually have string ids
  active: boolean;
  joinDate: string;
  mustChangePwd?: boolean;
  name?: string;
  isHidden?: boolean;
}

interface AppContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  users: StoreUser[];
  setUsers: React.Dispatch<React.SetStateAction<StoreUser[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  isFirebaseLoaded: boolean;
  
  dashboardFilter: { year: string; quarter: string; month: string; filterProjects: string[] };
  setDashboardFilter: React.Dispatch<React.SetStateAction<{ year: string; quarter: string; month: string; filterProjects: string[] }>>;
  
  reportsFilter: { year: string; quarter: string; month: string; filterProjects: string[] };
  setReportsFilter: React.Dispatch<React.SetStateAction<{ year: string; quarter: string; month: string; filterProjects: string[] }>>;
  
  transactionFilters: any;
  setTransactionFilters: React.Dispatch<React.SetStateAction<any>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};

// INITIAL MOCK DATA
const INITIAL_PROJECTS: Project[] = PROJECTS.map(p => ({
  ...p, isActive: true, isHidden: false, excludeFromReports: false
}));

const INITIAL_USERS: StoreUser[] = [
  { 
    id: 1, 
    uid: 'admin_1', 
    displayName: 'Hoàng Huy', 
    name: 'Hoàng Huy', 
    email: 'hoanghuy1kt@gmail.com', 
    role: 'admin', 
    active: true, 
    joinDate: '07/04/2026', 
    assignedProjects: [], 
    createdAt: Timestamp.now(), 
    mustChangePwd: true,
    isHidden: true, // Xóa khỏi danh sách hiển thị
  }
] as any[]; 
// We type cast this because we appended local fields `id, name, active...`

export function AppProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [users, setUsers] = useState<StoreUser[]>(INITIAL_USERS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);

  // Filters State Persistence
  const currentYear = new Date().getFullYear().toString();
  const [dashboardFilter, setDashboardFilter] = useState({ year: currentYear, quarter: 'all', month: 'all', filterProjects: [] as string[] });
  const [reportsFilter, setReportsFilter] = useState({ year: currentYear, quarter: 'all', month: 'all', filterProjects: [] as string[] });
  const [transactionFilters, setTransactionFilters] = useState<any>({
    month: '',
    project: 'all',
    description: '',
    category: 'all',
    income: 'all',
    expense: 'all',
    lockStatus: 'all',
    invoice: 'all',
  });

  // KẾT NỐI FIREBASE DB
  React.useEffect(() => {
    // Để tối ưu và không dính delay login, ta seed data nếu collection rỗng (Chỉ chạy 1 lần cho dự án trắng)
    const seedInitialDataIfNeeded = async () => {
      try {
        const db = getFirebaseDb();
        if (!db) return;
        const usersSnap = await getDocs(collection(db, 'users'));
        if (usersSnap.empty) {
          console.log("Database trống. Đang seed dữ liệu cơ sở...");
          
          // Seed the master admin via our custom API so it creates the Auth record securely
          for (const u of INITIAL_USERS) {
            try {
              await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: u.email,
                  displayName: u.name || u.displayName,
                  role: u.role,
                  assignedProjects: u.assignedProjects
                })
              });
            } catch (err) {
              console.error("Lỗi seed user:", err);
            }
          }

          // Seed the initial projects directly
          const batch = writeBatch(db);
          INITIAL_PROJECTS.forEach(p => batch.set(doc(collection(db, 'projects'), p.code), p));
          await batch.commit();
        }
      } catch (e) {
        console.error("Lỗi seed data context", e);
      }
    };
    
    if (!firebaseUser) {
       setIsFirebaseLoaded(true);
       return;
    }

    seedInitialDataIfNeeded().then(() => setIsFirebaseLoaded(true));

    const unsubTxs = subscribeToAllTransactions((txs) => setTransactions(txs));
    const unsubProjs = subscribeToAllProjects((projs) => {
      if (projs.length > 0) setProjects(projs as Project[]);
    });
    const unsubUsers = subscribeToAllUsers((usrs) => {
      if (usrs.length > 0) setUsers(usrs as StoreUser[]);
    });

    return () => {
      unsubTxs();
      unsubProjs();
      unsubUsers();
    };
  }, [firebaseUser]);

  return (
    <AppContext.Provider value={{ 
      projects, setProjects, 
      users, setUsers, 
      transactions, setTransactions,
      isFirebaseLoaded,
      dashboardFilter, setDashboardFilter,
      reportsFilter, setReportsFilter,
      transactionFilters, setTransactionFilters
    }}>
      {children}
    </AppContext.Provider>
  );
}
