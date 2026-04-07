'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CATEGORIES, PROJECTS, formatCurrency, formatDate } from '@/constants';
import { getDemoMonthOptionsDescending } from '@/lib/demo-transactions';
import { Transaction, CategoryCode } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Lock, Image, Download, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppContext } from '@/contexts/AppContext';

interface SubCategoryReport {
  name: string;
  total: number;
  transactions: Transaction[];
}

interface CategoryReport {
  code: CategoryCode;
  name: string;
  color: string;
  total: number;
  subCategories: SubCategoryReport[];
}

interface MonthlyReport {
  month: string;
  projectCode: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categories: CategoryReport[];
}

export default function ReportsPage() {
  const { transactions: globalTransactions, projects: globalProjects, reportsFilter, setReportsFilter } = useAppContext();
  const { user } = useAuth();
  
  const visibleProjects = useMemo(() => {
    return globalProjects.filter(p => {
      if (p.excludeFromReports || p.isHidden) return false;
      if (user?.role === 'admin') return true;
      if (user?.role === 'user' && user.assignedProjects.includes(p.code)) return true;
      return false;
    });
  }, [globalProjects, user]);

  const monthOptions = useMemo(() => {
    const set = new Set(globalTransactions.map((t) => t.month));
    const sorted = Array.from(set).sort((a, b) => b.localeCompare(a));
    return sorted.length > 0 ? sorted : [new Date().toISOString().substring(0, 7)];
  }, [globalTransactions]);

  const activeMonths = useMemo(() => {
    return monthOptions.filter(m => {
      const [y, mm] = m.split('-');
      if (reportsFilter.year !== 'all' && y !== reportsFilter.year) return false;
      if (reportsFilter.quarter !== 'all') {
        const q = Math.ceil(parseInt(mm) / 3).toString();
        if (q !== reportsFilter.quarter) return false;
      }
      if (reportsFilter.month !== 'all' && mm !== reportsFilter.month) return false;
      return true;
    });
  }, [reportsFilter.year, reportsFilter.quarter, reportsFilter.month, monthOptions]);

  const filterMonths = activeMonths.length === monthOptions.length ? [] : activeMonths;
  
  const filterProjects = reportsFilter.filterProjects;

  const setFilterProjects = (val: string[] | ((prev: string[]) => string[])) => {
    setReportsFilter(prev => ({
      ...prev,
      filterProjects: typeof val === 'function' ? val(prev.filterProjects) : val
    }));
  };

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ url: string; name: string } | null>(null);

  const transactions = globalTransactions.filter(tx => {
    // Only process visible projects
    const isProjectVisible = visibleProjects.some(p => p.code === tx.projectCode);
    if (!isProjectVisible) return false;

    if (filterProjects.length > 0 && !filterProjects.includes(tx.projectCode)) return false;
    if (filterMonths.length > 0 && !filterMonths.includes(tx.month)) return false;
    return true;
  });

  const report = buildReport(transactions, filterProjects, filterMonths);

  function buildReport(txs: Transaction[], projects: string[], months: string[]): MonthlyReport {
    let totalIncome = 0;
    let totalExpense = 0;
    
    const categoryMap: Record<CategoryCode, CategoryReport> = {} as any;
    CATEGORIES.forEach(cat => {
      categoryMap[cat.code] = {
        code: cat.code,
        name: cat.name,
        color: cat.color,
        total: 0,
        subCategories: [],
      };
    });

    txs.forEach(tx => {
      if (tx.income > 0) {
        totalIncome += tx.income;
      }
      if (tx.expense > 0) {
        totalExpense += tx.expense;
        if (categoryMap[tx.categoryCode]) {
          categoryMap[tx.categoryCode].total += tx.expense;
          
          const existingSubCat = categoryMap[tx.categoryCode].subCategories.find(
            s => s.name === (tx.subCategory || '(Không phân loại)')
          );
          
          if (existingSubCat) {
            existingSubCat.total += tx.expense;
            existingSubCat.transactions.push(tx);
          } else {
            categoryMap[tx.categoryCode].subCategories.push({
              name: tx.subCategory || '(Không phân loại)',
              total: tx.expense,
              transactions: [tx],
            });
          }
        }
      }
    });

    return {
      month: months.length === 0 ? 'Tất cả' : months.join(', '),
      projectCode: projects.length === 0 ? 'Tất cả' : projects.join(', '),
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categories: Object.values(categoryMap),
    };
  }

  const viewInvoice = (url: string, name: string) => {
    setSelectedInvoice({ url, name });
    setInvoiceDialogOpen(true);
  };

  const filteredCategories = report.categories.filter(cat => cat.total > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Báo Cáo Tháng</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">Xem báo cáo chi tiết theo từng mã chi phí</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto h-10">
          <Download className="h-4 w-4 mr-2" />
          Xuất PDF
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-xl sm:rounded-2xl border-border/50 shadow-sm">
        <CardContent className="p-4 sm:pt-6">
          <div className="flex flex-col w-full gap-3 sm:flex-row sm:items-end">
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:flex sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="space-y-1 sm:space-y-1.5 flex flex-col">
              <label className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lọc Năm</label>
              <Select value={reportsFilter.year} onValueChange={(v: any) => setReportsFilter(p => ({...p, year: v}))}>
                <SelectTrigger className="w-full sm:w-[110px] h-9 sm:h-10 bg-background shadow-sm border-border/80 rounded-lg text-sm">
                  <SelectValue placeholder="Chọn Năm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi năm</SelectItem>
                  {Array.from(new Set(monthOptions.map(m => m.split('-')[0]))).map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 sm:space-y-1.5 flex flex-col">
              <label className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lọc Quý</label>
              <Select value={reportsFilter.quarter} onValueChange={(v: any) => setReportsFilter(p => ({...p, quarter: v}))}>
                <SelectTrigger className="w-full sm:w-[110px] h-9 sm:h-10 bg-background shadow-sm border-border/80 rounded-lg text-sm">
                  <SelectValue placeholder="Chọn Quý" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi quý</SelectItem>
                  <SelectItem value="1">Quý 1</SelectItem>
                  <SelectItem value="2">Quý 2</SelectItem>
                  <SelectItem value="3">Quý 3</SelectItem>
                  <SelectItem value="4">Quý 4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 sm:space-y-1.5 flex flex-col col-span-2 xs:col-span-1 sm:col-span-1">
              <label className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lọc Tháng</label>
              <Select value={reportsFilter.month} onValueChange={(v: any) => setReportsFilter(p => ({...p, month: v}))}>
                <SelectTrigger className="w-full sm:w-[120px] h-9 sm:h-10 bg-background shadow-sm border-border/80 rounded-lg text-sm">
                  <SelectValue placeholder="Chọn Tháng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi tháng</SelectItem>
                  {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                    <SelectItem key={m} value={m}>Tháng {m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
            
            <div className="space-y-1 sm:space-y-1.5 flex flex-col w-full sm:w-auto mt-0.5 sm:mt-0">
              <label className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dự án ({filterProjects.length === 0 ? 'Tất cả' : filterProjects.length})</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 sm:h-10 w-full sm:w-[240px] justify-between font-normal rounded-lg border-border/80 bg-background shadow-sm hover:bg-background text-sm">
                    <span className="truncate">
                       {filterProjects.length === 0 ? 'Tất cả dự án' : filterProjects.length === 1 ? filterProjects[0] : `${filterProjects.length} dự án được chọn`}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[240px]" align="start">
                  <DropdownMenuCheckboxItem 
                     checked={filterProjects.length === 0} 
                     onCheckedChange={() => setFilterProjects([])}
                  >
                    Tất cả dự án
                  </DropdownMenuCheckboxItem>
                  {visibleProjects.map((p) => (
                    <div key={p.code} className="relative flex items-center group">
                      <DropdownMenuCheckboxItem 
                        className="flex-1 pr-16 cursor-pointer overflow-hidden"
                        checked={filterProjects.includes(p.code)}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilterProjects(prev => [...prev, p.code]);
                          } else {
                            setFilterProjects(prev => prev.filter(c => c !== p.code));
                          }
                        }}
                      >
                        <span className="truncate">{p.code} — {p.name}</span>
                      </DropdownMenuCheckboxItem>
                      <Button 
                        variant="secondary" 
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 z-10 shadow-sm"
                        onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           setFilterProjects([p.code]);
                        }}
                      >
                        Duy nhất
                      </Button>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="rounded-xl sm:rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-1.5 sm:pb-2 pt-4 px-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Tổng Thu</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-green-600 truncate">
              {formatCurrency(report.totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl sm:rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-1.5 sm:pb-2 pt-4 px-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Tổng Chi</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-red-600 truncate">
              {formatCurrency(report.totalExpense)}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl sm:rounded-2xl border-border/50 shadow-sm col-span-2 md:col-span-1">
          <CardHeader className="pb-1.5 sm:pb-2 pt-4 px-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Chênh Lệch</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
            <div className={`text-xl sm:text-2xl font-bold truncate ${report.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatCurrency(report.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accordion Report */}
      <Card className="rounded-xl sm:rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Báo Cáo Chi Tiết Theo Mã</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <Accordion type="multiple" className="w-full" defaultValue={['expense']}>
            {/* I. TỔNG THU */}
            <AccordionItem value="income" className="border-b border-border/50">
              <AccordionTrigger className="text-sm sm:text-lg font-bold sm:font-semibold hover:no-underline py-3 sm:py-4">
                <span className="flex items-center flex-wrap gap-2 text-left">
                  <span className="text-green-600">I. TỔNG THU</span>
                  <Badge variant="success" className="ml-0 sm:ml-2 text-[11px] sm:text-xs">
                    {formatCurrency(report.totalIncome)}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {transactions.filter(t => t.income > 0).length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">Không có khoản thu</p>
                  ) : (
                    Object.entries(
                      transactions.filter(t => t.income > 0).reduce((acc, tx) => {
                        const groupName = tx.subCategory || '(Thu thập chung)';
                        if (!acc[groupName]) acc[groupName] = [];
                        acc[groupName].push(tx);
                        return acc;
                      }, {} as Record<string, Transaction[]>)
                    ).map(([groupName, groupTxs], idx) => {
                      const groupTotal = groupTxs.reduce((sum, t) => sum + t.income, 0);
                      return (
                        <div key={idx} className="border border-green-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="flex items-center justify-between p-3 bg-green-50 border-b border-green-100">
                            <span className="font-semibold text-sm text-green-800 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              {groupName}
                            </span>
                            <Badge variant="outline" className="bg-white hover:bg-white text-green-700 border-green-200 font-bold">
                              {formatCurrency(groupTotal)}
                            </Badge>
                          </div>
                          <div className="divide-y divide-green-50 pl-0">
                            {groupTxs.map((tx, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-white hover:bg-green-50/40 transition-colors">
                                <div>
                                  <div className="text-[13px] font-medium">{tx.description}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {formatDate(tx.date)} • {PROJECTS.find(p => p.code === tx.projectCode)?.name || tx.projectCode}
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                  <div className="font-medium text-green-600/90 text-sm">{formatCurrency(tx.income)}</div>
                                  {tx.invoiceUrl && (
                                    <Button variant="ghost" size="sm" onClick={() => viewInvoice(tx.invoiceUrl!, tx.invoiceName || 'invoice')}>
                                      <Image className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* II. TỔNG CHI THEO MÃ */}
            <AccordionItem value="expense" className="border-b border-border/50">
              <AccordionTrigger className="text-sm sm:text-lg font-bold sm:font-semibold hover:no-underline py-3 sm:py-4">
                <span className="flex items-center flex-wrap gap-2 text-left">
                  <span className="text-red-600">II. TỔNG CHI THEO MÃ (A-F)</span>
                  <Badge variant="destructive" className="ml-0 sm:ml-2 text-[11px] sm:text-xs">
                    {formatCurrency(report.totalExpense)}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <Accordion type="multiple" className="pl-4 border-l-2 border-muted">
                  {filteredCategories.map(cat => (
                    <AccordionItem key={cat.code} value={`cat-${cat.code}`}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          ></div>
                          <span className="font-medium">{cat.code}. {cat.name}</span>
                          <Badge style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                            {formatCurrency(cat.total)}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {cat.subCategories.map((sub, idx) => (
                            <div key={idx} className="border rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between p-3 bg-muted/50">
                                <span className="font-medium text-sm">{sub.name}</span>
                                <Badge variant="outline">{formatCurrency(sub.total)}</Badge>
                              </div>
                              <div className="divide-y">
                                {sub.transactions.map(tx => (
                                  <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                                    <div>
                                      <div className="text-sm">{tx.description}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatDate(tx.date)} • {tx.performedByName}
                                        {tx.isLocked && <Lock className="inline h-3 w-3 ml-1" />}
                                      </div>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                      <div className="font-medium text-red-600">{formatCurrency(tx.expense)}</div>
                                      {tx.invoiceUrl && (
                                        <Button variant="ghost" size="sm" onClick={() => viewInvoice(tx.invoiceUrl!, tx.invoiceName || 'invoice')}>
                                          <Image className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>

            {/* III. TỔNG CHI TOÀN BỘ */}
            <AccordionItem value="total" className="border-b border-border/50">
              <AccordionTrigger className="text-sm sm:text-lg font-bold sm:font-semibold hover:no-underline py-3 sm:py-4">
                <span className="flex items-center flex-wrap gap-2 text-left">
                  <span>III. TỔNG CHI TOÀN BỘ</span>
                  <Badge variant="outline" className="ml-0 sm:ml-2 text-[11px] sm:text-xs">
                    {formatCurrency(report.totalExpense)}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredCategories.map(cat => (
                    <div
                      key={cat.code}
                      className="p-4 rounded-lg border"
                      style={{ borderLeftColor: cat.color, borderLeftWidth: 4 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        ></div>
                        <span className="font-medium">{cat.code}</span>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(cat.total)}</div>
                      <div className="text-sm text-muted-foreground">{cat.name}</div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* IV. CHÊNH LỆCH */}
            <AccordionItem value="balance" className="border-b-0">
              <AccordionTrigger className="text-sm sm:text-lg font-bold sm:font-semibold hover:no-underline py-3 sm:py-4">
                <span className="flex items-center flex-wrap gap-2 text-left">
                  <span>IV. CHÊNH LỆCH</span>
                  <Badge
                    variant={report.balance >= 0 ? 'success' : 'destructive'}
                    className="ml-0 sm:ml-2 text-[11px] sm:text-xs"
                  >
                    {formatCurrency(report.balance)}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">
                      {formatCurrency(report.balance)}
                    </div>
                    <div className="text-muted-foreground">
                      {report.balance >= 0 ? 'Thu nhiều hơn chi' : 'Chi nhiều hơn thu'}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Invoice Lightbox */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedInvoice?.name || 'Hóa đơn'}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {selectedInvoice?.url && (
              <img src={selectedInvoice.url} alt="Invoice" className="w-full h-auto" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
