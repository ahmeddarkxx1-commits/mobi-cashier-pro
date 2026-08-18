
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LogIn, Store, ShieldCheck, Mail, Lock, Loader2, AlertCircle, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (session: any) => void;
  onNavigateToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [showDbConfig, setShowDbConfig] = useState(false);
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('CUSTOM_SUPABASE_URL') || '');
  const [dbKey, setDbKey] = useState(localStorage.getItem('CUSTOM_SUPABASE_ANON_KEY') || '');

  const handleSaveDbConfig = () => {
    if (!dbUrl || !dbKey) {
      alert('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    localStorage.setItem('CUSTOM_SUPABASE_URL', dbUrl.trim());
    localStorage.setItem('CUSTOM_SUPABASE_ANON_KEY', dbKey.trim());
    alert('تم حفظ البيانات بنجاح، سيتم إعادة تحميل الصفحة للتوصيل بقاعدة البيانات الجديدة.');
    window.location.reload();
  };

  const handleResetDbConfig = () => {
    localStorage.removeItem('CUSTOM_SUPABASE_URL');
    localStorage.removeItem('CUSTOM_SUPABASE_ANON_KEY');
    alert('تم حذف الإعدادات المخصصة والرجوع لقاعدة البيانات الافتراضية.');
    window.location.reload();
  };

  const fetchUserIp = async (): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout max
      const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      return data.ip || 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      if (data.session) {
        // Fetch IP asynchronously in the background so it doesn't block login
        fetchUserIp().then(userIp => {
          supabase.auth.updateUser({
            data: { 
              last_ip: userIp,
              last_login: new Date().toISOString()
            }
          }).catch(console.error); // Silently fail if IP update fails
        });
        
        onLoginSuccess(data.session);
      }
    } catch (err: any) {
      setError(err.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني أولاً.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      
      setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني. يرجى مراجعة صندوق الوارد الخاص بك.');
      // Keep them on the form so they can read the message
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إرسال رابط الاستعادة.');
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
          
          {isForgotPassword && (
            <button
              onClick={() => { setIsForgotPassword(false); setError(null); setSuccessMsg(null); }}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors text-sm font-bold"
            >
              <ArrowRight size={18} />
              رجوع لتسجيل الدخول
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex p-4 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-600/20 mb-6">
              {isForgotPassword ? <KeyRound size={40} className="text-white" /> : <ShieldCheck size={40} className="text-white" />}
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">
              {isForgotPassword ? 'استعادة كلمة المرور' : 'تسجيل الدخول'}
            </h1>
            <p className="text-slate-400 font-bold text-sm">
              {isForgotPassword ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة' : 'نظام إدارة محلات الموبايلات الذكي'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-sm font-bold animate-shake">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-emerald-400 text-sm font-bold">
              <ShieldCheck size={18} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={isForgotPassword ? handleResetPassword : handleLogin} className="space-y-6">
            
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
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mr-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">كلمة المرور</label>
                  <button 
                    type="button" 
                    onClick={() => { setIsForgotPassword(true); setError(null); setSuccessMsg(null); }}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    نسيت كلمة السر؟
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 p-4 pr-12 pl-12 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    placeholder="••••••••"
                    dir="ltr"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 p-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  {isForgotPassword ? <KeyRound size={24} className="group-hover:scale-110 transition-transform" /> : <LogIn size={24} className="group-hover:-translate-x-1 transition-transform" />}
                  <span>{isForgotPassword ? 'إرسال رابط الاستعادة' : 'دخول للنظام'}</span>
                </>
              )}
            </button>
          </form>

          {!isForgotPassword && (
            <div className="mt-10 pt-8 border-t border-slate-800/50">
              <p className="text-slate-500 text-sm font-bold text-center">
                ليس لديك حساب بعد؟
                <button 
                  type="button" 
                  onClick={onNavigateToRegister} 
                  className="text-emerald-400 hover:text-emerald-300 font-black mr-2 transition-colors inline-flex items-center"
                >
                  افتح محلك الآن 🚀
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Cloud Database Settings */}
        <div className="mt-4 bg-slate-900/50 backdrop-blur-2xl border border-slate-800/80 rounded-[2rem] p-6 shadow-xl relative z-10">
          <button
            type="button"
            onClick={() => setShowDbConfig(!showDbConfig)}
            className="w-full flex items-center justify-between font-black text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-2">⚙️ إعدادات الاتصال السحابي (Supabase)</span>
            <span>{showDbConfig ? '▲' : '▼'}</span>
          </button>
          
          {showDbConfig && (
            <div className="mt-4 space-y-4 animate-in fade-in duration-300">
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed text-right">
                إذا قمت بإنشاء قاعدة بيانات Supabase خاصة بك، يمكنك إدخال رابط المشروع والمفتاح هنا لربط الموقع بها مباشرة.
              </p>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-slate-400">رابط المشروع (Project URL)</label>
                <input
                  type="text"
                  placeholder="https://your-project.supabase.co"
                  className="w-full bg-slate-950/60 border border-slate-850 p-3 rounded-xl text-xs font-bold text-slate-200 outline-none focus:border-emerald-500 text-left"
                  dir="ltr"
                  value={dbUrl}
                  onChange={e => setDbUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-slate-400">مفتاح الأمان (Anon Key)</label>
                <input
                  type="text"
                  placeholder="eyJhbGciOi..."
                  className="w-full bg-slate-950/60 border border-slate-850 p-3 rounded-xl text-xs font-bold text-slate-200 outline-none focus:border-emerald-500 text-left"
                  dir="ltr"
                  value={dbKey}
                  onChange={e => setDbKey(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDbConfig}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition-all"
                >
                  حفظ وتوصيل
                </button>
                {(localStorage.getItem('CUSTOM_SUPABASE_URL') || localStorage.getItem('CUSTOM_SUPABASE_ANON_KEY')) && (
                  <button
                    type="button"
                    onClick={handleResetDbConfig}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black px-4 py-3 rounded-xl text-xs transition-all border border-red-500/20"
                  >
                    حذف
                  </button>
                )}
              </div>
            </div>
          )}
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

