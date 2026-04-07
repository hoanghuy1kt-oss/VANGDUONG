'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { AddTransactionDialog } from '@/features/transactions/components/AddTransactionDialog';
import { TransactionFilterBar, FilterState } from '@/features/transactions/components/TransactionFilterBar';
import { TransactionTable } from '@/features/transactions/components/TransactionTable';
import { addTransaction, deleteTransaction, lockTransaction, unlockTransaction } from '@/lib/firestore';

export default function TransactionsPage() {
  const defaultMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // State
  const { transactions, setTransactions, projects: globalProjects, transactionFilters, setTransactionFilters } = useAppContext();
  const { user } = useAuth();
  
  const visibleProjects = globalProjects.filter(p => {
    if (p.excludeFromReports || p.isHidden) return false;
    if (user?.role === 'admin') return true;
    if (user?.role === 'user' && user.assignedProjects.includes(p.code)) return true;
    return false;
  });
  
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<{ url: string; name: string; id: string }[]>([]);
  const [currentInvoiceIdx, setCurrentInvoiceIdx] = useState(0);
  
  // Bộ lọc
  const filters = transactionFilters.month === '' ? { ...transactionFilters, month: defaultMonth() } : transactionFilters;

  const updateFilter = (key: keyof FilterState, value: string) => {
    setTransactionFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setTransactionFilters({
      month: defaultMonth(),
      project: 'all',
      description: '',
      category: 'all',
      income: 'all',
      expense: 'all',
      lockStatus: 'all',
      invoice: 'all',
    });
  };

  // Kỹ thuật Filter dữ liệu gọn gàng
  const filteredTransactions = transactions.filter((tx) => {
    // Luôn giấu các project bị đánh dấu excludeFromReports trong trang Sổ giao dịch chung
    const isProjectVisible = visibleProjects.some(p => p.code === tx.projectCode);
    if (!isProjectVisible) return false;

    if (filters.project !== 'all' && tx.projectCode !== filters.project) return false;
    if (filters.month && tx.month !== filters.month) return false;
    
    if (filters.description.trim()) {
      const q = filters.description.trim().toLowerCase();
      if (!tx.description.toLowerCase().includes(q) && !(tx.subCategory || '').toLowerCase().includes(q)) return false;
    }
    
    if (filters.category !== 'all' && tx.categoryCode !== filters.category) return false;
    if (filters.income === 'yes' && !(tx.income > 0)) return false;
    if (filters.expense === 'yes' && !(tx.expense > 0)) return false;
    if (filters.lockStatus === 'open' && tx.isLocked) return false;
    if (filters.lockStatus === 'locked' && !tx.isLocked) return false;
    
    return true;
  });

  // Handlers
  const handleToggleLock = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    try {
      if (tx.isLocked) {
        await unlockTransaction(id);
      } else {
        await lockTransaction(id, user?.uid || 'demo');
      }
    } catch (e: any) {
      alert("Lỗi khóa giao dịch: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá giao dịch này không?")) return;
    try {
      await deleteTransaction(id);
    } catch (e: any) {
      alert("Lỗi xóa giao dịch: " + e.message);
    }
  };

  const handleAddTransaction = async (newTx: Transaction) => {
    try {
      await addTransaction(newTx);
    } catch (e: any) {
      alert("Lỗi thêm giao dịch: " + e.message);
    }
  };

  const showInvoice = (attachments: { url: string; name: string; id: string }[]) => {
    setSelectedInvoices(attachments);
    setCurrentInvoiceIdx(0);
    setInvoiceDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* 1. Tiêu đề & Nút Thêm */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Sổ Giao Dịch</h1>
          <p className="text-muted-foreground font-medium mt-1">Theo dõi dòng tiền minh bạch, chặt chẽ.</p>
        </div>
        <AddTransactionDialog onAddTransaction={handleAddTransaction} />
      </div>

      {/* 2. Thanh Filter thông minh (Mobile First) */}
      <TransactionFilterBar 
        filters={filters} 
        onChange={updateFilter} 
        onReset={resetFilters} 
      />

      {/* 3. Bảng Giao dịch Hiện đại */}
      <TransactionTable 
        transactions={filteredTransactions} 
        onToggleLock={handleToggleLock}
        onDelete={handleDelete}
        onViewInvoice={showInvoice}
      />

      {/* 4. Lightbox Hóa đơn (Chỉ render khi open) */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-background/95 backdrop-blur-md flex flex-col">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              <span className="truncate pr-4">{selectedInvoices[currentInvoiceIdx]?.name || 'Hóa đơn chứng từ'}</span>
              <span className="text-sm font-normal text-muted-foreground whitespace-nowrap bg-muted px-3 py-1 rounded-full mr-6">
                {currentInvoiceIdx + 1} / {selectedInvoices.length}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-xl border shadow-sm flex items-center justify-center p-2 relative bg-black/5 min-h-[50vh]">
            {selectedInvoices.length > 0 && selectedInvoices[currentInvoiceIdx].url && (() => {
              const inv = selectedInvoices[currentInvoiceIdx];
              // Detect file extension realistically from name or url
              const isPdf = inv.name.toLowerCase().endsWith('.pdf') || inv.url.toLowerCase().includes('.pdf');
              const isDoc = inv.name.match(/\.(doc|docx|xls|xlsx|csv|txt|zip|rar)$/i);
              const isDocument = isPdf || isDoc;

              return (
                <div className="relative w-full h-full flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
                  {!isDocument ? (
                    <img src={inv.url} alt="Invoice" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md" />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-4 bg-white p-8 rounded-2xl shadow-sm border border-border/50 max-w-sm w-full">
                      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-sm ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                        {isPdf ? '📄' : '📝'}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground mb-1 line-clamp-2" title={inv.name}>{inv.name}</h4>
                        <p className="text-sm text-muted-foreground">Không thể xem trực tiếp định dạng này.</p>
                      </div>
                      <Button asChild className="w-full mt-2 shadow-sm rounded-xl">
                        <a href={inv.url} target="_blank" rel="noopener noreferrer">Mở / Tải Về</a>
                      </Button>
                    </div>
                  )}
                  
                  {selectedInvoices.length > 1 && (
                    <>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
                        onClick={() => setCurrentInvoiceIdx(p => (p > 0 ? p - 1 : selectedInvoices.length - 1))}
                      >
                        <span className="text-xl font-bold font-mono">{'<'}</span>
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
                        onClick={() => setCurrentInvoiceIdx(p => (p < selectedInvoices.length - 1 ? p + 1 : 0))}
                      >
                        <span className="text-xl font-bold font-mono">{'>'}</span>
                      </Button>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
