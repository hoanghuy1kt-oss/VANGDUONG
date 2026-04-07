import { Transaction } from '@/types';

export const DEMO_TRANSACTIONS: Transaction[] = [];

export const getDemoMonthOptionsDescending = (): string[] => {
  return [new Date().toISOString().substring(0, 7)];
};
