'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // We don't use the AuthContext user to block immediately to avoid flash,
  // but we can check if already logged in via middleware or AuthContext later.

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Lỗi kết nối máy chủ xác thực.");
      
      await signInWithEmailAndPassword(auth, email, password);
      // Login success! The onAuthStateChanged in AuthContext will catch this and route protection will lift.
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Tài khoản hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Quá nhiều nỗ lực sai. Vui lòng thử lại sau.');
      } else {
        setError('Lỗi đăng nhập: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-background border border-border/40 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/20">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Đăng Nhập Hệ Thống</h1>
            <p className="text-sm text-muted-foreground">Tài chính Nội Bộ HETHONGQUANLY</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tài Khoản Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@example.com"
                  className="pl-9 bg-muted/30 border-muted focus:bg-background transition-colors" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Mật Khẩu</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  className="pl-9 pr-10 bg-muted/30 border-muted focus:bg-background transition-colors" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg mt-2 font-medium">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-6 h-11 text-[15px] font-semibold" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Đăng Nhập'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Hệ thống quản lý nội bộ. Mọi truy cập trái phép đều bị ghi lại.
          </p>
        </div>
      </div>
    </div>
  );
}
