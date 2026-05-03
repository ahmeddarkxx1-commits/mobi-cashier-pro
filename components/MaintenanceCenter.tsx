
import React, { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  Receipt, 
  CheckCircle, 
  Smartphone, 
  User, 
  Plus, 
  ClipboardCheck,
  Wrench,
  Package,
  History,
  Save,
  Info,
  Layers,
  AlertTriangle,
  Stethoscope,
  ShoppingBag,
  Bell,
  Sparkles,
  CreditCard,
  X,
  CheckCircle2,
  Search,
  AlertCircle
} from 'lucide-react';
import { MaintenanceJob, Transaction, Product, UserRole } from '../types';
import { supabase } from '../supabaseClient';
import { createMaintenanceJob, updateMaintenanceJob, createDebt, updateProductStock } from '../supabaseHelpers';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface MaintenanceCenterProps {
  jobs: MaintenanceJob[];
  setJobs: React.Dispatch<React.SetStateAction<MaintenanceJob[]>>;
  addTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  userRole: UserRole;
  shopId: string | null;
}

const MaintenanceCenter: React.FC<MaintenanceCenterProps> = ({ 
  jobs, 
  setJobs, 
  addTransaction, 
  products, 
  setProducts,
  userRole,
  shopId
}) => {
  const [activeTab, setActiveTab] = useState<'workshop' | 'pos' | 'parts' | 'parts_sale'>('workshop');
  const [showAddJob, setShowAddJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSellingPart, setIsSellingPart] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [partsSalePrice, setPartsSalePrice] = useState<number>(0);
  const [checkoutPayments, setCheckoutPayments] = useState<Record<string, string>>({});
  const [selectedParts, setSelectedParts] = useState<Record<string, string>>({});
  const [isWholesale, setIsWholesale] = useState(false);
  const [partsSearchTerm, setPartsSearchTerm] = useState('');
  const [workshopPartsSearch, setWorkshopPartsSearch] = useState('');

  const partCategories = useMemo(() => {
    const saved = localStorage.getItem(`shop_part_categories_${shopId}`);
    return saved ? JSON.parse(saved) : ['part', 'شاشات', 'فلاتات', 'بطاريات'];
  }, [shopId]);

  const isPart = (cat: string) => {
    const categoryName = (cat || '').toLowerCase();
    const partKeywords = ['part', 'شاش', 'فلات', 'بطار', 'باغ', 'سوكت', 'كاميرا صيانة', 'ورشه', 'ورشة'];
    return partCategories.includes(cat) || partKeywords.some(k => categoryName.includes(k));
  };

  const [jobForm, setJobForm] = useState({ customerName: '', customerPhone: '', phoneModel: '', issue: '', cost: 0, paidAmount: 0 });

  const handleAddPartToJob = async (jobId: string, part: Product) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    if (part.stock <= 0) {
      toast.error('لا يوجد رصيد من هذه القطعة في المخزن!');
      return;
    }
    
    const price = isWholesale ? (part.wholesale_price || part.price) : part.price;
    const newPartsUsed = job.partsUsed ? `${job.partsUsed}, ${part.name}` : part.name;
    try {
      await updateMaintenanceJob(jobId, { 
        partsUsed: newPartsUsed,
        cost: (job.cost || 0) + price
      });
      await updateProductStock(part.id, part.stock - 1);
      
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, partsUsed: newPartsUsed, cost: (j.cost || 0) + price } : j));
      setProducts(prev => prev.map(p => p.id === part.id ? { ...p, stock: p.stock - 1 } : p));
      
      toast.success(`تم سحب ${part.name} من المخزن وإضافتها للتقرير بتكلفة ${price} ج`);
    } catch (err) {
      console.error(err);
    }
  };

  const maintenanceParts = useMemo(() => (products || []).filter(p => p && p.category && isPart(p.category)), [products, partCategories]);
  const pendingCount = useMemo(() => (jobs || []).filter(j => j && j.status === 'pending').length, [jobs]);
  const readyToDeliverCount = useMemo(() => (jobs || []).filter(j => j && j.status === 'completed').length, [jobs]);
  
  const readyToDeliver = useMemo(() => (jobs || []).filter(j => j && j.status === 'completed'), [jobs]);
  const activeJobs = useMemo(() => (jobs || []).filter(j => j && j.status !== 'delivered'), [jobs]);

  const filteredPartsForSale = useMemo(() => {
    if (!partsSearchTerm.trim()) return [];
    return (products || []).filter(p => 
      p && (isPart(p.category) || p.category === 'accessory' || p.category === 'phone') &&
      (
        (p.name || '').toLowerCase().includes(partsSearchTerm.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(partsSearchTerm.toLowerCase())
      )
    );
  }, [products, partsSearchTerm, partCategories]);

  const addNotification = (message: string, type: Notification['type'] = 'info') => {
    if (type === 'success') toast.success(message);
    else if (type === 'warning') toast.error(message);
    else toast(message);
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setIsSaving(true);

    try {
      const jobData: Omit<MaintenanceJob, 'id'> = {
        ...jobForm,
        notes: '',
        partsUsed: '',
        missingParts: '',
        status: 'pending',
        date: new Date().toISOString(),
        cost: Number(jobForm.cost),
        paidAmount: Number(jobForm.paidAmount),
        shop_id: shopId
      };

      const { data: newJob, error } = await createMaintenanceJob(jobData, shopId);
      if (newJob) {
        if (jobData.paidAmount > 0) {
          addTransaction({
            type: 'maintenance',
            medium: 'cash',
            amount: jobData.paidAmount,
            profit: jobData.paidAmount,
            cost: 0,
            description: `مقدم صيانة: ${jobData.phoneModel} (${jobData.customerName})`,
            category: 'maintenance'
          });
        }
        setJobs([newJob, ...jobs]);
        setShowAddJob(false);
        setJobForm({ customerName: '', customerPhone: '', phoneModel: '', issue: '', cost: 0, paidAmount: 0 });
        addNotification(`جهاز جديد وصل الورشة: ${newJob.phoneModel}`, 'info');
        if (userRole === 'OWNER' || userRole === 'MANAGER') setActiveTab('workshop');
      } else if (error) {
        toast.error('فشل حفظ بيانات الجهاز في السحابة!');
      }
    } catch (err) {
      console.error(err);
      toast.error('فشل تسجيل الجهاز.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDirectPartSale = async () => {
    const part = products.find(p => p.id === selectedPartId);
    if (!part || partsSalePrice <= 0) {
      toast.error('أكمل بيانات البيع يا عالمي!');
      return;
    }
    if (part.stock <= 0) {
      toast.error('القطعة دي خلصانة من المخزن!');
      return;
    }

    setIsSellingPart(true);
    try {
      if (!shopId) throw new Error('Shop ID is missing');

      // 1. Update Stock
      await updateProductStock(part.id, part.stock - 1);
      
      // 2. Record Transaction using prop
      addTransaction({
        type: 'maintenance',
        medium: 'cash',
        amount: partsSalePrice,
        cost: part.cost,
        profit: partsSalePrice - part.cost,
        description: `بيع قطعة غيار مباشر: ${part.name}`,
        category: 'maintenance'
      });

      // 3. Update UI
      setProducts(prev => prev.map(p => p.id === part.id ? { ...p, stock: p.stock - 1 } : p));
      setSelectedPartId('');
      setPartsSalePrice(0);
      toast.success(`تم بيع ${part.name} بنجاح!`);
    } catch (err) {
      console.error(err);
      toast.error('فشل تسجيل عملية البيع.');
    } finally {
      setIsSellingPart(false);
    }
  };

  const updateJobStatus = async (id: string, status: MaintenanceJob['status']) => {
    if (userRole === 'CASHIER' && status !== 'delivered') return;
    
    try {
      const { success, error } = await updateMaintenanceJob(id, { status });
      if (!success) {
        toast.error('فشل تحديث حالة الجهاز في السحابة!');
        return;
      }
      const job = jobs.find(j => j.id === id);
      const oldStatus = job?.status;

      setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));

      if (status === 'completed' && oldStatus !== 'completed') {
        addNotification(`عاش يا بطل! جهاز ${job?.phoneModel} خلص وجاهز للتسليم.`, 'success');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء التحديث.');
    }
  };

  const handleCheckout = async (job: MaintenanceJob, paymentAmountStr: string) => {
    const remainingCost = job.cost - job.paidAmount;
    if (remainingCost < 0) {
      toast.error('تم سداد أكثر من التكلفة!');
      return;
    }
    
    const paymentAmount = Number(paymentAmountStr) || 0;
    
    try {
      await updateMaintenanceJob(job.id, { status: 'delivered', paidAmount: job.paidAmount + paymentAmount });
      
      if (paymentAmount > 0) {
        addTransaction({
          type: 'maintenance',
          medium: 'cash',
          amount: paymentAmount,
          profit: paymentAmount, 
          cost: 0,
          description: `باقي حساب صيانة: ${job.phoneModel} (${job.customerName})`,
          category: 'maintenance'
        });
      }

      if (paymentAmount < remainingCost) {
        const debtAmount = remainingCost - paymentAmount;
        if (shopId) {
          await createDebt({
            customerName: job.customerName,
            customerPhone: job.customerPhone,
            amount: debtAmount,
            remainingAmount: debtAmount,
            description: `باقي صيانة: ${job.phoneModel} (شكوى: ${job.issue})`,
            date: new Date().toISOString(),
            status: 'pending',
            type: 'maintenance',
            shop_id: shopId
          }, shopId);
          addNotification(`تم تسجيل مبلغ ${debtAmount} ج كدين على العميل.`, 'warning');
        }
      }

      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'delivered', paidAmount: job.paidAmount + paymentAmount } : j));
      addNotification(`تم تسليم الجهاز بنجاح!`, 'success');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء التسليم.');
    }
  };

  const updateReportField = async (id: string, field: 'notes' | 'partsUsed' | 'missingParts', value: string) => {
    if (userRole === 'CASHIER') return;
    try {
      await updateMaintenanceJob(id, { [field]: value });
      setJobs(prev => prev.map(j => j.id === id ? { ...j, [field]: value } : j));
    } catch (err) {
      console.error(err);
    }
  };

  const updateJobCost = async (id: string, newCost: number) => {
    try {
      await updateMaintenanceJob(id, { cost: newCost });
      setJobs(prev => prev.map(j => j.id === id ? { ...j, cost: newCost } : j));
    } catch (err) {
      console.error(err);
      toast.error('فشل تحديث التكلفة');
    }
  };

  return (
    <div className="space-y-6 font-['Cairo'] relative">
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 w-full sm:w-fit overflow-x-auto no-scrollbar gap-2">
        <button onClick={() => setActiveTab('workshop')} className={`relative flex items-center gap-2 px-8 py-3.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'workshop' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
          <Wrench size={16} /> استلام جهاز (ورشة)
          {userRole !== 'CASHIER' && pendingCount > 0 && <span className="absolute -top-1 -left-1 w-6 h-6 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white animate-bounce">{pendingCount}</span>}
        </button>
        <button onClick={() => setActiveTab('pos')} className={`relative flex items-center gap-2 px-8 py-3.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'pos' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
          <Receipt size={16} /> تسليم أجهزة جاهزة
          {readyToDeliverCount > 0 && <span className="absolute -top-1 -left-1 w-6 h-6 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">{readyToDeliverCount}</span>}
        </button>
        <button onClick={() => setActiveTab('parts_sale')} className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'parts_sale' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
          <ShoppingBag size={16} /> بيع قطع غيار
        </button>
        {userRole !== 'CASHIER' && (
          <button onClick={() => setActiveTab('parts')} className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'parts' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Package size={16} /> جرد القطع والنواقص
          </button>
        )}
      </div>

      {activeTab === 'workshop' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="text-right">
               <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                 أجهزة في الورشة
                 {pendingCount > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-lg flex items-center gap-1 animate-pulse"><Bell size={10}/> في {pendingCount} أجهزة مستنية</span>}
               </h3>
               <p className="text-xs font-bold text-slate-400">متابعة شغل الصيانة والتقارير</p>
             </div>
             <button onClick={() => setShowAddJob(!showAddJob)} className="w-full sm:w-auto bg-slate-900 dark:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all">
               <Plus size={18}/> {userRole === 'cashier' ? 'اضغط هنا لاستلام جهاز جديد من عميل' : 'استلم جهاز جديد'}
             </button>
          </div>

          {showAddJob && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-3 sm:p-4">
               <form onSubmit={handleAddJob} className="bg-white dark:bg-slate-900 w-full max-w-lg p-5 sm:p-8 rounded-[2.5rem] shadow-2xl space-y-5 sm:space-y-6 border border-slate-200 dark:border-slate-800 relative max-h-[95vh] overflow-y-auto no-scrollbar">
                  <button type="button" onClick={() => setShowAddJob(false)} className="absolute top-4 sm:top-6 left-4 sm:left-6 text-slate-400 hover:text-red-500 p-2"><Plus className="rotate-45" size={24}/></button>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white text-right">استلام جهاز صيانة</h4>
                  <div className="space-y-4 sm:space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 text-right">
                        <label className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mr-2">رقم الموبايل</label>
                        <input placeholder="01xxxxxxxxx" className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-900 text-right font-bold outline-none focus:border-blue-500 shadow-sm" value={jobForm.customerPhone} onChange={e => setJobForm({...jobForm, customerPhone: e.target.value})} />
                      </div>
                      <div className="space-y-2 text-right">
                        <label className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mr-2">اسم العميل</label>
                        <input required placeholder="الاسم الكامل..." className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-900 text-right font-bold outline-none focus:border-blue-500 shadow-sm" value={jobForm.customerName} onChange={e => setJobForm({...jobForm, customerName: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2 text-right">
                      <label className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mr-2">نوع الموبايل وموديله</label>
                      <input required placeholder="مثلاً: iPhone 13 Pro Max..." className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-900 text-right font-bold outline-none focus:border-blue-500 shadow-sm" value={jobForm.phoneModel} onChange={e => setJobForm({...jobForm, phoneModel: e.target.value})} />
                    </div>
                    <div className="space-y-2 text-right">
                      <label className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mr-2">وصف العطل (الشكوى)</label>
                      <input required placeholder="العميل بيشتكي من إيه؟" className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-900 text-right font-bold outline-none focus:border-blue-500 shadow-sm" value={jobForm.issue} onChange={e => setJobForm({...jobForm, issue: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 text-right">
                        <label className="text-[10px] sm:text-xs font-black text-blue-600 uppercase tracking-widest mr-2">مقدم صيانة (ج)</label>
                        <input type="number" placeholder="0" className="w-full p-4 rounded-2xl border-2 border-blue-50 dark:border-blue-900/20 bg-blue-50/20 dark:bg-blue-900/10 text-right font-black text-lg outline-none focus:border-blue-500" value={jobForm.paidAmount || ''} onChange={e => setJobForm({...jobForm, paidAmount: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2 text-right">
                        <label className="text-[10px] sm:text-xs font-black text-blue-600 uppercase tracking-widest mr-2">التكلفة المتوقعة</label>
                        <input type="number" placeholder="0" className="w-full p-4 rounded-2xl border-2 border-blue-50 dark:border-blue-900/20 bg-blue-50/20 dark:bg-blue-900/10 text-right font-black text-lg outline-none focus:border-blue-500" value={jobForm.cost || ''} onChange={e => setJobForm({...jobForm, cost: Number(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full bg-blue-600 text-white rounded-3xl font-black py-5 shadow-xl text-lg mt-4 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CheckCircle2 size={24} />
                        تسجيل واستلام الجهاز
                      </>
                    )}
                  </button>
               </form>
            </div>
          )}

          {userRole !== 'CASHIER' && (
            <div className="grid grid-cols-1 gap-4 pb-20">
             {activeJobs.map(job => {
               const isNew = job.status === 'pending';
               return (
                 <div key={job.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border transition-all p-6 space-y-6 hover:shadow-2xl ${isNew ? 'border-red-200' : 'border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3 text-right">
                         <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 ${isNew ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
                           <Smartphone size={28}/>
                         </div>
                         <div>
                            <div className="font-black text-slate-800 dark:text-white text-lg leading-tight flex items-center gap-2">
                              {job.phoneModel}
                              {isNew && <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-bounce">لسه واصل</span>}
                            </div>
                            <div className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-1"><User size={12}/> {job.customerName}</div>
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <div className="text-base font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">{job.cost} ج</div>
                         <select value={job.status} disabled={userRole === 'CASHIER'} onChange={e => updateJobStatus(job.id, e.target.value as any)} className={`text-xs p-2.5 rounded-xl border-none font-black shadow-sm outline-none transition-all appearance-none text-center min-w-[150px] ${job.status === 'pending' ? 'bg-amber-100 text-amber-700' : job.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-600 text-white shadow-lg'}`}>
                            <option value="pending">⏳ لسه مستني الشغل</option>
                            <option value="in-progress">⚙️ شغالين فيه دلوقتي</option>
                            <option value="completed">✅ خلص خلاص (جاهز)</option>
                          </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                           <div className="text-[10px] font-black text-slate-400 uppercase mb-1 text-right">شكوى العميل:</div>
                           <div className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right leading-relaxed italic">"{job.issue}"</div>
                         </div>
                      </div>
                      
                      <div className="space-y-4">
                        {editingJobId === job.id ? (
                          <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl border border-blue-100">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 justify-end">ملاحظات الصنايعي <Stethoscope size={12}/></label>
                                <textarea placeholder="لقيت إيه في الجهاز؟..." className="w-full p-4 text-xs border rounded-xl bg-white dark:bg-slate-700 font-bold text-right outline-none focus:border-blue-500" rows={2} value={job.notes || ''} onChange={(e) => updateReportField(job.id, 'notes', e.target.value)} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1 justify-end">قطع ركبتها <Layers size={12}/></label>
                                <input placeholder="شاشة، بطارية، سماعة..." className="w-full p-4 text-xs border rounded-xl bg-white dark:bg-slate-700 font-bold text-right outline-none focus:border-blue-500" value={job.partsUsed || ''} onChange={(e) => updateReportField(job.id, 'partsUsed', e.target.value)} />
                                <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50 rounded-xl w-fit cursor-pointer" onClick={() => setIsWholesale(!isWholesale)}>
                                  <input type="checkbox" checked={isWholesale} onChange={() => {}} className="w-4 h-4" />
                                  <span className="text-xs font-black text-blue-700">حساب بسعر "المحلات / جملة"</span>
                                </div>
                                {maintenanceParts.length > 0 && (
                                  <div className="flex gap-2 mt-2">
                                    <button type="button" onClick={() => {
                                      const pId = selectedParts[job.id];
                                      if (!pId) return;
                                      const p = maintenanceParts.find(x => x.id === pId);
                                      if (p) handleAddPartToJob(job.id, p);
                                    }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm shrink-0 transition-colors">ضيفها للتقرير</button>
                                    <select 
                                      className="w-full p-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-right outline-none cursor-pointer focus:border-indigo-500"
                                      value={selectedParts[job.id] || ''}
                                      onChange={(e) => setSelectedParts({...selectedParts, [job.id]: e.target.value})}
                                    >
                                      <option value="">-- اختار واخصم من المخزن --</option>
                                      {maintenanceParts.map(part => (
                                        <option key={part.id} value={part.id}>{part.name} (باقي {part.stock}) - جملة: {part.wholesale_price || 0} ج</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-green-600 uppercase flex items-center gap-1 justify-end">التكلفة النهائية (قابلة للتعديل) <CreditCard size={12}/></label>
                                <input 
                                  type="number" 
                                  className="w-full p-4 text-lg border-2 border-green-100 rounded-xl bg-white dark:bg-slate-700 font-black text-center text-green-700 outline-none focus:border-green-500" 
                                  value={job.cost} 
                                  onChange={(e) => updateJobCost(job.id, Number(e.target.value))} 
                                />
                             </div>
                             <button onClick={() => setEditingJobId(null)} className="w-full bg-slate-900 text-white py-4 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 active:scale-95"><Save size={16}/> حفظ التغييرات والتقرير</button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                             <div className="flex flex-col gap-2">
                                <button onClick={() => setEditingJobId(job.id)} className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 self-end">تعديل التقرير الفني <ClipboardCheck size={12}/></button>
                                <div className="grid grid-cols-1 gap-2">
                                   <div className="p-3 bg-blue-50/30 rounded-xl text-right">
                                      <div className="text-[9px] font-black text-blue-500 uppercase">تقرير الفحص:</div>
                                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{job.notes || 'لسه مفيش ملاحظات'}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                 </div>
               );
             })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'parts_sale' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-right">
            <div className="flex flex-col items-center gap-4 mb-8">
               <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600">
                  <ShoppingBag size={40} />
               </div>
               <div className="text-center">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">بيع قطع غيار مباشر</h3>
                  <p className="text-slate-400 font-bold text-sm">بيع لأصحاب المحلات بأسعار متغيرة مع خصم فوري من المخزن</p>
               </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 px-1 uppercase flex items-center justify-between">
                    <span>ابحث عن اسم القطعة</span>
                    <Package size={12} />
                  </label>
                  
                  <div className="relative group">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                      type="text"
                      placeholder="اكتب اسم الشاشة أو البطارية..."
                      className="w-full pr-12 pl-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 font-bold text-right outline-none focus:border-blue-500 transition-all shadow-sm"
                      value={partsSearchTerm}
                      onChange={(e) => setPartsSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto no-scrollbar border-2 border-slate-50 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
                    {filteredPartsForSale.length === 0 ? (
                      <div className="py-4 text-center text-xs font-bold text-slate-400">مفيش نتائج للبحث ده..</div>
                    ) : (
                      filteredPartsForSale.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedPartId(item.id);
                            setPartsSalePrice(item.wholesale_price || item.price);
                            setPartsSearchTerm(''); // Clear search after selection
                          }}
                          className={`flex items-center justify-between p-4 rounded-xl transition-all text-right border ${
                            selectedPartId === item.id 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          <div className="flex flex-col items-end">
                            <span className="font-black text-sm">{item.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${selectedPartId === item.id ? 'bg-blue-400 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                {item.category}
                              </span>
                              <span className={`text-[10px] font-bold ${selectedPartId === item.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                متاح: {item.stock} حتة | جملة: {item.wholesale_price || 0} ج
                              </span>
                            </div>
                          </div>
                          {selectedPartId === item.id && <CheckCircle2 size={18} />}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {selectedPartId && (
                  <div className="animate-in zoom-in-95 duration-300">
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between gap-4">
                      <button onClick={() => setSelectedPartId('')} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <X size={20} />
                      </button>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-blue-600 uppercase">القطعة المختارة حالياً:</div>
                        <div className="font-black text-slate-800 dark:text-white">{products.find(p => p.id === selectedPartId)?.name}</div>
                      </div>
                    </div>
                  </div>
                )}

               <div className="flex gap-2">
                   <button 
                     type="button"
                     onClick={() => {
                        const p = products.find(x => x.id === selectedPartId);
                        if (p) setPartsSalePrice(p.wholesale_price || 0);
                     }}
                     className="flex-1 p-3 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black border border-blue-200 active:scale-95 transition-all"
                   >سعر المحلات</button>
                   <button 
                     type="button"
                     onClick={() => {
                        const p = products.find(x => x.id === selectedPartId);
                        if (p) setPartsSalePrice(p.price);
                     }}
                     className="flex-1 p-3 bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black border border-slate-200 active:scale-95 transition-all"
                   >سعر الزبون</button>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 px-1 uppercase">سعر البيع المطلوب</label>
                  <div className="relative">
                     <input 
                       type="number"
                       placeholder="0"
                       className="w-full p-5 rounded-2xl border-2 border-blue-100 bg-blue-50/30 text-blue-700 font-black text-center text-3xl outline-none focus:border-blue-500 transition-all"
                       value={partsSalePrice || ''}
                       onChange={(e) => setPartsSalePrice(Number(e.target.value))}
                     />
                     <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-400 font-black">جنيـه</div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold text-center">تقدر تمسح السعر وتكتب السعر اللي اتفقت عليه يدوي</p>
               </div>

               <button 
                 onClick={handleDirectPartSale}
                 disabled={isSellingPart || !selectedPartId}
                 className="group relative w-full bg-blue-600 text-white font-black py-6 rounded-[2.5rem] shadow-2xl hover:bg-blue-700 transition-all active:scale-90 disabled:opacity-50 flex items-center justify-center gap-3 text-lg overflow-hidden"
               >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-active:translate-y-0 transition-transform duration-200"></div>
                  {isSellingPart ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري إتمام البيعة...</span>
                    </div>
                  ) : (
                    <>
                       <CheckCircle2 size={24} className="group-active:scale-125 transition-transform" /> 
                       إتمام البيع والخصم من المخزن
                    </>
                  )}
               </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 pb-20">
           {readyToDeliver.length === 0 ? (
             <div className="col-span-full py-24 text-center border-2 border-dashed rounded-[3rem] bg-white dark:bg-slate-900">
                <p className="font-black text-slate-400">مفيش أجهزة جاهزة للتسليم حالياً</p>
             </div>
           ) : (
             readyToDeliver.map(job => (
               <div key={job.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col hover:shadow-2xl transition-all border-b-8 border-b-green-500">
                  <div className="p-7 flex-1 space-y-5">
                    <div className="flex items-center justify-between">
                       <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1"><CheckCircle size={12}/> خلص وجاهز للتسليم</span>
                    </div>
                    <div className="flex items-center gap-4 text-right font-black text-slate-800 dark:text-white text-xl leading-tight">{job.phoneModel}</div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-[11px] font-bold text-right text-slate-600">
                       {job.notes || 'تم الإصلاح بنجاح'}
                    </div>
                    <div className="text-sm font-bold text-slate-400 flex items-center justify-end gap-2 border-t pt-4 truncate">{job.customerName} <User size={16}/></div>
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-800 border-t flex flex-col gap-4">
                     <div className="flex items-center justify-between px-2">
                        <div className="text-sm font-bold text-slate-500">الباقي: <span className="text-xl font-black text-red-500 tabular-nums">{job.cost - job.paidAmount} ج</span></div>
                        <div className="text-sm font-bold text-slate-500">التكلفة: <span className="font-black text-slate-800 dark:text-white tabular-nums">{job.cost} ج</span></div>
                     </div>
                     <div className="flex gap-2 items-center">
                        <button 
                           onClick={() => handleCheckout(job, checkoutPayments[job.id] ?? (job.cost - job.paidAmount).toString())} 
                           className="flex-1 bg-slate-900 dark:bg-blue-600 text-white px-4 py-3 rounded-2xl font-black shadow-lg text-sm active:scale-90 transition-all flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-blue-700"
                        >
                           <CreditCard size={18}/>
                           استلم وسلم
                        </button>
                        <input 
                           type="number" 
                           placeholder="هيدفع كام؟" 
                           className="w-2/5 p-3 text-sm border rounded-2xl bg-white dark:bg-slate-700 font-black text-center outline-none focus:border-blue-500" 
                           value={checkoutPayments[job.id] ?? (job.cost - job.paidAmount)} 
                           onChange={(e) => setCheckoutPayments({...checkoutPayments, [job.id]: e.target.value})}
                        />
                     </div>
                     {(checkoutPayments[job.id] !== undefined ? Number(checkoutPayments[job.id]) : (job.cost - job.paidAmount)) < (job.cost - job.paidAmount) && (
                        <div className="text-[10px] font-bold text-amber-700 text-right bg-amber-100 dark:bg-amber-900/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/50">
                           ⚠️ الباقي ({(job.cost - job.paidAmount) - (checkoutPayments[job.id] !== undefined ? Number(checkoutPayments[job.id]) : (job.cost - job.paidAmount))} ج) هيتسجل ديون مستحقة باسم {job.customerName}.
                        </div>
                     )}
                  </div>
               </div>
             ))
           )}
        </div>
      )}

      {activeTab === 'parts' && (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="relative w-full sm:w-64">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="ابحث في قطع الغيار..." 
                    className="w-full pr-10 pl-4 py-3 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-right font-bold text-xs outline-none focus:border-blue-500 transition-all"
                    value={workshopPartsSearch}
                    onChange={(e) => setWorkshopPartsSearch(e.target.value)}
                  />
               </div>
               <h3 className="text-xl font-black text-right flex items-center gap-2 justify-end">جرد قطع الغيار للورشة <Package size={20}/></h3>
            </div>

            {(maintenanceParts || []).filter(p => p && (p.stock || 0) <= 2).length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20 flex items-center justify-between gap-4 animate-pulse">
                <span className="font-black text-red-600 dark:text-red-400 text-sm">{(maintenanceParts || []).filter(p => p && (p.stock || 0) <= 2).length} قطع قربت تخلص!</span>
                <AlertCircle className="text-red-500" size={20} />
              </div>
            )}
            
            {(!maintenanceParts || maintenanceParts.length === 0) ? (
               <div className="text-center py-10 text-slate-400 font-bold">
                 مفيش قطع غيار متسجلة للورشة. ممكن تضيفها من شاشة (المخزن والبضاعة) باختيار قسم "قطع غيار صيانة".
               </div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(maintenanceParts || [])
                    .filter(p => p && (
                      (p.name || '').toLowerCase().includes((workshopPartsSearch || '').toLowerCase()) ||
                      (p.category || '').toLowerCase().includes((workshopPartsSearch || '').toLowerCase())
                    ))
                    .sort((a, b) => (a.stock || 0) - (b.stock || 0)) // Low stock first
                    .map(part => (
                    <div 
                      key={part.id} 
                      className={`p-5 rounded-3xl border flex flex-col justify-between gap-4 transition-all relative overflow-hidden ${
                        part.stock <= 2 
                        ? 'bg-red-50 dark:bg-red-900/5 border-red-200 dark:border-red-900/30 shadow-lg shadow-red-500/10' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                      }`}
                    >
                      {part.stock <= 2 && (
                        <div className="absolute top-0 left-0 bg-red-500 text-white px-2 py-1 rounded-br-xl text-[8px] font-black uppercase">ناقص</div>
                      )}
                      <div className="text-right">
                        <div className="font-black text-slate-800 dark:text-white truncate text-sm mb-1" title={part.name}>{part.name}</div>
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[9px] px-2 py-0.5 rounded-lg font-black">{part.category}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-slate-500">الرصيد:</span>
                         <div className="flex items-center gap-2">
                            {part.stock <= 2 && <AlertCircle size={14} className="text-red-500" />}
                            <span className={`text-xl font-black ${part.stock > 2 ? 'text-green-600' : 'text-red-500'}`}>{part.stock}</span>
                         </div>
                      </div>
                    </div>
                  ))}
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceCenter;
