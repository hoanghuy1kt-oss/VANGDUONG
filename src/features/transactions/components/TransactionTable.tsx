import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORIES, getProjectByCode, formatDate } from '@/constants';
import { Transaction } from '@/types';
import { Lock, Unlock, Trash2, Image, FileText } from 'lucide-react';
import { FinanceMath } from '@/lib/finance'; // <-- Dùng FinanceMath

interface TransactionTableProps {
  transactions: Transaction[];
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  onViewInvoice: (attachments: { url: string; name: string; id: string }[]) => void;
}

export function TransactionTable({ transactions, onToggleLock, onDelete, onViewInvoice }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-20 border rounded-xl bg-card border-dashed">
        <FileText className="h-14 w-14 mx-auto mb-4 text-muted-foreground/30" />
        <h3 className="text-lg font-medium text-foreground">Không tìm thấy giao dịch nào</h3>
        <p className="text-sm text-muted-foreground mt-1">Hãy thay đổi bộ lọc hoặc thêm mới giao dịch.</p>
      </div>
    );
  }

  // Tiện ích tính tổng cột Tabular
  const totalIncome = transactions.reduce((acc, tx) => acc + (tx.income || 0), 0);
  const totalExpense = transactions.reduce((acc, tx) => acc + (tx.expense || 0), 0);

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-[1000px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[120px] py-4 font-semibold text-foreground">Ngày</TableHead>
              <TableHead className="min-w-[200px] font-semibold text-foreground">Nội dung</TableHead>
              <TableHead className="w-[140px] font-semibold text-foreground">Người nhập</TableHead>
              <TableHead className="w-[160px] font-semibold text-foreground">Dự án</TableHead>
              <TableHead className="w-[180px] font-semibold text-foreground">Phân bổ</TableHead>
              <TableHead className="w-[140px] text-right font-semibold text-foreground">Thu</TableHead>
              <TableHead className="w-[140px] text-right font-semibold text-foreground">Chi</TableHead>
              <TableHead className="w-[120px] text-center font-semibold text-foreground">Trạng thái</TableHead>
              <TableHead className="w-[100px] text-center font-semibold text-foreground">Hóa đơn</TableHead>
              <TableHead className="w-[100px] text-center font-semibold text-foreground">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const category = CATEGORIES.find((c) => c.code === tx.categoryCode);
              const project = getProjectByCode(tx.projectCode);
              
              return (
                <TableRow key={tx.id} className={`transition-colors hover:bg-muted/30 ${tx.isLocked ? 'opacity-80 bg-muted/20' : ''}`}>
                  {/* Ngày */}
                  <TableCell className="align-top font-medium text-muted-foreground">{formatDate(tx.date)}</TableCell>
                  
                  {/* Nội dung */}
                  <TableCell className="align-top">
                    <div>
                      <div className="font-semibold text-foreground leading-snug">{tx.description}</div>
                      {tx.subCategory && (
                        <div className="text-xs text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded-sm inline-block">{tx.subCategory}</div>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Người nhập */}
                  <TableCell className="align-top">
                    <div className="font-medium text-[13px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      {tx.createdBy || 'Hệ thống'}
                    </div>
                  </TableCell>

                  {/* Dự án */}
                  <TableCell className="align-top">
                    <span className="font-medium">{project?.name ?? tx.projectCode}</span>
                    <div className="text-[11px] font-mono text-muted-foreground uppercase cursor-help mt-0.5">{tx.projectCode}</div>
                  </TableCell>
                  
                  {/* Phân nhóm */}
                  <TableCell className="align-top">
                    {category ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: category.color }} />
                        <div>
                          <p className="text-sm font-medium leading-none" style={{ color: category.color }}>{category.name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground mt-1">#{category.code}</p>
                        </div>
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  
                  {/* Tiền Thu */}
                  <TableCell className="align-top text-right tabular-nums font-semibold tracking-tight text-green-600">
                    {tx.income > 0 ? FinanceMath.format(tx.income) : '-'}
                  </TableCell>
                  
                  {/* Tiền Chi */}
                  <TableCell className="align-top text-right tabular-nums font-semibold tracking-tight text-red-600">
                    {tx.expense > 0 ? FinanceMath.format(tx.expense) : '-'}
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell className="align-top text-center">
                    <Badge variant={tx.isLocked ? 'locked' : 'success'} className="px-2 py-0.5 shadow-sm">
                      {tx.isLocked ? <Lock className="h-3 w-3 mr-1.5" /> : <Unlock className="h-3 w-3 mr-1.5" />}
                      {tx.isLocked ? "Bảo lưu" : "Xử lý"}
                    </Badge>
                  </TableCell>
                  
                  {/* Hóa đơn */}
                  <TableCell className="align-top text-center">
                    {(tx.attachments && tx.attachments.length > 0) || tx.invoiceUrl ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-2 rounded-full border-primary/30 hover:bg-primary/5 text-primary gap-1" 
                        onClick={() => {
                          if (tx.attachments && tx.attachments.length > 0) {
                            onViewInvoice(tx.attachments);
                          } else if (tx.invoiceUrl) {
                            // Tương thích ngược với dữ liệu cũ
                            onViewInvoice([{ url: tx.invoiceUrl, name: tx.invoiceName || 'invoice', id: 'old' }]);
                          }
                        }}
                      >
                        <Image className="h-4 w-4" />
                        <span className="text-xs font-semibold">{tx.attachments?.length || 1} File</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground/50 italic">Không có</span>
                    )}
                  </TableCell>
                  
                  {/* Hành động */}
                  <TableCell className="align-top">
                    <div className="flex justify-center gap-1.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/5" onClick={() => onToggleLock(tx.id)} title={tx.isLocked ? 'Mở khóa sửa' : 'Chốt bảo lưu'}>
                        {tx.isLocked ? <Unlock className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-slate-400" />}
                      </Button>
                      {!tx.isLocked && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(tx.id)} title="Xóa">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          {/* Dòng Tổng Kết Sổ */}
          <TableBody className="bg-muted/10 border-t-2 border-border/70">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-4 text-right pr-6 font-bold text-muted-foreground uppercase text-xs tracking-wider">
                Tổng cộng sổ sách ({transactions.length} GD)
              </TableCell>
              <TableCell className="text-right text-green-600 font-bold tabular-nums text-base">
                {FinanceMath.format(totalIncome)}
              </TableCell>
              <TableCell className="text-right text-red-600 font-bold tabular-nums text-base">
                {FinanceMath.format(totalExpense)}
              </TableCell>
              <TableCell colSpan={3}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
