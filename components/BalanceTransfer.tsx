
import React, { useState, useMemo } from 'react';
import { CreditCard, Send, Settings, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { TransferSetting, Transaction } from '../types';

interface BalanceTransferProps {
  settings: TransferSetting[];
  addTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
}

const BalanceTransfer: React.FC<BalanceTransferProps> = ({ settings, addTransaction }) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>(settings[0]?.operator || '');
  const [customerNumber, setCustomerNumber] = useState('');
  const [operationType, setOperationType] = useState<'send' | 'receive'>('send');
  const [notification, setNotification] = useState<{show: boolean, message: string}>({show: false, message: ''});

  const currentSetting = useMemo(() => {
    return settings.find(s => s.operator === selectedOperator);
  }, [selectedOperator, settings]);

  const calculation = useMemo(() => {
    if (!currentSetting) return { commission: 0, profit: 0, fee: 0 };
    const num = parseFloat(amount) || 0;

    if (operationType === 'send') {
      const thousands = Math.ceil(num / 1000);
      const profit = thousands * (currentSetting.sendRate || 0);
      
      let fee = 0;
      if (currentSetting.companyFeeRate !== undefined) {
         fee = thousands * currentSetting.companyFeeRate;
         if (currentSetting.companyFeeMax && fee > currentSetting.companyFeeMax) {
            fee = currentSetting.companyFeeMax;
         }
      } else if (currentSetting.isSendTiered) {
         fee = num >= currentSetting.feeThreshold ? currentSetting.fixedFeeHigh : currentSetting.fixedFeeLow;
      }
      return { commission: Number(profit) + Number(fee), profit: Number(profit), fee: Number(fee) };
    } else {
      const thousands = Math.ceil(num / 1000);
      const commission = thousands * (currentSetting.receiveRate || 15);
      return { commission: Number(commission), profit: Number(commission), fee: 0 };
    }
  }, [amount, currentSetting, operationType]);

  const total = useMemo(() => (parseFloat(amount) || 0) + calculation.commission, [amount, calculation]);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !customerNumber) return;

    const opLabel = operationType === 'send' ? 'إرسال' : 'استلام';
    
    addTransaction({
      type: 'transfer',
      medium: 'cash', 
      amount: Number(calculation.profit),
      profit: Number(calculation.profit),
      description: `${opLabel} (${selectedOperator}): لـ ${customerNumber} (المبلغ: ${amount}، ربح المحل: ${calculation.profit.toFixed(2)})`,
      category: 'transfer'
    });

    setAmount('');
    setCustomerNumber('');
    setNotification({ show: true, message: `تمت عملية ال${opLabel} بنجاح وتم إضافة الربح للخزنة` });
    setTimeout(() => setNotification({ show: false, message: '' }), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <CreditCard size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">عملية تحويل جديدة</h3>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setOperationType('send')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  operationType === 'send' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ArrowUpRight size={16} />
                إرسال
              </button>
              <button
                onClick={() => setOperationType('receive')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  operationType === 'receive' 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ArrowDownLeft size={16} />
                استلام
              </button>
            </div>
          </div>

          <form onSubmit={handleTransfer} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-600">اختر الخدمة / الشركة</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {settings.map(s => {
                  const isInsta = s.operator.toLowerCase().includes('insta');
                  return (
                    <button
                      key={s.operator}
                      type="button"
                      onClick={() => setSelectedOperator(s.operator)}
                      className={`p-4 rounded-2xl border-2 transition-all text-sm font-bold flex flex-col items-center gap-1 ${
                        selectedOperator === s.operator 
                          ? isInsta ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-blue-600 bg-blue-50 text-blue-600' 
                          : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate w-full text-center">{s.operator}</span>
                      <span className="text-[10px] opacity-60">
                        {operationType === 'send' ? 
                          `${s.sendRate}ج/1000` : 
                          `${s.receiveRate}ج/1000`
                        }
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">رقم الموبايل / الحساب</label>
                <input
                  type="text"
                  placeholder={selectedOperator.toLowerCase().includes('insta') ? "رقم الحساب أو الـ IPA" : "01xxxxxxxxx"}
                  className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-left font-semibold bg-white text-gray-900"
                  dir="ltr"
                  value={customerNumber}
                  onChange={e => setCustomerNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">المبلغ</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none pr-4 pl-16 text-lg font-bold bg-white text-gray-900"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">ج.م</span>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-3xl border space-y-4 transition-colors ${
              operationType === 'send' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'
            }`}>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">مبلغ العملية</span>
                <span className="font-bold text-gray-700">{(parseFloat(amount) || 0).toLocaleString()} ج.م</span>
              </div>
              
              <div className="space-y-2 border-t border-white/50 pt-2">
                {operationType === 'send' && currentSetting?.isSendTiered ? (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 italic">عمولة المحل ({currentSetting.sendRate} لكل 1000):</span>
                      <span className="font-bold text-blue-600">{calculation.profit.toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 italic">عمولة الشركة (تلقائي):</span>
                      <span className="font-bold text-blue-600">{calculation.fee.toFixed(2)} ج.م</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 italic">إجمالي العمولة المستحقة:</span>
                    <span className={`font-bold ${operationType === 'send' ? 'text-blue-600' : 'text-green-600'}`}>
                      {calculation.commission.toFixed(2)} ج.م
                    </span>
                  </div>
                )}
              </div>

              <div className="h-px bg-white/50" />
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500 font-bold">المطلوب تحصيله من العميل</div>
                  <div className={`text-2xl font-black ${operationType === 'send' ? 'text-blue-700' : 'text-green-700'}`}>
                    {total.toLocaleString()} ج.م
                  </div>
                </div>
                <div className={`p-3 rounded-full ${operationType === 'send' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                  {operationType === 'send' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full text-white font-bold py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 text-lg ${
                operationType === 'send' 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' 
                  : 'bg-green-600 hover:bg-green-700 shadow-green-200'
              }`}
            >
              <Send size={22} />
              تأكيد عملية ال{operationType === 'send' ? 'إرسال' : 'استلام'}
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl h-full flex flex-col">
          <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Settings size={20} className="text-blue-400" />
            نظام العمولات المطبق
          </h4>
          <div className="flex-1 space-y-4">
            {settings.map(s => (
              <div key={s.operator} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-blue-100">{s.operator}</span>
                </div>
                <div className="flex flex-col gap-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">الإرسال:</span>
                    <span className="text-blue-300 font-bold">
                      {s.sendRate}ج/1000 {s.companyFeeRate ? `+ عمولة شركة ${s.companyFeeRate}ج/${s.companyFeeMax}ج` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">الاستلام:</span>
                    <span className="text-green-300 font-bold">{s.receiveRate}ج/1000</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
             <span className="text-white font-black text-sm">✓</span>
          </div>
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default BalanceTransfer;
