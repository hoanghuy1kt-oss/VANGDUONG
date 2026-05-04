'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CATEGORIES, formatCurrency } from '@/constants';
import { CategoryCode } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Lock, ChevronDown } from 'lucide-react';

type TooltipPayload = {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
      {label != null && (
        <p className="mb-1.5 font-medium text-foreground">{label}</p>
      )}
      <ul className="space-y-1">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="font-medium text-foreground">{p.name ?? p.dataKey}</span>
            <span>{formatCurrency(Number(p.value) || 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatMonthAxis(ym: string) {
  const [y, m] = ym.split('-');
  return `${m}/${y.slice(2)}`;
}

function formatYAxisCompact(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

function FilterDropdown({ 
  label, 
  options, 
  selectedValues, 
  onSelect, 
  placeholder,
  renderLabel
}: { 
  label: string; 
  options: string[]; 
  selectedValues: string[]; 
  onSelect: (vals: string[]) => void; 
  placeholder: string;
  renderLabel?: (val: string) => string;
}) {
  return (
    <div className="space-y-1 sm:space-y-1.5 flex flex-col">
      <Label className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label} {selectedValues.length > 0 && `(${selectedValues.length})`}
      </Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 sm:h-10 w-full min-w-[110px] justify-between font-normal rounded-lg border-border/80 bg-background shadow-sm hover:bg-background text-sm px-3">
            <span className="truncate">
               {selectedValues.length === 0 ? placeholder : selectedValues.length === 1 ? (renderLabel ? renderLabel(selectedValues[0]) : selectedValues[0]) : `${selectedValues.length} mục`}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 ml-1 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto" align="start">
          <DropdownMenuCheckboxItem 
             checked={selectedValues.length === 0} 
             onCheckedChange={() => onSelect([])}
          >
            {placeholder}
          </DropdownMenuCheckboxItem>
          {options.map(o => (
            <div key={o} className="relative flex items-center group">
              <DropdownMenuCheckboxItem 
                className="flex-1 pr-16 cursor-pointer overflow-hidden"
                checked={selectedValues.includes(o)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) => {
                  const next = checked ? [...selectedValues, o] : selectedValues.filter(x => x !== o);
                  onSelect(next);
                }}
              >
                <span className="truncate">{renderLabel ? renderLabel(o) : o}</span>
              </DropdownMenuCheckboxItem>
              <Button 
                variant="secondary" 
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 z-10 shadow-sm"
                onClick={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   onSelect([o]);
                }}
              >
                Duy nhất
              </Button>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function DashboardPage() {
  const { projects: globalProjects, transactions: globalTransactions, dashboardFilter, setDashboardFilter, categoryGroups } = useAppContext();
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
  
  const filterProjects = dashboardFilter.filterProjects;

  const setFilterProjects = (val: string[] | ((prev: string[]) => string[])) => {
    setDashboardFilter(prev => ({
      ...prev,
      filterProjects: typeof val === 'function' ? val(prev.filterProjects) : val
    }));
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    monthOptions.forEach(m => {
      const parts = m.split('-');
      let y = parts[0];
      const mm = parts[1];
      if (y.length === 2) y = '20' + y;
      if (y.length === 4 && y.startsWith('00')) y = '20' + y.substring(2);
      
      const q = Math.ceil(parseInt(mm) / 3).toString();

      const matchQuarter = dashboardFilter.quarters.length === 0 || dashboardFilter.quarters.includes(q);
      const matchMonth = dashboardFilter.months.length === 0 || dashboardFilter.months.includes(mm);

      if (matchQuarter && matchMonth) {
        years.add(y);
      }
    });
    return Array.from(years).sort((a,b) => b.localeCompare(a));
  }, [monthOptions, dashboardFilter.quarters, dashboardFilter.months]);

  const availableQuarters = useMemo(() => {
    const quarters = new Set<string>();
    monthOptions.forEach(m => {
      const parts = m.split('-');
      let y = parts[0];
      const mm = parts[1];
      if (y.length === 2) y = '20' + y;
      if (y.length === 4 && y.startsWith('00')) y = '20' + y.substring(2);
      
      const matchYear = dashboardFilter.years.length === 0 || dashboardFilter.years.includes(y);
      const matchMonth = dashboardFilter.months.length === 0 || dashboardFilter.months.includes(mm);

      if (matchYear && matchMonth) {
        quarters.add(Math.ceil(parseInt(mm) / 3).toString());
      }
    });
    return Array.from(quarters).sort();
  }, [monthOptions, dashboardFilter.years, dashboardFilter.months]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    monthOptions.forEach(m => {
      const parts = m.split('-');
      let y = parts[0];
      const mm = parts[1];
      if (y.length === 2) y = '20' + y;
      if (y.length === 4 && y.startsWith('00')) y = '20' + y.substring(2);
      
      const q = Math.ceil(parseInt(mm) / 3).toString();

      const matchYear = dashboardFilter.years.length === 0 || dashboardFilter.years.includes(y);
      const matchQuarter = dashboardFilter.quarters.length === 0 || dashboardFilter.quarters.includes(q);

      if (matchYear && matchQuarter) {
        months.add(mm);
      }
    });
    return Array.from(months).sort();
  }, [monthOptions, dashboardFilter.years, dashboardFilter.quarters]);

  const activeMonths = useMemo(() => {
    return monthOptions.filter(m => {
      const parts = m.split('-');
      let y = parts[0];
      const mm = parts[1];
      if (y.length === 2) y = '20' + y;
      if (y.length === 4 && y.startsWith('00')) y = '20' + y.substring(2);

      if (dashboardFilter.years.length > 0 && !dashboardFilter.years.includes(y)) return false;
      if (dashboardFilter.quarters.length > 0) {
        const q = Math.ceil(parseInt(mm) / 3).toString();
        if (!dashboardFilter.quarters.includes(q)) return false;
      }
      if (dashboardFilter.months.length > 0 && !dashboardFilter.months.includes(mm)) return false;
      return true;
    });
  }, [dashboardFilter.years, dashboardFilter.quarters, dashboardFilter.months, monthOptions]);

  const filterMonths = activeMonths.length === monthOptions.length ? [] : activeMonths;

  const scopedTx = useMemo(() => {
    // Only include transactions from projects that are "visible/active" in the context
    const visibleProjectCodes = new Set(visibleProjects.map(p => p.code));

    return globalTransactions.filter((tx) => {
      // Exclude hidden/inactive project data
      if (!visibleProjectCodes.has(tx.projectCode)) return false;

      if (filterProjects.length > 0 && !filterProjects.includes(tx.projectCode)) {
        return false;
      }
      return true;
    });
  }, [filterProjects, globalTransactions, visibleProjects]);

  const summary = useMemo(() => {
    const forMonth = scopedTx.filter((t) => filterMonths.length === 0 || filterMonths.includes(t.month));
    const byCategory: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpense = 0;
    forMonth.forEach((t) => {
      totalIncome += t.income || 0;
      totalExpense += t.expense || 0;
      if (t.categoryCode && (t.expense || 0) > 0) {
        if (!byCategory[t.categoryCode]) byCategory[t.categoryCode] = 0;
        byCategory[t.categoryCode] += t.expense;
      }
    });
    return { totalIncome, totalExpense, byCategory };
  }, [scopedTx, filterMonths]);

  const balance = summary.totalIncome - summary.totalExpense;

  const pieData = useMemo(() => {
    const allCategoriesMap = new Map<string, any>();
    visibleProjects.forEach(p => {
      const group = categoryGroups.find(g => g.id === (p.categoryGroupId || 'DEFAULT'));
      const cats = group?.categories || CATEGORIES;
      cats.forEach(c => {
        if (!allCategoriesMap.has(c.code)) {
          allCategoriesMap.set(c.code, c);
        }
      });
    });

    return Object.keys(summary.byCategory)
      .filter((code) => summary.byCategory[code] > 0)
      .map((code) => {
        const cat = allCategoriesMap.get(code) || CATEGORIES.find(c => c.code === code) || { code, name: 'Khác', color: '#888888' };
        return {
          name: `${cat.code}. ${cat.name.split(' ')[0]}`,
          value: summary.byCategory[code],
          color: cat.color,
        };
      });
  }, [summary.byCategory, visibleProjects]);

  const totalExpenseForPie = pieData.reduce((s, d) => s + d.value, 0);

  const projectBarData = useMemo(() => {
    const codes = filterProjects.length > 0
      ? visibleProjects.filter((p) => filterProjects.includes(p.code))
      : visibleProjects;
    return codes.map((project) => {
      const rows = scopedTx.filter((t) => (filterMonths.length === 0 || filterMonths.includes(t.month)) && t.projectCode === project.code);
      const Thu = rows.reduce((s, t) => s + (t.income || 0), 0);
      const Chi = rows.reduce((s, t) => s + (t.expense || 0), 0);
      return { name: project.code, Thu, Chi };
    });
  }, [scopedTx, filterMonths, filterProjects]);

  const dynamicTimelineMonths = useMemo(() => {
    // Lấy danh sách tất cả các tháng đã chuẩn hóa (YYYY-MM)
    const normalizedMonths = Array.from(new Set(monthOptions.map(m => {
      let y = m.split('-')[0];
      const mm = m.split('-')[1];
      if (y.length === 2) y = '20' + y;
      if (y.length === 4 && y.startsWith('00')) y = '20' + y.substring(2);
      return `${y}-${mm}`;
    })));

    let anchorMonth = normalizedMonths.length > 0 ? normalizedMonths.sort((a, b) => b.localeCompare(a))[0] : new Date().toISOString().substring(0, 7);
    
    if (filterMonths.length > 0) {
      const normalizedFilterMonths = filterMonths.map(m => {
        let y = m.split('-')[0];
        const mm = m.split('-')[1];
        if (y.length === 2) y = '20' + y;
        if (y.length === 4 && y.startsWith('00')) y = '20' + y.substring(2);
        return `${y}-${mm}`;
      });
      anchorMonth = normalizedFilterMonths.sort((a, b) => b.localeCompare(a))[0];
    }
    
    const [y, m] = anchorMonth.split('-').map(Number);
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(y, m - 1 - i, 1);
      const yStr = date.getFullYear();
      const mStr = String(date.getMonth() + 1).padStart(2, '0');
      result.push(`${yStr}-${mStr}`);
    }
    return result;
  }, [filterMonths, monthOptions]);

  const monthlyTrend = useMemo(() => {
    return dynamicTimelineMonths.map((month) => {
      const rows = scopedTx.filter((t) => {
        let y = t.month.split('-')[0];
        const m = t.month.split('-')[1];
        if (y.length === 2) y = '20' + y;
        if (y.length === 4 && y.startsWith('00')) y = '20' + y.substring(2);
        return `${y}-${m}` === month;
      });
      const Thu = rows.reduce((s: number, t: any) => s + (t.income || 0), 0);
      const Chi = rows.reduce((s: number, t: any) => s + (t.expense || 0), 0);
      return {
        month,
        label: formatMonthAxis(month),
        Thu,
        Chi,
      };
    });
  }, [scopedTx, dynamicTimelineMonths]);

  const projectCount = filterProjects.length > 0 ? filterProjects.length : visibleProjects.length;

  // Removed visibleMonthCheckboxes and visibleQuarters hooks

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">Tổng quan tài chính hệ thống</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:flex sm:flex-row gap-2 sm:gap-3">
            <FilterDropdown 
              label="Lọc Năm" 
              options={availableYears} 
              selectedValues={dashboardFilter.years} 
              onSelect={(vals) => setDashboardFilter(p => ({...p, years: vals}))} 
              placeholder="Mọi năm" 
            />
            <FilterDropdown 
              label="Lọc Quý" 
              options={availableQuarters} 
              selectedValues={dashboardFilter.quarters} 
              onSelect={(vals) => setDashboardFilter(p => ({...p, quarters: vals}))} 
              placeholder="Mọi quý" 
              renderLabel={(q) => dashboardFilter.years.length === 1 ? `${dashboardFilter.years[0]} - Q${q}` : `Quý ${q}`}
            />
            <FilterDropdown 
              label="Lọc Tháng" 
              options={availableMonths} 
              selectedValues={dashboardFilter.months} 
              onSelect={(vals) => setDashboardFilter(p => ({...p, months: vals}))} 
              placeholder="Mọi tháng" 
              renderLabel={(m) => dashboardFilter.years.length === 1 ? `${dashboardFilter.years[0]} - ${m}` : m}
            />
          </div>
          <div className="space-y-1 sm:space-y-1.5 flex flex-col w-full sm:w-auto mt-0.5 sm:mt-0">
            <Label className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dự án ({filterProjects.length === 0 ? 'Tất cả' : filterProjects.length})</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 sm:h-10 w-full sm:w-[220px] justify-between font-normal rounded-lg border-border/80 bg-background shadow-sm hover:bg-background text-sm">
                  <span className="truncate">
                     {filterProjects.length === 0 ? 'Tất cả dự án' : filterProjects.length === 1 ? filterProjects[0] : `${filterProjects.length} dự án được chọn`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[240px]" align="end">
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-xl sm:rounded-2xl border-border/50 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 px-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Tổng Thu
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold tracking-tight text-emerald-600 truncate">
              {formatCurrency(summary.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl sm:rounded-2xl border-border/50 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 px-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Tổng Chi
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10">
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold tracking-tight text-rose-600 truncate">
              {summary.totalExpense > 0 ? '-' + formatCurrency(summary.totalExpense) : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl sm:rounded-2xl border-border/50 shadow-sm transition-all hover:shadow-md hover:border-border/80 col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 px-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Chênh Lệch
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/10">
              <Wallet className="h-4 w-4 text-sky-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight truncate ${balance >= 0 ? 'text-sky-600' : 'text-amber-600'}`}
            >
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>

        <Card className="hidden lg:flex flex-col rounded-xl sm:rounded-2xl border-border/50 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 px-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Số Dự Án
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold tracking-tight truncate">{projectCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/40 shadow-sm transition-all hover:shadow-md hover:border-border/80">
        <CardHeader>
          <CardTitle className="text-lg">Thu — Chi theo tháng (12 tháng)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Xu hướng theo bộ lọc dự án hiện tại; trục hoành: tháng
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full min-h-[280px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={280}>
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillThu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillChi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis
                  tickFormatter={formatYAxisCompact}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { month?: string } | undefined)?.month ?? _
                  }
                />
                <Legend
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="Thu"
                  name="Thu"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#fillThu)"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="Chi"
                  name="Chi"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fill="url(#fillChi)"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/40 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Phân Tích Chi Phí Theo Nhóm Mã</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tháng: {filterMonths.length === 0 ? 'Tất cả' : filterMonths.map(m=>m.replace('-','/')).join(', ')}
            </p>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="relative mx-auto h-[320px] min-h-[280px] w-full max-w-md min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                  <PieChart>
                    <defs>
                      {pieData.map((d, i) => (
                        <linearGradient key={i} id={`slice-${i}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                          <stop offset="100%" stopColor={d.color} stopOpacity={0.75} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="48%"
                      innerRadius={72}
                      outerRadius={108}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                      label={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#slice-${index})`} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value) || 0)}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid hsl(var(--border))',
                        boxShadow: '0 10px 40px -10px rgb(0 0 0 / 0.2)',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value) => <span className="text-muted-foreground text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tổng chi
                  </span>
                  <span className="text-lg font-bold tabular-nums text-foreground">
                    {totalExpenseForPie > 0 ? '-' + formatCurrency(totalExpenseForPie) : formatCurrency(0)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                Chưa có dữ liệu chi phí trong tháng này
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Thu Chi Theo Dự Án</CardTitle>
            <p className="text-sm text-muted-foreground">So sánh thu / chi theo dự án (tháng đã chọn)</p>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full min-h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                <BarChart data={projectBarData} barGap={6} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barThu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6ee7b7" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="barChi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fda4af" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    tickFormatter={formatYAxisCompact}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                  />
                  <Bar dataKey="Thu" name="Thu" fill="url(#barThu)" radius={[8, 8, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Chi" name="Chi" fill="url(#barChi)" radius={[8, 8, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/40 shadow-sm transition-all hover:shadow-md hover:border-border/80">
        <CardHeader>
          <CardTitle className="text-lg">Danh Sách Dự Án</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {visibleProjects.map((project: any) => {
              const isSelectedOnly = filterProjects.includes(project.code);
              const projectTx = globalTransactions.filter((t: any) => (filterMonths.length === 0 || filterMonths.includes(t.month)) && t.projectCode === project.code);
              const thu = projectTx.reduce((s: number, t: any) => s + (t.income || 0), 0);
              const chi = projectTx.reduce((s: number, t: any) => s + (t.expense || 0), 0);

              const monthLabel = filterMonths.length === 0 
                ? 'Tất cả tháng' 
                : filterMonths.length === 1 ? `Tháng ${filterMonths[0].replace('-','/')}` : `${filterMonths.length} tháng`;

              return (
                <div
                  key={project.code}
                  onClick={() => {
                    setFilterProjects((prev) => {
                       if (prev.includes(project.code)) {
                         return prev.filter(c => c !== project.code);
                       }
                       if (prev.length === 0) {
                         return [project.code];
                       }
                       return [...prev, project.code];
                    })
                  }}
                  className={`group relative cursor-pointer rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                    isSelectedOnly
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border/60 bg-card/80 hover:border-primary/25'
                  }`}
                >
                  <div className="text-lg font-semibold tracking-tight">{project.code}</div>
                  <div className="text-sm text-muted-foreground">{project.name}</div>
                  {project.description && (
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{project.description}</div>
                  )}

                  <div className="absolute left-1/2 -top-24 z-50 w-52 -translate-x-1/2 translate-y-2 scale-95 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 pointer-events-none">
                    <div className="rounded-xl border border-border/80 bg-background/95 backdrop-blur shadow-lg p-3 text-sm">
                      <div className="font-semibold mb-2 flex justify-between items-center text-xs">
                        <span className="truncate mr-2 max-w-[120px]">{monthLabel}</span>
                        <span className="text-muted-foreground font-normal shrink-0">{project.code}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground">Tổng Thu:</span>
                        <span className="font-semibold text-emerald-600 tabular-nums">{formatCurrency(thu)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tổng Chi:</span>
                        <span className="font-semibold text-rose-600 tabular-nums">{chi > 0 ? '-' + formatCurrency(chi) : formatCurrency(0)}</span>
                      </div>
                    </div>
                    <div className="mx-auto h-2.5 w-2.5 -mt-1.5 rotate-45 border-r border-b border-border/80 bg-background/95 backdrop-blur"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
