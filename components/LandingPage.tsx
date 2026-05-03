import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  ArrowLeft, 
  CheckCircle2, 
  Database, 
  Wrench, 
  Wallet, 
  PhoneCall, 
  Globe, 
  ArrowRight, 
  Sparkles, 
  MessageCircle, 
  Store,
  AlertCircle,
  Clock,
  Target,
  ArrowDown,
  Star,
  Users,
  Shield,
  Layers,
  ChevronLeft,
  Quote
} from 'lucide-react';

interface LandingPageProps {
  onSelectPlan: (plan: 'BASIC' | 'PRO' | 'BUSINESS', duration: '1' | '3' | '12') => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectPlan, onLogin }) => {
  const [billingCycle, setBillingCycle] = useState<'1' | '3' | '12'>('1');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getPrice = (base: number) => {
    if (billingCycle === '3') return Math.floor(base * 3 * 0.9);
    if (billingCycle === '12') return Math.floor(base * 10);
    return base;
  };

  const getCycleText = () => {
    if (billingCycle === '3') return '3 أشهر';
    if (billingCycle === '12') return 'سنة كاملة';
    return 'شهر';
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-['Cairo'] selection:bg-emerald-500/30 overflow-x-hidden scroll-smooth" dir="rtl">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] bg-indigo-600/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Modern Glass Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'py-3 bg-slate-950/80 backdrop-blur-2xl border-b border-white/10' : 'py-6 bg-transparent'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl shadow-emerald-600/20 rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              <Smartphone size={24} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-white font-sans tracking-tighter leading-none">Mobi Cashier Pro</span>
              <span className="text-[10px] font-black text-emerald-500 tracking-widest uppercase opacity-80">Smart Shop Manager</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 ml-auto mr-12">
            <a href="#features" className="text-sm font-bold text-slate-400 hover:text-emerald-400 transition-colors">المميزات</a>
            <a href="#how-it-works" className="text-sm font-bold text-slate-400 hover:text-emerald-400 transition-colors">كيف يعمل؟</a>
            <a href="#pricing" className="text-sm font-bold text-slate-400 hover:text-emerald-400 transition-colors">الأسعار</a>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={onLogin} className="text-sm font-black text-slate-200 hover:text-white transition-colors px-5 py-2.5 rounded-xl hover:bg-white/5">
              دخول
            </button>
            <button 
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="relative group bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 overflow-hidden active:scale-95"
            >
              <span className="relative z-10">ابدأ الآن</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Premium Reveal */}
      <header className="relative pt-48 pb-32 z-10 overflow-hidden">
        <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-right space-y-8">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-black tracking-wide animate-in fade-in slide-in-from-right-4 duration-700">
              <Sparkles size={16} className="animate-spin-slow" />
              <span>أقوى نظام إدارة محلات في مصر والوطن العربي</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tighter text-white animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              سيستم محلك.. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
                على وضع البرو!
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-400 max-w-2xl font-bold leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              موبي كاشير برو مش بس برنامج حسابات، ده "شريك نجاح" بيشيل عنك هم الجرد، لخبطة الصيانة، وتوهان الديون. ركز في البيع وسيب الإدارة علينا.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <button 
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-12 py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-black text-xl transition-all shadow-2xl shadow-emerald-600/40 flex items-center justify-center gap-3 active:scale-95 group"
              >
                جرب مجاناً لمدة أسبوع
                <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <a 
                href="https://wa.me/201152628515" 
                className="w-full sm:w-auto px-10 py-6 bg-slate-900/50 hover:bg-slate-800 text-white rounded-[2rem] font-black text-xl transition-all border border-white/10 backdrop-blur-xl flex items-center justify-center gap-3 active:scale-95"
              >
                <MessageCircle size={24} className="text-[#25D366]" />
                شات واتساب
              </a>
            </div>

            <div className="flex items-center gap-8 pt-8 opacity-60">
              <div className="text-center">
                <div className="text-2xl font-black text-white">+1,500</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">محل موبايلات</div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-white">+50k</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">عملية يومية</div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-white">24/7</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">دعم فني</div>
              </div>
            </div>
          </div>

          <div className="flex-1 relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
            <div className="relative z-10 bg-gradient-to-br from-slate-900 to-slate-950 p-3 rounded-[3.5rem] border border-white/10 shadow-[0_0_100px_rgba(16,185,129,0.1)] group transition-all duration-700 hover:rotate-1">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-[3.5rem] blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200" 
                alt="Mobi Cashier Pro Interface" 
                className="relative rounded-[3rem] w-full h-auto object-cover shadow-2xl"
              />
              {/* Floating Elements */}
              <div className="absolute -top-10 -left-10 p-6 bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl animate-bounce-slow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-400">صافي الأرباح</div>
                    <div className="text-xl font-black text-white">45,280 ج</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 p-6 bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl animate-bounce-slow" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                    <Wrench size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-400">أجهزة الصيانة</div>
                    <div className="text-xl font-black text-white">12 جهاز جاهز</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Pain Points Section - Emotional Connection */}
      <section className="py-32 bg-slate-950/50 border-y border-white/5 relative z-10">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-white tracking-tight">مشاكل محلات الموبايلات <span className="text-red-500">مبتخلصش..</span></h2>
            <p className="text-slate-400 text-xl font-bold">كل يوم بيعدي بالورقة والقلم هو يوم بيضيع فيه مكسبك وتعبك.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ProblemCard 
              icon={<AlertCircle size={32} />}
              title="توهان في المخزن"
              desc="مش عارف عندك كام شاشة ولا كام بطارية، والقطع بتخلص وأنت مش دريان فبتخسر بيعة أكيدة."
            />
            <ProblemCard 
              icon={<Clock size={32} />}
              title="خناقات الصيانة"
              desc="العميل يسألك جهازي خلص ولا لأ؟ تفتح الدفتر وتدور وتنسى العطل كان إيه أصلاً."
            />
            <ProblemCard 
              icon={<Target size={32} />}
              title="فلوسك عند الناس"
              desc="ديون العميل الفلاني، ومقدم العميل التاني.. اللخبطة دي بتطير فلوسك في الهوا."
            />
            <ProblemCard 
              icon={<BarChart3 size={32} />}
              title="مكسبك مجهول"
              desc="طلعت كام النهاردة؟ وإيه صافي ربحك؟ لو مش عارف أرقامك، يبقى أنت مش بتدير مشروع."
            />
          </div>
        </div>
      </section>

      {/* Features Grid - Solution Oriented */}
      <section id="features" className="py-40 relative z-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-end justify-between gap-8 mb-24">
            <div className="text-right space-y-4">
              <div className="text-emerald-500 font-black text-xs uppercase tracking-[0.3em]">نظام متكامل</div>
              <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight">ليه موبي كاشير برو <br /> <span className="text-emerald-500">أحسن اختيار ليك؟</span></h2>
            </div>
            <p className="text-slate-400 text-lg font-bold max-w-lg text-right leading-relaxed">
              إحنا بنينا السيستم ده بناءً على خبرة حقيقية مع مئات أصحاب المحلات، عشان نوفرلك كل اللي محتاجه في شاشة واحدة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <FeatureCard 
              icon={<Database size={32} />}
              title="جرد ذكي ولحظي"
              desc="اعرف رصيد كل قطعة، تكلفتها، ومكسبك المتوقع. النظام هينبهك برسالة أول ما قطعة تقرب تخلص."
              gradient="from-emerald-600/20 to-transparent"
            />
            <FeatureCard 
              icon={<Wrench size={32} />}
              title="إدارة ورشة الصيانة"
              desc="سجل استلام الأجهزة، التقارير الفنية، قطع الغيار المستهلكة، وحالة الإصلاح لحظة بلحظة."
              gradient="from-blue-600/20 to-transparent"
            />
            <FeatureCard 
              icon={<Wallet size={32} />}
              title="منظومة الديون والآجل"
              desc="سجل ديون العملاء ومدفوعات الموردين. البرنامج بيفكرك بمواعيد التحصيل عشان حقك ميروحش."
              gradient="from-purple-600/20 to-transparent"
            />
            <FeatureCard 
              icon={<Users size={32} />}
              title="تعدد الموظفين"
              desc="حدد صلاحيات لكل موظف (كاشير، فني، مدير). راقب حركة كل واحد فيهم ومنع أي تلاعب."
              gradient="from-orange-600/20 to-transparent"
            />
            <FeatureCard 
              icon={<Shield size={32} />}
              title="بياناتك في الحفظ"
              desc="بياناتك بتترفع لحظياً على سيرفراتنا السحابية المؤمنة. حتى لو الجهاز باظ، شغلك محفوظ."
              gradient="from-indigo-600/20 to-transparent"
            />
            <FeatureCard 
              icon={<Globe size={32} />}
              title="متابعة من أي مكان"
              desc="افتح البرنامج من موبايلك وأنت في البيت أو مسافر وشوف مبيعات المحل وأنت مستريح."
              gradient="from-pink-600/20 to-transparent"
            />
          </div>
        </div>
      </section>

      {/* Testimonials - Social Proof */}
      <section className="py-32 bg-slate-900/20 relative z-10 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-black mb-6">قالوا إيه عن <span className="text-emerald-500">التغيير؟</span></h2>
            <p className="text-slate-400 text-lg font-bold">أصحاب محلات زي محلك بالظبط، قرروا يسيبوا الورقة والقلم.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <TestimonialCard 
              name="أحمد محمود"
              role="صاحب محل iStore"
              text="السيستم ده بجد فرق معايا جداً، خصوصاً في الصيانة. كنت بنسى الجهاز دخل امتى وخدت كام مقدم، دلوقتي كل حاجة متسستمة والعميل بيبقى مرتاح."
              avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
            />
            <TestimonialCard 
              name="محمد ياسين"
              role="مدير فني في بروفيشنال موبايل"
              text="أكتر حاجة عجبتني هي جرد قطع الغيار. أول ما الشاشات بتقل عندي البرنامج بيبعتلي تنبيه، مبيحصلش عندي عجز بضاعة أبداً."
              avatar="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200"
              highlight
            />
            <TestimonialCard 
              name="هاني فاروق"
              role="مالك سلسلة محلات هاني فون"
              text="كنت خايف من موضوع السحابة والنت، بس بجد النظام سريع جداً ومبيوقعش. وأحلى حاجة إني بتابع المبيعات وأنا في البيت."
              avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section - Premium Toggle */}
      <section id="pricing" className="py-40 relative z-10">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-24 space-y-6">
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight">باقات تناسب <span className="text-emerald-500">حجم طموحك</span></h2>
            <p className="text-slate-400 text-xl font-bold">ابدأ بـ 7 أيام تجربة مجانية لكل المميزات. مفيش دفع مقدم، جرب واحكم بنفسك!</p>
            
            <div className="flex justify-center pt-8">
              <div className="inline-flex items-center p-1.5 bg-slate-900 rounded-[2rem] border border-white/10 shadow-inner">
                <button 
                  onClick={() => setBillingCycle('1')} 
                  className={`px-10 py-4 rounded-[1.5rem] text-sm font-black transition-all duration-300 ${billingCycle === '1' ? 'bg-emerald-600 text-white shadow-xl translate-x-1' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  شهري
                </button>
                <button 
                  onClick={() => setBillingCycle('12')} 
                  className={`px-10 py-4 rounded-[1.5rem] text-sm font-black transition-all duration-300 flex items-center gap-2 ${billingCycle === '12' ? 'bg-emerald-600 text-white shadow-xl -translate-x-1' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  سنوي <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded-full">وفر شهرين 🎁</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <PricingCard 
              title="الباقة الأساسية"
              price={getPrice(180)}
              cycle={getCycleText()}
              desc="المثالية للمحلات الصغيرة والمستقرة."
              features={["مبيعات وكاشير سريع", "جرد المخزن والباركود", "تقارير يومية وشهرية", "1 مستخدم فقط", "دعم فني واتساب"]}
              buttonText="ابدأ مجاناً"
              onAction={() => onSelectPlan('BASIC', billingCycle)}
              icon={<Store />}
            />
            <PricingCard 
              title="باقة المحترفين (PRO)"
              price={getPrice(350)}
              cycle={getCycleText()}
              desc="الباقة المتكاملة لكل احتياجات محلك."
              features={["كل مميزات الأساسية", "منظومة صيانة متطورة", "إدارة الديون والآجل", "عدد موظفين مفتوح", "صلاحيات مستخدمين دقيقة", "تقارير أرباح وصافي ربح"]}
              buttonText="ابدأ التجربة المجانية"
              highlighted
              onAction={() => onSelectPlan('PRO', billingCycle)}
              icon={<Zap />}
            />
            <PricingCard 
              title="باقة الشركات (Business)"
              price={getPrice(600)}
              cycle={getCycleText()}
              desc="لأصحاب الفروع والمؤسسات الكبيرة."
              features={["إدارة فروع متعددة", "ربط بضاعة الفروع", "لوحة تحكم مركزية", "مدير حسابات مخصص", "تعديلات خاصة للنظام"]}
              buttonText="تواصل معنا"
              onAction={() => onSelectPlan('BUSINESS', billingCycle)}
              icon={<Layers />}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section - Clean Accordion */}
      <section className="py-32 relative z-10 bg-slate-950/30 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-1/3 text-right space-y-6">
              <h2 className="text-4xl font-black text-white tracking-tight">أسئلة بتدور <br /> في بالك؟ 🤔</h2>
              <p className="text-slate-400 font-bold leading-relaxed">
                جمعنا لك أكتر الأسئلة اللي بتوصلنا من أصحاب المحلات. لو عندك سؤال تاني، كلمنا واتساب فوراً.
              </p>
              <a href="https://wa.me/201152628515" className="inline-flex items-center gap-2 text-emerald-500 font-black hover:gap-4 transition-all">
                اسألنا على واتساب <ArrowLeft size={18} />
              </a>
            </div>
            <div className="lg:w-2/3 space-y-4">
              <FAQItem question="هل البرنامج محتاج إنترنت دايماً؟" answer="البرنامج سحابي عشان تقدر تتابعه من أي مكان، ومحتاج إنترنت بسيط جداً (حتى لو باقة موبايل ضعيفة) هيشتغل معاك بكفاءة عالية." />
              <FAQItem question="إيه اللي يحصل لو نسيت أسجل ديون العميل؟" answer="موبي كاشير برو فيه خاصية 'تسجيل سريع' بتفكرك وأنت بتقفل الفاتورة لو العميل دفع ناقص، فبتسجل الدين بضغطة واحدة وبيروح لملف العميل تلقائياً." />
              <FAQItem question="هل بياناتي في أمان لو السيستم وقع؟" answer="إحنا بنستخدم سيرفرات جوجل ومايكروسوفت المؤمنة، وبناخد نسخة احتياطية من بياناتك كل 12 ساعة. بياناتك ملكك ومحفوظة بتشفير كامل." />
              <FAQItem question="أقدر أشغله على أكتر من جهاز؟" answer="أكيد! الباقة البرو بتسمحلك تفتحه من الكمبيوتر في المحل، ومن موبايلك وأنت بره، ومن تابلت الفني في الورشة، وكلهم مربوطين ببعض لحظياً." />
              <FAQItem question="هل فيه تدريب على استخدامه؟" answer="بمجرد ما تشترك، بنبعتلك فيديوهات شرح قصيرة لكل جزء في البرنامج، وفريق الدعم الفني موجود معاك خطوة بخطوة لحد ما تبقى محترف." />
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action - Mega Banner */}
      <section className="py-40 relative z-10 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="relative p-16 md:p-24 rounded-[4rem] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 shadow-[0_0_100px_rgba(16,185,129,0.3)] text-center overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -mr-64 -mt-64 group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/10 rounded-full blur-[80px] -ml-48 -mb-48"></div>
            
            <div className="relative z-10 space-y-10">
              <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight">
                المحل الشاطر.. <br /> هو اللي متسستم صح!
              </h2>
              <p className="text-emerald-100 text-xl md:text-2xl max-w-3xl mx-auto font-bold opacity-90 leading-relaxed">
                انضم لـ +1500 صاحب محل موبايلات غيروا حياتهم وبدأوا يديروا مشروعهم باحترافية. متضيعش وقت أكتر من كده.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <button 
                  onClick={onLogin}
                  className="w-full sm:w-auto px-16 py-7 bg-white text-emerald-900 rounded-[2.5rem] font-black text-2xl hover:bg-emerald-50 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                >
                  ابدأ تجربتك المجانية دلوقتي
                  <ArrowLeft size={28} />
                </button>
                <a 
                  href="https://wa.me/201152628515" 
                  className="w-full sm:w-auto px-10 py-7 bg-black/20 hover:bg-black/30 text-white rounded-[2.5rem] font-black text-xl transition-all border border-white/10 backdrop-blur-md flex items-center justify-center gap-3"
                >
                  <MessageCircle size={24} />
                  كلم خبير مبيعات
                </a>
              </div>
              
              <div className="pt-8 text-emerald-100/60 font-black text-sm tracking-widest uppercase">
                7 أيام تجربة مجانية • دعم فني مباشر • لا يلزم بطاقة ائتمان
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Professional & Clean */}
      <footer className="py-24 border-t border-white/5 relative z-10 bg-slate-950">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20 text-right">
            <div className="md:col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 rounded-2xl shadow-xl">
                  <Smartphone size={24} className="text-white" />
                </div>
                <span className="text-2xl font-black text-white font-sans tracking-tighter">Mobi Cashier Pro</span>
              </div>
              <p className="text-slate-500 font-bold max-w-sm leading-relaxed text-lg">
                بنساعد أصحاب محلات الموبايلات والصيانة في مصر والوطن العربي يسيطروا على حساباتهم ويكبّروا مشاريعهم بذكاء.
              </p>
              <div className="flex items-center gap-4">
                <SocialIcon icon={<MessageCircle size={20} />} href="https://wa.me/201152628515" />
                <SocialIcon icon={<Globe size={20} />} href="#" />
              </div>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-white font-black text-lg">روابط سريعة</h4>
              <ul className="space-y-4 text-slate-500 font-bold">
                <li><a href="#" className="hover:text-emerald-500 transition-colors">عن البرنامج</a></li>
                <li><a href="#features" className="hover:text-emerald-500 transition-colors">المميزات</a></li>
                <li><a href="#pricing" className="hover:text-emerald-500 transition-colors">الباقات</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">مركز المساعدة</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-white font-black text-lg">تواصل معنا</h4>
              <ul className="space-y-4 text-slate-500 font-bold">
                <li>المقر: القاهرة، مصر</li>
                <li>مبيعات: 01152628515</li>
                <li>دعم فني: 01000000000</li>
                <li>ايميل: info@al3alme.com</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-600 text-sm font-bold">
            <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()} - Al3alme Systems</p>
            <div className="flex items-center gap-8">
              <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
              <a href="#" className="hover:text-white transition-colors">شروط الاستخدام</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modern Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-[110] flex flex-col items-end gap-4">
        <a 
          href="https://wa.me/201152628515" 
          target="_blank" 
          rel="noreferrer"
          className="group relative flex items-center gap-4 bg-[#25D366] text-white p-2 pr-8 rounded-full shadow-2xl shadow-[#25D366]/40 transition-all hover:pr-10 active:scale-95"
        >
          <span className="font-black text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">اسألنا أي حاجة!</span>
          <div className="bg-white p-3 rounded-full text-[#25D366] shadow-inner">
            <MessageCircle size={28} />
          </div>
        </a>
      </div>
    </div>
  );
};

const ProblemCard = ({ icon, title, desc }: any) => (
  <div className="p-10 bg-slate-900/40 border border-white/5 rounded-[3rem] hover:bg-slate-900/60 transition-all group">
    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform">
      {icon}
    </div>
    <h3 className="text-2xl font-black mb-4 text-white">{title}</h3>
    <p className="text-slate-500 font-bold leading-relaxed text-sm">{desc}</p>
  </div>
);

const FeatureCard = ({ icon, title, desc, gradient }: any) => (
  <div className={`group p-10 bg-slate-900/40 border border-white/5 rounded-[3.5rem] hover:bg-slate-900/80 transition-all relative overflow-hidden`}>
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
    <div className="relative z-10">
      <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform text-emerald-500">
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-4 text-white">{title}</h3>
      <p className="text-slate-500 font-bold leading-relaxed group-hover:text-slate-300 transition-colors">{desc}</p>
    </div>
  </div>
);

const PricingCard = ({ title, price, cycle, desc, features, buttonText, highlighted, onAction, icon }: any) => (
  <div className={`relative flex flex-col p-12 rounded-[4rem] transition-all duration-500 hover:scale-[1.03] ${
    highlighted 
    ? 'bg-gradient-to-b from-emerald-600 to-teal-900 text-white shadow-[0_30px_100px_rgba(16,185,129,0.25)] z-10 border border-emerald-400/30' 
    : 'bg-slate-900/50 text-slate-300 border border-white/5 backdrop-blur-xl'
  }`}>
    {highlighted && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-slate-950 px-8 py-2.5 rounded-full text-xs font-black shadow-2xl tracking-widest uppercase">
        الباقة الأكثر طلباً ⭐
      </div>
    )}
    
    <div className="flex items-center gap-5 mb-10">
      <div className={`p-4 rounded-2xl ${highlighted ? 'bg-white/15' : 'bg-slate-950 border border-white/5 shadow-inner'}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 28, className: highlighted ? "text-white" : "text-emerald-500" })}
      </div>
      <h3 className="text-2xl font-black text-white">{title}</h3>
    </div>

    <div className="mb-8 flex items-baseline gap-2">
      <span className="text-7xl font-black tabular-nums tracking-tighter text-white">{price.toLocaleString()}</span>
      <span className={`text-lg font-black ${highlighted ? 'text-emerald-100' : 'text-slate-500'}`}>ج.م <span className="opacity-60">/ {cycle}</span></span>
    </div>
    
    <p className={`text-base mb-12 font-bold leading-relaxed ${highlighted ? 'text-emerald-100' : 'text-slate-400'}`}>{desc}</p>
    
    <div className={`h-px w-full mb-12 ${highlighted ? 'bg-white/10' : 'bg-white/5'}`} />

    <ul className="space-y-6 mb-16 flex-grow">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-start gap-4 font-bold text-sm group/item">
          <div className={`mt-1 p-0.5 rounded-full ${highlighted ? 'bg-emerald-400/20' : 'bg-emerald-500/10'}`}>
            <CheckCircle2 size={18} className={highlighted ? "text-emerald-300" : "text-emerald-500"} />
          </div>
          <span className="leading-tight group-hover/item:translate-x-1 transition-transform">{f}</span>
        </li>
      ))}
    </ul>

    <button 
      onClick={onAction}
      className={`w-full py-6 rounded-[2rem] font-black text-2xl transition-all shadow-2xl active:scale-95 group overflow-hidden relative ${
        highlighted 
        ? 'bg-white text-emerald-900 hover:bg-emerald-50' 
        : 'bg-emerald-600 text-white hover:bg-emerald-500'
      }`}
    >
      <span className="relative z-10">{buttonText}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
    </button>
  </div>
);

const TestimonialCard = ({ name, role, text, avatar, highlight }: any) => (
  <div className={`p-10 rounded-[3.5rem] border transition-all hover:-translate-y-2 relative overflow-hidden ${
    highlight 
    ? 'bg-slate-900/80 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]' 
    : 'bg-slate-900/40 border-white/5'
  }`}>
    <Quote className="absolute top-8 left-8 text-white/5" size={80} />
    <div className="relative z-10 space-y-8">
      <p className="text-lg font-bold text-slate-300 leading-relaxed italic text-right">"{text}"</p>
      <div className="flex items-center gap-4 justify-end">
        <div className="text-right">
          <div className="font-black text-white">{name}</div>
          <div className="text-xs font-bold text-emerald-500">{role}</div>
        </div>
        <img src={avatar} alt={name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10" />
      </div>
    </div>
  </div>
);

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`border rounded-[2.5rem] overflow-hidden transition-all duration-500 ${isOpen ? 'bg-slate-900/80 border-emerald-500/30 shadow-2xl' : 'bg-slate-900/30 border-white/5 hover:bg-slate-900/50'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-8 text-right flex items-center justify-between gap-6"
      >
        <span className={`text-xl font-black transition-colors ${isOpen ? 'text-emerald-400' : 'text-white'}`}>{question}</span>
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-emerald-500 text-white rotate-180' : 'bg-slate-800 text-slate-400'}`}>
           <ArrowDown size={20} />
        </div>
      </button>
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-8 pb-8 text-slate-400 text-lg font-bold leading-relaxed border-t border-white/5 pt-6">
          {answer}
        </div>
      </div>
    </div>
  );
};

const SocialIcon = ({ icon, href }: any) => (
  <a href={href} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-500/30 transition-all hover:-translate-y-1">
    {icon}
  </a>
);

export default LandingPage;
