'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from '@/constants';
import { Plus, Edit, Trash2, KeyRound, CheckSquare, History, UserX, UserCheck, ShieldCheck, Download, FolderKanban, Users, Eye, EyeOff, FileBarChart, Square } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { addUser, updateUser, addProject, updateProject, deleteProject } from '@/lib/firestore';

import { UserRole } from '@/types';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const { projects: localProjects, setProjects: setLocalProjects, users: localUsers, setUsers: setLocalUsers } = useAppContext();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [userFilter, setUserFilter] = useState('all');
  const [showHiddenProjects, setShowHiddenProjects] = useState(false);

  // MODAL STATES
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<any>(null);
  
  // FORM STATES
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'user' as UserRole, assignedProjects: [] as string[] });
  const [projectForm, setProjectForm] = useState({ code: '', name: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // ... (useAppContext is already active from top)

  // --- HANDLERS FOR USERS
  const filteredUsers = localUsers.filter(u => {
    if (u.email === 'hoanghuy1kt@gmail.com') return false;
    if (u.isHidden) return false;
    if (userFilter === 'active') return u.active;
    if (userFilter === 'inactive') return !u.active;
    return true;
  });

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', role: 'user', assignedProjects: [] });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({ name: u.name || '', email: u.email || '', role: u.role || 'user', assignedProjects: Array.isArray(u.assignedProjects) ? u.assignedProjects : [] });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      setIsProcessing(true);
      let res;
      if (editingUser) {
        // Mode: Update -> gọi API (bạn cũng có thể gọi updateUser)
        res = await fetch('/api/admin/users', {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'update_profile',
            uid: editingUser.id,
            displayName: userForm.name,
            role: userForm.role,
            assignedProjects: userForm.assignedProjects
          })
        });
      } else {
        // Mode: Insert -> bắt buộc gọi Server API
        res = await fetch('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            email: userForm.email,
            displayName: userForm.name,
            role: userForm.role,
            assignedProjects: userForm.assignedProjects
          })
        });
      }
      
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Lỗi máy chủ (Status: ${res.status})`);
      }
      setIsUserModalOpen(false);
      alert('Thay đổi đã được lưu thành công trên máy chủ.');
    } catch (e: any) {
      alert("Lỗi lưu người dùng: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleUserActive = async (docId: string, authUid: string, active: boolean) => {
    try {
      setIsProcessing(true);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update_profile', docId: docId, uid: authUid || docId, active: !active })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Lỗi máy chủ (${res.status})`);
      alert(`Đã ${!active ? 'mở' : 'khóa'} tài khoản thành công!`);
    } catch (e: any) {
      alert("Lỗi khóa/mở người dùng: " + e.message + "\n(Vui lòng kiểm tra lại cấu hình Firebase Admin hoặc ID tài khoản)");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async (docId: string, authUid: string) => {
    if (!confirm("Bạn muốn đặt mật khẩu về 123456 cho người dùng này?")) return;
    try {
      setIsProcessing(true);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'reset_password', docId: docId, uid: authUid || docId })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Lỗi máy chủ (${res.status})`);
      alert('Thành công: Đã đặt lại mật khẩu về "123456" cho tài khoản này.');
    } catch (e: any) {
      alert("Lỗi đặt lại mật khẩu: " + e.message + "\n(Vui lòng kiểm tra lại cấu hình Firebase Admin)");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenDeleteConfirm = (userObj: any) => {
    setDeleteConfirmUser(userObj);
  };

  const executeDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      setIsProcessing(true);
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        body: JSON.stringify({ docId: deleteConfirmUser.id, uid: deleteConfirmUser.uid || deleteConfirmUser.id })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Lỗi máy chủ (${res.status})`);
      setDeleteConfirmUser(null);
    } catch (e: any) {
      alert("Lỗi xóa người dùng: " + e.message + "\n(Vui lòng kiểm tra lại cấu hình Firebase Admin hoặc phân quyền Auth)");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleProjectAssign = (code: string) => {
    setUserForm(prev => {
      const assigned = Array.isArray(prev.assignedProjects) ? prev.assignedProjects : [];
      if (assigned.includes(code)) {
        return { ...prev, assignedProjects: assigned.filter(c => c !== code) };
      } else {
        return { ...prev, assignedProjects: [...assigned, code] };
      }
    });
  };

  // --- HANDLERS FOR PROJECTS
  const visibleProjects = localProjects.filter(p => showHiddenProjects ? true : !p.isHidden);

  const handleSaveProject = async () => {
    if (projectForm.code && projectForm.name) {
      try {
        await addProject({ 
          code: projectForm.code.toUpperCase(), 
          name: projectForm.name, 
          isActive: true, 
          isHidden: false, 
          excludeFromReports: false 
        });
        setIsProjectModalOpen(false);
        setProjectForm({ code: '', name: '' });
      } catch (e: any) {
        alert("Lỗi thêm dự án: " + e.message);
      }
    }
  };

  const toggleProjectConfig = async (code: string, field: 'isActive' | 'isHidden' | 'excludeFromReports', currentValue: boolean) => {
    try {
      await updateProject(code, { [field]: !currentValue });
    } catch (e: any) {
      alert("Lỗi cấu hình dự án: " + e.message);
    }
  };

  const executeDeleteProject = async () => {
    if (!deleteConfirmProject) return;
    try {
      setIsProcessing(true);
      await deleteProject(deleteConfirmProject.code);
      setDeleteConfirmProject(null);
    } catch (e: any) {
      alert("Lỗi xóa dự án: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 line-fade-in delay-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Cài đặt Hệ thống</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
          Quản lý phân quyền người dùng và danh mục chi tiết dự án.
        </p>
      </div>

      <div className="w-full">
        <div className="grid w-full grid-cols-2 mb-6 p-1 bg-muted/60 rounded-xl">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'users' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
          >
            <Users className="h-4 w-4" /> <span className="hidden sm:inline">Tài khoản & Phân quyền</span>
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'projects' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
          >
            <FolderKanban className="h-4 w-4" /> <span className="hidden sm:inline">Dự án & Danh mục</span>
          </button>
        </div>
        
        {/* TAB USERS */}
        {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in-50 zoom-in-95 duration-300">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/40 gap-4 p-4 sm:p-6">
              <div>
                <CardTitle className="text-lg sm:text-xl">Người dùng Hệ thống</CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm">Tài khoản mặc định được khởi tạo với mật khẩu "123456".</CardDescription>
              </div>
              <div className="flex flex-row gap-2 w-full sm:w-auto">
                <select 
                  className="bg-background border border-border rounded-lg text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary flex-1 sm:flex-none h-10"
                  value={userFilter}
                  onChange={e => setUserFilter(e.target.value)}
                >
                  <option value="all">Tất cả tài khoản</option>
                  <option value="active">Đang mở (Active)</option>
                  <option value="inactive">Bị khóa (Inactive)</option>
                </select>
                <Button className="shrink-0 bg-primary/90 hover:bg-primary h-10 px-3" onClick={handleOpenAddUser}>
                  <Plus className="h-4 w-4 sm:hidden" /> 
                  <span className="hidden sm:inline">+ Thêm tài khoản</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-muted-foreground border-b border-border/40">
                    <tr>
                      <th className="h-12 px-6 text-left font-medium">Họ tên & Email</th>
                      <th className="h-12 px-5 text-left font-medium">Trạng thái Khóa</th>
                      <th className="h-12 px-5 text-left font-medium">Dự án tiếp cận</th>
                      <th className="h-12 px-5 text-right font-medium min-w-[200px]">Thao tác Cấu hình</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Không có tài khoản nào phù hợp bộ lọc.</td></tr>
                    )}
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="py-4 px-6 align-middle">
                          <div className="font-semibold text-base text-foreground flex items-center gap-2">
                             {u.name} {u.role === 'admin' && <ShieldCheck className="w-4 h-4 text-purple-600" />}
                          </div>
                          <div className="text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="py-4 px-5 align-middle">
                          {u.active ? (
                            <Badge variant="success" className="shadow-none rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Đang hoạt động</Badge>
                          ) : (
                            <Badge variant="secondary" className="shadow-none rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300">Đã khóa</Badge>
                          )}
                        </td>
                        <td className="py-4 px-5 align-middle">
                          <div className="flex flex-wrap gap-1 w-max max-w-[150px]">
                            {Array.isArray(u.assignedProjects) && u.assignedProjects.length > 0 ? (
                               u.assignedProjects.map((cp: string) => (
                                 <Badge key={cp} variant="outline" className="text-xs bg-background/50 border-border/80">{cp}</Badge>
                               ))
                            ) : (
                               <span className="text-muted-foreground text-xs italic">Chưa gán</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 align-middle text-right">
                          <div className="flex justify-end gap-2 opacity-10 sm:opacity-100 transition-opacity">
                            <Button disabled={isProcessing} variant="outline" size="icon" className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleOpenEditUser(u)} title="Chỉnh sửa thông tin">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button disabled={isProcessing} variant="outline" size="icon" className="h-8 w-8 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleResetPassword(u.id, u.uid)} title="Reset Password về '123456'">
                              <History className="h-4 w-4" />
                            </Button>
                            <Button disabled={isProcessing} variant="outline" size="icon" className={`h-8 w-8 border ${u.active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`} onClick={() => toggleUserActive(u.id, u.uid, u.active)} title={u.active ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                              {u.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                            {user?.email === 'hoanghuy1kt@gmail.com' && (
                              <Button disabled={isProcessing} variant="outline" size="icon" className="h-8 w-8 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleOpenDeleteConfirm(u)} title="Xóa vĩnh viễn tài khoản">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="sm:hidden flex flex-col divide-y divide-border/40">
                {filteredUsers.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-sm">Không có tài khoản nào phù hợp bộ lọc.</div>
                )}
                {filteredUsers.map(u => (
                  <div key={u.id} className="p-4 flex flex-col gap-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                           {u.name} {u.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                        </div>
                        <div className="text-muted-foreground text-[11px]">{u.email}</div>
                      </div>
                      <Badge variant={u.active ? 'success' : 'secondary'} className={`shadow-none rounded-full text-[10px] ${u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                        {u.active ? 'Active' : 'Khóa'}
                      </Badge>
                    </div>
                    {/* Projects + Actions */}
                    <div className="flex items-end justify-between mt-1">
                      <div className="flex flex-wrap gap-1 pr-2">
                        {Array.isArray(u.assignedProjects) && u.assignedProjects.length > 0 ? (
                           u.assignedProjects.map((cp: string) => (
                             <Badge key={cp} variant="outline" className="text-[10px] bg-background/50 border-border/80 px-1.5 py-0">{cp}</Badge>
                           ))
                        ) : (
                           <span className="text-muted-foreground text-xs italic">Chưa gán dự án</span>
                        )}
                      </div>
                      <div className="flex gap-1 border rounded-lg p-0.5 bg-background shadow-sm shrink-0">
                        <Button disabled={isProcessing} variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenEditUser(u)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button disabled={isProcessing} variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:bg-amber-50" onClick={() => handleResetPassword(u.id, u.uid)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button disabled={isProcessing} variant="ghost" size="icon" className={`h-7 w-7 ${u.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`} onClick={() => toggleUserActive(u.id, u.uid, u.active)}>
                          {u.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </Button>
                        {user?.email === 'hoanghuy1kt@gmail.com' && (
                          <Button disabled={isProcessing} variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => handleOpenDeleteConfirm(u)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* TAB PROJECTS & CATEGORIES */}
        {activeTab === 'projects' && (
        <div className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="col-span-7 border-border/60 shadow-sm flex flex-col min-h-[600px]">
              <CardHeader className="bg-muted/10 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-4 gap-3 sm:gap-4">
                <div className="space-y-0.5">
                  <CardTitle className="text-lg">Tùy biến Mã Dự án</CardTitle>
                  <CardDescription className="text-xs sm:text-sm leading-snug pr-2">Cấu hình ẩn, tạm ngưng hoặc rút khỏi báo cáo.</CardDescription>
                </div>
                <Button 
                   variant="outline" size="sm" 
                   onClick={() => setShowHiddenProjects(!showHiddenProjects)}
                   className="text-muted-foreground flex items-center gap-1.5 bg-background border-border whitespace-nowrap text-xs sm:text-sm px-2.5 sm:px-3 h-8 sm:h-9 w-fit shadow-sm"
                >
                   {showHiddenProjects ? <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                   <span>{showHiddenProjects ? 'Đang hiện DA ẩn' : 'Đang giấu DA ẩn'}</span>
                </Button>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                <div className="flex-1 overflow-y-auto w-full p-4 space-y-3">
                  {visibleProjects.length === 0 && (
                     <div className="text-center py-6 text-muted-foreground italic">Không có dự án nào hiển thị.</div>
                  )}
                  {visibleProjects.map(p => (
                    <div key={p.code} className={`flex items-center justify-between p-4 border rounded-xl shadow-sm transition-colors ${p.isActive ? 'bg-card border-border/60 hover:bg-muted/10' : 'bg-muted/30 border-dashed border-border/40 opacity-80'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-lg ${p.isActive ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                          {p.code.replace('DA', '')}
                        </div>
                        <div>
                          <div className={`font-bold flex items-center gap-2 ${!p.isActive && 'line-through text-muted-foreground'}`}>
                            {p.code}
                            {!p.isActive && <Badge variant="secondary" className="text-[10px] h-5 py-0">Đã chốt (Inactive)</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">{p.name}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                        <Button 
                           variant="outline" 
                           size="sm" 
                           className={`h-8 px-2 flex gap-1 ${!p.isActive ? 'bg-muted/50 text-gray-500 border-gray-200' : 'text-blue-600 border-blue-200'}`}
                           onClick={() => toggleProjectConfig(p.code, 'isActive', p.isActive ?? false)}
                           title="Đổi trạng thái Hoạt động / Vô hiệu hóa (cấm thêm dữ liệu)"
                        >
                           <ShieldCheck className="h-3.5 w-3.5" />
                           <span className="hidden xl:inline text-xs">{p.isActive ? 'Active' : 'Inactive'}</span>
                        </Button>
                        <Button 
                           variant="outline" 
                           size="sm" 
                           className={`h-8 px-2 flex gap-1 ${p.excludeFromReports ? 'bg-red-50 text-red-600 border-red-200' : 'text-muted-foreground border-border'}`}
                           onClick={() => toggleProjectConfig(p.code, 'excludeFromReports', p.excludeFromReports ?? false)}
                           title="Xóa luồng dữ liệu khỏi Report (Báo cáo)"
                        >
                           <FileBarChart className="h-3.5 w-3.5" />
                           <span className="hidden xl:inline text-xs">{p.excludeFromReports ? 'Đã Exclude' : 'Báo cáo'}</span>
                        </Button>
                        <Button 
                           variant="outline" 
                           size="sm" 
                           className={`h-8 px-2 flex gap-1 text-muted-foreground`}
                           onClick={() => toggleProjectConfig(p.code, 'isHidden', p.isHidden ?? false)}
                           title="Gọn màn hình - Ẩn khỏi list"
                        >
                           {p.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                        {isAdmin && (
                          <Button 
                             disabled={isProcessing}
                             variant="outline" 
                             size="sm" 
                             className="h-8 px-2 flex gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                             onClick={() => setDeleteConfirmProject(p)}
                             title="Xóa vĩnh viễn dự án"
                          >
                             <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border/40 bg-muted/5 mt-auto">
                    <Button 
                        className="w-full border-dashed border-2 bg-transparent text-primary hover:bg-primary/5 h-12 rounded-xl"
                        onClick={() => setIsProjectModalOpen(true)}
                    >
                        + Khởi tạo Dự Án Mới
                    </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-5 border-border/60 shadow-sm flex flex-col min-h-[600px]">
              <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
                <CardTitle className="text-lg">Danh Mục Phân Loại (Cứng)</CardTitle>
                <CardDescription>Hệ thống mã A-F chuẩn kế toán quốc tế.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <div className="divide-y divide-border/40 max-h-[550px] overflow-y-auto bg-card">
                  {CATEGORIES.map(c => (
                    <div key={c.code} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                      <div className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm border border-black/10" style={{ backgroundColor: c.color }} />
                      <div className="flex-1">
                        <span className="font-bold text-foreground mr-2 text-base">{c.code}.</span> 
                        <span className="text-muted-foreground font-medium">{c.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

      </div>

      {/* DIALOG XÁC NHẬN XÓA USER */}
      <Dialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Xác nhận xóa tài khoản</DialogTitle>
            <DialogDescription className="pt-3">
              Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong>{deleteConfirmUser?.name || deleteConfirmUser?.email}</strong>?
              <br /><br />
              <span className="text-rose-600 font-medium">Thao tác này sẽ xóa toàn bộ dữ liệu truy cập và không thể hoàn tác!</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setDeleteConfirmUser(null)}>Hủy bỏ</Button>
            <Button disabled={isProcessing} onClick={executeDeleteUser} type="button" className="bg-rose-600 hover:bg-rose-700 text-white min-w-[120px]">
               {isProcessing ? 'Đang xử lý...' : 'Đồng ý Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG XÁC NHẬN XÓA DỰ ÁN */}
      <Dialog open={!!deleteConfirmProject} onOpenChange={(open) => !open && setDeleteConfirmProject(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Xác nhận xóa dự án</DialogTitle>
            <DialogDescription className="pt-3">
              Bạn có chắc chắn muốn xóa hệ mã dự án <strong>{deleteConfirmProject?.code} - {deleteConfirmProject?.name}</strong> khỏi CSDL?
              <br /><br />
              <span className="text-rose-600 font-medium">Lưu ý: Tất cả báo cáo và tài khoản đang liên kết với mã dự án này có thể bị mất tham chiếu. Bạn cần chắc chắn trước khi xóa!</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setDeleteConfirmProject(null)}>Hủy bỏ</Button>
            <Button disabled={isProcessing} onClick={executeDeleteProject} type="button" className="bg-rose-600 hover:bg-rose-700 text-white min-w-[120px]">
               {isProcessing ? 'Đang xử lý...' : 'Đồng ý Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG THÊM / SỬA USER */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}</DialogTitle>
            <DialogDescription>
              Mật khẩu khởi tạo được gắn tự động là <strong className="text-foreground border-b border-dashed border-primary">123456</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Họ và tên</Label>
              <Input id="name" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Nguyễn Văn A" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email đăng nhập</Label>
              <Input id="email" type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="email@congty.com" />
            </div>
            
            <div className="grid gap-2">
              <Label>Cấp độ phân quyền</Label>
              <Select value={userForm.role} onValueChange={(v: any) => setUserForm({...userForm, role: v})}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Chọn quyền" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Quản trị viên (Admin)</SelectItem>
                  <SelectItem value="user">Nhân viên (Thường)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {userForm.role === 'admin' ? (
              <div className="border border-border/70 rounded-xl p-4 bg-primary/5">
                <Label className="flex justify-center text-sm font-semibold text-primary">Tất cả dự án (Quyền Mặc Định Admin)</Label>
                <div className="text-center text-xs text-muted-foreground mt-1">Admin có toàn quyền truy xuất mọi dự án trong sổ.</div>
              </div>
            ) : (
              <div className="border border-border/70 rounded-xl p-4 bg-muted/20">
                <Label className="mb-3 flex items-center justify-between text-base font-semibold text-primary">
                  <span>Trực quyền đọc Dự án</span>
                  <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-background rounded-md border">Multi-select</span>
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {localProjects.filter(p => !p.isHidden).map(p => {
                    const isChecked = Array.isArray(userForm.assignedProjects) && userForm.assignedProjects.includes(p.code);
                    return (
                      <button 
                        key={p.code} 
                        onClick={() => toggleProjectAssign(p.code)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg transition-all text-left border ${isChecked ? 'bg-primary/5 border-primary shadow-sm text-primary' : 'bg-background hover:bg-muted/50 border-border/80 text-muted-foreground'}`}
                      >
                        {isChecked ? <CheckSquare className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0 opacity-50" />}
                        <div className="font-medium text-[13px] truncate flex-1">{p.code} - {p.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-2 border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setIsUserModalOpen(false)}>Hủy bỏ</Button>
            <Button disabled={isProcessing} onClick={handleSaveUser} type="button" className="bg-primary/95 text-primary-foreground min-w-[120px]">
               {isProcessing ? 'Đang xử lý...' : (editingUser ? 'Cập nhật' : 'Tạo mới')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG THÊM DỰ ÁN MỚI */}
      <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mở nhanh Dự án mới</DialogTitle>
            <DialogDescription>
              Dự án sẽ ở chế độ <Badge variant="outline" className="h-5 px-1 py-0 shadow-none text-[10px]">Active</Badge> lập tức cho mọi giao dịch.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="projectCode" className="font-semibold">Mã ID (Quy ước Kế toán)</Label>
              <Input id="projectCode" value={projectForm.code} onChange={e => setProjectForm({...projectForm, code: e.target.value.toUpperCase()})} placeholder="VD: DA10" className="text-lg uppercase" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="projectName" className="font-semibold">Tên gọi nội bộ</Label>
              <Input id="projectName" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} placeholder="Phân khu Nam (Giai đoạn 2)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectModalOpen(false)}>Hủy bỏ</Button>
            <Button onClick={handleSaveProject} disabled={!projectForm.code || !projectForm.name}>Ghi nhận & Khởi tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
