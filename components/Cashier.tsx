
import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, X, Smartphone, ArrowRightLeft, Zap, Banknote, Laptop, Headset, UserPlus, Package } from 'lucide-react';
import { Product, Transaction, TransferSetting } from '../types';
import BalanceTransfer from './BalanceTransfer';
import BalanceRecharge from './BalanceRecharge';
import { updateProductStock, createDebt } from '../supabaseHelpers';
import MissingGoods from './MissingGoods';
import { AlertCircle } from 'lucide-react';

interface CashierProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  addTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  transferSettings: TransferSetting[];
  isLimited?: boolean;
  shopId: string | null;
}


const Cashier: React.FC<CashierProps> = ({ products, setProducts, addTransaction, transferSettings, isLimited = false, shopId }) => {
  const [activeTab, setActiveTab] = useState<'goods' | 'transfers' | 'recharge'>('goods');
  const [selectedCategory, setSelectedCategory] = useState<Product['category'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentMedium, setPaymentMedium] = useState<'cash' | 'wallet' | 'debt'>('cash');
  const [debtCustomerName, setDebtCustomerName] = useState('');
  const [debtCustomerPhone, setDebtCustomerPhone] = useState('');
  const [debtPaidAmount, setDebtPaidAmount] = useState<number>(0);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.category !== 'part' &&
      p.stock > 0 && 
      (selectedCategory === 'all' || p.category === selectedCategory) &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.includes(searchTerm))
    );
  }, [products, searchTerm, selectedCategory]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.qty < product.stock) {
          return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
        }
        return prev;
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = Math.max(1, Math.min(item.qty + delta, item.product.stock));
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  const totalCost = cart.reduce((acc, item) => acc + (item.product.cost * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (paymentMedium === 'debt') {
      if (!debtCustomerName) {
         toast.error('لازم تكتب اسم العميل لفتح حساب الآجل!');
         return;
      }
      const actualPaid = Number(debtPaidAmount) || 0;
      if (actualPaid > total) {
         toast.error('المبلغ المدفوع أكبر من إجمالي البيعة!');
         return;
      }

      const remaining = total - actualPaid;
      if (remaining > 0 && shopId) {
         await createDebt({
            customerName: debtCustomerName,
            customerPhone: debtCustomerPhone,
            amount: total,
            remainingAmount: remaining,
            description: `باقي بيع: ${cart.map(i => `${i.product.name} (${i.qty})`).join('، ')}`,
            date: new Date().toISOString(),
            status: 'pending',
            type: 'sale',
            shop_id: shopId
         }, shopId);
      }
      
      if (actualPaid > 0) {
        addTransaction({
          type: 'sale',
          medium: 'cash',
          amount: actualPaid,
          cost: Math.min(totalCost, actualPaid),
          profit: Math.max(0, actualPaid - totalCost),
          description: `دفعة من بيعة آجل (${debtCustomerName}): ${cart.map(i => `${i.product.name}`).join('، ')}`,
          category: 'sales'
        });
      }
    } else {
      addTransaction({
        type: 'sale',
        medium: paymentMedium,
        amount: total,
        cost: totalCost,
        profit: total - totalCost,
        description: `بيع: ${cart.map(i => `${i.product.name} (${i.qty})`).join('، ')}`,
        category: 'sales'
      });
    }

    // Update local and DB stock
    for (const item of cart) {
      const newStock = item.product.stock - item.qty;
      await updateProductStock(item.product.id, newStock);
    }

    setProducts(prev => prev.map(p => {
      const cartItem = cart.find(ci => ci.product.id === p.id);
      if (cartItem) {
        return { ...p, stock: p.stock - cartItem.qty };
      }
      return p;
    }));

    setCart([]);
    setIsCartOpen(false);
    setDebtCustomerName('');
    setDebtCustomerPhone('');
    setDebtPaidAmount(0);
    setPaymentMedium('cash');
    toast.success(paymentMedium === 'debt' ? 'تم تسجيل البيعة وتسجيل الباقي في الديون بنجاح!' : 'مبروك يا عالمي، البيعة تمت والفلوس دخلت الخزنة!', {
      duration: 4000,
      icon: '💰'
    });
  };

  // Helper to get category icon/thumbnail
  const ProductImage = ({ product }: { product: Product }) => {
    if (product.image) return <img src={product.image} className="w-full h-full object-cover rounded-xl" alt={product.name} />;
    
    const Icon = product.category === 'phone' ? Smartphone : Headset;
    const bg = product.category === 'phone' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600';
    
    return (
      <div className={`w-full h-full rounded-xl flex items-center justify-center ${bg}`}>
        <Icon size={32} />
      </div>
    );
  };

  return (
    <div className="relative h-full space-y-6 font-['Cairo']">
      {/* Tab Switcher */}
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 w-full sm:w-fit overflow-x-auto no-scrollbar gap-2 transition-colors duration-300">
        <button
          onClick={() => setActiveTab('goods')}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black transition-all whitespace-nowrap ${
            activeTab === 'goods' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package size={20} />
          بيع بضاعة
        </button>


        
        {!isLimited && (
          <>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black transition-all whitespace-nowrap ${
                activeTab === 'transfers' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ArrowRightLeft size={20} />
              تحويل كاش
            </button>
          </>
        )}
      </div>

      {activeTab === 'goods' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Sub-Categories for Goods */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {[
              { id: 'all', label: 'الكل', icon: Package },
              { id: 'phone', label: 'موبايلات', icon: Smartphone },
              { id: 'charger', label: 'شواحن', icon: Zap },
              { id: 'cable', label: 'كابلات', icon: Zap },
              { id: 'wired_earphone', label: 'سماعات سلك', icon: Headset },
              { id: 'bluetooth_earphone', label: 'سماعات بلوتوث', icon: Headset },
              { id: 'headphone', label: 'هيدفون', icon: Headset },
              { id: 'accessory', label: 'إكسسوارات أخرى', icon: Laptop }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all border ${
                  selectedCategory === cat.id 
                    ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600 shadow-md' 
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-500'
                }`}
              >
                <cat.icon size={14} />
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative group">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={24} />
            <input
              type="text"
              placeholder="دور على البضاعة اللي عايز تبيعها.."
              className="w-full pr-14 pl-6 py-5 rounded-3xl border border-gray-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-500 outline-none transition-all shadow-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-black text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all text-right flex flex-col gap-4 relative group"
              >
                {/* Thumbnail */}
                <div className="aspect-square w-full">
                   <ProductImage product={p} />
                </div>
                
                <div className="flex-1 space-y-1">
                   <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.category === 'phone' ? 'موبايل' : 'إكسسوار'}</div>
                   <div className="font-black text-gray-800 dark:text-white truncate text-base">{p.name}</div>
                   <div className="text-green-600 font-black text-lg">{p.price.toLocaleString()} ج</div>
                </div>

                {/* Quick Add Button */}
                <button
                  onClick={() => addToCart(p)}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-90"
                >
                  <Plus size={20} />
                  حطه في السلة
                </button>
                
                <div className="absolute top-7 left-7 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-gray-500 border border-gray-100">
                   باقي {p.stock}
                </div>
              </div>
            ))}
          </div>

          {/* Floating Cart Launcher */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-10 left-10 z-40 bg-blue-600 text-white px-8 py-6 rounded-[2.5rem] shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-4 animate-bounce shadow-blue-500/40"
          >
            <div className="relative">
              <ShoppingCart size={32} />
              {cart.length > 0 && (
                <span className="absolute -top-4 -right-4 bg-red-500 text-white text-[12px] font-black w-8 h-8 rounded-full flex items-center justify-center border-4 border-blue-600">
                  {cart.length}
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black opacity-80 uppercase leading-none mb-1">الحساب الصافي</div>
              <div className="font-black text-2xl leading-none">{total.toLocaleString()} ج</div>
            </div>
          </button>
        </div>
      )}

      {activeTab === 'transfers' && !isLimited && <BalanceTransfer settings={transferSettings} addTransaction={addTransaction} />}
      {activeTab === 'recharge' && !isLimited && <BalanceRecharge addTransaction={addTransaction} settings={transferSettings} />}

      {/* Modern Side Cart Drawer */}
      {isCartOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-left duration-500 text-right font-['Cairo']">
            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl"><ShoppingCart size={28} /></div>
                <div>
                   <h3 className="font-black text-2xl">بيعة جديدة</h3>
                   <p className="text-blue-400 text-xs font-bold">راجع بضاعتك قبل ما تخلص</p>
                </div>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={28} /></button>
            </div>

            <div className="flex-1 overflow-auto p-8 space-y-6 no-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                  <ShoppingCart size={80} className="opacity-10" />
                  <p className="font-black text-xl">السلة فاضية يا عالمي</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex flex-col p-5 bg-gray-50 rounded-[2rem] border border-gray-100 gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12">
                              <ProductImage product={item.product} />
                           </div>
                           <div>
                              <div className="font-black text-gray-800 text-lg">{item.product.name}</div>
                              <div className="text-xs text-blue-600 font-bold">سعر القطعة: {item.product.price.toLocaleString()} ج</div>
                           </div>
                        </div>
                        <button onClick={() => removeFromCart(item.product.id)} className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20} /></button>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                        <div className="flex items-center bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                          <button onClick={() => updateQty(item.product.id, -1)} className="p-3 hover:bg-gray-100 text-gray-400"><Minus size={18}/></button>
                          <span className="w-12 text-center font-black text-lg text-slate-900">{item.qty}</span>
                          <button onClick={() => updateQty(item.product.id, 1)} className="p-3 hover:bg-gray-100 text-gray-400"><Plus size={18}/></button>
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] font-black text-gray-400 uppercase">الإجمالي</div>
                           <div className="font-black text-xl text-slate-900">{(item.product.price * item.qty).toLocaleString()} ج</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4 border border-gray-200 mt-6 shrink-0">
                  <span className="text-xs font-black text-gray-400 block uppercase">طريقة الدفع</span>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <button 
                      onClick={() => setPaymentMedium('cash')}
                      className={`p-3 sm:p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-black transition-all ${
                        paymentMedium === 'cash' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' : 'border-gray-100 text-gray-400'
                      }`}
                    >
                      <Banknote size={24} />
                      كاش
                    </button>
                    <button 
                      onClick={() => setPaymentMedium('wallet')}
                      className={`p-3 sm:p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-black transition-all ${
                        paymentMedium === 'wallet' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' : 'border-gray-100 text-gray-400'
                      }`}
                    >
                      <Smartphone size={24} />
                      محفظة
                    </button>
                    <button 
                      onClick={() => setPaymentMedium('debt')}
                      className={`p-3 sm:p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-black transition-all ${
                        paymentMedium === 'debt' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' : 'border-gray-100 text-gray-400'
                      }`}
                    >
                      <UserPlus size={24} />
                      آجل
                    </button>
                  </div>
                  
                  {paymentMedium === 'debt' && (
                    <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase">اسم العميل</label>
                        <input type="text" required placeholder="اسم العميل (مطلوب)" className="w-full p-4 rounded-2xl border-2 border-gray-100 bg-white text-right font-black outline-none focus:border-blue-500" value={debtCustomerName} onChange={e => setDebtCustomerName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase">رقم الموبايل</label>
                        <input type="text" placeholder="اختياري" className="w-full p-4 rounded-2xl border-2 border-gray-100 bg-white text-right font-black outline-none focus:border-blue-500" value={debtCustomerPhone} onChange={e => setDebtCustomerPhone(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-blue-500 uppercase">دفع كام دلوقتي؟</label>
                        <input type="number" placeholder="0" className="w-full p-4 rounded-2xl border-2 border-blue-100 bg-blue-50/30 text-right font-black text-xl outline-none focus:border-blue-500" value={debtPaidAmount || ''} onChange={e => setDebtPaidAmount(Number(e.target.value))} />
                        <div className="text-left text-xs font-bold text-red-500">المتبقي: {Math.max(0, total - debtPaidAmount).toLocaleString()} ج</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 bg-white border-t border-gray-100 space-y-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10">
                <div className="flex items-center justify-between px-2">
                  <div className="text-gray-500 font-black">إجمالي الحساب</div>
                  <div className="text-3xl font-black text-blue-600 tabular-nums">{total.toLocaleString()} <span className="text-sm">جنيه</span></div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-black py-5 rounded-3xl shadow-2xl shadow-blue-500/20 transition-all flex items-center justify-center gap-4 text-xl active:scale-95"
                >
                  <CreditCard size={28} />
                  خلص البيعة واستلم الفلوس
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* MissingGoods removed from here as it's now in the sidebar */}
    </div>
  );
};

export default Cashier;
