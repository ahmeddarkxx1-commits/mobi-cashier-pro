import React, { useState, useEffect } from 'react';
import { Lock, MessageCircle, AlertCircle, LogOut, RefreshCcw, Bell, Store, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LockScreenProps {
  message: string;
  onLogout?: () => void;
  icon?: string;
}

const LockScreen: React.FC<LockScreenProps> = ({ message, icon }) => {
  const isPending = message?.includes('المراجعة') || false;
  const isMaintenance = message?.includes('الصيانة') || false;


  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvite, setLoadingInvite] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    checkInvites();
    // فحص كل 10 ثوانٍ لدعوات جديدة
    const interval = setInterval(checkInvites, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkInvites = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.email) return;
    const email = session.session.user.email;
    setUserEmail(email);

    const { data } = await supabase
      .from('shop_invites')
      .select('id, role, shop_id, shops(name, owner_email)')
      .eq('invited_email', email.toLowerCase())
      .eq('accepted', false);

    if (data) setInvites(data);
  };

  const handleAcceptInvite = async (invite: any) => {
    setLoadingInvite(invite.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) return;

      // 1. ربط الـ profile بالمحل
      await supabase
        .from('profiles')
        .update({ tenant_id: invite.shop_id, role: invite.role })
        .eq('id', userId);

      // 2. تأكيد الدعوة كمقبولة
      await supabase
        .from('shop_invites')
        .update({ accepted: true })
        .eq('id', invite.id);

      // 3. إعادة تحميل التطبيق لفتح المحل
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
    setLoadingInvite(null);
  };

  const handleRejectInvite = async (inviteId: string) => {
    await supabase.from('shop_invites').delete().eq('id', inviteId);
    setInvites(prev => prev.filter(i => i.id !== inviteId));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-['Cairo'] text-right" dir="rtl">
      <div className="max-w-md w-full space-y-4">

        {/* بطاقة الدعوات - تظهر فوق كل شيء لو فيه دعوة */}
        {invites.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <Bell size={20} className="text-blue-400 animate-bounce" />
              </div>
              <div>
                <h2 className="font-black text-white text-lg">لديك دعوة!</h2>
                <p className="text-xs text-blue-400 font-bold">تمت دعوتك للانضمام لمحل</p>
              </div>
            </div>

            {invites.map(invite => (
              <div key={invite.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                    <Store size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="font-black text-white">{invite.shops?.name || 'محل'}</p>
                    <p className="text-xs text-slate-400 font-bold">
                      الدور: {invite.role === 'CASHIER' ? 'كاشير 💼' : invite.role === 'MANAGER' ? 'مدير 🔧' : invite.role}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAcceptInvite(invite)}
                    disabled={loadingInvite === invite.id}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {loadingInvite === invite.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    قبول
                  </button>
                  <button
                    onClick={() => handleRejectInvite(invite.id)}
                    disabled={loadingInvite === invite.id}
                    className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black py-3 rounded-xl transition-all"
                  >
                    <XCircle size={16} /> رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* البطاقة الرئيسية */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 blur-[100px]" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 blur-[100px]" />

          <div className="relative">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 border ${
              isMaintenance ? 'bg-orange-500/10 border-orange-500/20' :
              isPending ? 'bg-blue-500/10 border-blue-500/20' : 
              'bg-red-500/10 border-red-500/20'
            }`}>
              {icon ? (
                <span className="text-5xl">{icon}</span>
              ) : isMaintenance ? (
                <RefreshCcw size={48} className="text-orange-500 animate-spin-slow" />
              ) : (
                <Lock size={48} className={isPending ? 'text-blue-500' : 'text-red-500 animate-pulse'} />
              )}
            </div>
            <h1 className="text-3xl font-black text-white mb-2">
              {isMaintenance ? 'صيانة النظام' : isPending ? 'حسابك قيد المراجعة' : 'تنبيه الاشتراك'}
            </h1>
            <p className="text-slate-400 font-bold leading-relaxed">{message}</p>
            {invites.length === 0 && isPending && (
              <p className="text-xs text-blue-400 font-bold mt-3 bg-blue-500/10 rounded-xl p-2">
                💡 إذا دعاك صاحب محل، ستظهر الدعوة هنا تلقائياً
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.open('https://wa.me/201152628515', '_blank')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/20"
            >
              <MessageCircle size={24} /> تواصل مع الإدارة الآن
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <RefreshCcw size={18} /> تحديث
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={18} /> خروج
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            <AlertCircle size={12} /> SECURE LICENSING SYSTEM v4.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
