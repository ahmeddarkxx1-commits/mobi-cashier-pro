
import React, { useState } from 'react';
import { Package, Search, Plus, Edit, Trash2, Filter, X } from 'lucide-react';
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
    cost: 0,
    category: 'accessory' as Product['category'],
    stock: 0
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || p.category === filter;
    return matchesSearch && matchesFilter;
  });

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
        
        if (error) {
           console.error('DB Update Error:', error);
           toast.error('فشل تحديث البيانات في السحابة!');
           setIsSaving(false);
           return;
        }

        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...newProduct } : p));
        setEditingId(null);
      } else {
        // Insert DB
        const { data: productData, error } = await supabase
          .from('products')
          .insert([{
            ...newProduct,
            shop_id: shopId
          }])
          .select()
          .single();
        
        if (error) {
          console.error('DB Insert Error:', error);
          toast.error('فشل إضافة المنتج لقاعدة البيانات!');
          setIsSaving(false);
          return;
        }

        if (productData) {
          setProducts([...products, productData as any]);
        }
      }
      setIsAdding(false);
      setNewProduct({ name: '', price: 0, cost: 0, category: 'accessory', stock: 0 });
    } catch (err) {
      console.error('Error saving product:', err);
      alert('حصل مشكلة في الحفظ، بس ضفناهولك مؤقتاً في الصفحة.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (product: Product) => {
    setNewProduct({ name: product.name, price: product.price, cost: product.cost, category: product.category, stock: product.stock });
    setEditingId(product.id);
    setIsAdding(true);
  };

  const deleteProduct = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف الصنف ده؟')) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        setProducts(products.filter(p => p.id !== id));
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
        <button 
          onClick={() => { setIsAdding(!isAdding); setEditingId(null); setNewProduct({name:'', price:0, cost:0, category:'accessory', stock:0}); }}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl w-full md:w-auto active:scale-95 transition-all"
        >
          <Plus size={20} />
          {editingId ? 'تعديل الصنف ده' : 'إضافة بضاعة جديدة'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSaveProduct} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-slate-800 space-y-6 transition-colors duration-300">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-gray-400 px-1 uppercase">اسم الصنف</label>
                <input placeholder="اكتب اسم المنتج..." required className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-right font-bold transition-colors duration-300" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-gray-400 px-1 uppercase">واقف عليا بكام؟</label>
                <input type="number" placeholder="0" required className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-right font-bold transition-colors duration-300" value={newProduct.cost || ''} onChange={e => setNewProduct({...newProduct, cost: Number(e.target.value)})} />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-gray-400 px-1 uppercase">هبيعه بكام؟</label>
                <input type="number" placeholder="0" required className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-right font-bold transition-colors duration-300" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
              </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 px-1 uppercase">تصنيف الصنف</label>
                      <select 
                        className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-right font-bold outline-none focus:border-indigo-500 transition-colors duration-300"
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}
                      >
                        <option value="phone">موبايل</option>
                        <option value="charger">شاحن</option>
                        <option value="cable">كابل</option>
                        <option value="wired_earphone">سماعة سلك</option>
                        <option value="bluetooth_earphone">سماعة بلوتوث</option>
                        <option value="headphone">هيدفون</option>
                        <option value="accessory">إكسسوار آخر</option>
                        <option value="part">قطعة غيار</option>
                        <option value="electronic">إلكترونيات</option>
                      </select>
                    </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-gray-400 px-1 uppercase">عندي منه كام؟</label>
                <input type="number" placeholder="0" required className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-right font-bold transition-colors duration-300" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} />
              </div>
           </div>
           <div className="flex justify-end gap-4 border-t dark:border-slate-800 pt-6">
             <button type="button" onClick={() => setIsAdding(false)} className="text-gray-500 dark:text-gray-400 font-black px-6 py-3 transition-colors">إلغاء</button>
             <button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg w-full sm:w-auto">حفظ البضاعة</button>
           </div>
        </form>
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
                      {product.category === 'phone' ? 'موبايل' : 
                       product.category === 'charger' ? 'شاحن' : 
                       product.category === 'cable' ? 'كابل' :
                       product.category === 'wired_earphone' ? 'سماعة سلك' :
                       product.category === 'bluetooth_earphone' ? 'سماعة بلوتوث' :
                       product.category === 'headphone' ? 'هيدفون' :
                       product.category === 'accessory' ? 'إكسسوار' : 
                       product.category === 'electronic' ? 'إلكترونيات' : 'قطعة غيار'}
                    </span>
                  </td>
                  <td className="p-5 text-center text-gray-400">{product.cost} ج</td>
                  <td className="p-5 text-center text-indigo-600">{product.price} ج</td>
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
