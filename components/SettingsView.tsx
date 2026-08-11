
import React, { useState, useEffect } from 'react';
import { Save, MessageCircle, Crown, Clock, CheckCircle, XCircle, Download, Database, UserPlus, Users, Trash2, Send, Loader2, Plus, RefreshCw, Wallet, Printer, Sliders } from 'lucide-react';
import { TransferSetting } from '../types';
import { supabase } from '../supabaseClient';
import JsBarcode from 'jsbarcode';

interface SettingsViewProps {
  settings: TransferSetting[];
  setSettings: React.Dispatch<React.SetStateAction<TransferSetting[]>>;
  trialDaysLeft?: number | null;
  shopStatus?: string;
  expiryDate?: string | null;
  shopPlan?: string;
  shopDuration?: string;
  shopId?: string;
  userRole?: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, setSettings, trialDaysLeft, shopStatus, expiryDate, shopPlan = 'BASIC', shopDuration = '', shopId, userRole }) => {
  const [activeOp, setActiveOp] = useState<string>(settings[0]?.operator || '');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('CASHIER');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'staff' | 'appearance' | 'financial' | 'data'>('staff');
  const [darkMode, setDarkMode] = useState(false);
  const [shopName, setShopName] = useState('');
  const [maxCashiers, setMaxCashiers] = useState(5);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [barcodePrintSettings, setBarcodePrintSettings] = useState({
    paddingTop: 0,
    paddingBottom: 3,
    paddingLeft: 1,
    paddingRight: 1,
    scale: 100,
    fontSizeSname: 9,
    fontSizePname: 7,
    fontSizePrice: 8
  });

  const [maintPrintSettings, setMaintPrintSettings] = useState({
    paddingTop: 1,
    paddingBottom: 1,
    paddingLeft: 1,
    paddingRight: 1,
    scale: 100,
    fontSizeSname: 8,
    fontSizeDev: 7,
    fontSizeCust: 6.5,
    fontSizeIssue: 6.5,
    fontSizeFoot: 6
  });

  useEffect(() => {
    const saved = localStorage.getItem('barcode_print_settings');
    if (saved) {
      try {
        setBarcodePrintSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        console.error(e);
      }
    }

    const savedMaint = localStorage.getItem('maint_print_settings');
    if (savedMaint) {
      try {
        setMaintPrintSettings(prev => ({ ...prev, ...JSON.parse(savedMaint) }));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const updateBarcodeSetting = (key: string, value: number) => {
    const updated = { ...barcodePrintSettings, [key]: value };
    setBarcodePrintSettings(updated);
    localStorage.setItem('barcode_print_settings', JSON.stringify(updated));
  };

  const resetBarcodeSettings = () => {
    const defaults = {
      paddingTop: 0,
      paddingBottom: 3,
      paddingLeft: 1,
      paddingRight: 1,
      scale: 100,
      fontSizeSname: 9,
      fontSizePname: 7,
      fontSizePrice: 8
    };
    setBarcodePrintSettings(defaults);
    localStorage.setItem('barcode_print_settings', JSON.stringify(defaults));
  };

  const updateMaintSetting = (key: string, value: number) => {
    const updated = { ...maintPrintSettings, [key]: value };
    setMaintPrintSettings(updated);
    localStorage.setItem('maint_print_settings', JSON.stringify(updated));
  };

  const resetMaintSettings = () => {
    const defaults = {
      paddingTop: 1,
      paddingBottom: 1,
      paddingLeft: 1,
      paddingRight: 1,
      scale: 100,
      fontSizeSname: 8,
      fontSizeDev: 7,
      fontSizeCust: 6.5,
      fontSizeIssue: 6.5,
      fontSizeFoot: 6
    };
    setMaintPrintSettings(defaults);
    localStorage.setItem('maint_print_settings', JSON.stringify(defaults));
  };

  const handlePrintTestBarcode = () => {
    const displayName = "صنف تجريبي للمعاينة";
    const barcode = "123456789012";
    const price = "150";

    // Render barcode to Canvas then convert to PNG
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;';
    document.body.appendChild(hiddenDiv);
    const canvas = document.createElement('canvas');
    hiddenDiv.appendChild(canvas);

    let barcodeDataURL = '';
    try {
      JsBarcode(canvas, barcode, {
        format: 'CODE128',
        width: 1.5,
        height: 18,
        displayValue: true,
        fontSize: 13,
        fontOptions: 'bold',
        margin: 0,
        textMargin: 1,
        background: '#ffffff',
        lineColor: '#000000'
      });
      barcodeDataURL = canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Barcode test render failed:', e);
      alert('فشل رسم باركود التجربة');
      document.body.removeChild(hiddenDiv);
      return;
    }
    document.body.removeChild(hiddenDiv);

    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>باركود تجريبي</title>
    <style>
      @page { size: 38mm 22mm; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 38mm; height: 22mm; background: #fff; color: #000; overflow: hidden; font-family: Arial, sans-serif; }
      .wrap { 
        width: 38mm; 
        height: 22mm; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: space-between; 
        padding: ${barcodePrintSettings.paddingTop}mm ${barcodePrintSettings.paddingRight}mm ${barcodePrintSettings.paddingBottom}mm ${barcodePrintSettings.paddingLeft}mm; 
        transform: scale(${barcodePrintSettings.scale / 100});
        transform-origin: top center;
        text-align: center; 
      }
      .sname { font-size: ${barcodePrintSettings.fontSizeSname}pt; font-weight: 900; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; line-height: 1; margin-bottom: -1px; margin-top: 1px; }
      .pname { font-size: ${barcodePrintSettings.fontSizePname}pt; font-weight: 700; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; line-height: 1; margin-bottom: 0px; }
      .bc { width: 100%; display: flex; align-items: center; justify-content: center; }
      .bc img { max-width: 100%; height: auto; display: block; }
      .price { font-size: ${barcodePrintSettings.fontSizePrice}pt; font-weight: 900; text-align: center; width: 100%; line-height: 1; margin-top: -2px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="sname">${shopName || 'محل موبايلات تجريبي'}</div>
      <div class="pname">${displayName}</div>
      <div class="bc"><img src="${barcodeDataURL}" /></div>
      <div class="price">السعر: ${price} ج</div>
    </div>
    <script>
      var _p = false;
      window.onload = function() {
        if (_p) return; _p = true;
        setTimeout(function() { window.print(); }, 500);
      };
      window.addEventListener('afterprint', function() {
        setTimeout(function() { window.close(); }, 300);
      });
    </script>
  </body>
</html>`);
    printWindow.document.close();
  };

  const handlePrintTestMaint = () => {
    const displayName = "هاتف ايفون 13 برو";
    const cleanCustomerName = "احمد علي";
    const cleanPhone = "01000000000";
    const issueText = "تغيير شاشة أصلية";
    const trackingCode = "98765";
    const costText = "4500 ج";
    const paidText = " (مقدم: 500ج)";

    // Render barcode to Canvas then convert to PNG
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;';
    document.body.appendChild(hiddenDiv);
    const canvas = document.createElement('canvas');
    hiddenDiv.appendChild(canvas);

    let barcodeDataURL = '';
    try {
      JsBarcode(canvas, trackingCode, {
        format: 'CODE128',
        width: 1.5,
        height: 18,
        displayValue: true,
        fontSize: 13,
        fontOptions: 'bold',
        margin: 0,
        textMargin: 1,
        background: '#ffffff',
        lineColor: '#000000'
      });
      barcodeDataURL = canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Barcode test render failed:', e);
      alert('فشل رسم باركود التجربة');
      document.body.removeChild(hiddenDiv);
      return;
    }
    document.body.removeChild(hiddenDiv);

    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>استيكر صيانة تجريبي</title>
    <style>
      @page { size: 38mm 22mm; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 38mm; height: 22mm; background: #fff; color: #000; overflow: hidden; font-family: Arial, sans-serif; }
      .wrap { 
        width: 38mm; 
        height: 22mm; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        padding: ${maintPrintSettings.paddingTop}mm ${maintPrintSettings.paddingRight}mm ${maintPrintSettings.paddingBottom}mm ${maintPrintSettings.paddingLeft}mm; 
        transform: scale(${maintPrintSettings.scale / 100});
        transform-origin: top center;
        text-align: center; 
        gap: 0.5mm;
      }
      .sname { font-size: ${maintPrintSettings.fontSizeSname}pt; font-weight: 900; text-align: center; width: 100%; line-height: 1.1; border-bottom: 1px dashed #000; padding-bottom: 0.5mm; margin-bottom: 0.5mm; white-space: nowrap; overflow: hidden; }
      .dev { font-size: ${maintPrintSettings.fontSizeDev}pt; font-weight: 900; width: 100%; line-height: 1.1; white-space: nowrap; overflow: hidden; }
      .cust { font-size: ${maintPrintSettings.fontSizeCust}pt; font-weight: 700; width: 100%; line-height: 1.1; white-space: nowrap; overflow: hidden; }
      .issue { font-size: ${maintPrintSettings.fontSizeIssue}pt; font-weight: 900; width: 100%; background: #000; color: #fff; padding: 0 2px; border-radius: 2px; line-height: 1.2; white-space: nowrap; overflow: hidden; }
      .bc { width: 100%; display: flex; align-items: center; justify-content: center; flex: 1; min-height: 0; }
      .bc img { max-width: 100%; max-height: 100%; display: block; }
      .foot { font-size: ${maintPrintSettings.fontSizeFoot}pt; font-weight: 900; width: 100%; display: flex; justify-content: space-between; margin-top: auto; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="sname">${shopName || 'مدير الصيانة الذكي'}</div>
      <div class="dev">📱 ${displayName}</div>
      <div class="cust">👤 ${cleanCustomerName}${cleanPhone ? ` (${cleanPhone})` : ''}</div>
      <div class="issue">🔧 عطل: ${issueText}</div>
      <div class="bc">${barcodeDataURL ? `<img src="${barcodeDataURL}" />` : ''}</div>
      <div class="foot">
        <span>كود: ${trackingCode}</span>
        <span>حساب: ${costText}${paidText}</span>
      </div>
    </div>
    <script>
      var _p = false;
      window.onload = function() {
        if (_p) return; _p = true;
        setTimeout(function() { window.print(); }, 500);
      };
      window.addEventListener('afterprint', function() {
        setTimeout(function() { window.close(); }, 300);
      });
    </script>
  </body>
</html>`);
    printWindow.document.close();
  };

  const handleSaveBarcodeSettings = async () => {
    if (!shopId) return;
    setSaveLoading(true);
    try {
      const { data: currentShop } = await supabase.from('shops').select('settings').eq('id', shopId).single();
      const currentSettings = currentShop?.settings || {};

      const newSettings = {
        ...currentSettings,
        barcode_print_settings: barcodePrintSettings,
        maint_print_settings: maintPrintSettings
      };

      const { error } = await supabase.from('shops').update({ settings: newSettings }).eq('id', shopId);
      if (error) throw error;

      localStorage.setItem('barcode_print_settings', JSON.stringify(barcodePrintSettings));
      localStorage.setItem('maint_print_settings', JSON.stringify(maintPrintSettings));
      alert('✅ تم حفظ إعدادات الطباعة (الباركود والصيانة) بنجاح سحابياً!');
    } catch (e: any) {
      console.error('Failed to save settings:', e);
      alert('❌ فشل حفظ الإعدادات: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const isOwnerOrManager = userRole === 'OWNER' || userRole === 'MANAGER';

  useEffect(() => {
    if (!shopId) return;
    fetchTeam();
    const interval = setInterval(fetchTeam, 30000);
    const channel = supabase.channel(`team_${shopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `tenant_id=eq.${shopId}` }, fetchTeam)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_invites', filter: `shop_id=eq.${shopId}` }, fetchTeam)
      .subscribe();

    // تحميل وضع الألوان المحفوظ
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  const fetchTeam = async () => {
    if (!shopId) return;
    const { data: members } = await supabase.from('profiles').select('id, full_name, role, device_id, device_name, last_ip, last_seen, device_wait_until').eq('tenant_id', shopId);
    if (members) setTeamMembers(members);
    const { data: invites } = await supabase.from('shop_invites').select('*').eq('shop_id', shopId).eq('accepted', false);
    if (invites) setPendingInvites(invites);
    const { data: shop } = await supabase.from('shops').select('name, max_cashiers, settings').eq('id', shopId).single();
    if (shop) {
      setShopName(shop.name);
      setMaxCashiers(shop.max_cashiers || 5);
      
      const cloudSettings = shop.settings?.barcode_print_settings;
      if (cloudSettings) {
        setBarcodePrintSettings(cloudSettings);
        localStorage.setItem('barcode_print_settings', JSON.stringify(cloudSettings));
      }
      
      const cloudMaintSettings = shop.settings?.maint_print_settings;
      if (cloudMaintSettings) {
        setMaintPrintSettings(cloudMaintSettings);
        localStorage.setItem('maint_print_settings', JSON.stringify(cloudMaintSettings));
      }
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !shopId) return;
    if (shopPlan !== 'PRO') {
      alert('⚠️ عذراً، إضافة الموظفين ميزة متاحة فقط في باقة PRO.\nيرجى الترقية لإضافة كاشير أو مدير للمحل.');
      return;
    }
    if ((teamMembers.length + pendingInvites.length) >= maxCashiers) {
      alert(`⚠️ عذراً، لقد وصلت للحد الأقصى للموظفين (${maxCashiers}).\nيرجى التواصل مع الإدارة لزيادة الحد.`);
      return;
    }
    setInviteLoading(true);
    const { error } = await supabase.from('shop_invites').insert([{
      shop_id: shopId,
      invited_email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      accepted: false
    }]);
    if (!error) {
      setInviteEmail('');
      fetchTeam();
      alert(`✅ تمت الدعوة لـ ${inviteEmail}`);
    } else {
      alert('خطأ: ' + error.message);
    }
    setInviteLoading(false);
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`هل تريد إزالة "${name}" من المحل؟`)) return;
    await supabase.from('profiles').update({ tenant_id: null }).eq('id', userId);
    fetchTeam();
  };

  const handleResetMemberDevice = async (userId: string, name: string) => {
    if (!confirm(`هل تريد تصفير قفل الجهاز لـ "${name}"؟ سيتمكن من الدخول من أي جهاز جديد فوراً.`)) return;
    await supabase.from('profiles').update({ 
      device_id: null, 
      device_wait_until: null,
      last_seen: null 
    }).eq('id', userId);
    fetchTeam();
  };

  const handleCancelInvite = async (inviteId: string) => {
    await supabase.from('shop_invites').delete().eq('id', inviteId);
    fetchTeam();
  };

  const updateSetting = (operator: string, updates: Partial<TransferSetting>) => {
    setSettings(prev => prev.map(s => s.operator === operator ? { ...s, ...updates } : s));
  };

  const toggleDarkMode = (isDark: boolean) => {
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleExportData = async () => {
    if (!shopId) return alert('❌ خطأ: لم يتم التعرف على معرف المحل');
    setIsBackingUp(true);
    try {
      const [products, transactions, maintenance, expenses, debts] = await Promise.all([
        supabase.from('products').select('*').eq('tenant_id', shopId),
        supabase.from('transactions').select('*').eq('tenant_id', shopId),
        supabase.from('maintenance_jobs').select('*').eq('tenant_id', shopId),
        supabase.from('expenses').select('*').eq('tenant_id', shopId),
        supabase.from('debts').select('*').eq('tenant_id', shopId),
      ]);

      const hasData = (products.data?.length || 0) + (transactions.data?.length || 0) + (maintenance.data?.length || 0);
      
      if (hasData === 0) {
        if (!confirm('⚠️ تنبيه: لا توجد بيانات مسجلة حالياً لتصديرها. هل تريد تحميل ملف فارغ؟')) {
          setIsBackingUp(false);
          return;
        }
      }

      const backupData = { 
        exportDate: new Date().toISOString(), 
        shopId, 
        data: { 
          products: products.data || [], 
          transactions: transactions.data || [], 
          maintenance: maintenance.data || [], 
          expenses: expenses.data || [], 
          debts: debts.data || [] 
        } 
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${new Date().toLocaleDateString('en-CA')}.json`;
      link.click();
      alert('✅ تم تصدير ' + hasData + ' سجل بنجاح');
    } catch (err) { 
      alert('❌ خطأ في النسخ الاحتياطي'); 
    } finally { 
      setIsBackingUp(false); 
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm('⚠️ تحذير: سيتم دمج البيانات من الملف مع البيانات الحالية. هل تريد الاستمرار؟')) return;
    
    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        const { data } = backup;
        
        if (!data) throw new Error('الملف لا يحتوي على بيانات صحيحة');

        const clean = (arr: any[]) => {
          if (!arr || !Array.isArray(arr)) return [];
          return arr.map(({ id, created_at, ...rest }) => ({ 
            ...rest, 
            tenant_id: shopId 
          }));
        };

        const results = await Promise.all([
          data.products?.length > 0 ? supabase.from('products').insert(clean(data.products)) : Promise.resolve({ error: null }),
          data.transactions?.length > 0 ? supabase.from('transactions').insert(clean(data.transactions)) : Promise.resolve({ error: null }),
          data.maintenance?.length > 0 ? supabase.from('maintenance_jobs').insert(clean(data.maintenance)) : Promise.resolve({ error: null }),
          data.expenses?.length > 0 ? supabase.from('expenses').insert(clean(data.expenses)) : Promise.resolve({ error: null }),
          data.debts?.length > 0 ? supabase.from('debts').insert(clean(data.debts)) : Promise.resolve({ error: null }),
        ]);

        const errors = results.filter(r => r.error).map(r => r.error?.message);
        
        if (errors.length > 0) {
          console.error('Import Errors:', errors);
          alert('❌ حدثت بعض الأخطاء أثناء الاستعادة:\n' + errors.join('\n'));
        } else {
          alert('✅ تم استعادة البيانات بنجاح!\nالمخزن: ' + (data.products?.length || 0) + '\nالمعاملات: ' + (data.transactions?.length || 0) + '\nالصيانة: ' + (data.maintenance?.length || 0));
          window.location.reload();
        }
      } catch (err: any) { 
        alert('❌ خطأ في قراءة الملف: ' + err.message); 
      } finally { 
        setIsRestoring(false); 
      }
    };
    reader.readAsText(file);
  };

  const currentOp = settings.find(s => s.operator === activeOp);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 font-['Cairo'] pb-20">
      
      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm w-fit max-w-full mx-auto overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('staff')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap transition-all ${activeTab === 'staff' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Users size={18} /> المستخدمين</button>
        <button onClick={() => setActiveTab('financial')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap transition-all ${activeTab === 'financial' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Save size={18} /> عمولات الشركات</button>
        <button onClick={() => setActiveTab('data')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap transition-all ${activeTab === 'data' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Database size={18} /> النسخ الاحتياطي</button>
        <button onClick={() => setActiveTab('appearance')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap transition-all ${activeTab === 'appearance' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><RefreshCw size={18} /> المظهر والشكل</button>
      </div>

      {/* Subscription Card - Always Visible */}
      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-800">
        <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Crown size={24} className="text-amber-400" />حالة الاشتراك</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-2xl p-5 flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">الخطة</span>
            <span className={`font-black ${shopPlan === 'PRO' ? 'text-amber-400' : 'text-blue-400'}`}>{shopPlan === 'PRO' ? '⭐ باقة PRO' : '🔵 الباقة الأساسية'}</span>
          </div>
          <div className="bg-slate-800 rounded-2xl p-5 flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">الحالة</span>
            <span className={`font-black ${shopStatus === 'active' ? 'text-green-400' : 'text-red-400'}`}>{shopStatus === 'active' ? 'نشط' : 'منتهي'}</span>
          </div>
          <div className="bg-slate-800 rounded-2xl p-5 flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">الأيام المتبقية</span>
            <span className="font-black text-white">{trialDaysLeft ?? '...'} يوم</span>
          </div>
        </div>
      </div>

      {/* Staff Tab */}
      {activeTab === 'staff' && isOwnerOrManager && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 animate-in slide-in-from-bottom duration-500">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 font-black">الأعضاء الحاليون ({teamMembers.length}/{maxCashiers})</p>
              {teamMembers.length >= maxCashiers && (
                <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-lg animate-pulse">تم الوصول للحد الأقصى</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teamMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs">{m.role === 'OWNER' ? '👑' : '💼'}</div>
                    <div>
                      <p className="font-black text-sm text-slate-900 dark:text-white">{m.full_name || 'موظف'}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{m.role === 'OWNER' ? 'صاحب المحل' : 'كاشير'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role !== 'OWNER' && (
                      <>
                        <button 
                          onClick={() => handleResetMemberDevice(m.id, m.full_name)} 
                          className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all"
                          title="تصفير قفل الجهاز"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button 
                          onClick={() => handleRemoveMember(m.id, m.full_name)} 
                          className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          title="إزالة الموظف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* عرض الدعوات المعلقة */}
            {pendingInvites.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-amber-500 font-black flex items-center gap-2">الدعوات المرسلة وفي انتظار التسجيل ({pendingInvites.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingInvites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center animate-pulse">✉️</div>
                        <div>
                          <p className="font-black text-sm text-slate-900 dark:text-white" dir="ltr">{invite.invited_email}</p>
                          <p className="text-[10px] text-amber-600 font-bold">{invite.role === 'MANAGER' ? 'مدير فرع' : 'كاشير موظف'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCancelInvite(invite.id)} 
                        className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        title="إلغاء الدعوة"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={`pt-6 border-t border-slate-100 dark:border-slate-800 ${shopPlan !== 'PRO' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
             <p className="text-xs text-slate-400 font-black mb-4 flex items-center gap-2"><UserPlus size={14} /> إضافة عضو جديد</p>
             <form onSubmit={handleSendInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3">
               <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="البريد الإلكتروني" className="md:col-span-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" dir="ltr" required />
               <button type="submit" disabled={inviteLoading} className="bg-blue-600 text-white rounded-xl font-black py-3 flex items-center justify-center gap-2 hover:bg-blue-500 transition-all">{inviteLoading ? <Loader2 className="animate-spin" /> : <Send size={18} />} إرسال دعوة</button>
             </form>
          </div>
        </div>
      )}

      {/* Data Backup Tab */}
      {activeTab === 'data' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8 animate-in slide-in-from-bottom duration-500">
           <div className="flex flex-col gap-1 text-right">
              <h3 className="text-xl font-black flex items-center gap-3 justify-end"><Database className="text-blue-500" size={24} /> إدارة البيانات والنسخ الاحتياطي</h3>
              <p className="text-xs text-slate-400 font-bold">حافظ على بياناتك في أمان ونزل نسخة احتياطية على جهازك</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export */}
              <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2rem] border border-blue-100 dark:border-blue-800 space-y-4 text-center">
                 <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
                    <Download size={32} />
                 </div>
                 <div className="space-y-2">
                    <h4 className="font-black text-lg text-slate-800 dark:text-white">تصدير نسخة احتياطية</h4>
                    <p className="text-xs text-slate-500 font-bold">هينزل لك ملف JSON فيه كل بيانات المحل (منتجات، صيانة، حسابات..)</p>
                 </div>
                 <button 
                   onClick={handleExportData}
                   disabled={isBackingUp}
                   className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   {isBackingUp ? <Loader2 className="animate-spin" /> : <Download size={20} />}
                   بدء النسخ الاحتياطي الآن
                 </button>
              </div>

              {/* Import */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-4 text-center">
                 <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                    <RefreshCw size={32} />
                 </div>
                 <div className="space-y-2">
                    <h4 className="font-black text-lg text-slate-800 dark:text-white">استعادة من نسخة قديمة</h4>
                    <p className="text-xs text-slate-500 font-bold">ارفع ملف النسخة الاحتياطية عشان ترجع بياناتك القديمة</p>
                 </div>
                 <label className={`w-full bg-slate-900 dark:bg-slate-700 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-slate-800 cursor-pointer transition-all flex items-center justify-center gap-2 ${isRestoring ? 'opacity-50 pointer-events-none' : ''}`}>
                   {isRestoring ? <Loader2 className="animate-spin" /> : <RefreshCw size={20} />}
                   رفع واستعادة البيانات
                   <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                 </label>
              </div>
           </div>

           <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-800">
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold text-center">
                 ⚠️ تنبيه: البيانات محفوظة تلقائياً في السحاب (Cloud)، النسخة الاحتياطية دي غرضها الأمان الإضافي فقط.
              </p>
           </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom duration-500">
           <h3 className="text-xl font-black mb-8 flex items-center gap-3">
             <RefreshCw size={24} className="text-blue-500" />
             مظهر النظام المفضل
           </h3>
           <div className="grid grid-cols-2 gap-6">
              <button 
                onClick={() => toggleDarkMode(false)} 
                className={`p-10 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${!darkMode ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 dark:border-slate-800 dark:bg-slate-800/50'}`}
              >
                <div className="text-4xl">☀️</div>
                <p className="font-black text-slate-900 dark:text-white text-lg">نهاري</p>
              </button>
              <button 
                onClick={() => toggleDarkMode(true)} 
                className={`p-10 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${darkMode ? 'border-blue-500 bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 dark:bg-slate-800/50'}`}
              >
                <div className="text-4xl">🌙</div>
                <p className="font-black text-slate-900 dark:text-white text-lg">ليلي</p>
              </button>
           </div>
           <p className="text-center text-[10px] text-slate-400 font-bold mt-8">
             * سيتم حفظ المظهر المفضل لهذا المتصفح تلقائياً
           </p>
        </div>
      )}

      {/* Settings for Barcode Printing */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 mt-6 animate-in slide-in-from-bottom duration-500">
           <div className="flex flex-col gap-1 text-right mb-6">
              <h3 className="text-xl font-black flex items-center gap-3 justify-end">
                <Printer className="text-blue-500" size={24} />
                إعدادات معايرة طباعة الباركود (لهذا الجهاز)
              </h3>
              <p className="text-xs text-slate-400 font-bold">تعديل هذه المقاسات إذا كانت الطباعة تخرج عن حدود الملصق الحراري (38mm x 22mm) على هذا الكمبيوتر.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right" dir="rtl">
              {/* Padding Margins */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                 <h4 className="font-black text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                    <Sliders size={16} className="text-blue-500" />
                    هوامش الملصق (مم)
                 </h4>
                 
                 <div className="space-y-3">
                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>الهامش العلوي (Top)</span>
                          <span className="text-blue-600 dark:text-blue-400">{barcodePrintSettings.paddingTop} مم</span>
                       </div>
                       <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5" 
                          value={barcodePrintSettings.paddingTop} 
                          onChange={e => updateBarcodeSetting('paddingTop', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>الهامش السفلي (Bottom)</span>
                          <span className="text-blue-600 dark:text-blue-400">{barcodePrintSettings.paddingBottom} مم</span>
                       </div>
                       <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5" 
                          value={barcodePrintSettings.paddingBottom} 
                          onChange={e => updateBarcodeSetting('paddingBottom', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>الهامش الأيسر (Left)</span>
                          <span className="text-blue-600 dark:text-blue-400">{barcodePrintSettings.paddingLeft} مم</span>
                       </div>
                       <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5" 
                          value={barcodePrintSettings.paddingLeft} 
                          onChange={e => updateBarcodeSetting('paddingLeft', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>الهامش الأيمن (Right)</span>
                          <span className="text-blue-600 dark:text-blue-400">{barcodePrintSettings.paddingRight} مم</span>
                       </div>
                       <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5" 
                          value={barcodePrintSettings.paddingRight} 
                          onChange={e => updateBarcodeSetting('paddingRight', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>
                 </div>
              </div>

              {/* Sizes and Zoom */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                 <h4 className="font-black text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                    <Sliders size={16} className="text-blue-500" />
                    حجم الملصق والخطوط (pt / %)
                 </h4>
                 
                 <div className="space-y-3">
                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>نسبة تكبير/تصغير الملصق (Scale)</span>
                          <span className="text-blue-600 dark:text-blue-400">{barcodePrintSettings.scale}%</span>
                       </div>
                       <input 
                          type="range" 
                          min="50" 
                          max="150" 
                          step="5" 
                          value={barcodePrintSettings.scale} 
                          onChange={e => updateBarcodeSetting('scale', parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>حجم خط اسم المحل (Store Name)</span>
                          <span className="text-blue-600 dark:text-blue-400">{barcodePrintSettings.fontSizeSname} pt</span>
                       </div>
                       <input 
                          type="range" 
                          min="6" 
                          max="14" 
                          step="0.5" 
                          value={barcodePrintSettings.fontSizeSname} 
                          onChange={e => updateBarcodeSetting('fontSizeSname', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>حجم خط اسم المنتج (Product Name)</span>
                          <span className="text-blue-600 dark:text-blue-400">{barcodePrintSettings.fontSizePname} pt</span>
                       </div>
                       <input 
                          type="range" 
                          min="5" 
                          max="12" 
                          step="0.5" 
                          value={barcodePrintSettings.fontSizePname} 
                          onChange={e => updateBarcodeSetting('fontSizePname', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>حجم خط السعر (Price)</span>
                          <span className="text-blue-600 dark:text-blue-400">{barcodePrintSettings.fontSizePrice} pt</span>
                       </div>
                       <input 
                          type="range" 
                          min="6" 
                          max="14" 
                          step="0.5" 
                          value={barcodePrintSettings.fontSizePrice} 
                          onChange={e => updateBarcodeSetting('fontSizePrice', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                     <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                           <span>عرض خطوط الباركود (Thick/Thin lines)</span>
                           <span className="text-blue-600 dark:text-blue-400">{(barcodePrintSettings.barcodeWidth || 2).toFixed(1)}</span>
                        </div>
                        <input 
                           type="range" 
                           min="1" 
                           max="3" 
                           step="0.5" 
                           value={barcodePrintSettings.barcodeWidth || 2} 
                           onChange={e => updateBarcodeSetting('barcodeWidth', parseFloat(e.target.value))}
                           className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                     </div>

                     <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                           <span>ارتفاع الباركود نفسه (Barcode Height)</span>
                           <span className="text-blue-600 dark:text-blue-400">{barcodePrintSettings.barcodeHeight || 25} px</span>
                        </div>
                        <input 
                           type="range" 
                           min="10" 
                           max="50" 
                           step="2" 
                           value={barcodePrintSettings.barcodeHeight || 25} 
                           onChange={e => updateBarcodeSetting('barcodeHeight', parseInt(e.target.value))}
                           className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                     </div>

                     <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                           <span>عرض خطوط الباركود (Thick/Thin lines)</span>
                           <span className="text-blue-600 dark:text-blue-400">{(maintPrintSettings.barcodeWidth || 1.5).toFixed(1)}</span>
                        </div>
                        <input 
                           type="range" 
                           min="1" 
                           max="3" 
                           step="0.5" 
                           value={maintPrintSettings.barcodeWidth || 1.5} 
                           onChange={e => updateMaintSetting('barcodeWidth', parseFloat(e.target.value))}
                           className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                     </div>

                     <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                           <span>ارتفاع الباركود نفسه (Barcode Height)</span>
                           <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.barcodeHeight || 18} px</span>
                        </div>
                        <input 
                           type="range" 
                           min="10" 
                           max="50" 
                           step="2" 
                           value={maintPrintSettings.barcodeHeight || 18} 
                           onChange={e => updateMaintSetting('barcodeHeight', parseInt(e.target.value))}
                           className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex justify-center gap-4 mt-6">
               <button 
                 onClick={handleSaveBarcodeSettings}
                 disabled={saveLoading}
                 className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
               >
                 {saveLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                 حفظ المقاسات في الحساب (سحابياً)
               </button>
               <button 
                 onClick={handlePrintTestBarcode}
                 className="bg-blue-600 hover:bg-blue-500 text-white font-black text-sm px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
               >
                 <Printer size={16} />
                 طباعة ملصق تجريبي
               </button>
               <button 
                 onClick={resetBarcodeSettings}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-sm px-6 py-3 rounded-2xl transition-all"
              >
                إعادة تعيين الافتراضي
              </button>
           </div>
        </div>
      )}

      {/* Settings for Maintenance Printing */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 mt-6 animate-in slide-in-from-bottom duration-500">
           <div className="flex flex-col gap-1 text-right mb-6">
              <h3 className="text-xl font-black flex items-center gap-3 justify-end">
                <Printer className="text-blue-500" size={24} />
                إعدادات معايرة طباعة ملصق الصيانة (لهذا الجهاز)
              </h3>
              <p className="text-xs text-slate-400 font-bold">تعديل هذه المقاسات إذا كانت طباعة استيكر الصيانة تخرج عن حدود الملصق الحراري (38mm x 22mm) على هذا الكمبيوتر.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right" dir="rtl">
              {/* Padding Margins */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                 <h4 className="font-black text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                    <Sliders size={16} className="text-blue-500" />
                    هوامش الملصق (مم)
                 </h4>
                 
                 <div className="space-y-3">
                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>الهامش العلوي (Top)</span>
                          <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.paddingTop} مم</span>
                       </div>
                       <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5" 
                          value={maintPrintSettings.paddingTop} 
                          onChange={e => updateMaintSetting('paddingTop', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>الهامش السفلي (Bottom)</span>
                          <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.paddingBottom} مم</span>
                       </div>
                       <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5" 
                          value={maintPrintSettings.paddingBottom} 
                          onChange={e => updateMaintSetting('paddingBottom', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>الهامش الأيسر (Left)</span>
                          <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.paddingLeft} مم</span>
                       </div>
                       <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5" 
                          value={maintPrintSettings.paddingLeft} 
                          onChange={e => updateMaintSetting('paddingLeft', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>الهامش الأيمن (Right)</span>
                          <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.paddingRight} مم</span>
                       </div>
                       <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.5" 
                          value={maintPrintSettings.paddingRight} 
                          onChange={e => updateMaintSetting('paddingRight', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>
                 </div>
              </div>

              {/* Sizes and Zoom */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                 <h4 className="font-black text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                    <Sliders size={16} className="text-blue-500" />
                    حجم الملصق والخطوط (pt / %)
                 </h4>
                 
                 <div className="space-y-3">
                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>نسبة تكبير/تصغير الملصق (Scale)</span>
                          <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.scale}%</span>
                       </div>
                       <input 
                          type="range" 
                          min="50" 
                          max="150" 
                          step="5" 
                          value={maintPrintSettings.scale} 
                          onChange={e => updateMaintSetting('scale', parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>خط اسم المحل (Store Name)</span>
                          <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.fontSizeSname} pt</span>
                       </div>
                       <input 
                          type="range" 
                          min="6" 
                          max="14" 
                          step="0.5" 
                          value={maintPrintSettings.fontSizeSname} 
                          onChange={e => updateMaintSetting('fontSizeSname', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>خط موديل الهاتف (Phone Model)</span>
                          <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.fontSizeDev} pt</span>
                       </div>
                       <input 
                          type="range" 
                          min="5" 
                          max="12" 
                          step="0.5" 
                          value={maintPrintSettings.fontSizeDev} 
                          onChange={e => updateMaintSetting('fontSizeDev', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>خط اسم العميل والبيانات (Client Info)</span>
                          <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.fontSizeCust} pt</span>
                       </div>
                       <input 
                          type="range" 
                          min="5" 
                          max="12" 
                          step="0.5" 
                          value={maintPrintSettings.fontSizeCust} 
                          onChange={e => updateMaintSetting('fontSizeCust', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>خط وصف العطل (Issue Text)</span>
                          <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.fontSizeIssue} pt</span>
                       </div>
                       <input 
                          type="range" 
                          min="5" 
                          max="12" 
                          step="0.5" 
                          value={maintPrintSettings.fontSizeIssue} 
                          onChange={e => updateMaintSetting('fontSizeIssue', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>

                    <div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>خط كود التتبع والحساب (Foot Text)</span>
                          <span className="text-blue-600 dark:text-blue-400">{maintPrintSettings.fontSizeFoot} pt</span>
                       </div>
                       <input 
                          type="range" 
                          min="5" 
                          max="12" 
                          step="0.5" 
                          value={maintPrintSettings.fontSizeFoot} 
                          onChange={e => updateMaintSetting('fontSizeFoot', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex justify-center gap-4 mt-6">
              <button 
                onClick={handleSaveBarcodeSettings}
                disabled={saveLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {saveLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                حفظ المقاسات في الحساب (سحابياً)
              </button>
              <button 
                onClick={handlePrintTestMaint}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-sm px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Printer size={16} />
                طباعة ملصق صيانة تجريبي
              </button>
              <button 
                onClick={resetMaintSettings}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-sm px-6 py-3 rounded-2xl transition-all"
              >
                إعادة تعيين الافتراضي
              </button>
           </div>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && isOwnerOrManager && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8 animate-in slide-in-from-bottom duration-500">
          <div className="flex flex-col gap-1">
             <h3 className="text-xl font-black flex items-center gap-3"><Wallet className="text-blue-500" size={24} /> إعدادات عمولة الشركات</h3>
             <p className="text-xs text-slate-400 font-bold">تحكم في نسبة الربح وعمولات التحويل لكل شركة</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {settings.map(s => (
              <button
                key={s.operator}
                onClick={() => setActiveOp(s.operator)}
                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all border whitespace-nowrap ${activeOp === s.operator ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
              >
                {s.operator}
              </button>
            ))}
          </div>

          {currentOp && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
               {/* Shop Commission */}
               <div className="space-y-4">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">ربح المحل (العمولة)</h4>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-[10px] text-slate-400 font-bold mb-1 block">ربحك لكل 1000ج تحويل</span>
                      <input 
                        type="number" 
                        value={currentOp.sendRate} 
                        onChange={e => updateSetting(currentOp.operator, { sendRate: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-slate-400 font-bold mb-1 block">عمولة الاستلام (لكل عملية)</span>
                      <input 
                        type="number" 
                        value={currentOp.receiveRate} 
                        onChange={e => updateSetting(currentOp.operator, { receiveRate: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold"
                      />
                    </label>
                  </div>
               </div>

               {/* Company Fees */}
               <div className="space-y-4">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">مصاريف الشركة (تخصم من العميل)</h4>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-[10px] text-slate-400 font-bold mb-1 block">نسبة مصاريف الشركة لكل 1000ج</span>
                      <input 
                        type="number" 
                        value={currentOp.companyFeeRate} 
                        onChange={e => updateSetting(currentOp.operator, { companyFeeRate: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-slate-400 font-bold mb-1 block">أقصى مبلغ لمصاريف الشركة</span>
                      <input 
                        type="number" 
                        value={currentOp.companyFeeMax} 
                        onChange={e => updateSetting(currentOp.operator, { companyFeeMax: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold"
                      />
                    </label>
                  </div>
               </div>

               {/* Tiered Fees */}
               <div className="md:col-span-2 space-y-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">نظام الشرائح الموحد (المبالغ الصغيرة)</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={currentOp.isSendTiered} 
                        onChange={e => updateSetting(currentOp.operator, { isSendTiered: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {currentOp.isSendTiered && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                      <label className="block">
                        <span className="text-[10px] text-slate-400 font-bold mb-1 block">المبلغ الموحد (أقل من العتبة)</span>
                        <input 
                          type="number" 
                          value={currentOp.fixedFeeLow} 
                          onChange={e => updateSetting(currentOp.operator, { fixedFeeLow: Number(e.target.value) })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-slate-400 font-bold mb-1 block">المبلغ الموحد (أكبر من العتبة)</span>
                        <input 
                          type="number" 
                          value={currentOp.fixedFeeHigh} 
                          onChange={e => updateSetting(currentOp.operator, { fixedFeeHigh: Number(e.target.value) })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-slate-400 font-bold mb-1 block">عتبة التغيير (مثلاً 3000ج)</span>
                        <input 
                          type="number" 
                          value={currentOp.feeThreshold} 
                          onChange={e => updateSetting(currentOp.operator, { feeThreshold: Number(e.target.value) })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold"
                        />
                      </label>
                    </div>
                  )}
               </div>
            </div>
          )}
          
          <div className="flex justify-end pt-4">
             <button 
              onClick={async () => {
                localStorage.setItem('transferSettings', JSON.stringify(settings));
                
                if (shopId) {
                  try {
                    const { data: currentShop } = await supabase.from('shops').select('settings').eq('id', shopId).single();
                    const currentSettings = currentShop?.settings || {};
                    
                    const { error } = await supabase
                      .from('shops')
                      .update({ 
                        settings: { 
                          ...currentSettings,
                          transferSettings: settings 
                        } 
                      })
                      .eq('id', shopId);
                    
                    if (error) throw error;
                    alert('✅ تم حفظ العمولات وتزامنها مع السحابة بنجاح!');
                  } catch (err) {
                    console.error('Sync error:', err);
                    alert('✅ تم الحفظ محلياً فقط! (مشكلة في المزامنة مع السحابة)');
                  }
                } else {
                  alert('✅ تم حفظ العمولات محلياً!');
                }
              }}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-500 shadow-lg shadow-blue-600/20 flex items-center gap-2"
             >
               <Save size={18} /> حفظ التغييرات النهائية
             </button>
          </div>
        </div>
      )}

      <div className="pt-10 flex flex-col items-center gap-4">
        <a href="https://wa.me/201152628515?text=أريد%20تطوير%20الباقة" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-500 font-black hover:scale-105 transition-all">
          <MessageCircle size={24} /> تواصل مع الإدارة لتغيير الخطة: 01152628515
        </a>
        <p className="text-[10px] text-slate-400 font-bold">Smart Mobile POS - v2.5.0</p>
      </div>
    </div>
  );
};

export default SettingsView;
