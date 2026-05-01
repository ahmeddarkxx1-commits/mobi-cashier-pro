
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { 
  Users, 
  CreditCard, 
  Palette, 
  MessageSquare, 
  RefreshCw, 
  ShieldCheck, 
  Save, 
  Calendar, 
  Trash2,
  Bell,
  CheckCircle2,
  Ban,
  AlertTriangle,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { AppConfig, SubscriptionInfo, ThemeMode } from '../types';
import { supabase } from '../supabaseClient';

interface ControlPanelProps {
  appConfig: AppConfig;
  setAppConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  shopId: string | null;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ appConfig, setAppConfig, subscription, setSubscription, shopId }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'style'>('users');
  const [tempConfig, setTempConfig] = useState<AppConfig>({ ...appConfig });
  
  const [invites, setInvites] = useState<{id: string, name?: string, email: string, role: string, created_at: string}[]>([]);
  const [activeCashiers, setActiveCashiers] = useState<{id: string, full_name: string, role: string, last_active_at?: string}[]>([]);
  const [newCashierEmail, setNewCashierEmail] = useState('');
  const [newCashierName, setNewCashierName] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  React.useEffect(() => {
    if (shopId) {
      fetchInvites();
      fetchActiveCashiers();
      
      const interval = setInterval(() => {
        fetchActiveCashiers();
      }, 15000); // تحديث كل 15 ثانية لجلب حالة المتصل
      
      return () => clearInterval(interval);
    }
  }, [shopId]);

  const fetchInvites = async () => {
    const { data, error } = await supabase.from('shop_invites').select('*').eq('shop_id', shopId);
    if (!error && data) {
      setInvites(data);
    }
  };

  const fetchActiveCashiers = async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, last_active_at').eq('tenant_id', shopId).eq('role', 'CASHIER');
    if (!error && data) {
      setActiveCashiers(data);
    }
  };

  const isUserOnline = (lastActiveAt?: string) => {
    if (!lastActiveAt) return false;
    const lastActive = new Date(lastActiveAt).getTime();
    const now = new Date().getTime();
    return (now - lastActive) < 120000; // Within last 2 minutes
  };

  const colors = [
    { name: 'Blue', value: '#2563eb' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Slate', value: '#0f172a' },
    { name: 'Rose', value: '#e11d48' },
  ];

  const handleSaveConfig = async () => {
    setAppConfig(tempConfig);
    if (shopId) {
      await supabase.from('shops').update({ name: tempConfig.appName }).eq('id', shopId);
    }
    toast.success('تم حفظ الإعدادات بنجاح وتطبيقها على النظام.');
  };

  const handleAddCashier = async () => {
    if (!newCashierEmail || !newCashierName) {
      toast.error('الرجاء إدخال اسم وإيميل الكاشير.');
      return;
    }
    
    const isPro = ['monthly', 'semi-annual', 'yearly'].includes(subscription?.planId || '');
    if (!isPro && invites.length >= 1) {
       toast.error('عذراً، الخطة المجانية/التجريبية تسمح بإضافة كاشير واحد فقط. يرجى ترقية الخطة (Pro) لإضافة المزيد.');
       return;
    }

    const { error } = await supabase.from('shop_invites').insert([{
      shop_id: shopId,
      name: newCashierName,
      email: newCashierEmail.trim().toLowerCase(),
      role: 'CASHIER'
    }]);

    if (error) {
       if (error.code === '23505') toast.error('هذا الإيميل مضاف مسبقاً!');
       else toast.error('حدث خطأ أثناء الإضافة.');
    } else {
       toast.success('تم إضافة الكاشير بنجاح! اطلب منه إنشاء حساب جديد بنفس هذا الإيميل.');
       setNewCashierEmail('');
       setNewCashierName('');
       setIsAddingUser(false);
       fetchInvites();
    }
  };

  const handleRemoveInvite = async (id: string) => {
    if(!confirm('هل أنت متأكد من حذف هذه الدعوة؟')) return;
    await supabase.from('shop_invites').delete().eq('id', id);
    fetchInvites();
  };

  const handleRemoveActiveCashier = async (id: string) => {
    if(!confirm('هل أنت متأكد من إيقاف هذا الكاشير؟ سيتم طرده من المحل فوراً ولن يتمكن من الدخول.')) return;
    const { error } = await supabase.rpc('kick_cashier', { cashier_id: id });
    if (error) {
      toast.error('خطأ في إزالة الكاشير: ' + error.message);
      console.error(error);
    } else {
      toast.success('تم إزالة الكاشير وطرد حسابه بنجاح!');
    }
    fetchActiveCashiers();
  };

  const handleExtendSubscription = (days: number) => {
    const now = new Date();
    const expiry = new Date(subscription.expiryDate);
    const baseDate = now > expiry ? now : expiry;
    const newExpiry = new Date(baseDate);
    newExpiry.setDate(baseDate.getDate() + days);

    setSubscription({
      ...subscription,
      expiryDate: newExpiry.toISOString(),
      status: 'active',
      planId: days >= 365 ? 'yearly' : 'monthly'
    });
    toast.success(`تم تمديد الاشتراك لـ ${days} يوم إضافي.`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500" dir="rtl">
      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'users', label: 'المستخدمين', icon: Users },
          { id: 'style', label: 'المظهر والشكل', icon: Palette },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden text-right font-['Cairo']">
        {activeTab === 'users' && (
          <div className="p-10 space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-800 dark:text-white">إدارة المستخدمين (الكاشير)</h3>
                <p className="text-gray-400 text-sm font-bold">إضافة وتعديل الكاشيرات للمحل</p>
              </div>
              <button onClick={() => setIsAddingUser(!isAddingUser)} className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2">إضافة كاشير جديد</button>
            </div>

            {isAddingUser && (
              <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex flex-col md:flex-row gap-4 items-end animate-in fade-in duration-300">
                <div className="flex-1 w-full">
                  <label className="text-xs font-black text-blue-800 dark:text-blue-400 block mb-2">اسم الكاشير</label>
                  <input 
                    type="text" 
                    className="w-full p-4 rounded-2xl border border-blue-200 dark:border-blue-800 dark:bg-slate-800 font-black" 
                    placeholder="مثال: محمود علي"
                    value={newCashierName}
                    onChange={(e) => setNewCashierName(e.target.value)}
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-xs font-black text-blue-800 dark:text-blue-400 block mb-2">إيميل الكاشير</label>
                  <input 
                    type="email" 
                    className="w-full p-4 rounded-2xl border border-blue-200 dark:border-blue-800 dark:bg-slate-800 font-black" 
                    placeholder="مثال: cashier@shop.com"
                    value={newCashierEmail}
                    onChange={(e) => setNewCashierEmail(e.target.value)}
                  />
                </div>
                <button onClick={handleAddCashier} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shrink-0 hover:bg-blue-700 transition-all w-full md:w-auto">إرسال دعوة الكاشير</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-6 bg-blue-50 dark:bg-slate-800 rounded-3xl border border-blue-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shadow-lg">أن</div>
                    <div>
                      <div className="font-black text-blue-900 dark:text-white">أنت (صاحب المحل)</div>
                      <div className="text-[10px] text-blue-600 font-bold uppercase">OWNER</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-700">نشط</span>
                  </div>
              </div>

              {activeCashiers.map((u, i) => (
                <div key={`active-${i}`} className="p-6 bg-green-50 dark:bg-slate-800 rounded-3xl border border-green-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center font-black text-green-600 border border-green-200 dark:border-slate-600">
                      <Users size={20} />
                    </div>
                    <div>
                      <div className="font-black text-gray-800 dark:text-white truncate max-w-[120px]">{u.full_name || 'كاشير'}</div>
                      <div className="text-[10px] text-green-600 font-bold uppercase truncate max-w-[120px]">مسجل ونشط</div>
                    </div>
                  </div>
                  <div className="text-left flex items-center gap-2">
                    {isUserOnline(u.last_active_at) ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-100 text-green-700 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> متصل الآن
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gray-100 text-gray-500">غير متصل</span>
                    )}
                    <button onClick={() => handleRemoveActiveCashier(u.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}

              {invites.map((u, i) => (
                <div key={`invite-${i}`} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center font-black text-slate-400 border border-gray-100 dark:border-slate-600">
                      <Users size={20} />
                    </div>
                    <div>
                      <div className="font-black text-gray-800 dark:text-white truncate max-w-[120px]">{u.name || 'بدون اسم'}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[120px]" title={u.email}>{u.email}</div>
                    </div>
                  </div>
                  <div className="text-left flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-yellow-100 text-yellow-700">في الانتظار (دعوة)</span>
                    <button onClick={() => handleRemoveInvite(u.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'style' && (
          <div className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 block">اللون الأساسي للنظام</label>
                  <div className="grid grid-cols-6 gap-3">
                    {colors.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setTempConfig({ ...tempConfig, primaryColor: c.value })}
                        className={`w-full aspect-square rounded-2xl border-4 transition-all ${
                          tempConfig.primaryColor === c.value ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 block">مظهر النظام المفضل</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: 'نهاري', icon: Sun },
                      { id: 'dark', label: 'ليلي', icon: Moon },
                      { id: 'system', label: 'تلقائي', icon: Monitor },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setTempConfig({ ...tempConfig, themeMode: mode.id as ThemeMode })}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 font-black text-xs ${
                          tempConfig.themeMode === mode.id 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                          : 'border-gray-100 dark:border-slate-800 text-gray-400'
                        }`}
                      >
                        <mode.icon size={20} />
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase">اسم التطبيق التجاري</label>
                    <input 
                      className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-slate-800 dark:bg-slate-800 font-black text-gray-800 dark:text-white outline-none focus:border-blue-500"
                      value={tempConfig.appName}
                      onChange={e => setTempConfig({ ...tempConfig, appName: e.target.value })}
                    />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center space-y-6">
                 <div className="text-gray-400 font-bold text-sm">معاينة الشكل الجديد</div>
                 <div className={`w-full max-w-[200px] h-32 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-600 ${tempConfig.themeMode === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                    <div className="h-4 w-full" style={{ backgroundColor: tempConfig.primaryColor }}></div>
                    <div className="p-4 space-y-2">
                       <div className={`h-2 w-1/2 rounded ${tempConfig.themeMode === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                       <div className={`h-2 w-full rounded ${tempConfig.themeMode === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                       <div className="h-6 w-full rounded-lg mt-2" style={{ backgroundColor: tempConfig.primaryColor }}></div>
                    </div>
                 </div>
              </div>
            </div>
            
            <button onClick={handleSaveConfig} className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all">
               <Save size={24} /> حفظ الإعدادات وتطبيق المظهر
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ControlPanel;
