import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CATEGORIES } from '@/constants';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction, CategoryCode } from '@/types';
import { Edit, Upload, Loader2, X } from 'lucide-react';
import { FinanceMath } from '@/lib/finance';
import imageCompression from 'browser-image-compression';
import { updateTransaction } from '@/lib/firestore';

interface EditTransactionDialogProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTransaction?: () => void;
}

export function EditTransactionDialog({ transaction, open, onOpenChange, onUpdateTransaction }: EditTransactionDialogProps) {
  const { projects: globalProjects } = useAppContext();
  const { user } = useAuth();
  
  const visibleProjects = globalProjects.filter(p => {
    if (p.excludeFromReports || p.isHidden) return false;
    if (user?.role === 'admin') return true;
    if (user?.role === 'user' && user.assignedProjects?.includes(p.code)) return true;
    return false;
  });

  const formatDateString = (date: any) => {
    if (!date) return new Date().toISOString().split('T')[0];
    if (date.toDate) return date.toDate().toISOString().split('T')[0];
    if (date instanceof Date) return date.toISOString().split('T')[0];
    return new Date(date).toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    date: formatDateString(transaction.date),
    description: transaction.description || '',
    type: (transaction.income || 0) > 0 ? 'income' as const : 'expense' as const,
    amount: (transaction.income || 0) > 0 ? FinanceMath.format(transaction.income) : FinanceMath.format(transaction.expense),
    projectCode: transaction.projectCode || '',
    categoryCode: (transaction.categoryCode as CategoryCode) || '',
    subCategory: transaction.subCategory || '',
  });

  const [existingFiles, setExistingFiles] = useState<{name: string, url: string, id: string}[]>(transaction.attachments || []);
  
  // Xử lý hóa đơn cũ (invoiceUrl) nếu chưa được chuyển sang attachments
  useEffect(() => {
    if (!transaction.attachments || transaction.attachments.length === 0) {
      if (transaction.invoiceUrl) {
         setExistingFiles([{
           name: transaction.invoiceName || 'invoice',
           url: transaction.invoiceUrl,
           id: 'old'
         }]);
      } else {
         setExistingFiles([]);
      }
    } else {
      setExistingFiles(transaction.attachments);
    }
  }, [transaction]);

  useEffect(() => {
    if (open) {
      setFormData({
        date: formatDateString(transaction.date),
        description: transaction.description || '',
        type: (transaction.income || 0) > 0 ? 'income' : 'expense',
        amount: (transaction.income || 0) > 0 ? FinanceMath.format(transaction.income) : FinanceMath.format(transaction.expense),
        projectCode: transaction.projectCode || '',
        categoryCode: (transaction.categoryCode as CategoryCode) || '',
        subCategory: transaction.subCategory || '',
      });
    }
  }, [open, transaction]);

  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const { categoryGroups } = useAppContext();
  const selectedProject = visibleProjects.find(p => p.code === formData.projectCode);
  const selectedGroup = categoryGroups.find(g => g.id === (selectedProject?.categoryGroupId || 'DEFAULT'));
  const currentCategories = selectedGroup?.categories || CATEGORIES;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsCompressing(true);
    const newFiles = Array.from(e.target.files);
    const processedFiles: File[] = [];

    for (const file of newFiles) {
      if (file.type.startsWith('image/')) {
        try {
          const options = {
            maxSizeMB: 1.8, 
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          const compressedBlob = await imageCompression(file, options);
          processedFiles.push(new File([compressedBlob], file.name, { type: compressedBlob.type }));
        } catch (error) {
          console.error("Compression error:", error);
          if (file.size <= 5 * 1024 * 1024) processedFiles.push(file);
        }
      } else {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File "${file.name}" vượt qua giới hạn 5MB và đã bị loại bỏ!`);
        } else {
          processedFiles.push(file);
        }
      }
    }
    
    if (processedFiles.length > 0) {
      setFiles(prev => [...prev, ...processedFiles]);
    }
    
    setIsCompressing(false);
    e.target.value = ''; 
  };

  const handleRemoveExistingFile = (idx: number) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveNewFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    let attachments: { name: string; url: string; id: string }[] = [...existingFiles];

    try {
      if (files && files.length > 0) {
        // Upload tất cả files mới đồng thời
        const uploadPromises = files.map(async (fileObj) => {
          const formDataUpload = new FormData();
          formDataUpload.append('file', fileObj);
          formDataUpload.append('projectCode', formData.projectCode || 'DA0');
          
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formDataUpload
          });
          
          if (!res.ok) {
            const err = await res.json();
            throw new Error(`Upload ${fileObj.name} thất bại: ` + err.error);
          }
          
          const data = await res.json();
          return { name: fileObj.name, url: data.url, id: data.fileId };
        });
        
        const newUploadedFiles = await Promise.all(uploadPromises);
        attachments = [...attachments, ...newUploadedFiles];
      }
      
      const rawAmountStr = String(formData.amount).replace(/\D/g, '');
      const safeAmount = FinanceMath.from(rawAmountStr).toNumber();
      
      const updatedTx: Partial<Transaction> = {
        date: new Date(formData.date),
        description: formData.description,
        income: formData.type === 'income' ? safeAmount : 0,
        expense: formData.type === 'expense' ? safeAmount : 0,
        projectCode: formData.projectCode || 'DA0',
        categoryCode: formData.categoryCode || (currentCategories[0]?.code || ''),
        subCategory: formData.subCategory,
        month: formData.date.slice(0, 7),
        attachments,
      };
      
      await updateTransaction(transaction.id, updatedTx);
      if (onUpdateTransaction) onUpdateTransaction();
      onOpenChange(false);
      setFiles([]);
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl px-4 sm:px-6 w-[95vw] rounded-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Chỉnh sửa Giao Dịch</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin chi tiết của giao dịch.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="edit-date">Ngày thao tác</Label>
              <Input id="edit-date" type="date" max={new Date().toISOString().split('T')[0]} value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="focus:ring-2 h-10" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="edit-type">Phân loại</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as 'income' | 'expense' })}>
                <SelectTrigger className="focus:ring-2 uppercase font-medium h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income" className="text-green-600 font-semibold">Tăng thu</SelectItem>
                  <SelectItem value="expense" className="text-red-600 font-semibold">Ghi chi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="edit-description">Nội dung diễn giải</Label>
            <Input id="edit-description" placeholder="VD: Thu tiền cọc hợp đồng X..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required className="h-10" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="edit-amount">Số tiền quy đổi (VND)</Label>
              <Input 
                id="edit-amount" 
                type="text" 
                placeholder="Nhập số tiền..." 
                value={formData.type === 'expense' && formData.amount ? '-' + formData.amount : formData.amount} 
                className="h-10"
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  if (!rawValue) {
                    setFormData({ ...formData, amount: '' });
                    return;
                  }
                  const formattedValue = new Intl.NumberFormat('vi-VN').format(Number(rawValue));
                  setFormData({ ...formData, amount: formattedValue });
                }} 
                required 
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="edit-project">Dự án áp dụng</Label>
              <Select 
                value={formData.projectCode} 
                onValueChange={(v) => {
                  const p = visibleProjects.find(x => x.code === v);
                  const group = categoryGroups.find(g => g.id === (p?.categoryGroupId || 'DEFAULT'));
                  const newCats = group?.categories || CATEGORIES;
                  const validCat = newCats.some(c => c.code === formData.categoryCode) ? formData.categoryCode : '';
                  setFormData({ ...formData, projectCode: v, categoryCode: validCat as any });
                }} 
                required
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="-- Trống --" />
                </SelectTrigger>
                <SelectContent>
                  {visibleProjects.length === 0 ? (
                    <div className="p-2 text-sm text-center text-muted-foreground italic">Không có dự án khả dụng</div>
                  ) : (
                    visibleProjects.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        <span className="font-semibold text-primary">{p.code}</span> - {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="edit-category">Phân nhóm Chi Phí (Cost Code)</Label>
              <Select value={formData.categoryCode} onValueChange={(v) => setFormData({ ...formData, categoryCode: v as CategoryCode })} disabled={formData.type === 'income'}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={formData.type === 'income' ? 'Không áp dụng cho Thu' : 'Chọn danh mục mục chi'} />
                </SelectTrigger>
                <SelectContent>
                  {currentCategories.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-semibold" style={{ color: c.color }}>{c.code}</span> - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="edit-subCategory">Chi tiết Phụ chi (không bắt buộc)</Label>
              <Input id="edit-subCategory" placeholder="VD: Mua thuốc, Tiền lương..." value={formData.subCategory} onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })} className="h-10" />
            </div>
          </div>

          <div className="border border-border/50 rounded-xl p-4 space-y-4">
             <Label>Hóa đơn / Chứng từ</Label>
             
             {/* Danh sách file hiện tại */}
             {existingFiles.length > 0 && (
               <div className="space-y-2">
                 <p className="text-sm font-medium text-muted-foreground">File đã tải lên:</p>
                 <div className="flex flex-col gap-2">
                   {existingFiles.map((f, i) => (
                     <div key={`existing-${i}`} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg text-sm">
                       <span className="truncate max-w-[80%]">{f.name}</span>
                       <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => handleRemoveExistingFile(i)}>
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {/* Danh sách file mới thêm */}
             {files.length > 0 && (
               <div className="space-y-2">
                 <p className="text-sm font-medium text-muted-foreground">File mới chọn thêm:</p>
                 <div className="flex flex-col gap-2">
                   {files.map((f, i) => (
                     <div key={`new-${i}`} className="flex items-center justify-between bg-primary/5 border border-primary/20 p-2 rounded-lg text-sm">
                       <span className="truncate max-w-[80%]">{f.name}</span>
                       <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => handleRemoveNewFile(i)}>
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             <div className="border-2 border-dashed border-primary/20 rounded-lg p-4 hover:bg-primary/5 transition-colors text-center relative mt-2">
              <input 
                type="file" 
                multiple
                disabled={isCompressing || isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
              />
              {isCompressing ? (
                <div className="text-amber-600 font-medium flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Đang xử lý ảnh...</span>
                </div>
              ) : (
                <div className="text-primary font-medium flex items-center justify-center gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">Thêm file khác</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0 mt-4 sm:mt-0">
            <Button type="button" variant="ghost" onClick={() => { onOpenChange(false); setFiles([]); }} disabled={isUploading || isCompressing} className="w-full sm:w-auto h-11 sm:h-10">Hủy bỏ</Button>
            <Button type="submit" className="min-w-[120px] w-full sm:w-auto h-11 sm:h-10" disabled={isUploading || isCompressing}>
              {isUploading ? 'Đang lưu...' : 'Cập nhật'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
