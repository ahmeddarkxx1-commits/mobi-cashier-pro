import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Store, User, Mail, Lock, Phone, Loader2, CheckCircle, ArrowRight } from 'lucide-react';

interface RegistrationPageProps {
  plan?: string;
  duration?: string;
  onBack: () => void;
  onSuccess: (session: any) => void;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ onBack, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // بيانات النموذج
  const [shopName, setShopName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // تحقق بسيط
    if (!shopName.trim() || !fullName.trim() || !email.trim() || !password.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    try {
      // إنشاء الحساب مع بيانات المحل في الـ metadata
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            shop_name: shopName.trim(),
            phone: phone.trim(),
            selected_plan: 'BASIC',
            is_new_owner: 'true',
            device_id: localStorage.getItem('mobi_cashier_device_id') || ('dev_' + Math.random().toString(36).substring(2, 15))
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول.');
        }
        throw signUpError;
      }

      if (data.session) {
        // تسجيل ناجح وتم الدخول تلقائياً
        setDone(true);
        setTimeout(() => onSuccess(data.session), 1500);
      } else {
        // قد يحتاج تأكيد البريد
        setDone(true);
        setError('تم التسجيل! إذا طُلب منك تأكيد البريد، افحص صندوق الوارد ثم سجّل دخولك.');
      }

    } catch (err: any) {
      setError(err.message || 'حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (done && !error) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-['Cairo']" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={48} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-white">تم إنشاء الحساب بنجاح!</h2>
          <p className="text-slate-400">جاري تحويلك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white font-['Cairo'] flex items-center justify-center p-4" dir="rtl">
      {/* خلفية */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* رجوع */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors text-sm font-bold"
        >
          <ArrowRight size={18} />
          رجوع لتسجيل الدخول
        </button>

        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl">
          {/* العنوان */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <Store size={32} />
            </div>
            <h1 className="text-2xl font-black">إنشاء حساب جديد</h1>
            <p className="text-slate-400 text-sm mt-1">ابدأ فترتك التجريبية المجانية (3 أيام)</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* اسم المحل */}
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2">اسم المحل *</label>
              <div className="relative">
                <Store size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  placeholder="مثال: محل موبايلات الأمين"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pr-11 pl-4 text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* الاسم الكامل */}
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2">اسم صاحب المحل *</label>
              <div className="relative">
                <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="الاسم الكامل"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pr-11 pl-4 text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2">رقم الهاتف</label>
              <div className="relative">
                <Phone size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pr-11 pl-4 text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  dir="ltr"
                />
              </div>
            </div>

            {/* البريد الإلكتروني */}
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2">البريد الإلكتروني *</label>
              <div className="relative">
                <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pr-11 pl-4 text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2">كلمة المرور *</label>
              <div className="relative">
                <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pr-11 pl-4 text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* رسالة الخطأ */}
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-400 font-bold text-center">
                {error}
              </div>
            )}

            {/* زر التسجيل */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white py-4 rounded-2xl font-black text-base transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 mt-2"
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin" /> جاري إنشاء الحساب...</>
              ) : (
                'إنشاء الحساب مجاناً 🎁'
              )}
            </button>

            {/* ملاحظة */}
            <p className="text-center text-xs text-slate-500 font-bold">
              بعد التسجيل ستظهر رسالة "قيد المراجعة" حتى يقوم الأدمن بتفعيل حسابك
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
