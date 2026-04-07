import { z } from 'zod';

// Loại giao dịch
export const TransactionTypeEnum = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);

// Lược đồ tạo mới Giao dịch
export const CreateTransactionSchema = z.object({
  amount: z.string().or(z.number())
    .refine((val) => Number(val) > 0, "Số tiền phải lớn hơn 0"),
  type: TransactionTypeEnum,
  categoryId: z.string().min(1, "Danh mục không được để trống"),
  date: z.string().datetime().or(z.date()),
  notes: z.string().max(255, "Ghi chú không được vượt quá 255 ký tự").optional(),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type TransactionType = z.infer<typeof TransactionTypeEnum>;
