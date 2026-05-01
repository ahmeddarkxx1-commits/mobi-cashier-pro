import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, Store, Users, Plus, Trash2, StopCircle, CheckCircle, X, Sparkles, Settings, Phone, Mail, Clock, ChevronDown, ChevronUp, RefreshCw, UserPlus, Send, Bell } from 'lucide-react';
import { supabase } from './supabaseClient';
import Swal from 'sweetalert2';

const SuperAdminApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [shopUsers, setShopUsers] = useState<Record<string, any[]>>({});
  const [shopInvites, setShopInvites] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedShop, setExpandedShop] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitingShop, setInvitingShop] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('CASHIER');
  const [newShop, setNewShop] = useState({ name: '', owner_email: '', plan: 'BASIC', months: 1 });
  const [editingShop, setEditingShop] = useState<any>({ id: '', name: '', plan: 'BASIC', extraMonths: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  // Notification and Maintenance State
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [globalNotify, setGlobalNotify] = useState({ title: '', message: '', type: 'info' });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAdminEmail(data.user.email || null);
    });
    fetchTenants();
    fetchAppConfig();

    // Notification Permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase.channel('admin_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shops' }, (payload) => {
        if (payload.new.status === 'pending') {
          playNotificationSound();
          showPushNotification(payload.new.name);
        }
        fetchTenants();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, fetchTenants)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchTenants)
      .subscribe();
    const interval = setInterval(fetchTenants, 15000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play();
    } catch (e) {
      console.error('Audio play failed:', e);
    }
  };

  const showPushNotification = (shopName: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("طلب تفعيل جديد 🏪", {
        body: `المحل "${shopName}" بانتظار المراجعة الآن.`,
        icon: '/favicon.ico'
      });
    }
  };

  const fetchAppConfig = async () => {
    const { data } = await supabase.from('app_config').select('*').limit(1).maybeSingle();
    if (data) {
      setMaintenanceMode(data.maintenance_mode || false);
      setMaintenanceMsg(data.maintenance_message || '');
    }
  };


  const fetchTenants = async () => {
    setLoading(true);
    const { data } = await supabase.from('shops').select('*').order('created_at', { ascending: false });
    if (data) setTenants(data);
    setLoading(false);
  };

  const fetchShopUsers = async (shopId: string) => {
    const { data } = await supabase.from('profiles').select('id, full_name, role').eq('tenant_id', shopId);
    if (data) setShopUsers(prev => ({ ...prev, [shopId]: data }));
    const { data: invites } = await supabase.from('shop_invites').select('*').eq('shop_id', shopId).eq('accepted', false);
    if (invites) setShopInvites(prev => ({ ...prev, [shopId]: invites }));
  };

  const toggleExpand = (shopId: string) => {
    if (expandedShop === shopId) { setExpandedShop(null); return; }
    setExpandedShop(shopId);
    fetchShopUsers(shopId);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !invitingShop) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('shop_invites').insert([{
      shop_id: invitingShop.id,
      invited_email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      accepted: false
    }]);
    if (!error) {
      Swal.fire({
        icon: 'success',
        title: 'تم إرسال الدعوة بنجاح',
        background: '#0f172a',
        color: '#fff'
      });
      setIsInviteModalOpen(false);
      setInviteEmail('');
      fetchShopUsers(invitingShop.id);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'فشل إرسال الدعوة',
        text: error.message,
        background: '#0f172a',
        color: '#fff'
      });
    }
    setIsSubmitting(false);
  };

  const handleRemoveInvite = async (inviteId: string, shopId: string) => {
    await supabase.from('shop_invites').delete().eq('id', inviteId);
    fetchShopUsers(shopId);
  };

  const handleActivateTrial = async (id: string) => {
    const result = await Swal.fire({
      title: 'تفعيل الفترة التجريبية؟',
      text: 'سيتم تفعيل 3 أيام تجريبية لهذا المحل',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'تفعيل الآن',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#10b981',
      background: '#0f172a',
      color: '#fff'
    });

    if (!result.isConfirmed) return;

    const expiry = new Date(); expiry.setDate(expiry.getDate() + 3);
    const { error } = await supabase.from('shops').update({ status: 'active', expiry_date: expiry.toISOString(), duration: '3_days_trial' }).eq('id', id);
    if (!error) { 
      Swal.fire({ icon: 'success', title: 'تم التفعيل بنجاح', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#fff' });
      fetchTenants(); 
    }
    else Swal.fire({ icon: 'error', title: 'خطأ', text: error.message, background: '#0f172a', color: '#fff' });
  };

  const handleToggleStatus = async (id: string, status: string) => {
    const newStatus = status === 'active' ? 'locked' : 'active';
    const result = await Swal.fire({
      title: 'تغيير حالة المحل؟',
      text: `سيتم تغيير الحالة إلى ${newStatus === 'active' ? 'نشط' : 'متوقف'}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'تأكيد التغيير',
      cancelButtonText: 'إلغاء',
      background: '#0f172a',
      color: '#fff'
    });

    if (!result.isConfirmed) return;
    await supabase.from('shops').update({ status: newStatus }).eq('id', id);
    fetchTenants();
  };

  const handleDeleteShop = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'حذف المحل؟',
      text: `سيتم حذف "${name}" نهائياً مع كافة بياناته!`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonText: 'حذف نهائي',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444',
      background: '#0f172a',
      color: '#fff'
    });

    if (!result.isConfirmed) return;
    
    // 1. إزالة ربط كل المستخدمين بهذا المحل في جدول profiles
    await supabase.from('profiles').update({ tenant_id: null, role: 'CASHIER' }).eq('tenant_id', id);
    
    // 2. حذف المحل نهائياً
    const { error } = await supabase.from('shops').delete().eq('id', id);
    
    if (!error) {
      Swal.fire({ icon: 'success', title: 'تم حذف المحل وجميع بياناته', background: '#0f172a', color: '#fff' });
      fetchTenants();
    } else {
      Swal.fire({ icon: 'error', title: 'خطأ في الحذف', text: error.message, background: '#0f172a', color: '#fff' });
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setIsSubmitting(true);
    const tenant = tenants.find(t => t.id === editingShop.id);
    let expiry = new Date(); // يبدأ الحساب دائماً من تاريخ اليوم (تحديد مدة جديدة)
    let newDuration = tenant?.duration; // نحافظ على القيمة كافتراضي

    if (editingShop.extraMonths === 0.1) {
      expiry.setDate(expiry.getDate() + 3);
      newDuration = '3_days_trial';
    } else if (editingShop.extraMonths > 0) {
      expiry.setMonth(expiry.getMonth() + Number(editingShop.extraMonths));
      newDuration = 'paid'; // إزالة حالة التجريبي عند الاشتراك
    } else {
      // إذا اختار "بدون تمديد" نحافظ على التاريخ القديم أو نضعه اليوم إذا كان منتهياً
      if (tenant?.expiry_date && new Date(tenant.expiry_date) > new Date()) {
        expiry = new Date(tenant.expiry_date);
      }
    }
    
    const { error } = await supabase.from('shops').update({ 
      plan: editingShop.plan, 
      expiry_date: expiry.toISOString(), 
      duration: newDuration,
      status: 'active' 
    }).eq('id', editingShop.id);
    
    if (!error) { 
      setIsSettingsModalOpen(false); 
      Swal.fire({ icon: 'success', title: 'تم تحديث الاشتراك', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#fff' });
      fetchTenants(); 
    }
    else Swal.fire({ icon: 'error', title: 'خطأ', text: error.message, background: '#0f172a', color: '#fff' });
    setIsSubmitting(false);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalNotify.title || !globalNotify.message) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('app_notifications').insert([{
      title: globalNotify.title,
      message: globalNotify.message,
      type: globalNotify.type,
      is_active: true
    }]);
    if (!error) {
      Swal.fire({ icon: 'success', title: 'تم البث بنجاح!', background: '#0f172a', color: '#fff' });
      setIsNotifyModalOpen(false);
      setGlobalNotify({ title: '', message: '', type: 'info' });
    } else {
      Swal.fire({ icon: 'error', title: 'خطأ في البث', text: error.message, background: '#0f172a', color: '#fff' });
    }
    setIsSubmitting(false);
  };

  const handleToggleMaintenance = async () => {
    const newMode = !maintenanceMode;
    const msg = prompt('أدخل رسالة الصيانة التي ستظهر للمستخدمين:', maintenanceMsg || 'النظام تحت الصيانة حالياً.. سنعود قريباً.');
    if (msg === null) return;
    
    const { error } = await supabase.from('app_config').update({ 
      maintenance_mode: newMode,
      maintenance_message: msg 
    }).eq('id', (await supabase.from('app_config').select('id').single()).data?.id);
    
    if (!error) {
      setMaintenanceMode(newMode);
      setMaintenanceMsg(msg);
      alert(`✅ تم ${newMode ? 'تفعيل' : 'إلغاء'} وضع الصيانة بنجاح!`);
    } else {
      alert('خطأ: ' + error.message);
    }
  };

  const handleSetGlobalMessage = async () => {
    const { data: config } = await supabase.from('app_config').select('*').limit(1).maybeSingle();
    const currentMsg = config?.global_message || '';
    
    const { value: msg } = await Swal.fire({
      title: 'ضبط الرسالة الهامة',
      input: 'textarea',
      inputLabel: 'ستظهر هذه الرسالة لجميع المستخدمين عند فتح التطبيق لمدة 5 ثوانٍ',
      inputValue: currentMsg,
      inputPlaceholder: 'أدخل نص الرسالة هنا...',
      showCancelButton: true,
      confirmButtonText: 'حفظ ونشر',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#3b82f6',
      background: '#0f172a',
      color: '#fff',
      inputAttributes: {
        dir: 'rtl'
      }
    });
    
    if (msg === undefined) return;

    // Use upsert to handle case where config might not exist
    const { error } = await supabase.from('app_config').upsert({ 
      id: config?.id || undefined, // undefined will let DB create a new one if config is null
      global_message: msg 
    });
    
    if (!error) {
      Swal.fire({
        icon: 'success',
        title: msg === '' ? 'تم إزالة الرسالة' : 'تم النشر بنجاح!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#0f172a',
        color: '#fff'
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'خطأ في الحفظ',
        text: error.message,
        background: '#0f172a',
        color: '#fff'
      });
    }
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    const expiry = new Date(); expiry.setMonth(expiry.getMonth() + Number(newShop.months));
    const { error } = await supabase.from('shops').insert([{ name: newShop.name, owner_email: newShop.owner_email, plan: newShop.plan, status: 'active', expiry_date: expiry.toISOString() }]);
    if (!error) { setIsModalOpen(false); setNewShop({ name: '', owner_email: '', plan: 'BASIC', months: 1 }); fetchTenants(); }
    else alert('خطأ: ' + error.message);
    setIsSubmitting(false);
  };

  const filtered = tenants.filter(t =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.owner_email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: tenants.length,
    active: tenants.filter(s => s.status === 'active').length,
    pending: tenants.filter(s => s.status === 'pending').length,
    expired: tenants.filter(s => s.status !== 'active' && s.status !== 'pending').length,
  };

  const getDaysLeft = (expiry: string) => {
    if (!expiry) return null;
    const diff = new Date(expiry).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (tenant: any) => {
    if (tenant.status === 'active') {
      const days = getDaysLeft(tenant.expiry_date);
      if (days !== null && days <= 0) return <span className="px-2 py-1 rounded-full text-[10px] font-black bg-red-500/20 text-red-400">منتهي</span>;
      if (days !== null && days <= 3) return <span className="px-2 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400">ينتهي قريباً ({days})</span>;
      return <span className="px-2 py-1 rounded-full text-[10px] font-black bg-green-500/20 text-green-400">نشط</span>;
    }
    if (tenant.status === 'pending') return <span className="px-2 py-1 rounded-full text-[10px] font-black bg-yellow-500/20 text-yellow-400">قيد المراجعة</span>;
    return <span className="px-2 py-1 rounded-full text-[10px] font-black bg-red-500/20 text-red-400">متوقف</span>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-['Cairo'] flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-red-600 rounded-xl shadow-lg shadow-red-500/20 shrink-0">
              <ShieldCheck size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-black truncate">لوحة تحكم السوبر أدمن</h1>
              <div className="hidden sm:block text-[10px] text-red-400 font-bold">SaaS Global Control Panel</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button onClick={() => window.location.reload()} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-blue-400" title="تحديث الصفحة كاملة">
              <RefreshCw size={16} className="sm:w-4.5 sm:h-4.5" />
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-red-500 transition-all rounded-xl font-black text-[11px] sm:text-sm">
              <LogOut size={14} className="sm:w-4 sm:h-4" /> 
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'إجمالي المحلات', value: stats.total, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'نشط', value: stats.active, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'قيد المراجعة', value: stats.pending, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'متوقف', value: stats.expired, color: 'text-red-400', bg: 'bg-red-500/10' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} border border-slate-800 rounded-2xl p-4 text-center`}>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 font-bold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Global Controls - Improved for Mobile */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:flex sm:items-center gap-3">
                <button onClick={() => setIsNotifyModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20 text-sm">
                  <Send size={16} />
                  بث إشعار
                </button>
                <button onClick={handleSetGlobalMessage} className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-black rounded-2xl transition-all shadow-lg shadow-amber-500/20 text-sm">
                  <Bell size={16} />
                  رسالة هامة (Alert)
                </button>
                <button onClick={handleToggleMaintenance} className={`flex items-center justify-center gap-2 px-6 py-3 ${maintenanceMode ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-800 hover:bg-slate-700'} rounded-2xl font-black text-sm transition-all`}
                >
                  {maintenanceMode ? <CheckCircle size={16} /> : <StopCircle size={16} />}
                  {maintenanceMode ? 'إلغاء الصيانة' : 'وضع الصيانة'}
                </button>
              </div>
              
              {maintenanceMode && (
                <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl text-amber-400 text-[10px] sm:text-xs font-bold animate-pulse text-center">
                  ⚠️ النظام في وضع الصيانة حالياً
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم المحل أو البريد..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
            <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-black text-sm transition-all whitespace-nowrap">
              <Plus size={16} /> إضافة محل جديد
            </button>
          </div>

          {/* Admin Shop Special Section */}
          {tenants.find(t => t.owner_email === adminEmail) && (
            <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 p-6 rounded-3xl mb-4 relative overflow-hidden group shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck size={120} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                      <ShieldCheck className="text-white" size={24} />
                    </div>
                    <h2 className="text-xl font-black text-white">حساب الإدارة (أنت)</h2>
                  </div>
                  <p className="text-slate-400 text-sm font-bold flex items-center gap-2">
                    <Mail size={14} className="text-blue-400" /> {adminEmail}
                  </p>
                </div>
                <div className="flex gap-2">
                   <span className="px-4 py-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-black">وصول كامل</span>
                </div>
              </div>
            </div>
          )}

          {/* Shops List */}
          <div className="space-y-3">
            {loading && <p className="text-center text-slate-400 py-8 font-bold">جاري التحميل...</p>}
            {!loading && filtered.filter(t => t.owner_email !== adminEmail).length === 0 && <p className="text-center text-slate-400 py-8 font-bold">لا توجد محلات</p>}

            {filtered.filter(t => t.owner_email !== adminEmail).map(tenant => {
              const days = getDaysLeft(tenant.expiry_date);
              const isExpanded = expandedShop === tenant.id;
              const users = shopUsers[tenant.id] || [];

              return (
                <div key={tenant.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-sm">
                  {/* Main Row */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Shop Name + Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Store size={14} className="text-blue-400 shrink-0" />
                        <span className="font-black text-sm sm:text-base truncate">{tenant.name || 'بدون اسم'}</span>
                        <div className="flex gap-1 flex-wrap">
                          {getStatusBadge(tenant)}
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 text-blue-400">{tenant.plan || 'BASIC'}</span>
                          {tenant.duration === '3_days_trial' && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/10 text-purple-400">تجريبي</span>}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1 mt-1 text-[11px] text-slate-500 font-bold">
                        {tenant.owner_email && <span className="flex items-center gap-1.5 truncate"><Mail size={12} className="shrink-0" />{tenant.owner_email}</span>}
                        {tenant.owner_phone && <span className="flex items-center gap-1.5"><Phone size={12} className="shrink-0" />{tenant.owner_phone}</span>}
                        {tenant.expiry_date && (
                          <span className={`flex items-center gap-1.5 ${days !== null && days <= 3 ? 'text-amber-400' : ''}`}>
                            <Clock size={12} className="shrink-0" />
                            {days !== null && days > 0 ? `${days} يوم متبقي` : 'منتهي'} · {new Date(tenant.expiry_date).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions - Better for Mobile Grid */}
                    <div className="grid grid-cols-5 sm:flex sm:items-center gap-1.5 sm:gap-2">
                      {tenant.status === 'pending' && (
                        <button onClick={() => handleActivateTrial(tenant.id)} className="col-span-2 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-black text-[10px] transition-all">
                          <Sparkles size={12} /> تفعيل
                        </button>
                      )}
                      <button onClick={() => { setInvitingShop(tenant); setIsInviteModalOpen(true); }} className={`${tenant.status === 'pending' ? 'col-span-3' : 'col-span-5'} sm:col-auto flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl font-black text-[10px] transition-all`} title="دعوة">
                        <UserPlus size={12} /> دعوة موظف
                      </button>
                      <button 
                        onClick={() => { 
                          setEditingShop({ 
                            id: tenant.id, 
                            name: tenant.name, 
                            plan: tenant.plan || 'BASIC', 
                            extraMonths: 0 
                          }); 
                          setIsSettingsModalOpen(true); 
                        }} 
                        className="p-2.5 bg-slate-800 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-xl transition-colors flex items-center justify-center"
                      >
                        <Settings size={16} />
                      </button>
                      <button onClick={() => handleToggleStatus(tenant.id, tenant.status)} className="p-2.5 bg-slate-800 hover:bg-amber-500/20 text-amber-400 rounded-xl transition-colors flex items-center justify-center"><StopCircle size={16} /></button>
                      <button onClick={() => handleDeleteShop(tenant.id, tenant.name)} className="p-2.5 bg-slate-800 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors flex items-center justify-center"><Trash2 size={16} /></button>
                      <button onClick={() => toggleExpand(tenant.id)} className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors flex items-center justify-center">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Users + Invites */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/50 p-4 space-y-4">
                      {/* Users */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-2"><Users size={13} /> المستخدمون ({users.length})</h4>
                        {users.length === 0 ? (
                          <p className="text-xs text-slate-600 font-bold">لا يوجد مستخدمون مرتبطون</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {users.map(u => (
                              <div key={u.id} className="bg-slate-900 rounded-xl p-3 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                  u.role === 'OWNER' ? 'bg-amber-500/20 text-amber-400' :
                                  u.role === 'MANAGER' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'
                                }`}>
                                  {u.role === 'OWNER' ? '👑' : u.role === 'MANAGER' ? '🔧' : '💼'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black truncate">{u.full_name || 'بدون اسم'}</p>
                                  <p className="text-[10px] text-slate-500 font-bold">{u.role === 'OWNER' ? 'صاحب المحل' : u.role === 'MANAGER' ? 'مدير' : 'كاشير'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pending Invites */}
                      {(shopInvites[tenant.id] || []).length > 0 && (
                        <div>
                          <h4 className="text-xs font-black text-amber-400 mb-2 flex items-center gap-2"><Send size={13} /> دعوات معلقة</h4>
                          <div className="space-y-2">
                            {(shopInvites[tenant.id] || []).map((inv: any) => (
                              <div key={inv.id} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-black text-amber-300" dir="ltr">{inv.invited_email}</p>
                                  <p className="text-[10px] text-amber-500 font-bold">{inv.role} · لم يُقبل بعد</p>
                                </div>
                                <button onClick={() => handleRemoveInvite(inv.id, tenant.id)} className="p-1 text-red-400 hover:text-red-300 transition-colors">
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Invite Modal */}
      {isInviteModalOpen && invitingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black">دعوة كاشير / مدير</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">للمحل: {invitingShop.name}</p>
              </div>
              <button onClick={() => { setIsInviteModalOpen(false); setInviteEmail(''); }} className="p-2 bg-slate-800 rounded-xl"><X size={18} /></button>
            </div>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">البريد الإلكتروني *</label>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-purple-500"
                  dir="ltr" placeholder="cashier@example.com" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">الدور</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-purple-500">
                  <option value="CASHIER">كاشير 💼</option>
                  <option value="MANAGER">مدير 🔧</option>
                </select>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-300 font-bold">
                📋 الخطوات: أرسل الدعوة ← أبلغ الكاشير بالإيميل ← يسجل بنفس الإيميل ← يدخل مباشرة على محلك
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl py-4 transition-all disabled:opacity-50">
                {isSubmitting ? 'جاري الإرسال...' : '📨 إرسال الدعوة عبر واتساب'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Shop Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">إضافة متجر جديد</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 rounded-xl"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddShop} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">اسم المتجر *</label>
                <input type="text" required value={newShop.name} onChange={e => setNewShop({...newShop, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-red-500" placeholder="موبايلات النور" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">البريد الإلكتروني *</label>
                <input type="email" required value={newShop.owner_email} onChange={e => setNewShop({...newShop, owner_email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-red-500" dir="ltr" placeholder="owner@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-2">الباقة</label>
                  <select value={newShop.plan} onChange={e => setNewShop({...newShop, plan: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-red-500">
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-2">المدة</label>
                  <select value={newShop.months} onChange={e => setNewShop({...newShop, months: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-red-500">
                    <option value={1}>شهر</option>
                    <option value={3}>3 أشهر</option>
                    <option value={6}>6 أشهر</option>
                    <option value={12}>سنة</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-500 text-white font-black rounded-xl py-4 mt-2 transition-all disabled:opacity-50">
                {isSubmitting ? 'جاري الإضافة...' : 'إضافة المتجر'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">تجديد الاشتراك</h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 bg-slate-800 rounded-xl"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">المتجر</label>
                <input type="text" disabled value={editingShop.name} className="w-full bg-slate-800 border border-slate-700 text-slate-400 rounded-xl px-4 py-3 font-bold text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-2">الباقة</label>
                  <select value={editingShop.plan} onChange={e => setEditingShop({...editingShop, plan: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-blue-500">
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-2">تمديد</label>
                  <select value={editingShop.extraMonths} onChange={e => setEditingShop({...editingShop, extraMonths: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-blue-500">
                    <option value={0}>بدون تمديد</option>
                    <option value={0.1}>3 أيام تجربة</option>
                    <option value={1}>شهر</option>
                    <option value={3}>3 أشهر</option>
                    <option value={6}>6 أشهر</option>
                    <option value={12}>سنة</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl py-4 mt-2 transition-all disabled:opacity-50">
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ وتفعيل'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Broadcast Notification Modal */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black flex items-center gap-2">
                <Send size={20} className="text-blue-400" />
                بث إشعار عام للمشتركين
              </h3>
              <button onClick={() => setIsNotifyModalOpen(false)} className="p-2 bg-slate-800 rounded-xl"><X size={18} /></button>
            </div>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">عنوان الإشعار</label>
                <input 
                  type="text" required 
                  value={globalNotify.title} 
                  onChange={e => setGlobalNotify({...globalNotify, title: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-blue-500" 
                  placeholder="تحديث جديد متاح!" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">محتوى الرسالة</label>
                <textarea 
                  required 
                  rows={3}
                  value={globalNotify.message} 
                  onChange={e => setGlobalNotify({...globalNotify, message: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-blue-500" 
                  placeholder="تم إضافة ميزة النسخ الاحتياطي في الإعدادات..."
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">نوع الإشعار</label>
                <select 
                  value={globalNotify.type} 
                  onChange={e => setGlobalNotify({...globalNotify, type: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="info">معلومة (أزرق)</option>
                  <option value="warning">تحذير (أصفر)</option>
                  <option value="maintenance">صيانة (برتقالي)</option>
                  <option value="success">نجاح (أخضر)</option>
                </select>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl py-4 mt-2 transition-all disabled:opacity-50">
                {isSubmitting ? 'جاري البث...' : '🚀 إرسال الآن'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminApp;
