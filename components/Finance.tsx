
import React, { useState, useMemo } from 'react';
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, History, X, TrendingUp, Smartphone, Banknote, Calculator } from 'lucide-react';
import { Transaction, Expense } from '../types';

interface FinanceProps {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}

const Finance: React.FC<FinanceProps> = ({ transactions, addTransaction, expenses, setExpenses }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const [formMode, setFormMode] = useState<'none' | 'expense' | 'income'>('none');
  const [newEntry, setNewEntry] = useState({ description: '', amount: 0, category: 'other', medium: 'cash' as 'cash' | 'wallet' });

  const stats = useMemo(() => {
    const cashIncome = transactions.filter(t => t.medium === 'cash' && t.type !== 'expense').reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const cashExpense = transactions.filter(t => t.medium === 'cash' && t.type === 'expense').reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const walletIncome = transactions.filter(t => t.medium === 'wallet' && t.type !== 'expense').reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const walletExpense = transactions.filter(t => t.medium === 'wallet' && t.type === 'expense').reduce((acc, t) => acc + Number(t.amount || 0), 0);
    return { cashBalance: cashIncome - cashExpense, walletBalance: walletIncome - walletExpense };
  }, [transactions]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Number(newEntry.amount);
    if (formMode === 'expense') {
      addTransaction({ type: 'expense', medium: newEntry.medium, amount: cleanAmount, description: `مصروف: ${newEntry.description}`, category: 'expense' });
    } else if (formMode === 'income') {
      addTransaction({ type: 'income', medium: newEntry.medium, amount: cleanAmount, profit: cleanAmount, description: `دخل خارجي: ${newEntry.description}`, category: 'manual_income' });
    }
    setFormMode('none');
    setNewEntry({ description: '', amount: 0, category: 'other', medium: 'cash' });
  };

  return (
    <div className="space-y-8 pb-10 font-['Cairo'] text-right">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 font-black text-sm">فلوس الدرج (كاش)</span>
            <Banknote className="text-green-500" size={24} />
          </div>
          <div className="text-4xl font-black text-gray-800 tabular-nums">{Math.round(stats.cashBalance).toLocaleString()} ج</div>
          <p className="text-[10px] text-gray-400 font-bold mt-2">السيولة اللي موجودة معاك في المحل دلوقتي</p>
        </div>
        <div className="bg-slate-900 p-7 rounded-[2.5rem] shadow-xl text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-blue-300 font-black text-sm">فلوس المحافظ (كاش / فيزا)</span>
            <Smartphone className="text-blue-400" size={24} />
          </div>
          <div className="text-4xl font-black text-white tabular-nums">{Math.round(stats.walletBalance).toLocaleString()} ج</div>
          <p className="text-[10px] text-blue-200/50 font-bold mt-2">رصيد فودافون كاش وباقي المحافظ</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-3">
            <button onClick={() => setFormMode('income')} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg active:scale-95">
              <TrendingUp size={18} /> زود دخل
            </button>
            <button onClick={() => setFormMode('expense')} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg active:scale-95">
              <Plus size={18} /> صرف مصروف
            </button>
         </div>
      </div>

      {formMode !== 'none' && (
        <form onSubmit={handleAddEntry} className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-100 animate-in slide-in-from-top duration-300">
           <div className="flex justify-between mb-8 items-center">
              <h4 className="text-xl font-black">{formMode === 'expense' ? 'سجل مصروفات جديدة' : 'سجل دخل إضافي'}</h4>
              <button type="button" onClick={() => setFormMode('none')}><X size={28} className="text-gray-400"/></button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input required placeholder="البيان (صرفت في إيه؟)" className="p-4 rounded-2xl border font-bold" value={newEntry.description} onChange={e => setNewEntry({...newEntry, description: e.target.value})} />
              <input required type="number" placeholder="المبلغ كام؟" className="p-4 rounded-2xl border font-black" value={newEntry.amount || ''} onChange={e => setNewEntry({...newEntry, amount: Number(e.target.value)})} />
              <button type="submit" className={`py-4 rounded-2xl font-black text-white ${formMode === 'expense' ? 'bg-red-600' : 'bg-green-600'}`}>سجل العملية</button>
           </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b flex items-center gap-2 font-black text-slate-800 dark:text-white uppercase"><History size={20}/> سجل كل العمليات والتحركات المالية</div>
        <div className="overflow-x-auto">
           <table className="w-full text-right">
             <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-gray-400">
                <tr><th className="p-5">الوقت</th><th className="p-5">البيان</th><th className="p-5 text-center">الوسيلة</th><th className="p-5 text-left">المبلغ</th></tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
                {transactions.map(t => (
                  <tr key={t.id} className="text-xs font-bold hover:bg-gray-50 transition-colors">
                    <td className="p-5 text-gray-400">{new Date(t.date).toLocaleTimeString('ar-EG')}</td>
                    <td className="p-5 text-slate-700 dark:text-white">{t.description}</td>
                    <td className="p-5 text-center"><span className={`px-2 py-1 rounded-lg ${t.medium === 'cash' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{t.medium === 'cash' ? 'كاش' : 'محفظة'}</span></td>
                    <td className={`p-5 text-left font-black text-base tabular-nums ${t.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>{t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString()} ج</td>
                  </tr>
                ))}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;
