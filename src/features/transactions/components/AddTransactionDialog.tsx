import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CATEGORIES } from '@/constants';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction, CategoryCode } from '@/types';
import { Plus, Upload, Loader2 } from 'lucide-react';
import { FinanceMath } from '@/lib/finance'; // <-- Dùng thư viện chuẩn hóa!
import imageCompression from 'browser-image-compression';

interface AddTransactionDialogProps {
  onAddTransaction: (tx: Transaction) => void;
}

export function AddTransactionDialog({ onAddTransaction }: AddTransactionDialogProps) {
  const { projects: globalProjects } = useAppContext();
  const { user } = useAuth();
  
  const visibleProjects = globalProjects.filter(p => {
    if (p.excludeFromReports || p.isHidden) return false;
    if (user?.role === 'admin') return true;
    if (user?.role === 'user' && user.assignedProjects?.includes(p.code)) return true;
    return false;
  });

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'expense' as 'income' | 'expense',
    amount: '',
    projectCode: '',
    categoryCode: '' as CategoryCode | '',
    subCategory: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsCompressing(true);
    const newFiles = Array.from(e.target.files);
    const processedFiles: File[] = [];

    for (const file of newFiles) {
      if (file.type.startsWith('image/')) {
        try {
          const options = {
            maxSizeMB: 1.8, // Limit safe default to under 2MB
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
    e.target.value = ''; // Reset input
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    let attachments: { name: string; url: string; id: string }[] = [];

    try {
      if (files && files.length > 0) {
        // Upload tất cả files đồng thời
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
        
        attachments = await Promise.all(uploadPromises);
      }
      
      const rawAmountStr = String(formData.amount).replace(/\D/g, '');
      const safeAmount = FinanceMath.from(rawAmountStr).toNumber();
      
      const newTx: Transaction = {
        id: Date.now().toString(),
        date: new Date(formData.date),
        description: formData.description,
        income: formData.type === 'income' ? safeAmount : 0,
        expense: formData.type === 'expense' ? safeAmount : 0,
        projectCode: formData.projectCode || 'DA0',
        categoryCode: (formData.categoryCode || 'F') as CategoryCode,
        subCategory: formData.subCategory,
        performedBy: 'demo',
        performedByName: 'Demo Admin',
        isLocked: false,
        month: formData.date.slice(0, 7),
        attachments,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      onAddTransaction(newTx);
      setOpen(false);
      setFiles([]);
      
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        type: 'expense',
        amount: '',
        projectCode: '',
        categoryCode: '',
        subCategory: '',
      });
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };
    
      // N/A replaced inside handleSubmit

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-sm transition-transform active:scale-95">
          <Plus className="h-4 w-4 mr-2" />
          Thêm Giao Dịch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl px-4 sm:px-6 w-[95vw] rounded-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Thêm Giao Dịch Mới</DialogTitle>
          <DialogDescription>
            Điền đầy đủ thông tin bên dưới. Mã chi phí bắt buộc đối với lệnh Chi.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="date">Ngày thao tác</Label>
              <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="focus:ring-2 h-10" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="type">Phân loại</Label>
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
            <Label htmlFor="description">Nội dung diễn giải</Label>
            <Input id="description" placeholder="VD: Thu tiền cọc hợp đồng X..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required className="h-10" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="amount">Số tiền quy đổi (VND)</Label>
              <Input 
                id="amount" 
                type="text" 
                placeholder="Nhập số tiền..." 
                value={formData.amount} 
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
              <Label htmlFor="project">Dự án áp dụng</Label>
              <Select value={formData.projectCode} onValueChange={(v) => setFormData({ ...formData, projectCode: v })} required>
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
              <Label htmlFor="category">Phân nhóm Chi Phí (Cost Code)</Label>
              <Select value={formData.categoryCode} onValueChange={(v) => setFormData({ ...formData, categoryCode: v as CategoryCode })} disabled={formData.type === 'income'}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={formData.type === 'income' ? 'Không áp dụng cho Thu' : 'Chọn danh mục mục chi'} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-semibold text-primary">{c.code}</span> - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="subCategory">Chi tiết Phụ chi (không bắt buộc)</Label>
              <Input id="subCategory" placeholder="VD: Mua thuốc, Tiền lương..." value={formData.subCategory} onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })} className="h-10" />
            </div>
          </div>

          <div className="border-2 border-dashed border-primary/20 rounded-xl p-5 sm:p-8 hover:bg-primary/5 transition-colors text-center relative">
            <input 
              type="file" 
              multiple
              disabled={isCompressing || isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
            />
            {isCompressing ? (
              <div className="text-amber-600 font-medium flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin mb-1" />
                <span className="text-sm">Đang nén tối ưu dung lượng ảnh...</span>
              </div>
            ) : files.length > 0 ? (
              <div className="text-primary font-medium flex flex-col items-center justify-center gap-2">
                <Upload className="h-5 w-5 mb-1" /> 
                <span className="text-sm">{files.length} tệp được chọn</span>
                <div className="flex flex-col items-center gap-1 mt-2 text-xs text-muted-foreground w-full px-4">
                  {files.slice(0, 3).map((f, i) => (
                     <div key={i} className="truncate w-full text-center">{f.name}</div>
                  ))}
                  {files.length > 3 && <div>... và {files.length - 3} tệp khác</div>}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); setFiles([]); }} className="h-6 mt-1 text-xs text-red-500 hover:text-red-600 relative z-10 w-fit">
                   Xóa chọn
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-primary/50 mb-3" />
                <p className="text-sm font-medium text-primary">Kéo thả hóa đơn chứng từ vào đây hoặc Nhấp chọn</p>
                <p className="text-xs text-muted-foreground mt-1">Hỗ trợ Chọn nhiều File (Multi-upload)</p>
              </>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0 mt-4 sm:mt-0">
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setFiles([]); }} disabled={isUploading || isCompressing} className="w-full sm:w-auto h-11 sm:h-10">Hủy bỏ</Button>
            <Button type="submit" className="min-w-[120px] w-full sm:w-auto h-11 sm:h-10" disabled={isUploading || isCompressing}>
              {isUploading ? 'Đang tải & lưu...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
