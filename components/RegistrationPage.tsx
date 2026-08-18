import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Store, User, Mail, Lock, Phone, Loader2, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

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
        setDone(true);
        setTimeout(() => onSuccess(data.session), 1500);
      } else {
        setDone(true);
        setError('تم التسجيل! يرجى تسجيل الدخول الآن.');
      }

    } catch (err: any) {
      setError(err.message || 'حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (done && !error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-['Cairo'] relative overflow-hidden" dir="rtl">
        <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
        </div>
        <div className="text-center space-y-4 relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
            <CheckCircle size={48} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white">تم إنشاء الحساب بنجاح!</h2>
          <p className="text-slate-400 font-bold">جاري تحويلك إلى لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-['Cairo'] flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Premium Minimalist Background (Matching LoginPage) */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors text-sm font-bold"
        >
          <ArrowRight size={18} />
          رجوع لتسجيل الدخول
        </button>

        <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl shadow-black/50">
          <div className="text-center mb-10">
            <div className="inline-flex p-4 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-600/20 mb-6">
              <Store size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">إنشاء حساب جديد</h1>
            <p className="text-slate-400 font-bold text-sm">ابدأ رحلتك في إدارة محلك بذكاء</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">اسم المحل *</label>
              <div className="relative group">
                <Store className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                <input
                  type="text"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 p-4 pr-12 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="مثال: محل موبايلات الأمين"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">اسم صاحب المحل *</label>
              <div className="relative group">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 p-4 pr-12 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="الاسم الكامل"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">رقم الهاتف</label>
              <div className="relative group">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 p-4 pr-12 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">البريد الإلكتروني *</label>
              <div className="relative group">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 p-4 pr-12 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="example@gmail.com"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">كلمة المرور *</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 p-4 pr-12 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="6 أحرف على الأقل"
                  dir="ltr"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 p-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                'إنشاء الحساب مجاناً'
              )}
            </button>
            
            <p className="text-center text-xs text-slate-500 font-bold mt-4">
              بالتسجيل، أنت توافق على شروط الخدمة وسياسة الخصوصية
            </p>
          </form>
        </div>
        
        <div className="text-center mt-8 space-y-1">
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Powered by Al3alme Systems</p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
