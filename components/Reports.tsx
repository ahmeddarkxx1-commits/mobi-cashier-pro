
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, LineChart, Line } from 'recharts';
import { Transaction, Expense, MaintenanceJob } from '../types';
import { Calendar, TrendingUp, Target, Wallet, BarChart3, Wrench, AlertCircle, Clock, ListChecks, ChevronLeft, ChevronRight, FileText, Banknote, Download } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  expenses: Expense[];
  maintenanceJobs: MaintenanceJob[];
}

type ReportPeriod = 'daily' | 'monthly' | 'yearly';

const Reports: React.FC<ReportsProps> = ({ transactions, expenses, maintenanceJobs }) => {
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const stats = useMemo(() => {
    const filterDate = new Date(selectedDate);
    const startOfSelectedDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
    const endOfSelectedDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 23, 59, 59);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const filterByPeriod = (tDate: string) => {
      const d = new Date(tDate);
      if (period === 'daily') return d >= startOfSelectedDay && d <= endOfSelectedDay;
      if (period === 'monthly') return d >= startOfMonth;
      return d >= startOfYear;
    };

    const periodT = transactions.filter(t => filterByPeriod(t.date));
    
    const income = periodT.filter(t => t.type !== 'expense').reduce((acc, t) => acc + t.amount, 0);
    const profit = periodT.reduce((acc, t) => acc + (t.profit || 0), 0);
    const expense = periodT.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    
    const balanceProfit = periodT
      .filter(t => t.category === 'recharge' || t.category === 'transfer')
      .reduce((acc, t) => acc + (t.profit || 0), 0);
      
    const maintenanceProfit = periodT
      .filter(t => t.type === 'maintenance')
      .reduce((acc, t) => acc + (t.profit || 0), 0);

    const uncollectedJobs = maintenanceJobs.filter(j => j.status === 'completed');

    return { 
      income, 
      profit, 
      expense,
      balanceProfit,
      maintenanceProfit,
      uncollectedCount: uncollectedJobs.length,
      uncollectedValue: uncollectedJobs.reduce((acc, j) => acc + j.cost, 0),
      periodTransactions: periodT
    };
  }, [transactions, maintenanceJobs, period, selectedDate]);

  const chartData = useMemo(() => {
    const data = [
      { name: 'مبيعات', value: stats.periodTransactions.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0), color: '#3b82f6' },
      { name: 'صيانة', value: stats.periodTransactions.filter(t => t.type === 'maintenance').reduce((acc, t) => acc + t.amount, 0), color: '#a855f7' },
      { name: 'تحويلات', value: stats.periodTransactions.filter(t => t.category === 'transfer' || t.category === 'recharge').reduce((acc, t) => acc + t.amount, 0), color: '#10b981' },
      { name: 'مصاريف', value: stats.periodTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0), color: '#ef4444' },
    ];
    return data.filter(d => d.value > 0);
  }, [stats.periodTransactions]);

  const handleDownloadReport = () => {
    const reportTitle = period === 'daily' ? `تقرير_يوم_${selectedDate}` : 
                       period === 'monthly' ? `تقرير_شهر_${new Date().getMonth() + 1}` : 'تقرير_سنة';
    
    let content = `--- ${reportTitle.replace(/_/g, ' ')} ---\n\n`;
    content += `إجمالي الدخل: ${stats.income} ج.م\n`;
    content += `إجمالي المصروفات: ${stats.expense} ج.م\n`;
    content += `صافي الأرباح: ${stats.profit} ج.م\n`;
    content += `أرباح الصيانة: ${stats.maintenanceProfit} ج.م\n`;
    content += `\n--- تفاصيل العمليات ---\n`;
    
    stats.periodTransactions.forEach(t => {
      content += `[${new Date(t.date).toLocaleTimeString('ar-EG')}] ${t.type === 'sale' ? 'بيع' : t.type === 'maintenance' ? 'صيانة' : 'مصروف'}: ${t.description} - المبلغ: ${t.amount}ج - الربح: ${t.profit}ج\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-12 font-['Cairo']">
      {/* Period Switcher & Date Picker */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl gap-2">
          <button onClick={() => setPeriod('daily')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${period === 'daily' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>تقرير اليوم</button>
          <button onClick={() => setPeriod('monthly')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${period === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>تقرير الشهر</button>
          <button onClick={() => setPeriod('yearly')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${period === 'yearly' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400'}`}>تقرير السنة</button>
        </div>

        {period === 'daily' && (
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 px-5 py-2.5 rounded-2xl border border-blue-100 dark:border-blue-800">
            <Calendar size={18} className="text-blue-600" />
            <span className="text-xs font-black text-blue-700 dark:text-blue-400">اختر التاريخ:</span>
            <input 
              type="date" 
              className="bg-transparent border-none outline-none font-black text-xs text-blue-600 dark:text-blue-400 cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        )}

        <button 
          onClick={handleDownloadReport}
          className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg active:scale-95 text-xs"
        >
          <Download size={18} /> تحميل الملف
        </button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-right">
        <div className="bg-gradient-to-br from-green-600 to-green-700 p-7 rounded-[2.5rem] text-white shadow-xl shadow-green-500/20">
          <div className="flex justify-between items-start mb-4">
             <Banknote size={24} className="opacity-50" />
             <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-black uppercase">إجمالي الدخل</span>
          </div>
          <div className="text-4xl font-black mb-1 tabular-nums">{stats.income.toLocaleString()}</div>
          <div className="text-[10px] text-green-100 font-bold">كل الفلوس اللي دخلت المحل</div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-7 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20">
          <div className="flex justify-between items-start mb-4">
             <TrendingUp size={24} className="opacity-50" />
             <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-black uppercase">صافي الأرباح</span>
          </div>
          <div className="text-4xl font-black mb-1 tabular-nums">{stats.profit.toLocaleString()}</div>
          <div className="text-[10px] text-blue-100 font-bold">مكسبك الصافي بعد التكاليف</div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-7 rounded-[2.5rem] text-white shadow-xl shadow-purple-500/20">
          <div className="flex justify-between items-start mb-4">
             <Wrench size={24} className="opacity-50" />
             <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-black uppercase">أرباح الصيانة</span>
          </div>
          <div className="text-4xl font-black mb-1 tabular-nums">{stats.maintenanceProfit.toLocaleString()}</div>
          <div className="text-[10px] text-purple-100 font-bold">أرباح الورشة فقط</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-start mb-4">
             <Clock size={24} className="text-red-500 opacity-50" />
             <span className="text-[10px] bg-red-50 text-red-600 px-3 py-1 rounded-full font-black uppercase">تحصيل صيانة</span>
          </div>
          <div className="text-4xl font-black mb-1 text-red-600 tabular-nums">{stats.uncollectedCount}</div>
          <div className="text-[10px] text-slate-400 font-bold">باقي: {stats.uncollectedValue.toLocaleString()} ج</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-right">
        {/* Charts Section */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
           <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-lg"><BarChart3 size={20} className="text-blue-500" /> تحليل الدخل</h4>
              <div className="text-[10px] font-bold text-slate-400">توزيع الإيرادات حسب النشاط</div>
           </div>
           
           <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'Cairo', textAlign: 'right'}} />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                   <AlertCircle size={48} className="opacity-20" />
                   <p className="font-bold">لا يوجد بيانات للرسم البياني حالياً</p>
                </div>
              )}
           </div>

           <div className="flex flex-wrap gap-4 justify-center">
              {chartData.map(c => (
                <div key={c.name} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl">
                   <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: c.color}} />
                   <span className="text-xs font-black text-slate-600 dark:text-slate-300">{c.name}</span>
                   <span className="text-[10px] font-bold text-slate-400">{Math.round((c.value / stats.income) * 100)}%</span>
                </div>
              ))}
           </div>
        </div>

        {/* Financial Summary Table */}
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl space-y-8 border border-slate-800 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -ml-32 -mt-32"></div>
           <div className="flex items-center gap-3 relative">
              <div className="p-3 bg-white/10 rounded-2xl text-blue-400"><Target size={24}/></div>
              <h4 className="font-black text-xl">ملخص الحسابات الصافي</h4>
           </div>

           <div className="space-y-4 relative">
              <div className="flex justify-between items-center p-5 bg-white/5 rounded-3xl border border-white/5">
                 <span className="font-bold text-slate-400">إجمالي الإيرادات</span>
                 <span className="font-black text-xl text-blue-400 tabular-nums">{stats.income.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between items-center p-5 bg-white/5 rounded-3xl border border-white/5">
                 <span className="font-bold text-slate-400">إجمالي المصروفات</span>
                 <span className="font-black text-xl text-red-400 tabular-nums">-{stats.expense.toLocaleString()} ج.م</span>
              </div>
              <div className="h-px bg-white/10 my-4"></div>
              <div className="flex justify-between items-center p-7 bg-blue-600 rounded-[2rem] shadow-xl">
                 <div>
                   <span className="text-[10px] font-black uppercase opacity-60 block mb-1">الربح النهائي للفترة</span>
                   <span className="text-4xl font-black tabular-nums">{(stats.profit - stats.expense).toLocaleString()}</span>
                 </div>
                 <div className="text-xl font-black">ج.م</div>
              </div>
           </div>
        </div>
      </div>

      {/* Daily Operations Log */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-700 text-right">
         <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl"><ListChecks size={20}/></div>
               <h4 className="font-black text-slate-800 dark:text-white">سجل العمليات التفصيلي</h4>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
               <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                     <th className="p-6">الوقت</th>
                     <th className="p-6">نوع العملية</th>
                     <th className="p-6">المسؤول</th>
                     <th className="p-6">البيان</th>
                     <th className="p-6 text-center">الربح</th>
                     <th className="p-6 text-left">المبلغ</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {stats.periodTransactions.length > 0 ? (
                    stats.periodTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                         <td className="p-6">
                            <div className="text-[11px] font-black text-slate-800 dark:text-white tabular-nums">{new Date(t.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute: '2-digit'})}</div>
                            <div className="text-[9px] text-slate-400 font-bold">{new Date(t.date).toLocaleDateString('ar-EG')}</div>
                         </td>
                         <td className="p-6">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black ${
                              t.type === 'expense' ? 'bg-red-50 text-red-600' : 
                              t.type === 'sale' ? 'bg-blue-50 text-blue-600' : 
                              t.type === 'maintenance' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'
                            }`}>
                              {t.type === 'expense' ? 'مصروف' : t.type === 'sale' ? 'مبيعات' : t.type === 'maintenance' ? 'صيانة' : 'تحويل'}
                            </span>
                         </td>
                         <td className="p-6">
                            <div className="text-[11px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg inline-block">{t.cashier_name || 'صاحب المحل'}</div>
                         </td>
                         <td className="p-6">
                            <div className="text-xs font-black text-slate-700 dark:text-slate-300 max-w-xs truncate">{t.description}</div>
                         </td>
                         <td className="p-6 text-center">
                            <div className="text-[11px] font-black text-green-600 tabular-nums">+{t.profit?.toLocaleString()}</div>
                         </td>
                         <td className={`p-6 text-left font-black text-sm tabular-nums ${t.type === 'expense' ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                            {t.amount.toLocaleString()} ج.م
                         </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                       <td colSpan={6} className="p-20 text-center text-slate-300 font-black flex flex-col items-center gap-3">
                          <AlertCircle size={40} className="opacity-20" />
                          <span>لا يوجد عمليات مسجلة في هذه الفترة</span>
                       </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default Reports;
