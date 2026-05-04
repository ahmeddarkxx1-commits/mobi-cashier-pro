
import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { LogIn, Store, ShieldCheck, Mail, Lock, Loader2, AlertCircle, UserPlus, User } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (session: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const devId = localStorage.getItem('mobi_cashier_device_id') || ('dev_' + Math.random().toString(36).substring(2, 15));
      if (!localStorage.getItem('mobi_cashier_device_id')) localStorage.setItem('mobi_cashier_device_id', devId);

      // جلب عنوان الـ IP للتوثيق في لوحة الأدمن
      let userIp = 'Unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        userIp = ipData.ip;
      } catch (e) { console.error('IP fetch failed'); }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              device_id: devId,
              last_ip: userIp
            }
          }
        });
        if (error) throw error;
        
        // Supabase returns a session if email confirmation is disabled
        if (data.session) {
          onLoginSuccess(data.session);
        } else {
          // If email confirmation is required but we just want to login right away if disabled
          alert('تم التسجيل! إذا تم إيقاف تأكيد البريد، يمكنك تسجيل الدخول الآن.');
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (data.session) {
          // تحديث الـ IP ووقت الدخول فقط دون المساس ببصمة الجهاز الموثقة
          await supabase.auth.updateUser({
            data: { 
              last_ip: userIp,
              last_login: new Date().toISOString()
            }
          });
          onLoginSuccess(data.session);
        }
      }
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال. تأكد من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-['Cairo'] flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Premium Minimalist Background */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex p-4 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-600/20 mb-6">
              <ShieldCheck size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">
              {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </h1>
            <p className="text-slate-400 font-bold text-sm">نظام إدارة محلات الموبايلات الذكي</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold animate-shake">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">الاسم الكامل</label>
                <div className="relative group">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 p-4 pr-12 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    placeholder="الاسم الثلاثي"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">البريد الإلكتروني</label>
              <div className="relative group">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 p-4 pr-12 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="example@shop.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 p-4 pr-12 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 p-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  {isSignUp ? <UserPlus size={24} className="group-hover:scale-110 transition-transform" /> : <LogIn size={24} className="group-hover:translate-x-1 transition-transform" />}
                  <span>{isSignUp ? 'إنشاء الحساب' : 'دخول للنظام'}</span>
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => onLoginSuccess({ user: { id: 'demo-user' } })}
              className="w-full bg-slate-800/50 hover:bg-slate-700/50 p-4 rounded-2xl font-bold text-sm text-slate-400 border border-slate-800 transition-all"
            >
              دخول تجريبي (Demo Mode)
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-800/50">
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 text-center space-y-4">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">مركز الدعم والإرشاد</h4>
              <p className="text-sm text-slate-300 font-bold leading-relaxed">تائه أو تواجه مشكلة؟ انضم لقناتنا الرسمية لمتابعة الشروحات أو تواصل معنا مباشرة</p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <a 
                  href="https://whatsapp.com/channel/0029VbDO2IV4dTnTLatpja2u" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 py-3 rounded-2xl font-black text-xs transition-all border border-emerald-600/20"
                >
                  <Store size={16} /> تابع القناة
                </a>
                <a 
                  href="https://wa.me/201152628515" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 py-3 rounded-2xl font-black text-xs transition-all border border-blue-600/20"
                >
                  <Mail size={16} /> تواصل مع الدعم
                </a>
              </div>
            </div>

            <p className="text-slate-500 text-xs font-bold mt-6 mb-4 text-center">
              {isSignUp ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}
              <button 
                type="button" 
                onClick={() => setIsSignUp(!isSignUp)} 
                className="text-emerald-400 hover:text-emerald-300 font-black mr-2 transition-colors"
              >
                {isSignUp ? 'سجل دخولك' : 'إنشاء حساب جديد'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-8 space-y-1">
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Powered by Al3alme Systems</p>
          <p className="text-slate-700 text-[9px] font-bold">Secure Cloud Architecture v2.5.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
