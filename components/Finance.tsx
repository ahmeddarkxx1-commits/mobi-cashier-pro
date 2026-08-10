
import React, { useState, useMemo } from 'react';
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, History, X, TrendingUp, Smartphone, Banknote, Calculator, Eye, Printer, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Transaction, Expense } from '../types';

interface FinanceProps {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id' | 'date' | 'shop_id'> & { shop_id?: string }) => void;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  appName?: string;
}

const Finance: React.FC<FinanceProps> = ({ transactions, addTransaction, expenses, setExpenses, appName }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const [formMode, setFormMode] = useState<'none' | 'expense' | 'income'>('none');
  const [newEntry, setNewEntry] = useState({ description: '', amount: 0, category: 'other', medium: 'cash' as 'cash' | 'wallet' });

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const getCleanName = (fullName: string) => {
    if (!fullName) return '';
    return fullName.split(' - Barcode:')[0].split(' - IMEI:')[0].trim();
  };

  const playBeepSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, context.currentTime); // 1000Hz standard scanner pitch
      
      gain.gain.setValueAtTime(0.3, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15); // Smooth decay
      
      osc.connect(gain);
      gain.connect(context.destination);
      
      osc.start();
      osc.stop(context.currentTime + 0.15);
    } catch (e) {
      console.error("Audio beep failed", e);
    }
  };

  const getInvoiceData = (t: Transaction) => {
    let items: Array<{ name: string; qty: number; price: number }> = [];
    const descriptionText = t.description.split(' | JSON:')[0];
    
    if (t.description.includes(' | JSON:')) {
      try {
        const jsonStr = t.description.split(' | JSON:')[1];
        items = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse invoice JSON", e);
      }
    }
    
    // Fallback if no JSON found (for old transactions)
    if (items.length === 0 && t.type === 'sale') {
      const cleanDesc = descriptionText.replace('بيع: ', '').replace(/دفعة من بيعة آجل \([^)]+\): /, '');
      items = cleanDesc.split('، ').map(itemStr => {
        const match = itemStr.match(/(.+)\s*\((\d+)\)/);
        if (match) {
          return { name: match[1].trim(), qty: parseInt(match[2]), price: 0 };
        }
        return { name: itemStr.trim(), qty: 1, price: 0 };
      });
    }
    
    return {
      id: t.id,
      date: new Date(t.date).toLocaleString('ar-EG'),
      items,
      total: t.amount,
      paymentMedium: t.medium,
      cashierName: t.cashier_name || 'غير مسجل',
      descriptionText
    };
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoice) return;
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) {
      toast.error('يرجى السماح بنوافذ البوب أب لطباعة الفواتير!');
      return;
    }
    const itemsHtml = selectedInvoice.items.length === 0 ? `
      <tr>
        <td colspan="3" style="text-align: right; padding: 6px 0;">${selectedInvoice.descriptionText}</td>
      </tr>
    ` : selectedInvoice.items.map((i: any) => `
      <tr>
        <td style="text-align: right; padding: 6px 0;">${getCleanName(i.name)}</td>
        <td style="text-align: center; padding: 6px 0;">${i.qty}</td>
        <td style="text-align: left; padding: 6px 0;">${i.price > 0 ? `${(i.price * i.qty).toLocaleString()} ج` : '-'}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>فاتورة مبسطة</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            * { box-sizing: border-box; font-family: 'Cairo', sans-serif; margin: 0; padding: 0; }
            body { width: 58mm; padding: 4mm; background: #fff; color: #000; direction: rtl; font-size: 11px; }
            .header { text-align: center; margin-bottom: 4mm; border-bottom: 1px dashed #000; padding-bottom: 2mm; }
            .shop-name { font-size: 16px; font-weight: 900; }
            .title { font-size: 12px; font-weight: 700; margin: 1mm 0; }
            .meta { font-size: 9px; line-height: 1.4; margin-bottom: 2mm; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
            th { border-bottom: 1px solid #000; padding: 4px 0; font-weight: 700; font-size: 10px; }
            td { font-size: 10px; }
            .footer { border-top: 1px dashed #000; padding-top: 2mm; text-align: center; font-size: 9px; margin-top: 4mm; }
            .total-row { font-size: 12px; font-weight: 900; border-top: 1px solid #000; padding-top: 2px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div class="shop-name">${appName || 'المحل'}</div>
            <div class="title">فاتورة مبيعات</div>
            <div class="meta">
              رقم الفاتورة: ${selectedInvoice.id}<br>
              التاريخ: ${selectedInvoice.date}<br>
              الكاشير: ${selectedInvoice.cashierName}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: right;">الصنف</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: left;">السعر</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="2" style="text-align: right; padding-top: 4px;">الإجمالي:</td>
                <td style="text-align: left; padding-top: 4px;">${selectedInvoice.total.toLocaleString()} ج</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            طريقة الدفع: ${selectedInvoice.paymentMedium === 'cash' ? 'كاش 💵' : 'محفظة 📱'}<br>
            شكراً لزيارتكم! 🎉
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleShareWhatsApp = () => {
    if (!selectedInvoice) return;
    const itemsText = selectedInvoice.items.length === 0 ? selectedInvoice.descriptionText : selectedInvoice.items.map((i: any) => `- ${getCleanName(i.name)} (${i.qty} قطعة) ${i.price > 0 ? `= ${(i.price * i.qty).toLocaleString()} ج` : ''}`).join('\n');
    const paymentText = selectedInvoice.paymentMedium === 'cash' ? 'كاش 💵' : 'محفظة 📱';
    const text = encodeURIComponent(
`شكرًا لتعاملك معنا في *${appName || 'المحل'}*! 🎉
تفاصيل فاتورتك الرقمية:
----------------------------
رقم الفاتورة: ${selectedInvoice.id}
التاريخ: ${selectedInvoice.date}
طريقة الدفع: ${paymentText}
----------------------------
المنتجات:
${itemsText}
----------------------------
*الإجمالي: ${selectedInvoice.total.toLocaleString()} ج*
----------------------------
نسعد بخدمتكم دائماً! ❤️`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

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
                <tr><th className="p-5">الوقت</th><th className="p-5">البيان</th><th className="p-5 text-center">الوسيلة</th><th className="p-5 text-left">المبلغ</th><th className="p-5 text-center">الفاتورة</th></tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
                {transactions.map(t => {
                  const isSale = t.type === 'sale' || t.description.startsWith('بيع:') || t.description.startsWith('دفعة من بيعة آجل');
                  return (
                    <tr key={t.id} className="text-xs font-bold hover:bg-gray-50 transition-colors">
                      <td className="p-5 text-gray-400">{new Date(t.date).toLocaleDateString('ar-EG')} {new Date(t.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="p-5 text-slate-700 dark:text-white">{t.description.split(' | JSON:')[0]}</td>
                      <td className="p-5 text-center"><span className={`px-2 py-1 rounded-lg ${t.medium === 'cash' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{t.medium === 'cash' ? 'كاش' : 'محفظة'}</span></td>
                      <td className={`p-5 text-left font-black text-base tabular-nums ${t.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>{t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString()} ج</td>
                      <td className="p-5 text-center">
                        {isSale ? (
                          <button 
                            onClick={() => setSelectedInvoice(getInvoiceData(t))}
                            className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl font-black text-[11px] transition-colors"
                          >
                            <Eye size={12} /> عرض الفاتورة
                          </button>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
             </tbody>
           </table>
        </div>
      </div>
      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm font-['Cairo']" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl text-right space-y-6 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center pb-4 border-b border-slate-850">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                📄 تفاصيل الفاتورة
              </h3>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-slate-950/50 border border-slate-850 p-5 rounded-2xl space-y-3 text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-850 pb-2"><span className="text-slate-500">رقم الفاتورة:</span><span className="font-bold text-white font-mono text-xs">{selectedInvoice.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">التاريخ:</span><span className="font-bold text-white">{selectedInvoice.date}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">الكاشير:</span><span className="font-bold text-white">{selectedInvoice.cashierName}</span></div>
              <div className="flex justify-between border-b border-slate-850 pb-2"><span className="text-slate-500">طريقة الدفع:</span><span className="font-bold text-blue-400">{selectedInvoice.paymentMedium === 'cash' ? 'كاش 💵' : 'محفظة 📱'}</span></div>
              
              <div className="space-y-2 pt-2">
                <span className="text-slate-500 font-bold">الأصناف المباعة:</span>
                <div className="space-y-1 max-h-40 overflow-y-auto bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  {selectedInvoice.items.length === 0 ? (
                    <div className="text-xs text-slate-300 font-bold">{selectedInvoice.descriptionText}</div>
                  ) : (
                    selectedInvoice.items.map((i: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs font-medium">
                        <span className="text-slate-300">{getCleanName(i.name)} ({i.qty} حتة)</span>
                        <span className="text-white font-bold">{i.price > 0 ? `${(i.price * i.qty).toLocaleString()} ج` : 'سعر غير مسجل'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-between border-t border-slate-850 pt-2 font-black text-lg"><span className="text-slate-300">الإجمالي:</span><span className="text-emerald-500">{selectedInvoice.total.toLocaleString()} ج</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePrintInvoice}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/15"
              >
                <Printer size={18} /> طباعة الفاتورة
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/15"
              >
                <Share2 size={18} /> واتساب
              </button>
            </div>
            
            <button
              onClick={() => setSelectedInvoice(null)}
              className="w-full py-3 bg-slate-850 hover:bg-slate-800 text-slate-400 font-bold rounded-xl transition-all text-xs border border-slate-800"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
