'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseAuth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, FileText, LogOut, Lock, User, Menu, KeyRound, PieChart, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePassword } from 'firebase/auth';

export default function Header() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [changing, setChanging] = useState(false);
  const [errorObj, setErrorObj] = useState('');

  const handleChangePwdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) return setErrorObj('Mật khẩu nhập lại không khớp.');
    if (newPwd.length < 6) return setErrorObj('Mật khẩu phải từ 6 ký tự.');
    
    setChanging(true);
    setErrorObj('');
    try {
      const auth = getFirebaseAuth();
      if (auth?.currentUser) {
        await updatePassword(auth.currentUser, newPwd);
        alert('Đổi mật khẩu thành công!');
        setIsChangePwdOpen(false);
        setNewPwd('');
        setConfirmPwd('');
      } else {
        setErrorObj('Lỗi chứng thực, vui lòng đăng nhập lại.');
      }
    } catch(err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setErrorObj('Vui lòng đăng xuất và đăng nhập lại để thực hiện đổi mật khẩu (Lý do bảo mật: Đã hết hạn token đổi pass).');
      } else {
        setErrorObj(err.message || 'Lỗi đổi mật khẩu');
      }
    } finally {
      setChanging(false);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getFirebaseAuth();
      if (auth) await signOut(auth);
      router.push('/login');
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/reports', label: 'Báo cáo', icon: PieChart },
    { href: '/transactions', label: 'Giao dịch', icon: FileText },
  ];

  if (isAdmin) {
    navItems.push({ href: '/admin', label: 'Quản trị', icon: Lock });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-2 mr-8">
          <div className="p-2 bg-primary rounded-lg">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg hidden sm:inline">HTQL Tài Chính</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-12 px-2 py-2 flex items-center gap-3 hover:bg-muted/50 rounded-lg">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary border border-border shadow-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="hidden sm:flex flex-col items-start text-left gap-1">
                  <span className="text-sm font-semibold leading-none">{user?.displayName || 'Demo Admin'}</span>
                  <span className="text-[11px] font-medium leading-none text-muted-foreground">{isAdmin ? 'Quản Trị Viên' : 'Nhân Sự'}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.displayName || 'Demo Admin'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || 'demo@demo.com'}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary mt-1 w-fit">
                    {isAdmin ? 'Admin' : 'User'}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setIsChangePwdOpen(true); }}>
                <KeyRound className="mr-2 h-4 w-4" />
                Đổi mật khẩu
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Manual Change Password Dialog */}
      <Dialog open={isChangePwdOpen} onOpenChange={setIsChangePwdOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Đổi Mật Khẩu</DialogTitle>
            <DialogDescription>
              Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePwdSubmit} className="space-y-4 pt-2">
             <div className="space-y-2 relative">
               <Label>Mật Khẩu Mới</Label>
               <Input 
                 type={showNewPwd ? "text" : "password"} 
                 required 
                 className="pr-10"
                 value={newPwd} 
                 onChange={e => setNewPwd(e.target.value)} 
               />
               <button 
                  type="button" 
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-[32px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
             </div>
             <div className="space-y-2 relative">
               <Label>Nhập Lại Mật Khẩu</Label>
               <Input 
                 type={showConfirmPwd ? "text" : "password"} 
                 required 
                 className="pr-10"
                 value={confirmPwd} 
                 onChange={e => setConfirmPwd(e.target.value)} 
               />
               <button 
                  type="button" 
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute right-3 top-[32px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
             </div>
             {errorObj && <p className="text-xs text-red-500 font-medium">{errorObj}</p>}
             <div className="flex justify-end gap-3 pt-2">
               <Button type="button" variant="outline" onClick={() => setIsChangePwdOpen(false)}>Hủy</Button>
               <Button type="submit" disabled={changing}>
                 {changing ? 'Đang cập nhật...' : 'Xác nhận'}
               </Button>
             </div>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
