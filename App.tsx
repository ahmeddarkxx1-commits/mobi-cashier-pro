import React, { useState, useEffect } from 'react';
import { Loader2, Bell, CheckCircle, XCircle } from 'lucide-react';
import StoreApp from './StoreApp';
import SuperAdminApp from './SuperAdminApp';
import LoginPage from './LoginPage';
import LandingPage from './components/LandingPage';
import RegistrationPage from './components/RegistrationPage';
import LockScreen from './components/LockScreen';
import { supabase } from './supabaseClient';
import { UserRole, AppConfig } from './types';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null); 
  const [loading, setLoading] = useState(true); 
  const [userRole, setUserRole] = useState<UserRole>('CASHIER');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');
  const [shopPlan, setShopPlan] = useState<string>('BASIC');
  
  // Navigation Flow State
  const [appState, setAppState] = useState<'landing' | 'login' | 'register' | 'app'>('landing');
  const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'PRO'>('BASIC');
  const [selectedDuration, setSelectedDuration] = useState<'1' | '3' | '12'>('1');

  // Invite notification state
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [acceptingInvite, setAcceptingInvite] = useState<string | null>(null);
  const [globalNotifications, setGlobalNotifications] = useState<any[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');


  const [appConfig, setAppConfig] = useState<AppConfig>({
    primaryColor: '#2563eb',
    appName: 'Mobi Cashier Pro',
    version: '4.0.0',
    maintenanceMode: false,
    globalMessage: '',
    themeMode: 'dark'
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setAppState('app');
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        if (appState === 'login') {
          setAppState('app');
        }
        fetchUserProfile(session.user.id);
      } else {
        setAppState('landing');
        setLoading(false);
        setUserRole('CASHIER');
        setTenantId(null);
        setIsLocked(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check for pending invites for the current user
  useEffect(() => {
    if (!session?.user?.email) return;
    const checkInvites = async () => {
      const { data } = await supabase
        .from('shop_invites')
        .select('id, role, shop_id, shops(name)')
        .eq('invited_email', session.user.email.toLowerCase())
        .eq('accepted', false);
      if (data && data.length > 0) setPendingInvites(data);
    };
    checkInvites();
    const inv = setInterval(checkInvites, 15000);
    return () => clearInterval(inv);
  }, [session]);

  // Global Config & Notifications Listener
  useEffect(() => {
    const fetchGlobalData = async () => {
      const { data: config } = await supabase.from('app_config').select('*').limit(1).maybeSingle();
      if (config) {
        setIsMaintenance(config.maintenance_mode);
        setMaintenanceMessage(config.maintenance_message);
        setAppConfig(prev => ({
          ...prev,
          globalMessage: config.global_message || ''
        }));
      }
      const { data: notify } = await supabase.from('app_notifications').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (notify) setGlobalNotifications(notify);
    };

    fetchGlobalData();
    const configSub = supabase.channel('global_config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, (payload) => {
        console.log('Global Config Change:', payload);
        fetchGlobalData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_notifications' }, fetchGlobalData)
      .subscribe((status) => {
        console.log('Realtime Status:', status);
      });

    return () => { supabase.removeChannel(configSub); };
  }, []);


  const handleAcceptInvite = async (invite: any) => {
    setAcceptingInvite(invite.id);
    await supabase.from('profiles').update({ tenant_id: invite.shop_id, role: invite.role }).eq('id', session.user.id);
    await supabase.from('shop_invites').update({ accepted: true }).eq('id', invite.id);
    setPendingInvites([]);
    setAcceptingInvite(null);
    fetchUserProfile(session.user.id);
  };

  const handleRejectInvite = async (inviteId: string) => {
    await supabase.from('shop_invites').delete().eq('id', inviteId);
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
  };
  // Listen to realtime shop status updates
  useEffect(() => {
    if (!tenantId) return;

    const checkSubscription = async (shop: any) => {
      let isShopLocked = false;
      let message = '';

      if (shop.status === 'pending') {
        isShopLocked = true;
        message = 'حسابك قيد المراجعة. يرجى التواصل مع الإدارة عبر واتساب لتفعيل اشتراكك.';
      } else if (shop.status === 'متوقف' || shop.status === 'suspended' || shop.status === 'locked') {
        isShopLocked = true;
        message = 'تم إيقاف اشتراكك مؤقتاً. يرجى التواصل مع الدعم الفني.';
      } else if (shop.expiry_date) {
        // حماية ضد التلاعب بالتاريخ: جلب الوقت الحقيقي من السيرفر
        try {
          const timeRes = await fetch('https://worldtimeapi.org/api/timezone/Africa/Cairo');
          const timeData = await timeRes.json();
          const serverDate = new Date(timeData.datetime);
          
          if (new Date(shop.expiry_date) < serverDate) {
            isShopLocked = true;
            if (shop.duration === '3_days_trial') {
              message = 'انتهت الفترة التجريبية (3 أيام). يرجى التواصل مع الإدارة لتفعيل الاشتراك الكامل.';
            } else {
              message = 'انتهت فترة اشتراكك. يرجى تجديد الاشتراك للمتابعة.';
            }
          }
        } catch (e) {
          // في حال فشل API الوقت، نعتمد على تاريخ الجهاز كاحتياطي مع علمنا بضعفه
          if (new Date(shop.expiry_date) < new Date()) {
            isShopLocked = true;
            if (shop.duration === '3_days_trial') {
              message = 'انتهت الفترة التجريبية (3 أيام). يرجى التواصل مع الإدارة لتفعيل الاشتراك الكامل.';
            } else {
              message = 'انتهت فترة اشتراكك. يرجى تجديد الاشتراك للمتابعة.';
            }
          }
        }
      }

      setIsLocked(isShopLocked);
      setLockMessage(message);
      if (!isShopLocked) setShopPlan(shop.plan || 'BASIC');
    };

    // Initial check on mount
    const initialCheck = async () => {
      if (!tenantId || userRole === 'SUPER_ADMIN') return;
      
      const { data: shop, error } = await supabase.from('shops').select('id').eq('id', tenantId).maybeSingle();
      
      if (shop) {
        checkSubscription(shop);
      } else if (!error && !shop) {
        // إذا لم يعثر على المحل نهائياً ولم يكن هناك خطأ في الاتصال
        handleLogout();
      }
    };
    initialCheck();

    const shopSubscription = supabase
      .channel(`shop_status_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // استمع لكل التغييرات (UPDATE, DELETE)
          schema: 'public',
          table: 'shops',
          filter: `id=eq.${tenantId}`,
        },
        async () => {
          // أعد الجلب لضمان أحدث بيانات من السيرفر
          const { data: shop } = await supabase.from('shops').select('*').eq('id', tenantId).single();
          if (shop) checkSubscription(shop);
        }
      )
      .subscribe();

    // Fallback polling every 5 seconds
    const interval = setInterval(async () => {
      if (!session?.user?.id) return;

      // إذا لم يكن هناك tenantId بعد (حساب pending)، أعد جلب البروفايل كاملاً
      if (!tenantId) {
        fetchUserProfile(session.user.id);
        return;
      }

      const { data: prof } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single();
      if (prof && prof.tenant_id === null && userRole !== 'SUPER_ADMIN') {
        alert("تم إزالتك من هذا المحل. سيتم تسجيل خروجك الآن.");
        handleLogout();
        return;
      }

      const { data: shop, error } = await supabase
        .from('shops')
        .select('status, expiry_date, plan, duration')
        .eq('id', tenantId)
        .maybeSingle();
        
      if (shop) {
        checkSubscription(shop);
      } else if (!error && !shop && userRole !== 'SUPER_ADMIN') {
        // المحل تم حذفه فعلياً من قاعدة البيانات
        Swal.fire({
          icon: 'error',
          title: 'تنبيه هام',
          text: 'عذراً، هذا المحل لم يعد متاحاً على النظام. يرجى التواصل مع الإدارة.',
          background: '#0f172a',
          color: '#fff',
          confirmButtonText: 'خروج'
        }).then(() => {
          handleLogout();
        });
      }
    }, 5000); // كل 5 ثوانٍ للاستجابة السريعة

    return () => {
      supabase.removeChannel(shopSubscription);
      clearInterval(interval);
    };
  }, [tenantId, session]);

  // Polling خاص للحسابات قيد المراجعة (tenantId = null)
  // يفحص كل 5 ثوانٍ إذا قام الأدمن بالتفعيل - يبحث في shops مباشرة بـ owner_id
  useEffect(() => {
    if (!session?.user?.id || tenantId || userRole === 'SUPER_ADMIN') return;

    const pendingInterval = setInterval(async () => {
      // البحث عن محل بـ owner_id مباشرة (حتى لو tenant_id في profile لا يزال null)
      const { data: shop } = await supabase
        .from('shops')
        .select('id, status')
        .eq('owner_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (shop?.id) {
        // تم التفعيل! أولاً ربط الـ profile بالمحل، ثم إعادة التحميل
        await supabase
          .from('profiles')
          .update({ tenant_id: shop.id })
          .eq('id', session.user.id);
        
        clearInterval(pendingInterval);
        fetchUserProfile(session.user.id);
      }
    }, 5000);

    return () => clearInterval(pendingInterval);
  }, [session, tenantId, userRole]);

  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // تغيير مهم: إذا لم نجد الملف الشخصي، هذا يعني أن المستخدم جديد جداً
        // سنفترض أنه صاحب محل قيد المراجعة بدلاً من تركه يرى شاشة خطأ
        setUserRole('OWNER');
        setIsLocked(true);
        setLockMessage('حسابك قيد المراجعة. يرجى التواصل مع الإدارة عبر واتساب لتفعيل اشتراكك.');
      } else {
        setUserRole(profile.role as UserRole);
        setTenantId(profile.tenant_id);

        // *** الإصلاح الحقيقي ***
        // إذا كان صاحب محل ولكن ليس لديه tenant_id بعد (الـ trigger لم يكتمل)
        // قفل الشاشة فوراً بدلاً من السماح لـ StoreApp بالظهور مع خطأ "لا يوجد محل"
        if (profile.role === 'OWNER' && !profile.tenant_id) {
          setIsLocked(true);
          setLockMessage('حسابك قيد المراجعة. يرجى التواصل مع الإدارة عبر واتساب لتفعيل اشتراكك.');
          return;
        }

        if (profile.role !== 'SUPER_ADMIN' && profile.tenant_id) {
          const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('status, expiry_date, plan, duration')
            .eq('id', profile.tenant_id)
            .single();

          if (!shopError && shop) {
            // تكرار منطق الفحص هنا أيضاً عند البداية
            let isShopLocked = false;
            let message = '';

            if (shop.status === 'pending') {
              isShopLocked = true;
              message = 'حسابك قيد المراجعة. يرجى التواصل مع الإدارة عبر واتساب لتفعيل اشتراكك.';
            } else if (shop.status === 'متوقف' || shop.status === 'suspended' || shop.status === 'locked') {
              isShopLocked = true;
              message = 'تم إيقاف اشتراكك مؤقتاً. يرجى التواصل مع الدعم الفني.';
            } else if (shop.expiry_date) {
              try {
                const timeRes = await fetch('https://worldtimeapi.org/api/timezone/Africa/Cairo');
                const timeData = await timeRes.json();
                const serverDate = new Date(timeData.datetime);
                if (new Date(shop.expiry_date) < serverDate) {
                  isShopLocked = true;
                  if (shop.duration === '3_days_trial') {
                    message = 'انتهت الفترة التجريبية (3 أيام). يرجى التواصل مع الإدارة لتفعيل الاشتراك الكامل.';
                  } else {
                    message = 'انتهت فترة اشتراكك. يرجى تجديد الاشتراك للمتابعة.';
                  }
                }
              } catch (e) {
                if (new Date(shop.expiry_date) < new Date()) {
                  isShopLocked = true;
                  if (shop.duration === '3_days_trial') {
                    message = 'انتهت الفترة التجريبية (3 أيام). يرجى التواصل مع الإدارة لتفعيل الاشتراك الكامل.';
                  } else {
                    message = 'انتهت فترة اشتراكك. يرجى تجديد الاشتراك للمتابعة.';
                  }
                }
              }
            }
            setIsLocked(isShopLocked);
            setLockMessage(message);
            if (!isShopLocked) setShopPlan(shop.plan || 'BASIC');
          }
        }
      }
    } catch (err) {
      console.error(err);
      // إذا حدث خطأ (غالباً لأن الحساب جديد جداً)، افترض أنه صاحب محل قيد المراجعة
      setUserRole('OWNER');
      setIsLocked(true);
      setLockMessage('حسابك قيد المراجعة. يرجى التواصل مع الإدارة عبر واتساب لتفعيل اشتراكك.');
    } finally {
      setLoading(false);
    }
  };

  // التأكد من عدم التعليق في شاشة التحميل للأبد
  useEffect(() => {
    if (loading && session) {
      const timer = setTimeout(() => {
        if (loading) {
          console.log("Timeout reached, forcing lock screen for safety");
          setLoading(false);
          setIsLocked(true);
          setLockMessage('حسابك قيد المراجعة. يرجى التواصل مع الإدارة عبر واتساب لتفعيل اشتراكك.');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="font-black animate-pulse">جاري تحميل النظام السحابي...</p>
      </div>
    );
  }

  if (appState === 'landing') {
    return (
      <LandingPage 
        onSelectPlan={(plan, duration) => { setSelectedPlan(plan); setSelectedDuration(duration); setAppState('register'); }} 
        onLogin={() => setAppState('login')} 
      />
    );
  }

  if (appState === 'register') {
    return (
      <RegistrationPage 
        plan={selectedPlan} 
        duration={selectedDuration}
        onBack={() => setAppState('landing')} 
        onSuccess={(sess) => {
          setSession(sess);
          setAppState('app');
        }} 
      />
    );
  }

  if (!session || appState === 'login') {
    return (
      <div className="relative min-h-screen bg-[#020617]" dir="rtl">
        <button 
          onClick={() => setAppState('landing')} 
          className="absolute top-8 left-8 z-50 text-slate-400 hover:text-white font-['Cairo'] flex items-center gap-2 font-bold px-4 py-2 bg-slate-900 rounded-xl border border-slate-800"
        >
          رجوع للرئيسية
        </button>
        <LoginPage onLoginSuccess={(sess) => {
          setSession(sess);
          setAppState('app');
        }} />
      </div>
    );
  }

  // Super Admin View
  if (userRole === 'SUPER_ADMIN') {
    return <SuperAdminApp onLogout={handleLogout} />;
  }

  if (isMaintenance && userRole !== 'SUPER_ADMIN') {
    return <LockScreen message={maintenanceMessage || 'النظام تحت الصيانة حالياً.. سنعود قريباً.'} icon="🔧" />;
  }

  if (isLocked) {
    return <LockScreen message={lockMessage} />;
  }


  // Regular Store App for OWNER, MANAGER, CASHIER
  return (
    <>


      {/* Global Alert Modal (Important Message) */}
      {appConfig.globalMessage && (
        <GlobalAlertOverlay message={appConfig.globalMessage} />
      )}

      {/* Maintenance Mode Overlay */}
      {isMaintenance && appState === 'app' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-['Cairo']" dir="rtl">
          <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-8 w-full max-w-sm shadow-2xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <Bell size={24} className="text-blue-400 animate-bounce" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Notification Modal */}
      {pendingInvites.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-['Cairo']" dir="rtl">
          <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-8 w-full max-w-sm shadow-2xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <Bell size={24} className="text-blue-400 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">لديك دعوة!</h2>
                <p className="text-xs text-blue-400 font-bold">تمت دعوتك للانضمام لمحل</p>
              </div>
            </div>

            {pendingInvites.map(invite => (
              <div key={invite.id} className="bg-slate-800 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-xl">🏪</div>
                  <div>
                    <p className="font-black text-white text-lg">{invite.shops?.name || 'محل'}</p>
                    <p className="text-xs text-slate-400 font-bold">
                      الدور: {invite.role === 'CASHIER' ? 'كاشير 💼' : 'مدير 🔧'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAcceptInvite(invite)}
                    disabled={acceptingInvite === invite.id}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {acceptingInvite === invite.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : <CheckCircle size={16} />}
                    قبول
                  </button>
                  <button
                    onClick={() => handleRejectInvite(invite.id)}
                    disabled={!!acceptingInvite}
                    className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black py-3 rounded-xl transition-all"
                  >
                    <XCircle size={16} /> رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <StoreApp 
        userRole={userRole} 
        onLogout={handleLogout} 
        appConfig={appConfig} 
        setAppConfig={setAppConfig} 
        tenantId={tenantId}
        shopPlan={shopPlan}
        globalNotifications={globalNotifications}
      />
    </>
  );
};


const GlobalAlertOverlay: React.FC<{ message: string }> = ({ message }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // التحقق مما إذا كان المستخدم قد رأى هذه الرسالة المحددة من قبل
    const seenMessages = JSON.parse(localStorage.getItem('seen_global_messages') || '[]');
    if (!seenMessages.includes(message)) {
      setVisible(true);
    }
  }, [message]);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => handleDismiss(), 8000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    const seenMessages = JSON.parse(localStorage.getItem('seen_global_messages') || '[]');
    if (!seenMessages.includes(message)) {
      localStorage.setItem('seen_global_messages', JSON.stringify([...seenMessages, message]));
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 p-8 sm:p-12 rounded-[3rem] shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] max-w-xl w-full text-center relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 group">
        
        {/* Animated Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-700"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all duration-700"></div>

        <div className="relative z-10">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-xl shadow-blue-600/20 group-hover:rotate-6 transition-transform duration-500">
            <Bell className="text-white animate-ring" size={48} />
          </div>
          
          <h2 className="text-3xl font-black text-white mb-6 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
              تنبيه هام من الإدارة
            </span>
          </h2>
          
          <div className="bg-white/5 dark:bg-black/20 border border-white/5 rounded-2xl p-6 mb-8">
            <p className="text-xl font-bold text-slate-100 leading-relaxed font-['Cairo']">
              {message}
            </p>
          </div>

          <button 
            onClick={handleDismiss}
            className="w-full py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-blue-50 transition-all active:scale-95 shadow-lg mb-6"
          >
            فهمت، شكراً
          </button>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-48 mx-auto">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-[progress_8s_linear_forwards]"></div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes ring {
          0%, 100% { transform: rotate(0); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(10deg); }
          20%, 40%, 60%, 80% { transform: rotate(-10deg); }
        }
        .animate-ring {
          animation: ring 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
