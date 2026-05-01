
import React, { useMemo } from 'react';
import { Receipt, CheckCircle, Smartphone, User, CreditCard, Clock } from 'lucide-react';
import { MaintenanceJob, Transaction } from '../types';

interface MaintenancePOSProps {
  jobs: MaintenanceJob[];
  setJobs: React.Dispatch<React.SetStateAction<MaintenanceJob[]>>;
  addTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
}

const MaintenancePOS: React.FC<MaintenancePOSProps> = ({ jobs, setJobs, addTransaction }) => {
  // Only jobs that are completed but not yet delivered
  const readyToDeliver = useMemo(() => {
    return jobs.filter(j => j.status === 'completed');
  }, [jobs]);

  const handleCheckout = (job: MaintenanceJob) => {
    if (!confirm(`هل تم استلام مبلغ ${job.cost} ج.م وتسليم الجهاز للعميل ${job.customerName}؟`)) return;

    // 1. Record the transaction
    // Fix: Added medium: 'cash' as it is a required property for transactions
    addTransaction({
      type: 'maintenance',
      medium: 'cash',
      amount: job.cost,
      description: `استلام صيانة: ${job.phoneModel} - العميل: ${job.customerName}`,
      category: 'maintenance'
    });

    // 2. Mark as delivered
    setJobs(prev => prev.map(j => 
      j.id === job.id ? { ...j, status: 'delivered' } : j
    ));

    alert('تمت عملية الدفع وتسليم الجهاز بنجاح');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
          <Receipt size={32} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-gray-800">كاشير الصيانة</h3>
          <p className="text-gray-500">تسليم الأجهزة الجاهزة وتحصيل الرسوم</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {readyToDeliver.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-3xl border border-dashed border-gray-200 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
               <Clock className="text-gray-300" size={40} />
            </div>
            <p className="text-gray-400 font-bold text-lg">لا يوجد أجهزة جاهزة للتسليم حالياً</p>
            <p className="text-sm text-gray-300">الأجهزة تظهر هنا تلقائياً بمجرد تغيير حالتها إلى "تم التصليح" من الورشة</p>
          </div>
        ) : (
          readyToDeliver.map(job => (
            <div key={job.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col">
              <div className="p-6 space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                    <CheckCircle size={12} />
                    جاهز للتسليم
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">#{job.id.slice(-4)}</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Smartphone className="text-blue-500" size={20} />
                    <div className="font-black text-gray-800 text-lg">{job.phoneModel}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="text-gray-400" size={18} />
                    <div className="text-sm font-bold text-gray-600">{job.customerName}</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100">
                  <div className="text-[10px] text-gray-400 mb-1">المشكلة التي تم حلها:</div>
                  <div className="text-xs font-bold text-gray-700 italic">"{job.issue}"</div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-500">المبلغ المطلوب:</span>
                  <span className="text-2xl font-black text-green-600">{job.cost.toLocaleString()} ج.م</span>
                </div>
                <button
                  onClick={() => handleCheckout(job)}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard size={20} />
                  تسجيل استلام المبلغ
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-indigo-900 text-white p-6 rounded-3xl flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-2xl">
               <Receipt size={24} className="text-indigo-200" />
            </div>
            <div>
               <div className="font-black text-lg">إجمالي الأجهزة الجاهزة: {readyToDeliver.length}</div>
               <div className="text-sm text-indigo-200">بانتظار استلام المبالغ المالية من العملاء</div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default MaintenancePOS;
