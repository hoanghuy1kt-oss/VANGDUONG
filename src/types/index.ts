import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedProjects: string[];
  createdAt: Date | Timestamp;
}

export type CategoryCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Transaction {
  id: string;
  date: Date | Timestamp;
  description: string;
  income: number;
  expense: number;
  projectCode: string;
  categoryCode: CategoryCode;
  subCategory: string;
  createdBy?: string; // Tên nhân viên đã thêm giao dịch này
  performedBy: string;
  performedByName: string;
  isLocked: boolean;
  lockedAt?: Date | Timestamp;
  lockedBy?: string;
  invoiceUrl?: string; // Sẽ deprecate sau
  invoiceName?: string; // Sẽ deprecate sau
  attachments?: { name: string; url: string; id: string }[];
  month: string;
  weekNumber?: number;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export interface Project {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isHidden?: boolean;
  excludeFromReports?: boolean;
}

export interface Category {
  code: CategoryCode;
  name: string;
  description: string;
  color: string;
}

export interface PeriodLock {
  id: string;
  type: 'month' | 'week';
  isLocked: boolean;
  lockedAt?: Date | Timestamp;
  lockedBy?: string;
  projectCode?: string;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: Record<CategoryCode, number>;
  byProject: Record<string, { income: number; expense: number }>;
}

export interface MonthlyReport {
  month: string;
  projectCode?: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categories: Record<CategoryCode, CategoryReport>;
}

export interface CategoryReport {
  code: CategoryCode;
  name: string;
  total: number;
  subCategories: SubCategoryReport[];
}

export interface SubCategoryReport {
  name: string;
  total: number;
  transactions: Transaction[];
}

export interface FilterOptions {
  projectCode?: string;
  month?: string;
  categoryCode?: CategoryCode;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
}
