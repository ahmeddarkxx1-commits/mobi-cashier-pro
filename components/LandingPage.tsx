import React, { useState } from 'react';
import { Smartphone, ShieldCheck, Zap, BarChart3, Users, Star, ArrowLeft, CheckCircle2, Layout, Database, Wrench, Wallet, PhoneCall, Globe, ArrowRight, Download, CreditCard, Sparkles, TrendingUp, MessageCircle } from 'lucide-react';

interface LandingPageProps {
  onSelectPlan: (plan: 'BASIC' | 'PRO' | 'BUSINESS', duration: '1' | '3' | '12') => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectPlan, onLogin }) => {
  const [billingCycle, setBillingCycle] = useState<'1' | '3' | '12'>('1');

  const getPrice = (base: number) => {
    if (billingCycle === '3') return Math.floor(base * 3 * 0.9); // 10% discount
    if (billingCycle === '12') return Math.floor(base * 10); // 2 months free
    return base;
  };

  const getCycleText = () => {
    if (billingCycle === '3') return '3 أشهر';
    if (billingCycle === '12') return 'سنة كاملة';
    return 'شهر';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-['Cairo'] selection:bg-emerald-500/30 overflow-x-hidden scroll-smooth" dir="rtl">
      {/* Premium Minimalist Background */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="p-2 bg-emerald-600 rounded-xl shadow-sm shrink-0">
              <Smartphone size={18} className="text-white" />
            </div>
            <span className="text-base sm:text-xl font-black tracking-tight text-white font-sans truncate">Mobi Cashier Pro</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <button onClick={onLogin} className="text-xs sm:text-sm font-black text-slate-300 hover:text-white transition-colors px-2 sm:px-4 py-2">
              دخول
            </button>
            <button 
              onClick={onLogin} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs font-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 whitespace-nowrap"
            >
              اشترك الآن
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-44 pb-24 z-10">
        <div className="container mx-auto px-6 text-center">
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.1] mb-8 tracking-tight text-white">
            حول محلك إلى <br />
            <span className="text-emerald-500">
              منظومة ذكية
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl text-slate-400 mb-14 max-w-3xl mx-auto font-medium leading-relaxed">
            النظام المتكامل رقم #1 لإدارة محلات الموبايلات والصيانة في مصر والوطن العربي. 
            جرد، كاشير، حسابات، ونواقص.. كله في جيبك.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button onClick={() => {
              document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
            }} className="w-full sm:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-lg transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95">
              ابدأ الآن بخصم 30%
              <ArrowLeft size={22} />
            </button>
          </div>

          {/* Trust Badge */}
          <div className="mt-20 flex flex-wrap justify-center items-center gap-10 opacity-40 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2 font-black text-xl"><ShieldCheck /> آمن 100%</div>
            <div className="flex items-center gap-2 font-black text-xl"><Globe /> سحابي</div>
            <div className="flex items-center gap-2 font-black text-xl"><Star /> 4.9 تقييم</div>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="py-12 sm:py-20 z-10 relative border-y border-white/5 bg-slate-900/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 text-center">
          <div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-500 mb-2">+1500</div>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">محل مشترك</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-indigo-500 mb-2">+10M</div>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">عملية بيع</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-cyan-500 mb-2">99.9%</div>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">وقت التشغيل</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-purple-500 mb-2">24/7</div>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">دعم فني</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative z-10">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6">قوة التحكم في <span className="text-emerald-500">قبضة يدك</span></h2>
            <p className="text-slate-400 text-lg">صممنا كل ميزة بدقة لتناسب احتياجات تاجر الموبايلات وفني الصيانة المحترف.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap size={30} />}
              title="كاشير فائق السرعة"
              desc="بيع الأجهزة والإكسسوارات بلمسة واحدة. حساب تلقائي للأرباح، دعم كامل للباركود، وطباعة فواتير حرارية."
              gradient="from-amber-500/20 to-orange-500/20"
              iconColor="text-amber-400"
            />
            <FeatureCard 
              icon={<Database size={30} />}
              title="إدارة المخزن الذكية"
              desc="جرد حي لحظة بلحظة. تنبيهات تلقائية للبضاعة الناقصة، وإدارة كاملة للموديلات والألوان والباركودات."
              gradient="from-emerald-500/20 to-teal-500/20"
              iconColor="text-emerald-400"
            />
            <FeatureCard 
              icon={<Wrench size={30} />}
              title="منظومة صيانة متكاملة"
              desc="استلم أجهزة الزبائن، حدد الأعطال والتكاليف، وتابع حالة التصليح مع إشعارات للزبائن فور الانتهاء."
              gradient="from-purple-500/20 to-pink-500/20"
              iconColor="text-purple-400"
            />
            <FeatureCard 
              icon={<BarChart3 size={30} />}
              title="تقارير مالية دقيقة"
              desc="شاهد أرباحك الصافية يومياً وشهرياً. تحليل شامل للمبيعات، المصروفات، وأداء الموظفين برسوم بيانية."
              gradient="from-blue-500/20 to-cyan-500/20"
              iconColor="text-blue-400"
            />
            <FeatureCard 
              icon={<Wallet size={30} />}
              title="كشكول الديون والآجل"
              desc="نظم حسابات الزبائن والموردين. سجل الدفعات، المتبقي، وتواريخ السداد لضمان حقك دائماً."
              gradient="from-red-500/20 to-rose-500/20"
              iconColor="text-red-400"
            />
            <FeatureCard 
              icon={<TrendingUp size={30} />}
              title="إدارة النواقص والطلبيات"
              desc="النظام يضيف تلقائياً أي صنف يخلص من المخزن لقائمة النواقص عشان متنساش تطلبه من المورد."
              gradient="from-indigo-500/20 to-blue-500/20"
              iconColor="text-indigo-400"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative z-10 bg-slate-900/30 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6">باقات مرنة لكل <span className="text-indigo-500">طموح</span></h2>
            <p className="text-slate-400 text-lg mb-12">ابدأ بالباقة اللي تناسب حجم محلك النهاردة، واكبر معانا بكرة.</p>
            
            {/* Custom Billing Toggle - Improved for Mobile */}
            <div className="flex justify-center mb-10 overflow-x-auto no-scrollbar max-w-full px-4">
              <div className="inline-flex items-center p-1 bg-slate-950 rounded-2xl border border-white/5 shadow-inner whitespace-nowrap">
                <button onClick={() => setBillingCycle('1')} className={`px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all ${billingCycle === '1' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>شهري</button>
                <button onClick={() => setBillingCycle('3')} className={`px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all ${billingCycle === '3' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                  3 شهور 
                  <span className={`text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-md mr-1.5 ${billingCycle === '3' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>وفر 10%</span>
                </button>
                <button onClick={() => setBillingCycle('12')} className={`px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all ${billingCycle === '12' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                  سنوي 
                  <span className={`text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-md mr-1.5 ${billingCycle === '12' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'}`}>هدية🎁</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Basic Plan */}
            <PricingCard 
              title="الباقة العادية"
              price={getPrice(180)}
              oldPrice={getPrice(250)}
              cycle={getCycleText()}
              desc="المثالية للمحلات الصغيرة في بداية طريقها."
              features={[
                "كاشير مبيعات سريع",
                "إدارة مخزن محدودة",
                "تقرير مبيعات يومي",
                "مستخدم واحد فقط",
                "دعم فني عبر الواتساب"
              ]}
              buttonText="ابدأ النسخة العادية"
              onAction={() => onSelectPlan('BASIC', billingCycle)}
              icon={<Layout className="text-slate-400" />}
            />

            {/* Pro Plan */}
            <PricingCard 
              title="باقة المحترف (PRO)"
              price={getPrice(350)}
              oldPrice={getPrice(500)}
              cycle={getCycleText()}
              desc="الباقة الأكثر طلباً، شاملة لكل شيء تحتاجه."
              features={[
                "كل مميزات الباقة العادية",
                "منظومة صيانة متكاملة",
                "إدارة الديون والآجل",
                "عدد غير محدود من الموظفين",
                "تقارير أرباح متقدمة",
                "دعم فني متميز"
              ]}
              buttonText="اشترك في باقة المحترف"
              highlighted
              onAction={() => onSelectPlan('PRO', billingCycle)}
              icon={<Star className="text-amber-400" />}
            />

            {/* Business Plan */}
            <PricingCard 
              title="باقة الأعمال (Business)"
              price={getPrice(600)}
              oldPrice={getPrice(850)}
              cycle={getCycleText()}
              desc="للمؤسسات والشركات الكبيرة ذات الفروع."
              features={[
                "كل مميزات باقة الـ PRO",
                "إدارة فروع متعددة",
                "ربط الفروع ببعضها",
                "تحويل بضاعة بين الفروع",
                "لوحة تحكم إدارية مركزية",
                "مدير حسابات خاص"
              ]}
              buttonText="اشترك في باقة الأعمال"
              onAction={() => onSelectPlan('BUSINESS', billingCycle)}
              icon={<Globe className="text-blue-400" />}
            />
          </div>
        </div>
      </section>

      {/* Support & Help Section - For Lost Users */}
      <section id="support" className="py-24 relative z-10 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/20 rounded-[3rem] p-8 md:p-16 text-center shadow-2xl">
            <div className="w-20 h-20 bg-emerald-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
              <MessageCircle size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-white">تايه ومش عارف تبدأ منين؟ 🤔</h2>
            <p className="text-slate-400 text-lg md:text-xl mb-12 leading-relaxed">
              لا تقلق، نحن معك في كل خطوة. انضم لقناتنا الرسمية لمشاهدة فيديوهات الشرح، أو تواصل معنا مباشرة على الواتساب وسنقوم بمساعدتك في إعداد حسابك فوراً.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a 
                href="https://whatsapp.com/channel/0029VbDO2IV4dTnTLatpja2u" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-10 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 active:scale-95"
              >
                <Store size={24} />
                قناة الشروحات (واتساب)
              </a>
              <a 
                href="https://wa.me/201152628515" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-lg transition-all border border-white/5 flex items-center justify-center gap-3 active:scale-95"
              >
                <PhoneCall size={24} />
                تواصل مع المبرمج
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-32 relative z-10">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-900 rounded-[3.5rem] p-12 md:p-24 text-center relative overflow-hidden shadow-3xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48" />
            <h2 className="text-4xl md:text-6xl font-black mb-8 relative z-10">مستعد لتطوير محلك؟</h2>
            <p className="text-emerald-100 text-lg md:text-xl mb-12 max-w-2xl mx-auto relative z-10">انضم لأكثر من 1500 صاحب محل في الوطن العربي يديرون أعمالهم بذكاء وسهولة.</p>
            <button 
              onClick={onLogin}
              className="px-12 py-5 bg-white text-emerald-900 rounded-2xl font-black text-xl hover:bg-emerald-50 transition-all shadow-xl active:scale-95 relative z-10"
            >
              سجل حسابك مجاناً الآن
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 relative z-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-xl">
              <Smartphone size={22} className="text-emerald-400" />
            </div>
            <span className="text-xl font-black text-white font-sans">Mobi Cashier Pro</span>
          </div>
          <p className="text-slate-500 font-bold">جميع الحقوق محفوظة &copy; {new Date().getFullYear()} - Al3alme Systems</p>
          <div className="flex items-center gap-6 text-slate-400">
            <a href="https://wa.me/201152628515" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-emerald-400 transition-colors bg-slate-900 px-4 py-2 rounded-xl border border-white/5">
              <span className="text-sm font-bold text-white" dir="ltr">01152628515</span>
              <MessageCircle size={18} className="text-emerald-500" />
            </a>
            <PhoneCall size={20} className="hover:text-emerald-400 cursor-pointer transition-colors" />
            <CreditCard size={20} className="hover:text-emerald-400 cursor-pointer transition-colors" />
            <ShieldCheck size={20} className="hover:text-emerald-400 cursor-pointer transition-colors" />
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/201152628515" 
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 bg-[#25D366] hover:bg-[#1EBE5D] text-white py-3 px-6 rounded-full shadow-2xl shadow-[#25D366]/40 transition-all hover:scale-105 hover:-translate-y-1 flex items-center gap-3 border border-[#25D366]/50 animate-bounce"
        style={{ animationDuration: '3s' }}
      >
        <span className="font-black text-sm">استفسار؟ تواصل واتساب</span>
        <MessageCircle size={24} />
      </a>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, gradient, iconColor }: any) => (
  <div className="group bg-slate-900/40 border border-white/5 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] hover:bg-slate-800/60 transition-all hover:-translate-y-2 relative overflow-hidden backdrop-blur-sm">
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-950 flex items-center justify-center mb-6 sm:mb-8 relative z-10 ${iconColor} group-hover:scale-110 transition-transform shadow-xl`}>
      {icon}
    </div>
    <h3 className="text-xl sm:text-2xl font-black mb-4 relative z-10 text-white">{title}</h3>
    <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-bold relative z-10 group-hover:text-slate-300 transition-colors">{desc}</p>
  </div>
);

const PricingCard = ({ title, price, oldPrice, cycle, desc, features, buttonText, highlighted, onAction, icon }: any) => (
  <div className={`relative flex flex-col p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] transition-all hover:scale-[1.02] ${
    highlighted 
    ? 'bg-gradient-to-b from-emerald-600 to-teal-900 text-white shadow-2xl shadow-emerald-600/30 z-10 border border-emerald-400/30' 
    : 'bg-slate-900/50 text-slate-300 border border-white/5'
  }`}>
    {highlighted && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-2 rounded-full text-[10px] font-black shadow-xl tracking-widest uppercase">
        القيمة الأفضل
      </div>
    )}
    
    <div className="flex items-center justify-between mb-6 sm:mb-8">
      <div className={`p-3 sm:p-4 rounded-2xl ${highlighted ? 'bg-white/10' : 'bg-slate-950'}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest ${highlighted ? 'text-emerald-100' : 'text-slate-500'}`}>{title}</span>
    </div>

    <div className="mb-4 flex flex-col gap-1">
      {oldPrice && (
        <div className="flex items-center gap-2">
          <span className={`text-xl line-through font-bold tabular-nums opacity-60 ${highlighted ? 'text-emerald-100' : 'text-slate-500'}`}>
            {oldPrice.toLocaleString()} ج.م
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${highlighted ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400'}`}>خصم خاص</span>
        </div>
      )}
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-6xl font-black tracking-tighter tabular-nums text-white">{price.toLocaleString()}</span>
        <span className={`text-lg font-bold ${highlighted ? 'text-emerald-200' : 'text-slate-500'}`}>ج.م / {cycle}</span>
      </div>
    </div>
    
    <p className={`text-sm mb-10 font-bold leading-relaxed ${highlighted ? 'text-emerald-100' : 'text-slate-400'}`}>{desc}</p>
    
    <div className="h-px w-full bg-white/10 mb-10" />

    <ul className="space-y-5 mb-12 flex-grow">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-center gap-3 font-bold text-sm">
          <CheckCircle2 size={18} className={highlighted ? "text-emerald-200" : "text-emerald-500"} />
          <span>{f}</span>
        </li>
      ))}
    </ul>

    <button 
      onClick={onAction}
      className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95 ${
        highlighted 
        ? 'bg-white text-emerald-900 hover:bg-emerald-50' 
        : 'bg-emerald-600 text-white hover:bg-emerald-500'
      }`}
    >
      {buttonText}
    </button>
  </div>
);

export default LandingPage;
