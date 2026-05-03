
import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Package, Plus, Trash2, Search, ClipboardList, Loader2, Smartphone } from 'lucide-react';
import { Product } from '../types';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

interface MissingGoodsProps {
  products: Product[];
  shopId: string | null;
}

interface MissingItem {
  id: string;
  name: string;
  status: 'pending' | 'ordered' | 'received';
  created_at: string;
  is_automatic: boolean;
  category?: string; // Adding category support
}

const MissingGoods: React.FC<MissingGoodsProps> = ({ products, shopId }) => {
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('إكسسوارات');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchMissingItems();
    }
  }, [shopId]);

  const fetchMissingItems = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('missing_goods')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMissingItems(data || []);
    } catch (err) {
      console.error('Error fetching missing items:', err);
      toast.error('فشل تحميل قائمة النواقص');
    } finally {
      setLoading(false);
    }
  };

  // المزامنة التلقائية: التأكد من أن كل منتج كميته صفر موجود في الجدول
  useEffect(() => {
    let isMounted = true;
    const syncAutomaticMissing = async () => {
      if (!shopId || loading || products.length === 0) return;
      
      // نبهني لما يتبقي حتتين أو أقل عشان نلحق نجيب غيرها
      const lowStock = products.filter(p => p.stock <= 2);
      
      for (const product of lowStock) {
        if (!isMounted) break;
        
        // التحقق من الاسم بدقة لمنع التكرار
        const alreadyExists = missingItems.some(item => 
          item.name.trim().toLowerCase() === product.name.trim().toLowerCase()
        );

        if (!alreadyExists) {
          const newItem = {
            name: product.name,
            status: 'pending',
            is_automatic: true,
            shop_id: shopId,
            category: product.category // محاولة إضافة التصنيف لو الجدول بيدعمه
          };
          
          try {
            const { data, error } = await supabase.from('missing_goods').insert([newItem]).select();
            if (!error && data && isMounted) {
              setMissingItems(prev => {
                // تأكيد إضافي لمنع التكرار في الـ State
                if (prev.some(p => p.name === data[0].name)) return prev;
                return [data[0], ...prev];
              });
            }
          } catch (e) {
            console.error("Sync insert failed", e);
          }
        }
      }
    };

    syncAutomaticMissing();
    return () => { isMounted = false; };
  }, [products.length, shopId, loading]); // تقليل مسببات التكرار

  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !shopId) return;
    setIsAdding(true);

    try {
      const newItem = {
        name: newItemName.trim(),
        status: 'pending',
        is_automatic: false,
        shop_id: shopId,
        category: newItemCategory // حفظ التصنيف المختار يدوياً
      };

      const { data, error } = await supabase.from('missing_goods').insert([newItem]).select();
      if (error) throw error;

      if (data) {
        setMissingItems([data[0], ...missingItems]);
        setNewItemName('');
        toast.success('تم إضافة النواقص بنجاح وتحفظت في السيرفر');
      }
    } catch (err) {
      console.error('Error adding item:', err);
      toast.error('فشل حفظ الصنف');
    } finally {
      setIsAdding(false);
    }
  };

  const removeItem = async (id: string) => {
    try {
      const { error } = await supabase.from('missing_goods').delete().eq('id', id);
      if (error) throw error;

      setMissingItems(prev => prev.filter(item => item.id !== id));
      toast.success('تم الحذف بنجاح');
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error('فشل الحذف من السيرفر');
    }
  };

  const updateStatus = async (id: string, status: MissingItem['status']) => {
    try {
      const { error } = await supabase.from('missing_goods').update({ status }).eq('id', id);
      if (error) throw error;

      setMissingItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      toast.success('تم تحديث الحالة');
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('فشل تحديث الحالة');
    }
  };

  const filteredItems = useMemo(() => {
    // 1. إزالة التكرار من القائمة بناءً على الاسم (safety net)
    const uniqueItems: MissingItem[] = [];
    const seenNames = new Set<string>();

    [...missingItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .forEach(item => {
        const normalizedName = item.name.trim().toLowerCase();
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          uniqueItems.push(item);
        }
      });

    // 2. الفلترة بناءً على البحث والتصنيف
    return uniqueItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const itemCat = getItemCategory(item);
      const matchesCategory = categoryFilter === 'all' || itemCat === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [missingItems, searchTerm, categoryFilter]);

  // دالة لجلب تصنيف المنتج من قائمة المنتجات الحالية
  const getItemCategory = (item: MissingItem) => {
    // لو الصنف متسجل فيه تصنيف أصلاً (من الإضافة اليدوية أو المزامنة)
    if (item.category) return item.category;

    // محاولة البحث في المنتجات
    const product = products.find(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
    if (product) return product.category;
    
    // محاولة استنتاج التصنيف من الاسم كملجأ أخير
    const n = item.name.toLowerCase();
    if (n.includes('شاشه') || n.includes('شاشة') || n.includes('screen')) return 'شاشات';
    if (n.includes('بطاريه') || n.includes('بطارية') || n.includes('battery')) return 'بطاريات';
    if (n.includes('شاحن') || n.includes('charger') || n.includes('كابل') || n.includes('cable')) return 'إكسسوارات';
    return 'صنف يدوي';
  };

  // دالة لجلب الكمية المتبقية في المخزن
  const getStockQuantity = (name: string) => {
    const product = products.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    return product ? product.stock : null;
  };

  return (
    <div className="space-y-6 font-['Cairo'] animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right">
          <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-sm">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">نواقص المحل</h3>
            <p className="text-xs font-bold text-slate-400">بضاعة خلصت أو محتاجين نطلبها (محفوظة على السحاب)</p>
          </div>
        </div>
        {loading && <Loader2 className="animate-spin text-blue-600" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleAddManualItem} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 justify-end">إضافة نواقص يدوية <Plus size={18} className="text-blue-600" /></h4>
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-slate-400 uppercase pr-1">اسم الصنف الناقص</label>
              <input 
                placeholder="مثلاً: كابل ايفون، شاشة نوت 10..." 
                className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50 dark:bg-slate-800 text-right font-bold outline-none focus:border-blue-500 transition-all"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                disabled={isAdding}
              />
            </div>

            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-slate-400 uppercase pr-1">تصنيف الصنف</label>
              <select 
                className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50 dark:bg-slate-800 text-right font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                value={newItemCategory}
                onChange={e => setNewItemCategory(e.target.value)}
                disabled={isAdding}
              >
                <option value="شاشات">شاشات</option>
                <option value="بطاريات">بطاريات</option>
                <option value="إكسسوارات">إكسسوارات</option>
                <option value="قطع غيار">قطع غيار</option>
                <option value="أدوات صيانة">أدوات صيانة</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <button 
                type="submit" 
                disabled={isAdding || !newItemName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isAdding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              ضيف للقائمة واحفظها
            </button>
          </form>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-800/50 space-y-3">
             <div className="flex items-center gap-2 justify-end text-blue-700 dark:text-blue-400 font-black text-sm">
                مزامنة السحاب <AlertCircle size={16} />
             </div>
             <p className="text-[11px] font-bold text-blue-600 dark:text-blue-500/80 text-right leading-relaxed">
                كل النواقص اللي بتكتبها هنا بتتحفظ في حسابك وتقدر تشوفها من أي موبايل تاني أو كمبيوتر مسجل عليه.
             </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col gap-4">
                 <div className="relative flex-1 w-full">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="ابحث في النواقص..." 
                      className="w-full pr-12 pl-4 py-4 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 text-right font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
                 
                 {/* فلتر التصنيفات السريع */}
                 <div className="flex flex-wrap gap-2 justify-end">
                    {['all', 'شاشات', 'بطاريات', 'إكسسوارات', 'قطع غيار'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                          categoryFilter === cat 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {cat === 'all' ? 'الكل' : cat}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                 {loading ? (
                    <div className="h-full flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                    </div>
                 ) : filteredItems.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 py-20 opacity-40">
                      <ClipboardList size={80} strokeWidth={1} />
                      <p className="font-black text-xl">مفيش نواقص حالياً.. المحل عمران!</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 gap-3">
                      {filteredItems.map(item => (
                        <div key={item.id} className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${item.is_automatic ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                           <div className="flex items-center gap-3">
                              <button onClick={() => removeItem(item.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                 <Trash2 size={16} />
                              </button>
                              <div className="flex items-center gap-2">
                                 <select 
                                   value={item.status} 
                                   onChange={e => updateStatus(item.id, e.target.value as any)}
                                   className={`text-[10px] font-black px-3 py-1.5 rounded-lg border-none outline-none appearance-none cursor-pointer ${
                                     item.status === 'pending' ? 'bg-slate-200 text-slate-700' : 
                                     item.status === 'ordered' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                   }`}
                                 >
                                    <option value="pending">مطلوب</option>
                                    <option value="ordered">تم الطلب</option>
                                    <option value="received">وصل المحل</option>
                                 </select>
                              </div>
                           </div>

                           <div className="flex items-center gap-4 text-right">
                              <div>
                                  <div className="font-black text-slate-800 dark:text-white text-sm flex items-center gap-2 justify-end">
                                    {item.name}
                                    {item.is_automatic && <span className="bg-orange-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black animate-pulse whitespace-nowrap">نقص حاد</span>}
                                 </div>
                                 <div className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-2 justify-end">
                                    <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-blue-600 dark:text-blue-400">
                                      {getItemCategory(item)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {item.is_automatic ? (
                                        <span className="text-red-500">
                                          متبقي {getStockQuantity(item.name)} قطع فقط
                                        </span>
                                      ) : 'مضافة يدوياً'}
                                      <AlertCircle size={10} />
                                    </div>
                                 </div>
                              </div>
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${item.is_automatic ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                 {getItemCategory(item).includes('شاش') ? <Smartphone size={24} /> : 
                                  getItemCategory(item).includes('بطار') ? <Package size={24} /> : 
                                  <AlertCircle size={24} />}
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MissingGoods;
