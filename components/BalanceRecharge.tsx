
import React, { useState, useMemo, useEffect } from 'react';
import { Zap, Hash, Sparkles, TrendingUp, DollarSign, HelpCircle, Smartphone, CheckCircle2, ShoppingCart, Plus } from 'lucide-react';
import { Transaction, TransferSetting } from '../types';

interface BalanceRechargeProps {
  addTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  settings: TransferSetting[];
}

const operators = [
  { id: 'vf', name: 'فودافون', color: 'bg-red-600', light: 'bg-red-50', text: 'text-red-600' },
  { id: 'et', name: 'اتصالات', color: 'bg-green-600', light: 'bg-green-50', text: 'text-green-600' },
  { id: 'or', name: 'أورانج', color: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-500' },
  { id: 'we', name: 'وي WE', color: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600' },
];

const categories = [
  { id: 'faka', name: 'كروت فكة / مكسات', icon: Sparkles },
  { id: 'credit', name: 'رصيد عادي (صافي)', icon: Hash },
  { id: 'other', name: 'خدمات أخرى', icon: HelpCircle },
];

const BalanceRecharge: React.FC<BalanceRechargeProps> = ({ addTransaction, settings = [] }) => {
  const [activeOpId, setActiveOpId] = useState(operators[0].id);
  const [activeCat, setActiveCat] = useState('faka');
  const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(null);
  
  const [netAmount, setNetAmount] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [otherName, setOtherName] = useState('');

  const operator = operators.find(o => o.id === activeOpId);
  const currentOpSettings = useMemo(() => {
    return settings.find(s => s.operator.includes(operator?.name || '')) || settings[0];
  }, [operator, settings]);

  useEffect(() => {
    setSelectedRuleIndex(null);
  }, [activeOpId, activeCat]);

  useEffect(() => {
    if (activeCat === 'credit' && netAmount) {
      const net = parseFloat(netAmount);
      if (!isNaN(net)) {
        const multiplier = currentOpSettings?.creditMultiplier || 1.5;
        const sell = Math.ceil(net * multiplier);
        setSellingPrice(sell.toString());
        setCostPrice((net * 1.05).toFixed(2));
      }
    }
  }, [netAmount, activeCat, currentOpSettings]);

  const handleSale = (label: string, sell: number, cost: number) => {
    addTransaction({
      type: 'income',
      medium: 'cash', // العميل يدفع كاش في المحل
      amount: Number(sell),
      cost: Number(cost),
      profit: Number(sell) - Number(cost),
      description: `شحن رصيد: ${label} (${operator?.name})`,
      category: 'recharge'
    });
    
    setSelectedRuleIndex(null);
    alert('تم تسجيل عملية البيع بنجاح وتحديث الخزنة');
  };

  const handleManualSale = (e: React.FormEvent) => {
    e.preventDefault();
    const sell = parseFloat(sellingPrice);
    const cost = parseFloat(costPrice) || 0;
    
    if (isNaN(sell) || sell <= 0) return;

    const desc = activeCat === 'credit' 
      ? `رصيد صافي ${netAmount} لشركة ${operator?.name}`
      : `${otherName} (${operator?.name})`;

    addTransaction({
      type: 'income',
      medium: 'cash', // تسجيل ككاش ليدخل الخزنة
      amount: Number(sell),
      cost: Number(cost),
      profit: Number(sell) - Number(cost),
      description: `شحن رصيد: ${desc}`,
      category: 'recharge'
    });

    setSellingPrice('');
    setCostPrice('');
    setNetAmount('');
    setOtherName('');
    alert('تم تسجيل العملية بنجاح');
  };

  const profitPreview = useMemo(() => {
    const s = parseFloat(sellingPrice) || 0;
    const c = parseFloat(costPrice) || 0;
    return Math.max(0, s - c);
  }, [sellingPrice, costPrice]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 w-full overflow-x-hidden">
      <div className="flex bg-white p-2 rounded-3xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar gap-2">
        {operators.map(op => (
          <button
            key={op.id}
            onClick={() => setActiveOpId(op.id)}
            className={`flex-1 min-w-[100px] py-4 rounded-2xl font-black text-xs sm:text-sm transition-all ${
              activeOpId === op.id ? `${op.color} text-white shadow-lg scale-105` : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
            }`}
          >
            {op.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex bg-slate-50 p-1.5 border-b border-gray-100">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
                activeCat === cat.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <cat.icon size={14} />
              {cat.name}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-8 space-y-8">
          {activeCat === 'faka' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="text-xs font-black text-gray-400 px-1 uppercase flex items-center gap-2">
                <ShoppingCart size={14} />
                قائمة كروت الفكة المتاحة:
              </div>
              <div className="grid grid-cols-1 gap-4">
                {currentOpSettings?.rechargeRules?.map((rule, idx) => {
                  const isSelected = selectedRuleIndex === idx;
                  const profit = rule.cardValue - rule.costPrice;

                  return (
                    <div 
                      key={idx}
                      className={`relative rounded-[2rem] border-2 transition-all duration-300 overflow-hidden ${
                        isSelected 
                          ? `border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]` 
                          : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedRuleIndex(isSelected ? null : idx)}
                        className={`w-full p-6 text-right font-black transition-all flex items-center justify-between ${
                          isSelected ? 'bg-blue-50/50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                           <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-200'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full bg-white transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`} />
                           </div>
                           <span className={`text-lg ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{rule.label}</span>
                        </div>
                        <div className={`px-4 py-1.5 rounded-2xl text-base ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {rule.cardValue} ج
                        </div>
                      </button>

                      {isSelected && (
                        <div className="p-6 bg-white border-t border-blue-100 space-y-4 animate-in slide-in-from-top duration-300">
                          <div className="flex items-center justify-between text-xs font-black">
                            <div className="flex flex-col">
                              <span className="text-gray-400">تكلفة عليك:</span>
                              <span className="text-slate-800">{rule.costPrice} ج</span>
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-gray-400">ربحك في الكارت:</span>
                              <span className="text-green-600">+{profit.toFixed(2)} ج</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleSale(rule.label, rule.cardValue, rule.costPrice)}
                            className={`w-full py-5 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${operator?.color}`}
                          >
                            <CheckCircle2 size={24} />
                            تأكيد بيع {rule.label}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(activeCat === 'credit' || activeCat === 'other') && (
            <form onSubmit={handleManualSale} className="space-y-6 animate-in slide-in-from-bottom duration-300">
              {activeCat === 'other' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 pr-1">اسم الخدمة</label>
                  <input
                    type="text"
                    placeholder="مثلاً: فاتورة إنترنت، شحن ألعاب..."
                    className="w-full p-4 rounded-2xl border-2 border-gray-100 bg-slate-50 font-bold text-right outline-none focus:border-blue-500"
                    value={otherName}
                    onChange={e => setOtherName(e.target.value)}
                    required
                  />
                </div>
              )}

              {activeCat === 'credit' && (
                <div className="p-8 bg-slate-900 rounded-[2rem] text-center space-y-4">
                  <label className="text-xs font-black text-blue-300 block">أدخل الرصيد الصافي المطلوب</label>
                  <div className="flex items-center justify-center gap-3">
                    <input
                      type="number"
                      placeholder="0"
                      className="w-32 bg-transparent text-center text-5xl font-black text-white outline-none border-b-2 border-blue-500 pb-2"
                      value={netAmount}
                      onChange={e => setNetAmount(e.target.value)}
                      autoFocus
                    />
                    <span className="text-xl font-black text-blue-400">ج صافي</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-xs font-black text-gray-400 pr-1">سعر التكلفة (عليك)</label>
                   <div className="relative">
                      <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pr-12 pl-4 py-4 rounded-2xl border-2 border-gray-100 font-black text-gray-900 outline-none focus:border-blue-500"
                        value={costPrice}
                        onChange={e => setCostPrice(e.target.value)}
                        required
                      />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-black text-gray-400 pr-1">سعر البيع (للزبون)</label>
                   <div className="relative">
                      <TrendingUp className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pr-12 pl-4 py-4 rounded-2xl border-2 border-gray-100 font-black text-gray-900 outline-none focus:border-blue-500"
                        value={sellingPrice}
                        onChange={e => setSellingPrice(e.target.value)}
                        required
                      />
                   </div>
                 </div>
              </div>

              {profitPreview > 0 && (
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center justify-between">
                  <span className="text-sm font-black text-green-700">الربح المتوقع لهذه العملية:</span>
                  <span className="text-xl font-black text-green-600">{profitPreview.toFixed(2)} ج</span>
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-6 rounded-[2rem] font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
                  sellingPrice ? `${operator?.color} text-white` : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 size={24} />
                تأكيد وتسجيل البيع
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="bg-[#1a3a5f] p-6 rounded-3xl text-white flex items-center justify-between shadow-xl">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl"><Smartphone size={20}/></div>
            <div>
               <div className="text-[10px] font-black text-blue-300 uppercase">الشركة النشطة</div>
               <div className="font-black text-sm">{operator?.name}</div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default BalanceRecharge;
