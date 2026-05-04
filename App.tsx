import React, { useState, useEffect } from 'react';
import { Loader2, Bell, CheckCircle, XCircle, LogOut, Clock, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
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
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [isWaitingForDevice, setIsWaitingForDevice] = useState(false);
  const [waitTimeLeft, setWaitTimeLeft] = useState<number>(0);
  const [activeDeviceName, setActiveDeviceName] = useState<string>('');
  const [activeDeviceIp, setActiveDeviceIp] = useState<string>('');
  const [isDeviceActivelyInUse, setIsDeviceActivelyInUse] = useState(false);

  // Helper: Get human-readable device name
  const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    let device = 'جهاز غير معروف';
    if (/iPhone/.test(ua)) device = 'iPhone';
    else if (/iPad/.test(ua)) device = 'iPad';
    else if (/Android/.test(ua)) {
      const match = ua.match(/Android.*?;\s*([^)]+)\)/);
      device = match ? match[1].trim().split(' ').slice(0, 2).join(' ') : 'Android';
    }
    else if (/Windows/.test(ua)) device = 'Windows PC';
    else if (/Macintosh|Mac OS X/.test(ua)) device = 'Mac';
    else if (/Linux/.test(ua)) device = 'Linux';

    let browser = '';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

    const devId = localStorage.getItem('mobi_cashier_device_id') || '';
    const shortId = devId.substring(4, 10).toUpperCase();
    return browser ? `${device} · ${browser} [${shortId}]` : `${device} [${shortId}]`;
  };

  // Helper: Get public IP address
  const getDeviceIp = async (): Promise<string> => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || '';
    } catch {
      return '';
    }
  };

  // Generate or retrieve Device ID
  useEffect(() => {
    let devId = localStorage.getItem('mobi_cashier_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      localStorage.setItem('mobi_cashier_device_id', devId);
    }
    setCurrentDeviceId(devId);
  }, []);

  // Heartbeat: update last_seen every 2 minutes to signal device is active
  useEffect(() => {
    if (!session?.user?.id || isWaitingForDevice) return;
    const updateHeartbeat = async () => {
      await supabase.from('profiles').update({
        last_seen: new Date().toISOString()
      }).eq('id', session.user.id);
    };
    updateHeartbeat();
    const heartbeat = setInterval(updateHeartbeat, 2 * 60 * 1000);
    return () => clearInterval(heartbeat);
  }, [session?.user?.id, isWaitingForDevice]);

  // Polling for waiting device: check every 30s if authorized device has gone offline
  useEffect(() => {
    if (!isWaitingForDevice || !session?.user?.id) return;
    const checkIfDeviceLeft = setInterval(async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_seen, device_wait_until, device_id')
        .eq('id', session.user.id)
        .single();
      if (!profile) return;
      const devId = localStorage.getItem('mobi_cashier_device_id');
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const isStillActive = profile.last_seen && new Date(profile.last_seen) > threeMinutesAgo && profile.device_id !== devId;
      if (!isStillActive && isDeviceActivelyInUse) {
        // Original device went offline - start the 2h timer
        const waitDate = new Date();
        waitDate.setHours(waitDate.getHours() + 2);
        await supabase.from('profiles').update({ device_wait_until: waitDate.toISOString() }).eq('id', session.user.id);
        setIsDeviceActivelyInUse(false);
        setWaitTimeLeft(2 * 60 * 60);
      }
    }, 30 * 1000);
    return () => clearInterval(checkIfDeviceLeft);
  }, [isWaitingForDevice, session?.user?.id, isDeviceActivelyInUse]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        setAppState('app');
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // تجاهل أحداث التحديث لمنع الحلقة المفرغة
      if (_event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') return;

      setSession(session);
      if (session) {
        if (appState === 'login' || appState === 'landing') {
          setAppState('app');
        }
        fetchUserProfile(session.user.id);
      } else {
        setAppState('landing');
        setLoading(false);
        setIsWaitingForDevice(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Waiting Room Logic Timer
  useEffect(() => {
    if (!isWaitingForDevice || waitTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setWaitTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.reload(); // إعادة التحميل للدخول بعد انتهاء الوقت
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isWaitingForDevice, waitTimeLeft]);

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

  // Realtime Profile Security Listener
  useEffect(() => {
    if (!session?.user?.id) return;

    const profileSub = supabase.channel(`profile_security_${session.user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: `id=eq.${session.user.id}`
      }, (payload) => {
        const newProfile = payload.new;
        const devId = localStorage.getItem('mobi_cashier_device_id');
        
        console.log('Security Update Received:', newProfile);

        const userDevId = newProfile.device_id;
        const waitUntil = newProfile.device_wait_until;
        const lastSeen = newProfile.last_seen;
        const authorizedDeviceName = newProfile.device_name || 'جهاز غير معروف';
        const authorizedDeviceIp = newProfile.last_ip || '';

        // إذا كان هذا هو جهازي، تأكد أنني لست محجوباً (نادراً ما يحدث)
        if (userDevId === devId) {
          setIsWaitingForDevice(false);
          setIsDeviceActivelyInUse(false);
          return;
        }

        // إذا كنت جهازاً مختلفاً
        if (userDevId && userDevId !== devId) {
          const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
          const isAuthorizedOnline = lastSeen && new Date(lastSeen) > threeMinutesAgo;

          setActiveDeviceName(authorizedDeviceName);
          setActiveDeviceIp(authorizedDeviceIp);

          if (isAuthorizedOnline) {
            setIsDeviceActivelyInUse(true);
            setIsWaitingForDevice(true);
            setWaitTimeLeft(0);
          } else if (waitUntil) {
            const now = new Date().getTime();
            const waitTime = new Date(waitUntil).getTime();
            if (now < waitTime) {
              setIsDeviceActivelyInUse(false);
              setIsWaitingForDevice(true);
              setWaitTimeLeft(Math.ceil((waitTime - now) / 1000));
            } else {
              // الوقت انتهى، المفروض fetchUserProfile هو اللي يتعامل مع النقل
              setIsWaitingForDevice(false);
            }
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(profileSub); };
  }, [session?.user?.id]);


  // Heartbeat to keep session alive and prevent unauthorized takeover
  useEffect(() => {
    if (!session?.user?.id || isWaitingForDevice || isLocked) return;

    const updateActivity = async () => {
      const devId = localStorage.getItem('mobi_cashier_device_id');
      const { data: profile } = await supabase.from('profiles').select('device_id').eq('id', session.user.id).single();
      
      // لا تحدث النشاط إلا إذا كنت الجهاز المعتمد
      if (profile?.device_id === devId) {
        const myName = getDeviceName();
        const myIp = await getDeviceIp();
        await supabase.from('profiles').update({
          last_seen: new Date().toISOString(),
          device_name: myName,
          last_ip: myIp || undefined
        }).eq('id', session.user.id);
      }
    };

    // Update immediately on mount
    updateActivity();

    // Then every 2 minutes
    const interval = setInterval(updateActivity, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session?.user?.id, isWaitingForDevice, isLocked]);

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

      // تم إزالة فحص الدخول المزدوج القديم لصالح نظام غرفة الانتظار الموحد في قاعدة البيانات

      // إذا لم يكن هناك tenantId بعد (حساب pending)، أعد جلب البروفايل كاملاً
      if (!tenantId) {
        fetchUserProfile(session.user.id);
        return;
      }

      const { data: prof } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single();
      if (prof && prof.tenant_id === null && userRole !== 'SUPER_ADMIN') {
        Swal.fire({
          icon: 'info',
          text: 'تم إزالتك من هذا المحل بواسطة المالك.',
          background: '#0f172a',
          color: '#fff',
          confirmButtonText: 'حسناً'
        }).then(() => {
          handleLogout();
        });
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
          title: '<div class="text-2xl font-black text-amber-500 mb-2">تنبيه النظام</div>',
          html: `
            <div class="flex flex-col items-center gap-4 py-4">
              <div class="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p class="text-slate-300 font-bold text-lg leading-relaxed">
                عذراً، بيانات هذا المحل لم تعد متوفرة.
                <br/>
                <span class="text-slate-500 text-sm">حسابك لا يزال موجوداً، ولكن المحل المرتبط به قد تم حذفه أو نقله.</span>
              </p>
            </div>
          `,
          background: '#0f172a',
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'تسجيل الخروج والمتابعة',
          padding: '2rem',
          customClass: {
            popup: 'rounded-[3rem] border border-slate-800 shadow-2xl',
            confirmButton: 'rounded-2xl px-8 py-4 font-black text-lg shadow-lg shadow-blue-500/20'
          },
          allowOutsideClick: false,
          backdrop: `rgba(2, 6, 23, 0.9)`
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const meta = currentUser?.user_metadata;
      const devId = localStorage.getItem('mobi_cashier_device_id');
      
      console.log('--- Security Check ---');
      console.log('Current Device ID (Local):', devId);
      console.log('Authorized Device ID (Metadata):', meta?.device_id);
      console.log('Wait Until (Metadata):', meta?.wait_until);

      // جلب بيانات البروفايل أولاً للفحص
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, tenant_id, device_id, device_wait_until, last_seen, device_name, last_ip')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setUserRole('OWNER');
        setIsLocked(true);
        setLockMessage('حسابك قيد المراجعة. يرجى التواصل مع الإدارة عبر واتساب لتفعيل اشتراكك.');
      } else {
        setUserRole(profile.role as UserRole);
        setTenantId(profile.tenant_id);

        const userDevId = profile.device_id;
        const waitUntil = profile.device_wait_until;
        const lastSeen = profile.last_seen;
        const authorizedDeviceName = profile.device_name || 'جهاز غير معروف';
        const authorizedDeviceIp = profile.last_ip || '';

        // 1. الجهاز المعتمد - يدخل مباشرة ويحدث بياناته
        if (userDevId === devId) {
          const myName = getDeviceName();
          const myIp = await getDeviceIp();
          await supabase.from('profiles').update({
            last_seen: new Date().toISOString(),
            device_name: myName,
            last_ip: myIp || undefined
          }).eq('id', userId);
        }
        // 2. جهاز مختلف عن المعتمد
        else if (userDevId && devId && userDevId !== devId) {
          // استثناء: السوبر أدمن يمكنه الدخول من أي جهاز مع تحديث البيانات
          if (profile.role === 'SUPER_ADMIN') {
            const myName = getDeviceName();
            const myIp = await getDeviceIp();
            await supabase.from('profiles').update({
              device_id: devId,
              device_name: myName,
              last_ip: myIp || undefined,
              last_seen: new Date().toISOString(),
              device_wait_until: null
            }).eq('id', userId);

            // إشعار للأدمن بأنه تم تجاوز القفل
            Swal.fire({
              icon: 'info',
              title: 'تنبيه الأدمن',
              text: `تم السماح بالدخول لجهاز الأدمن. كان هناك نشاط سابق من جهاز: ${authorizedDeviceName} (${authorizedDeviceIp})`,
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 5000,
              background: '#0f172a',
              color: '#fff'
            });
          } else {
            const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
            const isAuthorizedOnline = lastSeen && new Date(lastSeen) > threeMinutesAgo;

            if (isAuthorizedOnline) {
              setActiveDeviceName(authorizedDeviceName);
              setActiveDeviceIp(authorizedDeviceIp);
              setIsDeviceActivelyInUse(true);
              setIsWaitingForDevice(true);
              setWaitTimeLeft(0);
              setLoading(false);
              return;
            } else if (waitUntil) {
              const now = new Date().getTime();
              const waitTime = new Date(waitUntil).getTime();
              if (now < waitTime) {
                setActiveDeviceName(authorizedDeviceName);
                setActiveDeviceIp(authorizedDeviceIp);
                setIsDeviceActivelyInUse(false);
                setIsWaitingForDevice(true);
                setWaitTimeLeft(Math.ceil((waitTime - now) / 1000));
                setLoading(false);
                return;
              } else {
                const myName = getDeviceName();
                const myIp = await getDeviceIp();
                await supabase.from('profiles').update({
                  device_id: devId,
                  device_wait_until: null,
                  device_name: myName,
                  last_ip: myIp || undefined,
                  last_seen: new Date().toISOString()
                }).eq('id', userId);
              }
            } else {
              const waitDate = new Date();
              waitDate.setHours(waitDate.getHours() + 2);
              await supabase.from('profiles').update({
                device_wait_until: waitDate.toISOString()
              }).eq('id', userId);
              setActiveDeviceName(authorizedDeviceName);
              setActiveDeviceIp(authorizedDeviceIp);
              setIsDeviceActivelyInUse(false);
              setIsWaitingForDevice(true);
              setWaitTimeLeft(2 * 60 * 60);
              setLoading(false);
              return;
            }
          }
        }
        // 3. أول دخول - لا يوجد device_id مسجل
        else if (!userDevId && devId) {
          const myName = getDeviceName();
          const myIp = await getDeviceIp();
          await supabase.from('profiles').update({
            device_id: devId,
            device_name: myName,
            last_ip: myIp || undefined,
            last_seen: new Date().toISOString()
          }).eq('id', userId);
        }

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



  const handleLogout = async () => {
    if (session?.user?.id) {
      // تصفير آخر ظهور عند تسجيل الخروج يدوياً للسماح لجهاز آخر بالدخول فوراً (اختياري حسب رغبتك)
      // سأجعله يصفر last_seen فقط ليظهر للجهاز الآخر أنه "غير متصل" ويبدأ العداد
      await supabase.from('profiles').update({ 
        last_seen: null 
      }).eq('id', session.user.id);
    }
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



  if (isWaitingForDevice) {
    const hours = Math.floor(waitTimeLeft / 3600);
    const minutes = Math.floor((waitTimeLeft % 3600) / 60);
    const seconds = waitTimeLeft % 60;

    return (
      <div className="min-h-screen bg-[#020617] text-white font-['Cairo'] flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-purple-600 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-2xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl text-center space-y-8 relative z-10">
          
          {isDeviceActivelyInUse ? (
            <>
              <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                <ShieldCheck size={48} className="text-rose-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight text-rose-400">الحساب قيد الاستخدام!</h2>
                <p className="text-slate-300 font-bold leading-relaxed">
                  هذا الحساب مفتوح حالياً ومستخدم على جهاز آخر. لا يمكنك الدخول حتى يتم تسجيل الخروج من الجهاز الأصلي.
                </p>
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">الجهاز النشط:</span>
                    <span className="font-bold text-blue-400 text-sm" dir="ltr">{activeDeviceName}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                <Clock size={48} className="text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight">غرفة الانتظار الأمنية</h2>
                <p className="text-slate-400 font-bold leading-relaxed">
                  هذا الحساب كان مفتوحاً على جهاز آخر. لحماية خصوصيتك، يجب الانتظار <span className="text-amber-500">ساعتين</span> قبل تبديل الجهاز.
                </p>
                <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">الجهاز السابق:</span>
                    <span className="font-bold text-slate-300 text-sm" dir="ltr">{activeDeviceName}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { val: hours, label: 'ساعة' },
                  { val: minutes, label: 'دقيقة' },
                  { val: seconds, label: 'ثانية' }
                ].map((t, i) => (
                  <div key={i} className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl">
                    <div className="text-3xl font-black text-white tabular-nums">{String(t.val).padStart(2, '0')}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">{t.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="pt-4 space-y-3">
            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={20} /> تسجيل الخروج والمغادرة
            </button>

            <a 
              href="https://wa.me/201152628515?text=طلب%20فك%20قفل%20الجهاز%20وتخطي%20الانتظار"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-green-600/10 hover:bg-green-600/20 text-green-500 font-black rounded-2xl transition-all flex items-center justify-center gap-2 border border-green-500/20"
            >
              <MessageCircle size={20} /> التواصل مع الدعم الفني
            </a>

            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest flex items-center justify-center gap-2 pt-2">
              <ShieldCheck size={12} /> SECURE DEVICE SWAP PROTOCOL
            </p>
          </div>
        </div>
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
