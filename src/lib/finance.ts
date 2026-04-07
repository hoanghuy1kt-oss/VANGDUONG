import Decimal from 'decimal.js';

// Cấu hình chuẩn Decimal cho hệ thống tài chính
// Giới hạn số thập phân làm tròn (thường là 2 với USD, 0 với VND)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class FinanceMath {
  /**
   * Khởi tạo một số tiền an toàn (tránh lỗi float point)
   */
  static from(value: number | string | Decimal): Decimal {
    try {
      return new Decimal(value);
    } catch {
      return new Decimal(0);
    }
  }

  /**
   * Định dạng tiền tệ cho UI hiển thị
   */
  static format(
    amount: number | string | Decimal,
    currency: 'VND' | 'USD' = 'VND'
  ): string {
    const value = this.from(amount);

    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(value.toNumber());
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value.toNumber());
  }

  /**
   * Cộng (+) số tiền an toàn
   */
  static add(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.from(a).plus(this.from(b));
  }

  /**
   * Trừ (-) số tiền an toàn
   */
  static sub(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.from(a).minus(this.from(b));
  }

  /**
   * Trích xuất số nguyên lưu vào CSDL (ví dụ lưu dạng cent để tránh sai sót lẻ)
   */
  static toDBInt(value: number | string | Decimal): number {
    // Với VND thường không có cent nên bằng chính nó
    // Nếu USD, nhân 100
    return this.from(value).round().toNumber();
  }
}
