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
  const { transactions, projects, categoryGroups } = useAppContext();
  const visibleProjects = projects.filter(p => !p.excludeFromReports && !p.isHidden);
  const allAvailableCategories = Array.from(new Map(categoryGroups.flatMap(g => g.categories || []).map(c => [c.code, c])).values());

  // Lấy các giá trị có thực trong dữ liệu
  const monthsWithData = Array.from(new Set(transactions.map(t => t.month))).sort((a, b) => b.localeCompare(a));
  const projectCodesWithData = new Set(transactions.map(t => t.projectCode));
  const categoryCodesWithData = new Set(transactions.map(t => t.categoryCode));

  const monthOptions = [...monthsWithData];
  if (filters.month && filters.month !== 'all' && !monthOptions.includes(filters.month)) {
    monthOptions.push(filters.month);
    monthOptions.sort((a, b) => b.localeCompare(a));
  }

  const projectsToRender = visibleProjects.filter(p => projectCodesWithData.has(p.code));
  if (filters.project !== 'all' && !projectsToRender.some(p => p.code === filters.project)) {
    const selectedP = visibleProjects.find(p => p.code === filters.project);
    if (selectedP) projectsToRender.push(selectedP);
  }

  let catsToRender = allAvailableCategories.filter(c => categoryCodesWithData.has(c.code));
  if (catsToRender.length === 0) catsToRender = CATEGORIES.filter(c => categoryCodesWithData.has(c.code));
  if (filters.category !== 'all' && !catsToRender.some(c => c.code === filters.category)) {
    const selectedC = allAvailableCategories.find(c => c.code === filters.category) || CATEGORIES.find(c => c.code === filters.category);
    if (selectedC) catsToRender.push(selectedC);
  }


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
          <Select value={filters.month || 'all'} onValueChange={(v) => onChange('month', v)}>
            <SelectTrigger className="w-full sm:w-[160px] bg-background focus:ring-2">
              <SelectValue placeholder="Chọn tháng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả các tháng</SelectItem>
              {monthOptions.map(m => {
                const parts = m.split('-');
                const month = parts[1];
                let year = parts[0];
                if (year.length === 2) year = '20' + year;
                if (year.length === 4 && year.startsWith('00')) year = '20' + year.substring(2);
                return <SelectItem key={m} value={m}>{month}/{year}</SelectItem>;
              })}
            </SelectContent>
          </Select>
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
              {projectsToRender.map((p) => (
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
              {catsToRender.map((c) => (
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
