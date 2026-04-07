import { Category, CategoryCode, Project } from '@/types';

export const PROJECTS: Project[] = [];

export const CATEGORIES: Category[] = [
  { code: 'A', name: 'Quỹ lương & BHXH', description: 'Lương nhân viên, bảo hiểm xã hội', color: '#3B82F6' },
  { code: 'B', name: 'Sinh hoạt GĐ & VP', description: 'Chi phí sinh hoạt gia đình và văn phòng', color: '#10B981' },
  { code: 'C', name: 'Y tế & Thuốc', description: 'Chi phí y tế, thuốc men', color: '#EF4444' },
  { code: 'D', name: 'Giáo dục con', description: 'Học phí, sách vở, hoạt động ngoại khóa', color: '#F59E0B' },
  { code: 'E', name: 'Đầu tư & Tiết kiệm', description: 'Đầu tư, tiết kiệm, tích lũy', color: '#8B5CF6' },
  { code: 'F', name: 'Chi phí khác', description: 'Các chi phí không thuộc A-E', color: '#6B7280' },
];

export const CATEGORY_MAP: Record<CategoryCode, Category> = {
  A: CATEGORIES[0],
  B: CATEGORIES[1],
  C: CATEGORIES[2],
  D: CATEGORIES[3],
  E: CATEGORIES[4],
  F: CATEGORIES[5],
};

export const getCategoryByCode = (code: CategoryCode): Category => {
  return CATEGORY_MAP[code];
};

export const getProjectByCode = (code: string): Project | undefined => {
  return PROJECTS.find(p => p.code === code);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: Date | string | { toDate?: () => Date }): string => {
  const d =
    typeof date === 'string'
      ? new Date(date)
      : date instanceof Date
        ? date
        : typeof (date as { toDate?: () => Date }).toDate === 'function'
          ? (date as { toDate: () => Date }).toDate()
          : new Date();
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
};

export const getMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};
