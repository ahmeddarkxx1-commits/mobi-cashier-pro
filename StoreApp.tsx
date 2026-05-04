
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, Wallet, Package, PieChart, Settings, Menu, X, Wrench, LogOut, Smartphone, LogIn, AlertCircle, Loader2, Bell, Store
} from 'lucide-react';
import Cashier from './components/Cashier';
import MaintenanceCenter from './components/MaintenanceCenter';
import Inventory from './components/Inventory';
import Finance from './components/Finance';
import Reports from './components/Reports';
import Debts from './components/Debts';
import ControlPanel from './components/ControlPanel';
import SettingsView from './components/SettingsView';
import MissingGoods from './components/MissingGoods';
import { StoreSection, Product, MaintenanceJob, Transaction, TransferSetting, Expense, UserRole, AppConfig, SubscriptionInfo } from './types';
import { supabase } from './supabaseClient';

interface StoreAppProps {
  userRole: UserRole;
  onLogout: () => void;
  appConfig: AppConfig;
  setAppConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  tenantId: string | null;
  shopPlan?: string;
  globalNotifications?: any[];
}

const StoreApp: React.FC<StoreAppProps> = ({ userRole, onLogout, appConfig, setAppConfig, tenantId, shopPlan = 'BASIC', globalNotifications = [] }) => {
  const [activeSection, setActiveSection] = useState<StoreSection>('cashier');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [maintenanceJobs, setMaintenanceJobs] = useState<MaintenanceJob[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [shopStatus, setShopStatus] = useState<string>('active');
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [shopDuration, setShopDuration] = useState<string>('');
  const [shopName, setShopName] = useState<string>('');
  const [shopOwnerEmail, setShopOwnerEmail] = useState<string>('');
  
  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);


  const [transferSettings, setTransferSettings] = useState<TransferSetting[]>([]);

  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId && !shopId) return;
    const sid = tenantId || shopId;

    const syncAllSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('settings')
          .eq('id', sid)
          .single();

        if (error) throw error;

        const currentSettings = data?.settings || {};
        let needsUpdate = false;
        const newSettings = { ...currentSettings };

        if (currentSettings.transferSettings && currentSettings.transferSettings.length > 0) {
          setTransferSettings(currentSettings.transferSettings);
          localStorage.setItem('transferSettings', JSON.stringify(currentSettings.transferSettings));
        } else {
          // Check if we have local data to push
          const saved = localStorage.getItem('transferSettings');
          if (saved) {
            const parsed = JSON.parse(saved);
            setTransferSettings(parsed);
            newSettings.transferSettings = parsed;
            needsUpdate = true;
          } else {
            // Default settings if none anywhere
            const vfRules = [
              { label: 'فكة 13 (2.5ج رصيد)', cardValue: 13, costPrice: 9.5 },
              { label: 'فكة 16.5 (4ج رصيد)', cardValue: 16.5, costPrice: 12 },
              { label: 'فكة 19.5 (5.5ج رصيد)', cardValue: 19.5, costPrice: 14 },
              { label: 'فكة 26 (9ج رصيد)', cardValue: 26, costPrice: 19 },
              { label: 'فكة 38 (12.5ج رصيد)', cardValue: 38, costPrice: 28 },
              { label: 'فكة 65 (25ج رصيد)', cardValue: 65, costPrice: 50 }
            ];
            const defaults = [
              { operator: 'فودافون', sendRate: 10, companyFeeRate: 0, companyFeeMax: 0, isSendTiered: true, fixedFeeLow: 5, fixedFeeHigh: 15, feeThreshold: 3000, receiveRate: 15, rechargeRules: vfRules, creditMultiplier: 1.5 },
              { operator: 'اتصالات', sendRate: 10, companyFeeRate: 5, companyFeeMax: 15, isSendTiered: true, fixedFeeLow: 5, fixedFeeHigh: 15, feeThreshold: 3000, receiveRate: 15, rechargeRules: vfRules, creditMultiplier: 1.5 },
              { operator: 'أورانج', sendRate: 10, companyFeeRate: 5, companyFeeMax: 15, isSendTiered: true, fixedFeeLow: 5, fixedFeeHigh: 15, feeThreshold: 3000, receiveRate: 15, rechargeRules: vfRules, creditMultiplier: 1.5 },
              { operator: 'وي', sendRate: 10, companyFeeRate: 5, companyFeeMax: 15, isSendTiered: true, fixedFeeLow: 5, fixedFeeHigh: 15, feeThreshold: 3000, receiveRate: 15, rechargeRules: vfRules, creditMultiplier: 1.5 },
              { operator: 'إنستا باي', sendRate: 0, companyFeeRate: 0, companyFeeMax: 0, isSendTiered: false, fixedFeeLow: 0, fixedFeeHigh: 0, feeThreshold: 0, receiveRate: 0, rechargeRules: [], creditMultiplier: 1.0 }
            ];
            setTransferSettings(defaults);
            newSettings.transferSettings = defaults;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await supabase.from('shops').update({ settings: newSettings }).eq('id', sid);
        }
      } catch (err) {
        console.warn('Sync settings failed:', err);
        const saved = localStorage.getItem('transferSettings');
        if (saved) setTransferSettings(JSON.parse(saved));
      }
    };

    syncAllSettings();
  }, [tenantId, shopId]);

  // Heartbeat لإثبات التواجد (Online Status)
  useEffect(() => {
    if (!userRole) return;
    const updatePresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch full name once
        if (!currentUserName) {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
          if (profile && profile.full_name) {
             setCurrentUserName(profile.full_name);
          }
        }
        await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);
      }
    };
    
    updatePresence(); // تحديث فوري عند الدخول
    const intervalId = setInterval(updatePresence, 30000); // تحديث كل 30 ثانية
    
    return () => clearInterval(intervalId);
  }, [userRole, currentUserName]);

  // Fetch Notifications
  useEffect(() => {
    if (!shopId) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('shop_notifications')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
    };
    fetchNotifications();
    const sub = supabase.channel('notif-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_notifications', filter: `shop_id=eq.${shopId}` }, fetchNotifications)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [shopId]);

  const markAsRead = async (id: string) => {
    // Check if it's a shop notification or a global one
    const isGlobal = globalNotifications.some(gn => gn.id === id);
    
    if (isGlobal) {
      const readIds = JSON.parse(localStorage.getItem('read_global_notifs') || '[]');
      localStorage.setItem('read_global_notifs', JSON.stringify([...new Set([...readIds, id])]));
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('تم إخفاء التنبيه');
    } else {
      const { error } = await supabase
        .from('shop_notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('تم القراءة');
      }
    }
  };

  // Combine notifications
  useEffect(() => {
    const fetchAndCombine = async () => {
      const readGlobalIds = JSON.parse(localStorage.getItem('read_global_notifs') || '[]');
      const unreadGlobals = globalNotifications
        .filter(gn => !readGlobalIds.includes(gn.id))
        .map(gn => ({ ...gn, content: gn.message })); // Normalize content field

      let shopNotifs: any[] = [];
      if (shopId) {
        const { data } = await supabase
          .from('shop_notifications')
          .select('*')
          .eq('shop_id', shopId)
          .eq('is_read', false);
        if (data) shopNotifs = data;
      }
      
      setNotifications([...unreadGlobals, ...shopNotifs].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    };
    
    fetchAndCombine();
  }, [shopId, globalNotifications]);

  // Fetch trial info - يعتمد على shopId (يُعين بعد fetchData) أو tenantId
  useEffect(() => {
    const sid = tenantId || shopId;
    if (!sid) return;
    const fetchShopInfo = async () => {
      if (!tenantId) return;
      const { data, error } = await supabase
        .from('shops')
        .select('name, owner_email, status, expiry_date, duration')
        .eq('id', tenantId)
        .maybeSingle();
      
      if (data && !error) {
        setShopName(data.name || '');
        setShopOwnerEmail(data.owner_email || '');
        setShopStatus(data.status || 'active');
        setExpiryDate(data.expiry_date || null);
        setShopDuration(data.duration || '');
        
        if (data.expiry_date) {
          const diff = new Date(data.expiry_date).getTime() - new Date().getTime();
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(days > 0 ? days : 0);
        }
      }
    };

    fetchShopInfo();
    const inv = setInterval(fetchShopInfo, 30000);
    return () => clearInterval(inv);
  }, [tenantId]);

  // Background Data Refresh logic
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      let sId = tenantId;

      if (!tenantId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let { data: shopData } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', user.id)
            .single();

          if (shopData) sId = shopData.id;
        }
      }

      if (!sId) {
        setLoading(false);
        return;
      }

      setShopId(sId);

      // Fetch all data in parallel
      const [prodData, transData, jobData, shopData] = await Promise.all([
        supabase.from('products').select('*').eq('shop_id', sId),
        supabase.from('transactions').select('*').eq('shop_id', sId).order('date', { ascending: false }),
        supabase.from('maintenance_jobs').select('*').eq('shop_id', sId),
        supabase.from('shops').select('name').eq('id', sId).single()
      ]);

      if (prodData.error || transData.error || jobData.error) {
        console.error('Fetch error:', prodData.error || transData.error || jobData.error);
        if (!isSilent) toast.error('فشل مزامنة البيانات من السحابة. تأكد من الإنترنت.');
        return;
      }

      if (prodData.data) setProducts(prodData.data);
      if (transData.data) setTransactions(transData.data);
      if (jobData.data) setMaintenanceJobs(jobData.data);
      if (shopData.data && shopData.data.name !== appConfig.appName) {
        setAppConfig(prev => ({ ...prev, appName: shopData.data.name }));
      }

    } catch (err) {
      console.error('Error fetching background data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, appConfig.appName]);

  // Initial fetch and setup sync interval
  useEffect(() => {
    fetchData(); // أول جلب (مع Loader)
    const syncInterval = setInterval(() => fetchData(true), 15000); // تحديث صامت كل 15 ثانية
    return () => clearInterval(syncInterval);
  }, [fetchData]);

  const addTransaction = async (t: Omit<Transaction, 'id' | 'date'>) => {
    if (!shopId) return;

    const newT = { 
      ...t, 
      id: Math.random().toString(36).substr(2, 9), 
      date: new Date().toISOString(),
      amount: Number(t.amount || 0),
      profit: Number(t.profit || 0),
      cost: Number(t.cost || 0),
      shop_id: shopId,
      cashier_name: currentUserName || (userRole === 'OWNER' ? 'صاحب المحل' : 'كاشير المحل')
    };

    // Optimistic update
    setTransactions(prev => [newT, ...prev]);

    // DB Sync
    const { error } = await supabase.from('transactions').insert([newT]);
    if (error) {
      console.error('Error saving transaction:', error);
      toast.error('فشل تسجيل العملية في قاعدة البيانات!');
      // Revert local state on error
      setTransactions(prev => prev.filter(item => item.id !== newT.id));
    }
  };

  const menuItems = [
    // --- العمليات الأساسية ---
    { id: 'cashier', label: 'كاشير المحل', icon: LayoutDashboard, roles: ['OWNER', 'MANAGER', 'CASHIER'] },
    { id: 'maintenance_pos', label: 'مركز الصيانة', icon: Wrench, roles: ['OWNER', 'MANAGER', 'CASHIER'], plan: 'PRO' },
    
    // --- إدارة البضاعة ---
    { id: 'inventory', label: 'المخزن والبضاعة', icon: Package, roles: ['OWNER', 'MANAGER'] },
    { id: 'missing_goods', label: 'نواقص المحل', icon: AlertCircle, roles: ['OWNER', 'MANAGER', 'CASHIER'], plan: 'PRO' },
    
    // --- الحسابات والمالية ---
    { id: 'finance', label: 'الخزينة والمصاريف', icon: Wallet, roles: ['OWNER', 'MANAGER'] },
    { id: 'debts', label: 'الديون والآجل', icon: Wallet, roles: ['OWNER', 'MANAGER', 'CASHIER'], plan: 'PRO' },
    
    // --- التحليل والإدارة ---
    { id: 'reports', label: 'التقارير والمبيعات', icon: PieChart, roles: ['OWNER', 'MANAGER', 'CASHIER'] },
    { id: 'settings', label: 'الإعدادات والتحكم', icon: Settings, roles: ['OWNER'] },
  ].filter(item => item.roles.includes(userRole));

  const handleSectionChange = (id: string, plan?: string) => {
    if (plan === 'PRO' && shopPlan !== 'PRO') {
      toast.error('هذه الميزة متاحة فقط في باقة PRO ⭐\nتواصل مع الإدارة للترقية الآن!', {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          borderRadius: '1rem',
          border: '1px solid #334155'
        },
        icon: '🔒'
      });
      return;
    }
    setActiveSection(id as StoreSection);
    setIsSidebarOpen(false);
  };

  // حساب الخزنة (الكاش الفعلي في المحل)
  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const cashBalance = transactions.reduce((acc, t) => {
    if (t.medium === 'cash') {
      const amt = Number(t.amount || 0);
      return (t.type === 'expense') ? acc - amt : acc + amt;
    }
    return acc;
  }, 0);

  const todayStr = getLocalDateString();
  const todayCashBalance = transactions.reduce((acc, t) => {
    const tDate = new Date(t.date);
    // Get local date parts
    const tDateStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}-${String(tDate.getDate()).padStart(2, '0')}`;
    
    if (tDateStr === todayStr && t.medium === 'cash') {
      const amt = Number(t.amount || 0);
      return (t.type === 'expense') ? acc - amt : acc + amt;
    }
    return acc;
  }, 0);

  if (!loading && !shopId) {
    if (userRole === 'OWNER') {
      return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <p className="font-black animate-pulse">جاري التحقق من حالة المحل...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 font-['Cairo'] text-center" dir="rtl">
        <div className="bg-slate-900 border border-slate-800 p-10 rounded-3xl max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Smartphone size={40} className="text-slate-400" />
          </div>
          <h2 className="text-2xl font-black mb-4">لا يوجد محل مرتبط بك</h2>
          <p className="text-slate-400 font-bold leading-relaxed mb-8">
            حسابك حالياً غير مرتبط بأي محل على النظام. إذا كنت كاشير، يرجى طلب دعوة من صاحب المحل.
          </p>
          <div className="space-y-3">
            <button 
              onClick={async () => {
                const { data, error } = await supabase.rpc('accept_invite');
                if (data === true) {
                   toast.success('تم العثور على دعوة وقبولها بنجاح! سيتم تحويلك للمحل الآن.');
                   setTimeout(() => window.location.reload(), 1500);
                } else {
                   toast.error('لم يتم العثور على أي دعوات جديدة مبعوتة لإيميلك.');
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              التحقق من وجود دعوات جديدة
            </button>
            <button 
              onClick={onLogout}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4 font-['Cairo']">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="font-black animate-pulse">جاري تحميل بيانات المحل...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-right font-['Cairo'] overflow-hidden transition-colors duration-300" dir="rtl">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      <aside className={`
        fixed lg:static inset-y-0 right-0 z-50 w-72 bg-slate-900 text-white flex flex-col shadow-2xl
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
              <Store className="text-white" size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black truncate text-white leading-none mb-1">{shopName || 'جاري التحميل...'}</h1>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-blue-300 font-bold opacity-80 truncate">{currentUserName}</span>
                <span className="text-[9px] text-slate-500 font-bold truncate opacity-60">{shopOwnerEmail}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white shrink-0">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const isLocked = item.plan === 'PRO' && shopPlan !== 'PRO';
            return (
              <button 
                key={item.id} 
                onClick={() => handleSectionChange(item.id, item.plan)} 
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-sm ${
                  activeSection === item.id ? 'bg-blue-600 text-white shadow-lg' : 
                  isLocked ? 'text-slate-500 opacity-60 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <item.icon size={20} />
                  {item.label}
                </div>
                {isLocked && (
                  <span className="text-[8px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/30 font-black flex items-center gap-1">
                    <LogIn size={10} /> PRO
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-4 text-red-400 bg-red-400/10 rounded-2xl font-black text-sm hover:bg-red-500 hover:text-white transition-all">
              <LogOut size={18} /> اقفل البرنامج واخرج
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* شريط العد التنازلي للفترة التجريبية */}
        {trialDaysLeft !== null && trialDaysLeft <= 3 && shopStatus === 'active' && (
          <div className={`w-full text-center text-xs font-black py-2 px-4 ${
            trialDaysLeft === 0 ? 'bg-red-600 text-white animate-pulse' :
            trialDaysLeft === 1 ? 'bg-orange-500 text-white' :
            'bg-amber-400 text-slate-900'
          }`}>
            {trialDaysLeft === 0 
              ? '⚠️ انتهت فترتك التجريبية! تواصل مع الإدارة فوراً لتجنب إيقاف الخدمة.'
              : `⏳ تبقى ${trialDaysLeft} ${trialDaysLeft === 1 ? 'يوم' : 'أيام'} فقط من فترتك التجريبية المجانية. تواصل مع الإدارة للاشتراك.`
            }
          </div>
        )}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 sticky top-0 z-30 flex items-center justify-between shrink-0 h-16 sm:h-20 transition-colors duration-300">
          <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl shrink-0"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-sm sm:text-lg font-black text-slate-800 dark:text-white truncate transition-colors duration-300">
              {menuItems.find(i => i.id === activeSection)?.label}
            </h2>
            <div className="hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 pr-4 mr-1">
               <span className="text-xs font-black text-blue-600 dark:text-blue-400">{shopName}</span>
               <span className="text-[9px] font-bold text-slate-500">{shopOwnerEmail}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm transition-colors duration-300">
               <LayoutDashboard size={16} className="shrink-0 sm:hidden" />
               <span className="hidden sm:inline text-[10px] sm:text-xs font-black">الخزنة (اليوم):</span>
               <span className="font-black text-[11px] sm:text-sm tabular-nums" dir="ltr">
                 {Math.round(todayCashBalance).toLocaleString()} ج
               </span>
            </div>
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-2 sm:p-3 rounded-xl transition-all relative border ${
                  notifications.length > 0 
                  ? 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse' 
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                    {notifications.length}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-black text-sm">الرسايل والتنبيهات</h3>
                    <button onClick={() => setIsNotificationsOpen(false)}><X size={18} /></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2 space-y-2 no-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <div className="text-4xl mb-2">📭</div>
                        <p className="text-xs font-bold">مفيش رسايل جديدة</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <h4 className="font-black text-xs text-blue-600 dark:text-blue-400 mb-1">{n.title}</h4>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{n.content}</p>
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg transition-all"
                          >
                            قراعةه (إخفاء)
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={onLogout}
              className="p-2 sm:p-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-2 border border-red-100 dark:border-red-900/30 shrink-0 min-w-[40px] justify-center"
              title="خروج سريع"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline font-black text-xs">خروج</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-slate-50/50 dark:bg-slate-950/50 transition-colors duration-300 no-scrollbar">
          <div className="max-w-6xl mx-auto pb-20 lg:pb-0">
            {activeSection === 'cashier' && <Cashier products={products} setProducts={setProducts} addTransaction={addTransaction} transferSettings={transferSettings} shopId={shopId} />}
            {activeSection === 'maintenance_pos' && <MaintenanceCenter jobs={maintenanceJobs} setJobs={setMaintenanceJobs} addTransaction={addTransaction} products={products} setProducts={setProducts} userRole={userRole} shopId={shopId} />}
            {activeSection === 'inventory' && <Inventory products={products} setProducts={setProducts} shopId={shopId} />}
            {activeSection === 'finance' && <Finance transactions={transactions} addTransaction={addTransaction} expenses={expenses} setExpenses={setExpenses} />}
            { activeSection === 'reports' && <Reports transactions={transactions} expenses={expenses} maintenanceJobs={maintenanceJobs} /> }
            { activeSection === 'debts' && <Debts shopId={shopId} addTransaction={addTransaction} /> }
            { activeSection === 'missing_goods' && <MissingGoods products={products} shopId={shopId} /> }
            { activeSection === 'settings' && (
              <div className="pb-20">
                <SettingsView 
                  settings={transferSettings} 
                  setSettings={setTransferSettings}
                  trialDaysLeft={trialDaysLeft}
                  shopStatus={shopStatus}
                  expiryDate={expiryDate}
                  shopPlan={shopPlan}
                  shopDuration={shopDuration}
                  shopId={shopId}
                  userRole={userRole}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoreApp;
