
import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Calendar, Banknote, CheckCircle2, AlertCircle, Clock, Trash2, Filter, X } from 'lucide-react';
import { Debt } from '../types';
import { supabase } from '../supabaseClient';
import { createDebt } from '../supabaseHelpers';

interface DebtsProps {
  shopId: string | null;
  addTransaction: (t: any) => void;
}

const Debts: React.FC<DebtsProps> = ({ shopId, addTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [newDebt, setNewDebt] = useState({ customerName: '', customerPhone: '', amount: 0, description: '' });
  const [settleModal, setSettleModal] = useState<{isOpen: boolean, debt: Debt | null}>({isOpen: false, debt: null});
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  useEffect(() => {
    if (!shopId) return;
    const fetchDebts = async () => {
      const { data, error } = await supabase.from('debts').select('*').eq('shop_id', shopId).order('date', { ascending: false });
      if (data) setDebts(data);
      if (error) console.error('Error fetching debts', error);
    };
    fetchDebts();
  }, [shopId]);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || newDebt.amount <= 0) return;
    
    const debtData = {
      customerName: newDebt.customerName,
      customerPhone: newDebt.customerPhone,
      amount: Number(newDebt.amount),
      remainingAmount: Number(newDebt.amount),
      description: newDebt.description,
      date: new Date().toISOString(),
      status: 'pending' as const,
      type: 'manual' as const,
      shop_id: shopId
    };

    const { data: created, error } = await createDebt(debtData, shopId);
    if (created) {
      setDebts([created, ...debts]);
      setIsAddingDebt(false);
      setNewDebt({ customerName: '', customerPhone: '', amount: 0, description: '' });
    } else if (error) {
      console.error('Error creating debt:', error);
      toast.error('فشل تسجيل المديونية في السحابة!');
    }
  };

  const handleSettleClick = (debt: Debt) => {
    setSettleModal({ isOpen: true, debt });
    setPaymentAmount(debt.remainingAmount);
  };

  const submitSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const debt = settleModal.debt;
    if (!debt) return;
    
    if (paymentAmount <= 0) {
      alert('يجب إدخال مبلغ صحيح!');
      return;
    }
    if (paymentAmount > debt.remainingAmount) {
      alert('المبلغ أكبر من المستحق!');
      return;
    }

    const newRemaining = debt.remainingAmount - paymentAmount;
    const newStatus = newRemaining <= 0 ? 'paid' : 'partially_paid';

    try {
      const { error } = await supabase.from('debts').update({
        remainingAmount: newRemaining,
        status: newStatus
      }).eq('id', debt.id);

      if (error) throw error;

      setDebts(prev => prev.map(d => d.id === debt.id ? { ...d, remainingAmount: newRemaining, status: newStatus } : d));
      
      addTransaction({
        type: 'debt_payment',
        medium: 'cash',
        amount: paymentAmount,
        profit: paymentAmount,
        cost: 0,
        description: `سداد دين: ${debt.customerName} (${debt.description || ''})`,
        category: 'other'
      });
      
      setSettleModal({ isOpen: false, debt: null });
      setPaymentAmount(0);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء السداد.');
    }
  };

  const filteredDebts = debts.filter(d => 
    d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (d.customerPhone && d.customerPhone.includes(searchTerm))
  );

  const totalRemaining = debts.reduce((acc, d) => acc + d.remainingAmount, 0);

  return (
    <div className="space-y-6 font-['Cairo'] text-right" dir="rtl">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2.5rem] flex items-center justify-between">
          <div>
            <div className="text-red-500 font-black text-3xl mb-1">{totalRemaining.toLocaleString()} ج</div>
            <div className="text-red-900/60 font-bold text-sm">إجمالي الديون المستحقة</div>
          </div>
          <AlertCircle size={48} className="text-red-500 opacity-20" />
        </div>
        
        <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-[2.5rem] flex items-center justify-between">
          <div>
            <div className="text-green-500 font-black text-3xl mb-1">{debts.filter(d => d.status === 'paid').length}</div>
            <div className="text-green-900/60 font-bold text-sm">ديون تم تسويتها</div>
          </div>
          <CheckCircle2 size={48} className="text-green-500 opacity-20" />
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-8 rounded-[2.5rem] flex items-center justify-between">
          <div>
            <div className="text-blue-500 font-black text-3xl mb-1">{debts.filter(d => d.status === 'pending').length}</div>
            <div className="text-blue-900/60 font-bold text-sm">مديونيات نشطة</div>
          </div>
          <Clock size={48} className="text-blue-500 opacity-20" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={24} />
          <input
            type="text"
            placeholder="ابحث باسم الزبون أو رقم التليفون.."
            className="w-full pr-14 pl-6 py-5 rounded-3xl border border-gray-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm bg-white text-gray-900 font-black text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsAddingDebt(true)}
          className="bg-slate-900 text-white px-8 py-5 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10 active:scale-95"
        >
          <UserPlus size={24} />
          إضافة دين جديد
        </button>
      </div>

      {/* Debt List */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-black text-xl flex items-center gap-3">
             <Banknote className="text-blue-600" />
             سجل المديونيات
          </h3>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Filter size={20}/></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-gray-400 text-sm font-black border-b border-gray-50 uppercase tracking-widest">
                <th className="px-8 py-6">الزبون</th>
                <th className="px-8 py-6">التاريخ</th>
                <th className="px-8 py-6">المبلغ</th>
                <th className="px-8 py-6">المتبقي</th>
                <th className="px-8 py-6">الحالة</th>
                <th className="px-8 py-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-300 space-y-4">
                      <Banknote size={80} className="opacity-10" />
                      <p className="font-black text-xl">مفيش ديون حالياً يا عالمي</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDebts.map(debt => (
                  <tr key={debt.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-black text-gray-800">{debt.customerName}</div>
                      <div className="text-[11px] font-bold text-blue-600 mt-1">{debt.description || 'لا يوجد بيان'}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1"><Phone size={12}/> {debt.customerPhone || 'بدون رقم'}</div>
                    </td>
                    <td className="px-8 py-6 text-gray-500 font-bold text-sm">
                       <div className="flex items-center gap-2"><Calendar size={14}/> {new Date(debt.date).toLocaleDateString('ar-EG')}</div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-900">{debt.amount.toLocaleString()} ج</td>
                    <td className="px-8 py-6">
                       <span className={`font-black ${debt.remainingAmount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {debt.remainingAmount.toLocaleString()} ج
                       </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${
                        debt.status === 'paid' ? 'bg-green-100 text-green-600' : 
                        debt.status === 'partially_paid' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {debt.status === 'paid' ? 'تم السداد' : debt.status === 'partially_paid' ? 'سداد جزئي' : 'مطلوب السداد'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        {debt.remainingAmount > 0 && (
                          <button onClick={() => handleSettleClick(debt)} title="استلام دفعة / سداد الدين" className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Banknote size={18}/></button>
                        )}
                        <button className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Debt Modal */}
      {isAddingDebt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <form onSubmit={handleAddDebt} className="bg-white dark:bg-slate-900 w-full max-w-lg p-8 rounded-[2.5rem] shadow-2xl space-y-6 relative border border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsAddingDebt(false)} className="absolute top-6 left-6 text-slate-400 hover:text-red-500"><X size={24}/></button>
            <h4 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2 justify-end">
              إضافة دين جديد <UserPlus className="text-blue-600" />
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-2 text-right">
                <label className="text-sm font-black text-slate-700">اسم العميل</label>
                <input required placeholder="اسم الزبون..." className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 text-right font-bold outline-none focus:border-blue-500" value={newDebt.customerName} onChange={e => setNewDebt({...newDebt, customerName: e.target.value})} />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-sm font-black text-slate-700">رقم الموبايل</label>
                <input placeholder="01X..." className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 text-right font-bold outline-none focus:border-blue-500" value={newDebt.customerPhone} onChange={e => setNewDebt({...newDebt, customerPhone: e.target.value})} />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-sm font-black text-blue-600">المبلغ (جنيه)</label>
                <input type="number" required placeholder="0" className="w-full p-4 rounded-2xl border-2 border-blue-100 dark:bg-slate-800 text-right font-black text-lg outline-none focus:border-blue-500" value={newDebt.amount || ''} onChange={e => setNewDebt({...newDebt, amount: Number(e.target.value)})} />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-sm font-black text-slate-700">البيان (باقي إيه؟)</label>
                <input placeholder="مثال: باقي حساب صيانة، أو جهاز..." className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 text-right font-bold outline-none focus:border-blue-500" value={newDebt.description} onChange={e => setNewDebt({...newDebt, description: e.target.value})} />
              </div>
            </div>
            
            <button type="submit" className="w-full bg-blue-600 text-white rounded-2xl font-black py-5 shadow-xl text-lg active:scale-95 transition-all">سجل المديونية</button>
          </form>
        </div>
      )}

      {/* Settle Debt Modal */}
      {settleModal.isOpen && settleModal.debt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <form onSubmit={submitSettleDebt} className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl space-y-6 relative border border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setSettleModal({isOpen: false, debt: null})} className="absolute top-6 left-6 text-slate-400 hover:text-red-500"><X size={24}/></button>
            <h4 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2 justify-end">
              تسوية دين <Banknote className="text-green-600" />
            </h4>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl text-right space-y-2 border border-slate-100">
              <div className="text-sm text-slate-500 font-bold flex justify-between">
                <span className="text-slate-800 dark:text-white">{settleModal.debt.customerName}</span>
                <span>العميل</span>
              </div>
              <div className="text-sm text-slate-500 font-bold flex justify-between">
                <span className="text-red-500 font-black">{settleModal.debt.remainingAmount} ج</span>
                <span>المتبقي</span>
              </div>
            </div>

            <div className="space-y-2 text-right">
              <label className="text-sm font-black text-blue-600">المبلغ المدفوع (جنيه)</label>
              <input type="number" required placeholder="0" className="w-full p-4 rounded-2xl border-2 border-blue-100 dark:bg-slate-800 text-right font-black text-2xl outline-none focus:border-blue-500" value={paymentAmount || ''} onChange={e => setPaymentAmount(Number(e.target.value))} />
            </div>
            
            <button type="submit" className="w-full bg-green-600 text-white rounded-2xl font-black py-5 shadow-xl text-lg hover:bg-green-700 active:scale-95 transition-all">تأكيد السداد وإضافة للخزنة</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Debts;
