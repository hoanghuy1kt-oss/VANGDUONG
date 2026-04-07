import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CATEGORIES } from '@/constants';
import { FilterX, Search, SlidersHorizontal } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

export interface FilterState {
  month: string;
  project: string;
  description: string;
  category: string;
  income: string;
  expense: string;
  lockStatus: string;
  invoice: string;
}

interface TransactionFilterBarProps {
  filters: FilterState;
  onChange: (key: keyof FilterState, value: string) => void;
  onReset: () => void;
}

export function TransactionFilterBar({ filters, onChange, onReset }: TransactionFilterBarProps) {
  const { projects } = useAppContext();
  const visibleProjects = projects.filter(p => !p.excludeFromReports && !p.isHidden);

  return (
    <div className="bg-card border rounded-lg shadow-sm w-full p-4 mb-4">
      <div className="flex flex-col space-y-4">
        {/* Hàng 1: Tìm kiếm chính & Cột mốc */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Gõ từ khóa nội dung để tìm kiếm..." 
              value={filters.description || ''} 
              onChange={(e) => onChange('description', e.target.value)} 
              className="pl-9 bg-background focus:ring-2" 
            />
          </div>
          <Input 
            type="month" 
            value={filters.month} 
            onChange={(e) => onChange('month', e.target.value)} 
            className="w-full sm:w-[160px] bg-background" 
          />
        </div>

        {/* Hàng 2: Các bộ lọc trạng thái */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center text-sm font-medium text-muted-foreground pr-2">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Lọc chuyên sâu:
          </div>
          
          <Select value={filters.project} onValueChange={(v) => onChange('project', v)}>
            <SelectTrigger className="w-[150px] h-9 bg-background">
              <SelectValue placeholder="Dự án" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi Dự án</SelectItem>
              {visibleProjects.map((p) => (
                <SelectItem key={p.code} value={p.code}>{p.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.category} onValueChange={(v) => onChange('category', v)}>
            <SelectTrigger className="w-[160px] h-9 bg-background">
              <SelectValue placeholder="Mã chi phí" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mã phí</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.income} onValueChange={(v) => onChange('income', v)}>
             <SelectTrigger className="w-[130px] h-9 bg-background"><SelectValue placeholder="Dòng tiền Thêm"/></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Tất cả Thu</SelectItem>
               <SelectItem value="yes">Phát sinh Thu</SelectItem>
             </SelectContent>
          </Select>
          
          <Select value={filters.expense} onValueChange={(v) => onChange('expense', v)}>
             <SelectTrigger className="w-[130px] h-9 bg-background"><SelectValue placeholder="Dòng tiền Chi"/></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Tất cả Chi</SelectItem>
               <SelectItem value="yes">Phát sinh Chi</SelectItem>
             </SelectContent>
          </Select>

          <Select value={filters.lockStatus} onValueChange={(v) => onChange('lockStatus', v)}>
             <SelectTrigger className="w-[140px] h-9 bg-background"><SelectValue placeholder="Kiểm soát"/></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Mọi trạng thái</SelectItem>
               <SelectItem value="open">Đang mở</SelectItem>
               <SelectItem value="locked">Đã Chốt Khóa</SelectItem>
             </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={onReset} className="h-9 px-3 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto">
            <FilterX className="h-4 w-4 mr-1.5" />
            Khôi phục
          </Button>
        </div>
      </div>
    </div>
  );
}
