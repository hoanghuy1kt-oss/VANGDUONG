'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Lock, PieChart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function MobileNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const navItems = [
    { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { href: '/reports', label: 'Báo cáo', icon: PieChart },
    { href: '/transactions', label: 'Giao dịch', icon: FileText },
  ];

  if (isAdmin) {
    navItems.push({ href: '/admin', label: 'Quản trị', icon: Lock });
  }

  return (
    <div 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <nav className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all ${isActive ? 'bg-primary/10' : ''}`}>
                <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
