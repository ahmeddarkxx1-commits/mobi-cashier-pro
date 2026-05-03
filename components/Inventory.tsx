
import React, { useState, useMemo } from 'react';
import { Package, Search, Plus, Edit, Trash2, Filter, X, Settings2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Product } from '../types';
import { supabase } from '../supabaseClient';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  shopId: string | null;
}

const Inventory: React.FC<InventoryProps> = ({ products, setProducts, shopId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<Product['category'] | 'all'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    wholesale_price: 0,
    cost: 0,
    category: 'accessory',
    stock: 0
  });

  const CATEGORY_ICONS: Record<string, string> = {
    phone: '📱',
    charger: '🔌',
    cable: '➰',
    wired_earphone: '🎧',
    bluetooth_earphone: '📶',
    headphone: '🎚️',
    accessory: '✨',
    part: '🔧',
    electronic: '⚡',
    'شاشات': '📺',
    'فلاتات': '📂',
    'بطاريات': '🔋'
  };

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem(`shop_categories_${shopId}`);
    return saved ? JSON.parse(saved) : ['phone', 'charger', 'cable', 'wired_earphone', 'bluetooth_earphone', 'headphone', 'accessory', 'electronic'];
  });

  const [partCategories, setPartCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem(`shop_part_categories_${shopId}`);
    return saved ? JSON.parse(saved) : ['part'];
  });

  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'general' | 'part'>('general');
  const [activeGroup, setActiveGroup] = useState<'phones' | 'accessories' | 'parts'>('accessories');

  const GROUPS = [
    { id: 'phones', label: 'موبايلات', icon: '📱', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { id: 'accessories', label: 'إكسسوارات', icon: '✨', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { id: 'parts', label: 'قطع غيار', icon: '🔧', color: 'bg-orange-50 text-orange-600 border-orange-100' }
  ];

  const getGroupCategories = (groupId: string) => {
    if (groupId === 'phones') return ['phone'];
    if (groupId === 'accessories') return customCategories.filter(c => c !== 'phone');
    if (groupId === 'parts') return partCategories;
    return [];
  };

  const saveCategories = (cats: string[], type: 'general' | 'part') => {
    if (type === 'general') {
      setCustomCategories(cats);
      localStorage.setItem(`shop_categories_${shopId}`, JSON.stringify(cats));
    } else {
      setPartCategories(cats);
      localStorage.setItem(`shop_part_categories_${shopId}`, JSON.stringify(cats));
    }
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    if (newCatType === 'general') {
      if (customCategories.includes(newCatName.trim())) return;
      saveCategories([...customCategories, newCatName.trim()], 'general');
    } else {
      if (partCategories.includes(newCatName.trim())) return;
      saveCategories([...partCategories, newCatName.trim()], 'part');
    }
    setNewCatName('');
  };

  const removeCategory = (cat: string, type: 'general' | 'part') => {
    if (confirm(`هل أنت متأكد من حذف تصنيف "${cat}"؟`)) {
      if (type === 'general') {
        saveCategories(customCategories.filter(c => c !== cat), 'general');
      } else {
        saveCategories(partCategories.filter(c => c !== cat), 'part');
      }
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      phone: 'موبايل',
      charger: 'شاحن',
      cable: 'كابل',
      wired_earphone: 'سماعة سلك',
      bluetooth_earphone: 'سماعة بلوتوث',
      headphone: 'هيدفون',
      accessory: 'إكسسوار',
      part: 'قطعة غيار',
      electronic: 'إلكترونيات'
    };
    return labels[cat] || cat;
  };

  const isPartCategory = (cat: string) => partCategories.includes(cat);

  const filteredProducts = (products || []).filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || p.category === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = useMemo(() => {
    const summary: Record<string, { count: number, totalCost: number, totalRetail: number }> = {};
    let grandTotalCost = 0;
    let grandTotalRetail = 0;
    let grandTotalItems = 0;

    (products || []).forEach(p => {
      if (!summary[p.category]) {
        summary[p.category] = { count: 0, totalCost: 0, totalRetail: 0 };
      }
      const qty = p.stock || 0;
      summary[p.category].count += qty;
      summary[p.category].totalCost += (p.cost || 0) * qty;
      summary[p.category].totalRetail += (p.price || 0) * qty;

      grandTotalCost += (p.cost || 0) * qty;
      grandTotalRetail += (p.price || 0) * qty;
      grandTotalItems += qty;
    });

    return { categorySummary: summary, grandTotalCost, grandTotalRetail, grandTotalItems };
  }, [products]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setIsSaving(true);

    try {
      if (editingId) {
        // Update DB
        const { error } = await supabase
          .from('products')
          .update({ ...newProduct })
          .eq('id', editingId);
        
        if (error) throw error;

        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...newProduct } : p));
        toast.success('تم تحديث البيانات بنجاح');
      } else {
        const { data: productData, error } = await supabase
          .from('products')
          .insert([{
            ...newProduct,
            shop_id: shopId
          }])
          .select()
          .single();
        
        if (error) throw error;

        if (productData) {
          setProducts(prev => [...prev, productData as any]);
          toast.success('تم إضافة المنتج الجديد بنجاح');
        }
      }
      closeModal();
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error('حصلت مشكلة أثناء الحفظ!');
    } finally {
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewProduct({ name: '', price: 0, wholesale_price: 0, cost: 0, category: 'accessory', stock: 0 });
  };

  const startEdit = (product: Product) => {
    setNewProduct({ 
      name: product.name, 
      price: product.price, 
      wholesale_price: product.wholesale_price || 0, 
      cost: product.cost, 
      category: product.category, 
      stock: product.stock 
    });
    setEditingId(product.id);
    setIsAdding(true);
    
    // Set active group based on category
    if (product.category === 'phone') setActiveGroup('phones');
    else if (partCategories.includes(product.category)) setActiveGroup('parts');
    else setActiveGroup('accessories');
  };

  const deleteProduct = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف الصنف ده؟')) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        setProducts(prev => prev.filter(p => p.id !== id));
        toast.success('تم حذف الصنف بنجاح');
      } catch (err) {
        console.error('Error deleting product:', err);
        toast.error('فشل حذف المنتج من قاعدة البيانات!');
      }
    }
  };

  return (
    <div className="space-y-6 font-['Cairo']">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Package /></div>
          <div>
            <h3 className="text-xl font-black text-gray-800 dark:text-white">المخزن والجرد</h3>
            <p className="text-sm text-gray-500">متابعة كل البضاعة اللي في المحل</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowCatManager(!showCatManager)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all"
          >
            <Filter size={20} />
            إدارة التصنيفات
          </button>
          <button 
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); setNewProduct({name:'', price:0, wholesale_price:0, cost:0, category:'accessory', stock:0}); }}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl w-full md:w-auto active:scale-95 transition-all"
          >
            <Plus size={20} />
            {editingId ? 'تعديل الصنف ده' : 'إضافة بضاعة جديدة'}
          </button>
        </div>
      </div>

      {/* Warehouse Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 pb-2 min-w-max">
            {Object.entries(stats.categorySummary).map(([cat, data]) => (
              <div key={cat} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm min-w-[200px] space-y-3 transition-all hover:shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICONS[cat] || '📦'}</span>
                  <span className="font-black text-slate-700 dark:text-slate-300">{getCategoryLabel(cat)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">الكمية:</span>
                    <span className="font-black text-indigo-600">{data.count} حتة</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">قيمة التكلفة:</span>
                    <span className="font-black text-slate-600 dark:text-slate-400">{data.totalCost.toLocaleString()} ج</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">قيمة البيع:</span>
                    <span className="font-black text-green-600">{data.totalRetail.toLocaleString()} ج</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-indigo-600 text-white p-6 rounded-[2.5rem] shadow-xl shadow-indigo-500/20 flex flex-col justify-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Package size={120} />
          </div>
          <div className="relative z-10">
            <div className="text-xs font-black uppercase opacity-80 mb-1">إجمالي قيمة المخزن (تكلفة)</div>
            <div className="text-4xl font-black">{stats.grandTotalCost.toLocaleString()} <span className="text-lg">جنيه</span></div>
          </div>
          <div className="relative z-10 flex justify-between border-t border-white/20 pt-4">
             <div>
               <div className="text-[10px] font-black opacity-60 uppercase">إجمالي القطع</div>
               <div className="font-black text-xl">{stats.grandTotalItems}</div>
             </div>
             <div className="text-left">
               <div className="text-[10px] font-black opacity-60 uppercase">الربح المتوقع</div>
               <div className="font-black text-xl text-green-300">{(stats.grandTotalRetail - stats.grandTotalCost).toLocaleString()} ج</div>
             </div>
          </div>
        </div>
      </div>

      {showCatManager && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Filter size={16} />
              تحكم في تصنيفات المحل
            </h4>
          </div>

          <div className="space-y-4">
            <div className="text-right">
              <span className="text-xs font-black text-slate-400">تصنيفات عامة:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {customCategories.map(cat => (
                  <div key={cat} className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <span className="font-bold text-sm">{getCategoryLabel(cat)}</span>
                    <button onClick={() => removeCategory(cat, 'general')} className="text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-black text-blue-400">تصنيفات قطع الغيار (تظهر في الورشة):</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {partCategories.map(cat => (
                  <div key={cat} className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                    <span className="font-bold text-sm text-blue-700 dark:text-blue-300">{getCategoryLabel(cat)}</span>
                    <button onClick={() => removeCategory(cat, 'part')} className="text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t dark:border-slate-800">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase mr-2">إضافة تصنيف جديد</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="مثلاً: شاشات، بطاريات، كفرات..." 
                  className="flex-1 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-right font-bold focus:border-indigo-500 outline-none transition-all"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addCategory()}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase mr-2">نوع التصنيف</label>
              <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setNewCatType('general')}
                  className={`px-6 py-3 rounded-xl font-black text-xs transition-all ${newCatType === 'general' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  بضاعة عامة
                </button>
                <button 
                  onClick={() => setNewCatType('part')}
                  className={`px-6 py-3 rounded-xl font-black text-xs transition-all ${newCatType === 'part' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  قطعة غيار
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button 
                onClick={addCategory}
                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all h-[58px]"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 border-b dark:border-slate-800 flex items-center justify-between z-10">
              <h4 className="text-2xl font-black text-slate-800 dark:text-white">
                {editingId ? 'تعديل الصنف' : 'إضافة صنف جديد'}
              </h4>
              <button onClick={closeModal} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-right">
                  <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">اسم المنتج</label>
                  <input 
                    placeholder="مثلاً: شاشة ايفون 11 اصلية..." 
                    required 
                    className="w-full p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right font-bold text-lg focus:border-indigo-500 outline-none transition-all" 
                    value={newProduct.name} 
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">الكمية المتاحة</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    required 
                    className="w-full p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right font-black text-xl focus:border-indigo-500 outline-none transition-all" 
                    value={newProduct.stock || ''} 
                    onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 text-right">
                  <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">سعر التكلفة (عليّ بكام؟)</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    required 
                    className="w-full p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right font-black text-xl focus:border-blue-500 outline-none transition-all" 
                    value={newProduct.cost || ''} 
                    onChange={e => setNewProduct({...newProduct, cost: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">سعر البيع للزبون</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    required 
                    className="w-full p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right font-black text-xl focus:border-green-500 outline-none transition-all text-green-600" 
                    value={newProduct.price || ''} 
                    onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">سعر الجملة (للمحلات)</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className="w-full p-5 rounded-2xl border-2 border-blue-50 dark:border-blue-900/20 bg-blue-50/30 dark:bg-blue-900/10 text-right font-black text-xl focus:border-blue-500 outline-none transition-all text-blue-600" 
                    value={newProduct.wholesale_price || ''} 
                    onChange={e => setNewProduct({...newProduct, wholesale_price: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b dark:border-slate-800 pb-4">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-widest">اختر المجموعة أولاً</label>
                  <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-[1.5rem] gap-2 w-full sm:w-auto">
                    {GROUPS.map(group => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setActiveGroup(group.id as any)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all ${
                          activeGroup === group.id 
                            ? 'bg-white dark:bg-slate-700 shadow-lg text-slate-900 dark:text-white scale-105' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        <span>{group.icon}</span>
                        {group.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {getGroupCategories(activeGroup).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewProduct({...newProduct, category: cat})}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${
                        newProduct.category === cat 
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-lg scale-105' 
                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'
                      }`}
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">
                        {CATEGORY_ICONS[cat] || '📦'}
                      </span>
                      <span className="font-black text-xs text-center">{getCategoryLabel(cat)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="px-8 py-4 text-slate-500 font-black hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : <Plus size={20} />}
                  {editingId ? 'حفظ التعديلات' : 'إضافة للمخزن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4 transition-colors duration-300">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="دور على البضاعة اللي عندك..." className="w-full pr-12 pl-4 py-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-right font-bold transition-colors duration-300" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto w-full pb-4">
          <table className="w-full text-right min-w-[750px]">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs font-black text-gray-500 dark:text-gray-400 transition-colors duration-300">
              <tr>
                <th className="p-5">الصنف</th>
                <th className="p-5 text-center">النوع</th>
                <th className="p-5 text-center">واقف عليا بكام</th>
                <th className="p-5 text-center">سعر البيع</th>
                <th className="p-5 text-center">باقي كام</th>
                <th className="p-5 text-center">تحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors text-sm font-bold">
                  <td className="p-5 text-gray-800 dark:text-white">{product.name}</td>
                  <td className="p-5 text-center">
                    <span className="px-3 py-1.5 rounded-full text-[10px] bg-blue-50 text-blue-700">
                      {getCategoryLabel(product.category)}
                    </span>
                  </td>
                  <td className="p-5 text-center text-gray-400">{product.cost} ج</td>
                  <td className="p-5 text-center">
                    <div className="text-indigo-600">{product.price} ج</div>
                    <div className="text-[10px] text-blue-500 font-black">جملة: {product.wholesale_price || 0} ج</div>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[11px] ${product.stock < 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                      {product.stock} حتة
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => startEdit(product)} className="p-2.5 text-blue-600 bg-blue-50 rounded-xl"><Edit size={16} /></button>
                      <button onClick={() => deleteProduct(product.id)} className="p-2.5 text-red-600 bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
