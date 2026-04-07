'use server';

import { CreateTransactionSchema, CreateTransactionInput } from './schemas';
import { FinanceMath } from '@/lib/finance';
// import { db } from '@/lib/firebase'; // Sẽ dùng database module

export async function createTransactionAction(input: CreateTransactionInput) {
  try {
    // 1. CHẶN GÁC BẢO MẬT BẰNG ZOD
    const parsedData = CreateTransactionSchema.parse(input);

    // 2. CHUẨN HOÁ TÀI CHÍNH
    const safeAmount = FinanceMath.from(parsedData.amount).toNumber();

    // 3. THAO TÁC CƠ SỞ DỮ LIỆU
    // Ở đây sẽ viết logic insert vào Firebase
    console.log('Lưu vào DB số tiền:', safeAmount, 'Loại:', parsedData.type);

    return {
      success: true,
      message: 'Lưu giao dịch thành công'
    };

  } catch (error: any) {
    // Nếu lỗi từ Zod
    if (error.issues) {
      return { success: false, message: 'Dữ liệu đầu vào không hợp lệ', errors: error.issues };
    }
    
    return { success: false, message: error.message || 'Lỗi hệ thống khi lưu giao dịch' };
  }
}
