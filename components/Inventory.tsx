import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Package, Search, Plus, Edit, Trash2, Filter, X, Settings2, CheckCircle2, Camera, Scan, Sparkles, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { Product } from '../types';
import { supabase } from '../supabaseClient';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import JsBarcode from 'jsbarcode';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  shopId: string | null;
  shopName?: string;
}

const Inventory: React.FC<InventoryProps> = ({ products, setProducts, shopId, shopName }) => {
  const playBeepSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, context.currentTime); // 1000Hz standard scanner pitch
      
      gain.gain.setValueAtTime(0.3, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15); // Smooth decay
      
      osc.connect(gain);
      gain.connect(context.destination);
      
      osc.start();
      osc.stop(context.currentTime + 0.15);
    } catch (e) {
      console.error("Audio beep failed", e);
    }
  };

  const handlePrintBarcode = (product: Product) => {
    let displayName = product.name;
    let barcode = '';

    const barcodeMatch = displayName.match(/(.+)\s*-\s*Barcode:\s*(\w+)/i);
    if (barcodeMatch) {
      displayName = barcodeMatch[1].trim();
      barcode = barcodeMatch[2].trim();
    } else {
      toast.error('هذا المنتج لا يحتوي على باركود لطباعته!');
      return;
    }

    const imeiMatch = displayName.match(/(.+)\s*-\s*IMEI:\s*(\w+)/i);
    if (imeiMatch) displayName = imeiMatch[1].trim();

    // Render barcode to Canvas then convert to PNG (guaranteed to print on thermal printers)
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;';
    document.body.appendChild(hiddenDiv);
    const canvas = document.createElement('canvas');
    hiddenDiv.appendChild(canvas);

    let barcodeDataURL = '';
    try {
      const fmt = /^\d{13}$/.test(barcode) ? 'EAN13' : /^\d{8}$/.test(barcode) ? 'EAN8' : 'CODE128';
      JsBarcode(canvas, barcode, {
        format: fmt,
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
    } catch {
      try {
        JsBarcode(canvas, barcode, { format: 'CODE128', width: 1.5, height: 18, displayValue: true, fontSize: 13, margin: 0, background: '#ffffff', lineColor: '#000000' });
        barcodeDataURL = canvas.toDataURL('image/png');
      } catch (e) {
        console.error('Barcode render failed:', e);
        toast.error('فشل رسم الباركود، تأكد من صحة الرقم');
        document.body.removeChild(hiddenDiv);
        return;
      }
    }
    document.body.removeChild(hiddenDiv);

    if (!barcodeDataURL || barcodeDataURL === 'data:,') {
      toast.error('الباركود فارغ، تأكد من صحة الرقم');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (!printWindow) {
      toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>باركود</title>
    <style>
      @page { size: 38mm 22mm; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 38mm; height: 22mm; background: #fff; color: #000; overflow: hidden; font-family: Arial, sans-serif; }
      .wrap { width: 38mm; height: 22mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 0mm 1mm 3mm 1mm; text-align: center; }
      .sname { font-size: 9pt; font-weight: 900; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; line-height: 1; margin-bottom: -1px; margin-top: 1px; }
      .pname { font-size: 7pt; font-weight: 700; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; line-height: 1; margin-bottom: 0px; }
      .bc { width: 100%; display: flex; align-items: center; justify-content: center; }
      .bc img { max-width: 100%; height: auto; display: block; }
      .price { font-size: 8pt; font-weight: 900; text-align: center; width: 100%; line-height: 1; margin-top: -2px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="sname">${shopName || 'محل موبايلات'}</div>
      <div class="pname">${displayName}</div>
      <div class="bc"><img src="${barcodeDataURL}" /></div>
      <div class="price">السعر: ${product.price} ج</div>
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
    stock: 0,
    imei: '',
    barcode: ''
  });

  const [isFormCameraOpen, setIsFormCameraOpen] = useState(false);
  const formQrCodeRef = useRef<Html5Qrcode | null>(null);

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

  const [customCategories, setCustomCategories] = useState<string[]>(['phone', 'charger', 'cable', 'wired_earphone', 'bluetooth_earphone', 'headphone', 'accessory', 'electronic']);
  const [partCategories, setPartCategories] = useState<string[]>(['part', 'شاشات', 'فلاتات', 'بطاريات']);

  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'general' | 'part'>('general');
  const [activeGroup, setActiveGroup] = useState<'phones' | 'accessories' | 'parts'>('accessories');
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync Categories from Supabase
  React.useEffect(() => {
    if (!shopId) return;
    
    const syncCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('settings')
          .eq('id', shopId)
          .single();

        if (error) {
          console.warn('Sync failed, using local storage:', error.message);
          const localCats = localStorage.getItem(`shop_categories_${shopId}`);
          const localParts = localStorage.getItem(`shop_part_categories_${shopId}`);
          if (localCats) setCustomCategories(JSON.parse(localCats));
          if (localParts) setPartCategories(JSON.parse(localParts));
          return;
        }

        const currentSettings = data?.settings || {};
        let needsUpdate = false;
        const newSettings = { ...currentSettings };

        // 1. Sync Custom Categories
        if (currentSettings.categories && currentSettings.categories.length > 0) {
          setCustomCategories(currentSettings.categories);
          localStorage.setItem(`shop_categories_${shopId}`, JSON.stringify(currentSettings.categories));
        } else {
          const localCats = localStorage.getItem(`shop_categories_${shopId}`);
          if (localCats) {
            const parsed = JSON.parse(localCats);
            if (parsed.length > 0) {
              setCustomCategories(parsed);
              newSettings.categories = parsed;
              needsUpdate = true;
            }
          }
        }

        // 2. Sync Part Categories
        if (currentSettings.part_categories && currentSettings.part_categories.length > 0) {
          setPartCategories(currentSettings.part_categories);
          localStorage.setItem(`shop_part_categories_${shopId}`, JSON.stringify(currentSettings.part_categories));
        } else {
          const localParts = localStorage.getItem(`shop_part_categories_${shopId}`);
          if (localParts) {
            const parsed = JSON.parse(localParts);
            if (parsed.length > 0) {
              setPartCategories(parsed);
              newSettings.part_categories = parsed;
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate) {
          await supabase.from('shops').update({ settings: newSettings }).eq('id', shopId);
          console.log('Local categories migrated to cloud successfully.');
        }

      } catch (err) {
        console.error('Category Sync Error:', err);
      }
    };

    syncCategories();
  }, [shopId]);

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

  const saveCategories = async (cats: string[], type: 'general' | 'part') => {
    let newCustom = customCategories;
    let newParts = partCategories;

    if (type === 'general') {
      newCustom = cats;
      setCustomCategories(cats);
      localStorage.setItem(`shop_categories_${shopId}`, JSON.stringify(cats));
    } else {
      newParts = cats;
      setPartCategories(cats);
      localStorage.setItem(`shop_part_categories_${shopId}`, JSON.stringify(cats));
    }

    // Attempt to sync with Supabase
    if (shopId) {
      try {
        const { data: currentShop } = await supabase.from('shops').select('settings').eq('id', shopId).single();
        const currentSettings = currentShop?.settings || {};
        
        await supabase
          .from('shops')
          .update({ 
            settings: { 
              ...currentSettings,
              categories: newCustom,
              part_categories: newParts
            } 
          })
          .eq('id', shopId);
      } catch (err) {
        console.error('Failed to sync categories to cloud:', err);
      }
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
    const categorySummary: Record<string, { count: number; totalCost: number; totalRetail: number; totalWholesale: number }> = {};
    let grandTotalCost = 0;
    let grandTotalRetail = 0;
    let grandTotalWholesale = 0;
    let grandTotalItems = 0;

    (products || []).forEach(p => {
      if (!categorySummary[p.category]) {
        categorySummary[p.category] = { count: 0, totalCost: 0, totalRetail: 0, totalWholesale: 0 };
      }
      const qty = p.stock || 0;
      categorySummary[p.category].count += qty;
      categorySummary[p.category].totalCost += (p.cost || 0) * qty;
      categorySummary[p.category].totalRetail += (p.price || 0) * qty;
      categorySummary[p.category].totalWholesale += (p.wholesale_price || p.price || 0) * qty;

      grandTotalCost += (p.cost || 0) * qty;
      grandTotalRetail += (p.price || 0) * qty;
      grandTotalWholesale += (p.wholesale_price || p.price || 0) * qty;
      grandTotalItems += qty;
    });

    return { categorySummary, grandTotalCost, grandTotalRetail, grandTotalWholesale, grandTotalItems };
  }, [products]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setIsSaving(true);

    let finalName = newProduct.name.trim();
    if (newProduct.imei) finalName += ` - IMEI: ${newProduct.imei.trim()}`;
    if (newProduct.barcode) finalName += ` - Barcode: ${newProduct.barcode.trim()}`;

    const finalProduct = {
      name: finalName,
      price: newProduct.price,
      wholesale_price: newProduct.wholesale_price,
      cost: newProduct.cost,
      category: newProduct.category,
      stock: newProduct.stock
    };

    try {
      if (editingId) {
        // Update DB
        const { error } = await supabase
          .from('products')
          .update(finalProduct)
          .eq('id', editingId);
        
        if (error) throw error;

        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...finalProduct } : p));
        toast.success('تم تحديث البيانات بنجاح');
      } else {
        const { data: productData, error } = await supabase
          .from('products')
          .insert([{
            ...finalProduct,
            shop_id: shopId
          }])
          .select()
          .single();
        
        if (error) throw error;

        if (productData) {
          setProducts(prev => [...prev, productData as any]);
          toast.success('تم إضافة المنتج الجديد بنجاح');
          if (newProduct.barcode) {
            handlePrintBarcode(productData as any);
          }
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

  // Camera Barcode Scanner for Form Hook
  useEffect(() => {
    if (!isFormCameraOpen) return;

    const timer = setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode("form-reader");
        formQrCodeRef.current = html5QrCode;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ];

        const onScanSuccess = (decodedText: string) => {
          playBeepSound();
          setNewProduct(prev => ({ ...prev, barcode: decodedText }));
          toast.success(`تم قراءة الباركود: ${decodedText}`);
          
          if (formQrCodeRef.current && formQrCodeRef.current.isScanning) {
            formQrCodeRef.current.stop().then(() => {
              setIsFormCameraOpen(false);
            }).catch(err => {
              console.error("Failed to stop form scanner on success", err);
              setIsFormCameraOpen(false);
            });
          } else {
            setIsFormCameraOpen(false);
          }
        };

        html5QrCode.start(
          { facingMode: "environment" },
          { 
            fps: 15, 
            formatsToSupport: formatsToSupport,
            qrbox: (width, height) => {
              return { width: Math.min(width * 0.8, 300), height: 120 };
            }
          },
          onScanSuccess,
          () => {}
        ).catch(err => {
          console.error("Error starting form html5QrCode:", err);
          toast.error("لم نتمكن من تشغيل الكاميرا تلقائياً. تأكد من إعطاء الصلاحية.");
        });
      } catch (e) {
        console.error("Form scanner setup failed:", e);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (formQrCodeRef.current) {
        const instance = formQrCodeRef.current;
        if (instance.isScanning) {
          instance.stop().catch(err => console.error("Form cleanup stop failed", err));
        }
        formQrCodeRef.current = null;
      }
    };
  }, [isFormCameraOpen]);

  const handleGenerateBarcode = () => {
    const category = newProduct.category || 'accessory';
    
    const prefixes: Record<string, string> = {
      phone: '10',
      charger: '20',
      cable: '30',
      wired_earphone: '40',
      bluetooth_earphone: '41',
      headphone: '42',
      accessory: '43',
      part: '50',
      electronic: '90'
    };
    
    const prefix = prefixes[category] || '99';
    
    const barcodes = (products || [])
      .filter(p => p.category === category)
      .map(p => {
        const match = p.name.match(/Barcode:\s*(\d+)/i);
        if (!match) return null;
        const num = parseInt(match[1]);
        // Only accept valid integers that are exactly 8 digits and start with our prefix
        if (!isNaN(num) && Number.isSafeInteger(num) && match[1].length === 8 && match[1].startsWith(prefix)) {
          return num;
        }
        return null;
      })
      .filter((v): v is number => v !== null);

    let nextNumber = parseInt(`${prefix}000001`); // Start sequence 8 digits
    if (barcodes.length > 0) {
      const maxVal = Math.max(...barcodes);
      if (!isNaN(maxVal) && Number.isSafeInteger(maxVal)) {
        nextNumber = maxVal + 1;
      }
    }

    const generatedBarcode = String(nextNumber);
    setNewProduct(prev => ({ ...prev, barcode: generatedBarcode }));
    toast.success(`تم توليد باركود: ${generatedBarcode}`);
  };

  const closeModal = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewProduct({ name: '', price: 0, wholesale_price: 0, cost: 0, category: 'accessory', stock: 0, imei: '', barcode: '' });
  };

  const startEdit = (product: Product) => {
    let displayName = product.name;
    let imei = '';
    let barcode = '';

    // Parse Barcode
    const barcodeMatch = displayName.match(/(.+)\s*-\s*Barcode:\s*(\w+)/i);
    if (barcodeMatch) {
      displayName = barcodeMatch[1].trim();
      barcode = barcodeMatch[2].trim();
    }

    // Parse IMEI
    const imeiMatch = displayName.match(/(.+)\s*-\s*IMEI:\s*(\w+)/i);
    if (imeiMatch) {
      displayName = imeiMatch[1].trim();
      imei = imeiMatch[2].trim();
    }

    setNewProduct({ 
      name: displayName, 
      price: product.price, 
      wholesale_price: product.wholesale_price || 0, 
      cost: product.cost, 
      category: product.category, 
      stock: product.stock,
      imei: imei,
      barcode: barcode
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

  const handleUpdateStock = async (product: Product, delta: number) => {
    const newStock = Math.max(0, (product.stock || 0) + delta);
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', product.id);
      
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
      toast.success('تم تحديث الكمية بنجاح');
    } catch (err) {
      console.error('Error updating stock:', err);
      toast.error('حصلت مشكلة أثناء تعديل الكمية!');
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
            onClick={() => setShowCatManager(true)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all flex-1 sm:flex-none text-sm"
          >
            <Filter size={18} />
            إدارة التصنيفات
          </button>
          <button 
            onClick={() => { setIsAdding(true); setEditingId(null); setNewProduct({name:'', price:0, wholesale_price:0, cost:0, category:'accessory', stock:0}); }}
            className="bg-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl w-full sm:w-auto active:scale-95 transition-all text-sm"
          >
            <Plus size={18} />
            {editingId ? 'تعديل الصنف' : 'إضافة بضاعة'}
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
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">قيمة الجملة:</span>
                    <span className="font-black text-amber-600">{data.totalWholesale.toLocaleString()} ج</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">قيمة القطاعي:</span>
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h4 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Settings2 size={24} className="text-indigo-600" />
                  إدارة التصنيفات
                </h4>
                <p className="text-[10px] font-bold text-slate-400 mt-1">نظّم بضاعتك حسب اختيارك</p>
              </div>
              <button onClick={() => setShowCatManager(false)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Package size={12} /> بضاعة عامة (إكسسوارات)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {customCategories.map(cat => (
                      <div key={cat} className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-2 group shadow-sm">
                        <span className="text-sm font-bold">{getCategoryLabel(cat)}</span>
                        <button onClick={() => removeCategory(cat, 'general')} className="text-slate-300 hover:text-red-500 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                    <Filter size={12} /> قطع غيار (للورشة)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {partCategories.map(cat => (
                      <div key={cat} className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-2 group shadow-sm">
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{getCategoryLabel(cat)}</span>
                        <button onClick={() => removeCategory(cat, 'part')} className="text-blue-300 hover:text-red-500 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase mr-2">اسم التصنيف الجديد</label>
                  <input 
                    type="text" 
                    placeholder="شاشات، بطاريات، جرابات..." 
                    className="w-full p-4 rounded-2xl border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 text-right font-bold focus:border-indigo-500 outline-none transition-all shadow-sm"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex bg-white dark:bg-slate-900 p-1 rounded-2xl border-2 border-white dark:border-slate-800 shadow-sm">
                    <button 
                      onClick={() => setNewCatType('general')}
                      className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${newCatType === 'general' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      إكسسوار / بضاعة
                    </button>
                    <button 
                      onClick={() => setNewCatType('part')}
                      className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${newCatType === 'part' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      قطعة غيار
                    </button>
                  </div>

                  <button 
                    onClick={addCategory}
                    className="bg-slate-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:opacity-90 active:scale-95 transition-all text-sm"
                  >
                    إضافة الآن
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 overflow-hidden">
            
            {/* Header */}
            <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold">
                  {editingId ? '✏️' : '✨'}
                </div>
                <div className="text-right">
                  <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-tight">
                    {editingId ? 'تعديل الصنف' : 'إضافة صنف جديد'}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-400">
                    {editingId ? 'تحديث بيانات وسعر ومخزون الصنف' : 'إضافة منتج أو قطعة غيار للمخزن'}
                  </p>
                </div>
              </div>
              <button 
                onClick={closeModal} 
                className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="product-form" onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 no-scrollbar">
              
              {/* SECTION 1: الأساسيات (اسم المنتج والباركود) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                
                {/* اسم المنتج */}
                <div className="space-y-1 text-right">
                  <label className="text-[11px] font-black text-slate-500 uppercase flex items-center justify-between">
                    <span className="text-red-500 font-bold">* اسم المنتج أو الصنف</span>
                    <span className="text-[10px] text-slate-400 font-normal">واضح ومختصر</span>
                  </label>
                  <input 
                    placeholder="مثال: شاشة اوبو A76 أصلية / كابل تايب سي..." 
                    required 
                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right font-bold text-sm sm:text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all" 
                    value={newProduct.name} 
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                  />
                </div>

                {/* الباركود مع أزرار سريعة ومدمجة */}
                <div className="space-y-1 text-right">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-500">رمز الباركود (Barcode)</label>
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button" 
                        onClick={handleGenerateBarcode}
                        className="text-[10px] bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg font-black hover:bg-indigo-200 transition-all flex items-center gap-1 active:scale-95"
                      >
                        ⚡ توليد باركود
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsFormCameraOpen(true)}
                        className="text-[10px] bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg font-black hover:bg-blue-200 transition-all flex items-center gap-1 active:scale-95"
                      >
                        📷 سكان
                      </button>
                    </div>
                  </div>
                  <input 
                    placeholder="امسح بالاسكنر أو اكتب الباركود..." 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right font-mono font-bold text-sm focus:border-indigo-500 outline-none transition-all" 
                    value={newProduct.barcode || ''} 
                    onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} 
                  />
                </div>

                {/* IMEI للهواتف (اختياري) */}
                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-slate-400">رقم IMEI (اختياري للهواتف فقط)</label>
                  <input 
                    placeholder="15 رقم للـ IMEI..." 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right font-mono font-bold text-xs focus:border-indigo-500 outline-none transition-all" 
                    value={newProduct.imei || ''} 
                    onChange={e => setNewProduct({...newProduct, imei: e.target.value})} 
                  />
                </div>

              </div>

              {/* SECTION 2: الأسعار والمخزون في شبكة واحدة مدمجة وأنيقة */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">💰 الأسعار والمخزون</span>
                  <span className="text-[10px] text-slate-400 font-bold">بالجنيه المصري</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* الكمية */}
                  <div className="space-y-1 text-right bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-black text-slate-500 block">📦 الكمية</label>
                    <div className="flex items-center gap-1">
                      <button 
                        type="button"
                        onClick={() => setNewProduct({...newProduct, stock: Math.max(0, (newProduct.stock || 0) - 1)})}
                        className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-500 rounded-lg text-xs font-black transition-colors"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        inputMode="numeric"
                        required 
                        className="w-full py-0.5 text-center font-black text-sm sm:text-base text-slate-800 dark:text-white bg-transparent outline-none" 
                        value={newProduct.stock ?? ''} 
                        onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} 
                      />
                      <button 
                        type="button"
                        onClick={() => setNewProduct({...newProduct, stock: (newProduct.stock || 0) + 1})}
                        className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg text-xs font-black transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* سعر التكلفة */}
                  <div className="space-y-1 text-right bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-black text-slate-500 block">🏷️ التكلفة (عليك)</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      placeholder="0" 
                      required 
                      className="w-full py-0.5 text-center font-black text-sm sm:text-base text-slate-700 dark:text-slate-200 bg-transparent outline-none" 
                      value={newProduct.cost ?? ''} 
                      onChange={e => setNewProduct({...newProduct, cost: Number(e.target.value)})} 
                    />
                  </div>

                  {/* سعر البيع للزبون */}
                  <div className="space-y-1 text-right bg-emerald-50/60 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40">
                    <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 block">💵 سعر البيع</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      placeholder="0" 
                      required 
                      className="w-full py-0.5 text-center font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400 bg-transparent outline-none" 
                      value={newProduct.price ?? ''} 
                      onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} 
                    />
                  </div>

                  {/* سعر الجملة */}
                  <div className="space-y-1 text-right bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-xl border border-blue-200/80 dark:border-blue-800/40">
                    <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 block">🏬 سعر الجملة</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      placeholder="0" 
                      className="w-full py-0.5 text-center font-black text-sm sm:text-base text-blue-600 dark:text-blue-400 bg-transparent outline-none" 
                      value={newProduct.wholesale_price ?? ''} 
                      onChange={e => setNewProduct({...newProduct, wholesale_price: Number(e.target.value)})} 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: التصنيفات والمجموعات (مدمجة وسلسة) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                
                {/* 1. اختر نوع البضاعة (المجموعة الرئيسية) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase">1. نوع البضاعة:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {GROUPS.map(group => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setActiveGroup(group.id as any)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl transition-all font-black text-xs border ${
                          activeGroup === group.id 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-base">{group.icon}</span>
                        <span>{group.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. اختر التصنيف الفرعي */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-500">2. التصنيف الفرعي:</span>
                    <span className="text-[9px] text-slate-400 font-bold">اختر صنفاً</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto no-scrollbar p-0.5">
                    {getGroupCategories(activeGroup).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewProduct({...newProduct, category: cat})}
                        className={`p-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 text-center relative ${
                          newProduct.category === cat 
                            ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 shadow-sm ring-1 ring-indigo-500' 
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-200'
                        }`}
                      >
                        {newProduct.category === cat && (
                          <div className="absolute top-1 right-1 text-indigo-600 dark:text-indigo-400">
                            <CheckCircle2 size={12} />
                          </div>
                        )}
                        <span className="text-lg leading-none">{CATEGORY_ICONS[cat] || '📦'}</span>
                        <span className={`font-black text-[10px] leading-tight truncate w-full ${newProduct.category === cat ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>
                          {getCategoryLabel(cat)}
                        </span>
                      </button>
                    ))}

                    {/* Quick Add Button */}
                    <button 
                      type="button"
                      onClick={() => setShowCatManager(true)}
                      className="p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all active:scale-95"
                    >
                      <Plus size={16} />
                      <span className="font-black text-[9px]">أضف تصنيف</span>
                    </button>
                  </div>
                </div>

              </div>

            </form>

            {/* Sticky Bottom Action Bar */}
            <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 z-20">
              <button 
                type="button" 
                onClick={closeModal} 
                className="flex-1 py-3 text-slate-500 font-black text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all text-center"
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                form="product-form"
                disabled={isSaving}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm sm:text-base rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : <CheckCircle2 size={18} />}
                <span>{editingId ? 'حفظ التعديلات' : 'إضافة للمخزن'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col gap-4 transition-colors duration-300">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="دور على البضاعة اللي عندك..." className="w-full pr-12 pl-4 py-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-right font-bold transition-colors duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              الكل
            </button>
            {Array.from(new Set((products || []).map(p => p.category))).map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  filter === cat 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center">
              <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Package size={40} />
              </div>
              <p className="font-black text-slate-400">مفيش نتائج للبحث ده..</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="bg-white dark:bg-slate-800/50 rounded-[2rem] border border-gray-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                       <button onClick={() => deleteProduct(product.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="حذف الصنف">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => startEdit(product)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="تعديل الصنف">
                        <Edit size={16} />
                      </button>
                      {product.name.includes('- Barcode:') && (
                        <button onClick={() => handlePrintBarcode(product)} className="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="طباعة ملصق الباركود حراري">
                          <Printer size={16} />
                        </button>
                      )}
                    </div>
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] px-3 py-1 rounded-full font-black">
                      {getCategoryLabel(product.category)}
                    </span>
                  </div>

                  <div className="text-right space-y-1 mb-4">
                    <div className="font-black text-slate-800 dark:text-white text-base truncate" title={product.name.replace(/\s*-\s*Barcode:\s*\S+/i, '').replace(/\s*-\s*IMEI:\s*\S+/i, '').trim()}>
                      {product.name.replace(/\s*-\s*Barcode:\s*\S+/i, '').replace(/\s*-\s*IMEI:\s*\S+/i, '').trim()}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleUpdateStock(product, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-500 hover:text-red-500 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-base transition-all active:scale-90"
                          title="تقليل المخزون بمقدار 1"
                        >
                          -
                        </button>
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${product.stock <= 2 ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 animate-pulse' : 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'}`}>
                          متبقي: {product.stock} حتة
                        </span>
                        <button
                          onClick={() => handleUpdateStock(product, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-500 hover:text-emerald-500 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-base transition-all active:scale-90"
                          title="زيادة المخزون بمقدار 1"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
                    <div className="text-right border-l border-slate-200 dark:border-slate-700 pr-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase mb-1">واقف عليك بـ</div>
                      <div className="text-sm font-black text-slate-600 dark:text-slate-300">{product.cost} <span className="text-[10px]">ج</span></div>
                    </div>
                    <div className="text-right pr-2">
                      <div className="text-[9px] font-black text-indigo-500 uppercase mb-1">سعر البيع</div>
                      <div className="text-sm font-black text-indigo-600">{product.price} <span className="text-[10px]">ج</span></div>
                      <div className="text-[9px] font-black text-blue-500 mt-1">جملة: {product.wholesale_price || 0} ج</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Camera Barcode Scanner Modal for Form */}
      {isFormCameraOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md font-['Cairo']" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl text-right space-y-6 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                📷 قارئ باركود الكاميرا (للمخزن)
              </h3>
              <button 
                onClick={() => setIsFormCameraOpen(false)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 font-bold">يرجى السماح بالوصول للكاميرا ووضع الباركود أمام العدسة لقراءته.</p>
            
            <div className="bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-inner min-h-[300px] flex items-center justify-center text-white">
              <div id="form-reader" className="w-full"></div>
            </div>
            
            <button
              onClick={() => setIsFormCameraOpen(false)}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all text-sm"
            >
              إلغاء وإغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
