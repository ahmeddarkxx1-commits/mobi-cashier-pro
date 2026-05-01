
import React from 'react';
import { CreditCard, CheckCircle, Clock, Lock, Sparkles, Calendar, ShieldCheck } from 'lucide-react';
import { SubscriptionInfo } from '../types';

interface SubscriptionManagerProps {
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  isLocked?: boolean;
}

const plans = [
  { id: 'monthly', name: 'اشتراك شهري', price: 250, duration: 30, description: 'مثالي للمحلات الصغيرة' },
  { id: 'semi-annual', name: 'اشتراك 6 شهور', price: 1200, duration: 180, description: 'توفير جيد وراحة بال' },
  { id: 'yearly', name: 'اشتراك سنوي', price: 2000, duration: 365, description: 'أفضل قيمة - توفير 33%', best: true },
];

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ subscription, setSubscription, isLocked = false }) => {
  const handleSubscribe = (planId: 'monthly' | 'semi-annual' | 'yearly', days: number) => {
    const now = new Date();
    const currentExpiry = new Date(subscription.expiryDate);
    const baseDate = now > currentExpiry ? now : currentExpiry;
    
    const newExpiry = new Date(baseDate);
    newExpiry.setDate(baseDate.getDate() + days);

    setSubscription({
      status: 'active',
      startDate: now.toISOString(),
      expiryDate: newExpiry.toISOString(),
      planId,
      trialUsed: true
    });
    alert('تم تجديد الاشتراك بنجاح! شكراً لاستخدامكم نظامنا.');
  };

  const daysLeft = Math.ceil((new Date(subscription.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`space-y-8 ${isLocked ? 'max-w-4xl mx-auto' : ''}`}>
      {isLocked && (
        <div className="text-center space-y-4 mb-12">
          <div className="w-24 h-24 bg-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-red-500/20">
            <Lock size={48} />
          </div>
          <h1 className="text-4xl font-black">التطبيق مغلق!</h1>
          <p className="text-gray-400 font-bold max-w-lg mx-auto leading-relaxed">
            انتهت فترة السماح (3 أسابيع) ولم يتم تجديد الاشتراك. يرجى اختيار خطة لتفعيل النظام مرة أخرى والوصول لبياناتك.
          </p>
        </div>
      )}

      {!isLocked && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${daysLeft > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <Calendar size={32} />
            </div>
            <div>
              <div className="text-gray-500 font-black text-sm">حالة الاشتراك الحالي:</div>
              <div className="text-2xl font-black text-gray-800">
                {daysLeft > 0 ? `ينتهي خلال ${daysLeft} يوم` : 'منتهي الصلاحية'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
                <div className="text-[10px] font-black text-gray-400 uppercase">نوع الخطة</div>
                <div className="text-sm font-black text-blue-600">
                  {subscription.planId === 'monthly' ? 'شهري' : 
                   subscription.planId === 'semi-annual' ? '6 شهور' : 
                   subscription.planId === 'yearly' ? 'سنوي' : 'فترة تجريبية'}
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div 
            key={plan.id}
            className={`relative bg-white rounded-[2.5rem] p-8 border-2 transition-all hover:scale-105 ${
              plan.best ? 'border-blue-500 shadow-2xl shadow-blue-500/10' : 'border-gray-100'
            }`}
          >
            {plan.best && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                <Sparkles size={12} /> القيمة الأفضل
              </div>
            )}
            
            <div className="text-center space-y-4 mb-8">
              <h3 className="text-xl font-black text-gray-800">{plan.name}</h3>
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                <span className="text-gray-400 font-bold">ج.م</span>
              </div>
              <p className="text-xs text-gray-400 font-bold leading-relaxed">{plan.description}</p>
            </div>

            <ul className="space-y-4 mb-8 text-xs font-bold text-gray-600">
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> كاشير ومبيعات غير محدودة</li>
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> إدارة الورشة والصيانة</li>
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> تقارير مالية دقيقة</li>
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> دعم فني متواصل</li>
            </ul>

            <button
              onClick={() => handleSubscribe(plan.id as any, plan.duration)}
              className={`w-full py-4 rounded-2xl font-black transition-all ${
                plan.best ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-900 text-white'
              }`}
            >
              اشترك الآن
            </button>
          </div>
        ))}
      </div>

      {!isLocked && (
        <div className="bg-slate-900 text-white p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl">
                <ShieldCheck size={32} />
             </div>
             <div>
                <h4 className="font-black text-lg">نظام حماية البيانات</h4>
                <p className="text-xs text-gray-400 font-bold">بياناتك محفوظة دائماً حتى في حال انتهاء الاشتراك.</p>
             </div>
          </div>
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
             <Clock size={16} />
             <span>دعم فني متاح 24/7</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;
