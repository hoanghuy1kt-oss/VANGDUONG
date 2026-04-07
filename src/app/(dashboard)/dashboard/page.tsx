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

export default function DashboardPage() {
  const { projects: globalProjects, transactions: globalTransactions, dashboardFilter, setDashboardFilter } = useAppContext();
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

  const activeMonths = useMemo(() => {
    return monthOptions.filter(m => {
      const [y, mm] = m.split('-');
      if (dashboardFilter.year !== 'all' && y !== dashboardFilter.year) return false;
      if (dashboardFilter.quarter !== 'all') {
        const q = Math.ceil(parseInt(mm) / 3).toString();
        if (q !== dashboardFilter.quarter) return false;
      }
      if (dashboardFilter.month !== 'all' && mm !== dashboardFilter.month) return false;
      return true;
    });
  }, [dashboardFilter.year, dashboardFilter.quarter, dashboardFilter.month, monthOptions]);

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
    const byCategory: Record<CategoryCode, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      F: 0,
    };
    let totalIncome = 0;
    let totalExpense = 0;
    forMonth.forEach((t) => {
      totalIncome += t.income || 0;
      totalExpense += t.expense || 0;
      if (t.categoryCode && (t.expense || 0) > 0) {
        byCategory[t.categoryCode] += t.expense;
      }
    });
    return { totalIncome, totalExpense, byCategory };
  }, [scopedTx, filterMonths]);

  const balance = summary.totalIncome - summary.totalExpense;

  const pieData = useMemo(() => {
    return CATEGORIES.filter((cat) => (summary.byCategory[cat.code] || 0) > 0).map((cat) => ({
      name: `${cat.code}. ${cat.name.split(' ')[0]}`,
      value: summary.byCategory[cat.code] || 0,
      color: cat.color,
    }));
  }, [summary.byCategory]);

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
    // Tìm tháng lớn nhất để làm mỏ neo (anchor)
    let anchorMonth = monthOptions.length > 0 ? monthOptions[0] : new Date().toISOString().substring(0, 7);
    if (filterMonths.length > 0) {
      anchorMonth = [...filterMonths].sort((a, b) => b.localeCompare(a))[0];
    }
    
    // Tính ngược lại 11 tháng trước đó (tổng 12 tháng)
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
      const rows = scopedTx.filter((t) => t.month === month);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Tổng quan tài chính hệ thống</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-xs text-muted-foreground">Lọc theo Năm</Label>
              <Select value={dashboardFilter.year} onValueChange={(v: any) => setDashboardFilter(p => ({...p, year: v}))}>
                <SelectTrigger className="w-[120px] h-10 bg-background shadow-sm border-border/80">
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

            <div className="space-y-1.5 flex flex-col">
              <Label className="text-xs text-muted-foreground">Lọc theo Quý</Label>
              <Select value={dashboardFilter.quarter} onValueChange={(v: any) => setDashboardFilter(p => ({...p, quarter: v}))}>
                <SelectTrigger className="w-[120px] h-10 bg-background shadow-sm border-border/80">
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

            <div className="space-y-1.5 flex flex-col">
              <Label className="text-xs text-muted-foreground">Lọc theo Tháng</Label>
              <Select value={dashboardFilter.month} onValueChange={(v: any) => setDashboardFilter(p => ({...p, month: v}))}>
                <SelectTrigger className="w-[130px] h-10 bg-background shadow-sm border-border/80">
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
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-xs text-muted-foreground">Dự án ({filterProjects.length === 0 ? 'Tất cả' : filterProjects.length})</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 w-[200px] justify-between font-normal rounded-lg border-border/80 bg-background shadow-sm hover:bg-background">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/40 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Thu
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600">
              {formatCurrency(summary.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Chi
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10">
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-rose-600">
              {formatCurrency(summary.totalExpense)}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chênh Lệch
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/10">
              <Wallet className="h-4 w-4 text-sky-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tracking-tight ${balance >= 0 ? 'text-sky-600' : 'text-amber-600'}`}
            >
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Số Dự Án
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{projectCount}</div>
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
            <CardTitle className="text-lg">Phân Tích Chi Phí Theo Mã (A-F)</CardTitle>
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
                    {formatCurrency(totalExpenseForPie)}
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
                        <span className="font-semibold text-rose-600 tabular-nums">{formatCurrency(chi)}</span>
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
