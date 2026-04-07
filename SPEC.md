# HỆ THỐNG QUẢN LÝ TÀI CHÍNH - SPEC.md

## 1. Tổng Quan Dự Án

### 1.1 Mục Tiêu
Xây dựng Web Application "Tổng hành dinh" quản trị tài chính cho Văn phòng Trung tâm và các dự án vệ tinh (EcofarmSB, Villa Phú Quốc, Homestay...).

### 1.2 Triết Lý
"Kỷ luật sắt: Không hóa đơn - Không tiền"

### 1.3 Tech Stack
- **Frontend**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend & Database**: Firebase (Firestore, Auth)
- **Storage**: Google Drive API
- **Visualization**: Recharts
- **Language**: TypeScript

---

## 2. Phân Quyền (RBAC)

### 2.1 Vai trò

| Vai trò | Quyền hạn |
|---------|-----------|
| **Admin** (Chủ tịch/CEO) | Xem tất cả dữ liệu, Chốt sổ/Mở khóa, Dashboard tổng hợp |
| **User** (Giám đốc dự án) | Chỉ xem/nhập trong dự án được phân quyền |

### 2.2 Cấu trúc dữ liệu người dùng
```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  assignedProjects: string[]; // ['DA0', 'DA1', 'DA2']
  createdAt: Timestamp;
}
```

---

## 3. Cấu Trúc Dữ Liệu

### 3.1 Mã Dự Án
- `DA0` - Văn phòng Trung tâm
- `DA1` - EcofarmSB
- `DA2` - Villa Phú Quốc
- `DA3` - Homestay

### 3.2 Phân Loại Chi Phí (Mã A-F)

| Mã | Tên | Mô tả |
|----|-----|-------|
| A | Quỹ lương & BHXH | Lương nhân viên, bảo hiểm xã hội |
| B | Sinh hoạt GĐ & VP | Chi phí sinh hoạt gia đình và văn phòng |
| C | Y tế & Thuốc | Chi phí y tế, thuốc men |
| D | Giáo dục con | Học phí, sách vở, hoạt động ngoại khóa |
| E | Đầu tư & Tiết kiệm | Đầu tư, tiết kiệm, tích lũy |
| F | Chi phí khác | Các chi phí không thuộc A-E |

### 3.3 Cấu trúc Giao dịch (Transaction)
```typescript
interface Transaction {
  id: string;
  date: Timestamp;
  description: string;
  income: number;        // Số tiền Thu
  expense: number;       // Số tiền Chi
  projectCode: string;   // DA0, DA1, DA2...
  categoryCode: string;  // A, B, C, D, E, F
  subCategory: string;   // Tên mục con linh hoạt
  performedBy: string;   // UID người thực hiện
  performedByName: string;
  isLocked: boolean;     // Trạng thái khóa
  lockedAt?: Timestamp;
  lockedBy?: string;
  invoiceUrl?: string;   // Direct link từ Google Drive
  invoiceName?: string;
  month: string;         // Format: YYYY-MM
  weekNumber?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3.4 Cấu trúc Tháng/Tuần
```typescript
interface PeriodLock {
  id: string;            // Format: YYYY-MM hoặc YYYY-WW
  type: 'month' | 'week';
  isLocked: boolean;
  lockedAt?: Timestamp;
  lockedBy?: string;
  projectCode?: string;  // undefined = tất cả
}
```

---

## 4. Firestore Collections

```
/users/{uid}
  - email, displayName, role, assignedProjects[], createdAt

/transactions/{transactionId}
  - date, description, income, expense, projectCode, categoryCode
  - subCategory, performedBy, performedByName, isLocked
  - lockedAt, lockedBy, invoiceUrl, invoiceName, month, weekNumber

/periodLocks/{periodId}
  - type, isLocked, lockedAt, lockedBy, projectCode

/projectCategories/{projectCode}
  - name, subCategories[]  // Cho phép tùy chỉnh mục con
```

---

## 5. Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Transactions
    match /transactions/{transactionId} {
      allow read: if request.auth != null 
        && (request.auth.token.admin == true 
            || resource.data.projectCode in request.auth.token.assignedProjects);
      
      allow create: if request.auth != null 
        && (request.auth.token.admin == true 
            || resource.data.projectCode in request.auth.token.assignedProjects);
      
      allow update, delete: if request.auth.token.admin == true
        || (resource.data.isLocked == false 
            && request.resource.data.isLocked == false
            && request.auth.token.admin != true);
    }
    
    // Period locks
    match /periodLocks/{periodId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

---

## 6. Giao Diện

### 6.1 Layout Chính
```
┌─────────────────────────────────────────┐
│  Logo   │ Navigation     │ User │ Logout │
├─────────┴────────────────┴──────┴───────┤
│                                         │
│           Main Content Area             │
│                                         │
└─────────────────────────────────────────┘
```

### 6.2 Trang Dashboard
- **Tổng quan**: Tổng thu, Tổng chi, Chênh lệch
- **Biểu đồ tròn**: Phân tích tỷ trọng chi phí A-F
- **Biểu đồ cột**: Thu chi theo tháng
- **Danh sách dự án**: Cards hiển thị nhanh từng dự án

### 6.3 Trang Nhập Liệu
- Form nhập giao dịch với các trường:
  - Ngày (date picker)
  - Nội dung (text)
  - Thu/Chi (radio + number)
  - Mã Dự án (dropdown)
  - Mã Chi phí (A-F dropdown)
  - Mục con (text, có autocomplete)
  - Upload hóa đơn (drag & drop)

### 6.4 Trang Báo Cáo (Accordion)
```
I. TỔNG THU
   └── Danh sách các khoản thu

II. TỔNG CHI THEO MÃ
    ├── A. Quỹ lương & BHXH (Expandable)
    │   └── Các mục con + chi tiết
    ├── B. Sinh hoạt GĐ & VP (Expandable)
    └── ...

III. TỔNG CHI TOÀN BỘ

IV. CHÊNH LỆCH
```

### 6.5 Màu sắc theo Mã Chi Phí
- A: `#3B82F6` (Blue)
- B: `#10B981` (Green)
- C: `#EF4444` (Red)
- D: `#F59E0B` (Amber)
- E: `#8B5CF6` (Purple)
- F: `#6B7280` (Gray)

---

## 7. Tính Năng Lock/Unlock

### 7.1 Cơ chế
- Admin nhấn "Chốt sổ" → Tất cả giao dịch trong tuần/tháng chuyển `isLocked: true`
- Dòng bị khóa: Màu xám, không thể edit/delete
- Admin có quyền Unlock từng dòng để sửa lỗi

### 7.2 UI Indicators
- 🔓 Unlocked: Màu xanh lá, có thể chỉnh sửa
- 🔒 Locked: Màu xám, không thể chỉnh sửa
- Icon khóa nhỏ ở cuối mỗi dòng (Admin thấy)

---

## 8. Google Drive Integration

### 8.1 Quy trình Upload
1. User chọn file (ảnh hóa đơn)
2. File được upload lên thư mục Firebase Storage
3. Hoặc upload trực tiếp lên Google Drive qua API
4. Lưu `invoiceUrl` (Direct View Link) vào Firestore

### 8.2 Cấu trúc thư mục Drive
```
/FinanceApp
  /DA0_VanPhong
    /2026-04
      /invoice_xxx.jpg
  /DA1_EcofarmSB
  /DA2_VillaPhuQuoc
```

---

## 9. Cấu trúc Folder

```
/HETHONGQUANLY
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── reports/
│   │   └── layout.tsx
│   ├── api/
│   │   └── drive/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/              # shadcn components
│   ├── auth/
│   ├── dashboard/
│   ├── transactions/
│   ├── reports/
│   └── layout/
├── lib/
│   ├── firebase.ts
│   ├── auth.ts
│   ├── firestore.ts
│   └── drive.ts
├── hooks/
├── types/
├── constants/
├── .env.local
├── firebase.json
└── SPEC.md
```

---

## 10. API Endpoints

### 10.1 Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/session` - Lấy session

### 10.2 Transactions
- `GET /api/transactions` - Lấy danh sách (filter by project, month)
- `POST /api/transactions` - Tạo mới
- `PATCH /api/transactions/:id` - Cập nhật
- `DELETE /api/transactions/:id` - Xóa

### 10.3 Lock/Unlock
- `POST /api/lock` - Chốt sổ period
- `POST /api/unlock` - Mở khóa period
- `POST /api/transactions/:id/unlock` - Unlock 1 dòng

### 10.4 Reports
- `GET /api/reports/monthly?project=X&month=YYYY-MM` - Báo cáo tháng
- `GET /api/reports/summary` - Tổng hợp

---

## 11. Môi Trường Development

### 11.1 Variables cần thiết (.env.local)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_SERVICE_ACCOUNT=
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=
```

---

## 12. Testing Checklist

- [ ] Đăng nhập/Đăng xuất
- [ ] Phân quyền Admin vs User
- [ ] CRUD Transactions
- [ ] Lock/Unlock
- [ ] Upload hóa đơn lên Drive
- [ ] Xem Lightbox hóa đơn
- [ ] Dashboard charts
- [ ] Accordion reports
- [ ] Filter theo dự án/tháng
- [ ] Responsive mobile
