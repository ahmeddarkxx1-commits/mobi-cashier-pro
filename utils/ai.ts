import { GoogleGenerativeAI } from '@google/generative-ai';
import { MaintenanceJob } from '../types';

const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function extractMaintenanceJob(text: string): Promise<Partial<MaintenanceJob>> {
  if (!apiKey) {
    throw new Error('API Key is missing! تأكد من إضافة GEMINI_API_KEY');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  const prompt = `
أنت مساعد ذكي في مركز صيانة موبايلات. وظيفتك هي قراءة النص التالي المكتوب باللغة العامية المصرية من موظف الاستقبال، واستخراج بيانات الصيانة منه.
يجب أن يكون ردك بصيغة JSON فقط، بدون أي نصوص أخرى أو تنسيقات Markdown (لا تستخدم \`\`\`json).

النص: "${text}"

المطلوب إرجاع JSON يحتوي على هذه الحقول (إذا لم تجد المعلومة اجعلها نص فارغ "" أو 0 للأرقام):
{
  "customerName": "اسم العميل",
  "customerPhone": "رقم الموبايل",
  "phoneModel": "موديل الجهاز (مثال: iPhone 11)",
  "issue": "العطل / الشكوى",
  "paidAmount": 0, // المبلغ المدفوع كمقدم
  "cost": 0 // إجمالي تكلفة الصيانة المتوقعة
}
`;

  try {
    const result = await model.generateContent(prompt);
    let textResponse = result.response.text().trim();
    
    // Clean up if it contains markdown code blocks
    textResponse = textResponse.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

    const parsedData = JSON.parse(textResponse);
    return {
      customerName: parsedData.customerName || '',
      customerPhone: parsedData.customerPhone || '',
      phoneModel: parsedData.phoneModel || '',
      issue: parsedData.issue || '',
      paidAmount: Number(parsedData.paidAmount) || 0,
      cost: Number(parsedData.cost) || 0
    };
  } catch (error) {
    console.error('AI Parse Error:', error);
    throw new Error('مقدرتش أفهم النص بشكل صحيح، تأكد من كتابة التفاصيل بوضوح.');
  }
}

export interface ExtractedProduct {
  name: string;
  price: number;
  wholesale_price: number;
  cost: number;
  category: string;
  categoryType?: 'general' | 'part';
  stock: number;
  barcode: string;
  imei: string;
}

export async function extractProductDetails(text: string): Promise<Partial<ExtractedProduct>> {
  if (!apiKey) {
    throw new Error('API Key is missing! تأكد من إضافة GEMINI_API_KEY');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  const prompt = `
أنت مساعد ذكي في نظام إدارة محلات الموبايلات. وظيفتك هي قراءة النص التالي المكتوب باللغة العربية (أو العامية المصرية) والذي يصف بضاعة أو منتج جديد يراد إضافته للمخزن، واستخراج بيانات المنتج منه بشكل دقيق ومحايد.

النص: "${text}"

المطلوب إرجاع JSON فقط يحتوي على هذه الحقول (إذا لم تجد المعلومة اجعلها نص فارغ "" أو 0 للأرقام أو الفئة المناسبة):
{
  "name": "اسم المنتج أو قطعة الغيار (مثال: شاحن أنكر 20 واط، شاشة آيفون 11 أصلية، جراب سيليكون)",
  "price": 0, // سعر البيع للزبون
  "wholesale_price": 0, // سعر الشراء من المورد / الجملة
  "cost": 0, // تكلفة المنتج (اجعلها مساوية لسعر الشراء/الجملة إذا لم تذكر صراحة)
  "category": "الفئة المناسبة للمنتج وتكون واحدة فقط من هذه القيم حصراً: ['phone', 'charger', 'cable', 'wired_earphone', 'bluetooth_earphone', 'headphone', 'accessory', 'part', 'electronic', 'شاشات', 'فلاتات', 'بطاريات']",
  "stock": 1, // الكمية أو العدد المذكور (الافتراضي 1)
  "barcode": "رمز الباركود إذا ذكر كأرقام أو حروف (مثال: 69341777)",
  "imei": "رقم IMEI الخاص بالهواتف إذا ذكر"
}
`;

  try {
    const result = await model.generateContent(prompt);
    let textResponse = result.response.text().trim();
    
    // Clean up if it contains markdown code blocks
    textResponse = textResponse.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

    const parsedData = JSON.parse(textResponse);
    return {
      name: parsedData.name || '',
      price: Number(parsedData.price) || 0,
      wholesale_price: Number(parsedData.wholesale_price) || 0,
      cost: Number(parsedData.cost) || Number(parsedData.wholesale_price) || 0,
      category: parsedData.category || 'accessory',
      stock: Number(parsedData.stock) || 1,
      barcode: parsedData.barcode || '',
      imei: parsedData.imei || ''
    };
  } catch (error) {
    console.error('AI Product Parse Error:', error);
    throw new Error('مقدرتش أفهم تفاصيل المنتج بشكل صحيح، تأكد من كتابتها بوضوح.');
  }
}

export interface FinancialDataSummary {
  period: string;
  date?: string;
  income: number;
  profit: number;
  expense: number;
  balanceProfit: number;
  maintenanceProfit: number;
  uncollectedCount: number;
  uncollectedValue: number;
  transactionsSummary: {
    type: string;
    description: string;
    amount: number;
    profit: number;
  }[];
}

export interface AIAnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export async function analyzeFinancialReports(data: FinancialDataSummary): Promise<AIAnalysisResult> {
  if (!apiKey) {
    throw new Error('API Key is missing! تأكد من إضافة GEMINI_API_KEY');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  const prompt = `
أنت مستشار مالي ومحلل أعمال محترف متخصص في إدارة محلات بيع وصيانة الموبايلات والتحويلات المالية. وظيفتك هي مراجعة التقرير المالي التالي للمحل، وتقديم تحليل مالي دقيق ومقترحات لتحسين الأرباح باللغة العربية (وبأسلوب مهني وواضح لصاحب المحل).

البيانات المالية للفترة (${data.period}):
- تاريخ التقرير: ${data.date || 'غير محدد'}
- إجمالي الإيرادات (الدخل): ${data.income} ج.م
- إجمالي المصاريف: ${data.expense} ج.م
- صافي الأرباح: ${data.profit} ج.م (الربح الفعلي من العمليات قبل خصم المصاريف العامة)
- أرباح الصيانة فقط: ${data.maintenanceProfit} ج.م
- أرباح كروت الفكة والتحويلات فقط: ${data.balanceProfit} ج.م
- عدد أجهزة الصيانة غير المحصلة (جاهزة ولكن لم تسلم): ${data.uncollectedCount} جهاز بقيمة معلقة بلغت ${data.uncollectedValue} ج.م

ملخص لبعض العمليات في هذه الفترة:
${JSON.stringify(data.transactionsSummary, null, 2)}

المطلوب إرجاع رد بصيغة JSON فقط، بدون أي نصوص أخرى أو تنسيقات Markdown (لا تستخدم \`\`\`json).
يجب أن يحتوي الـ JSON على الحقول التالية حصراً:
{
  "summary": "ملخص عام ومبسط للأداء المالي في هذه الفترة (سطرين أو ثلاثة بحد أقصى، بأسلوب مشجع ومباشر)",
  "strengths": ["نقاط القوة المستنتجة من الأرقام، مثل تحقيق أرباح عالية من نشاط معين أو انخفاض المصاريف (اكتب 2 إلى 3 نقاط كحد أقصى)"],
  "weaknesses": ["نقاط الضعف والتنبيهات، مثل ارتفاع المصروفات بالنسبة للربح، أو قيمة معلقة كبيرة في الصيانة لم تُحصل بعد (اكتب 2 إلى 3 نقاط)"],
  "recommendations": ["توصيات وخطوات عملية محددة بناءً على هذه الأرقام لزيادة المبيعات أو تقليل المصاريف في الفترة القادمة (اكتب 3 نقاط عملية)"]
}
`;

  try {
    const result = await model.generateContent(prompt);
    let textResponse = result.response.text().trim();
    
    // Clean up if it contains markdown code blocks
    textResponse = textResponse.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

    const parsedData = JSON.parse(textResponse);
    return {
      summary: parsedData.summary || 'تم استخراج التقرير المالي بنجاح.',
      strengths: Array.isArray(parsedData.strengths) ? parsedData.strengths : [],
      weaknesses: Array.isArray(parsedData.weaknesses) ? parsedData.weaknesses : [],
      recommendations: Array.isArray(parsedData.recommendations) ? parsedData.recommendations : []
    };
  } catch (error) {
    console.error('AI Reports Parse Error:', error);
    throw new Error('فشل الذكاء الاصطناعي في تحليل التقرير، يرجى المحاولة لاحقاً.');
  }
}

export async function extractProductsFromImage(
  base64Image: string, 
  mimeType: string,
  existingCategories: string[]
): Promise<ExtractedProduct[]> {
  if (!apiKey) {
    throw new Error('API Key is missing! تأكد من إضافة GEMINI_API_KEY');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
أنت مساعد ذكي مخصص لمراجعة وفك خطوط الفواتير الورقية أو الكشوفات المكتوبة بخط اليد أو المطبوعة لمحلات الموبايلات والصيانة.
وظيفتك هي استخراج قائمة بالمنتجات والبضائع المكتوبة في الصورة المرفقة.
اليك قائمة بالتصنيفات الموجودة حالياً بالمحل: ${JSON.stringify(existingCategories)}

يجب عليك تحديد الفئة (category) لكل صنف مستخرج:
- إذا كان الصنف يتبع أحد التصنيفات الموجودة حالياً بالمحل، استخدم اسم التصنيف المكتوب بالإنجليزية أو العربية كما هو في القائمة المرفقة.
- إذا كان الصنف لا يطابق أي تصنيف موجود حالياً، قم باقتراح تصنيف جديد مناسب جداً له باللغة العربية (مثال: "جرابات"، "شواحن سيارة"، "ساعات ذكية") واجعله هو قيمة الحقل "category".
- حدد أيضاً نوع التصنيف (categoryType) ليكون "general" للبضائع والإكسسوارات العامة، أو "part" لقطع غيار الصيانة والورشة.

المطلوب إرجاع JSON يحتوي على مصفوفة (Array) من المنتجات المستخرجة بالتنسيق التالي حصراً، بدون أي نصوص أخرى أو تنسيقات Markdown (لا تستخدم \`\`\`json):
[
  {
    "name": "اسم المنتج أو قطعة الغيار بالكامل بوضوح (مثال: جراب ايفون 11، شاحن سامسونج 25 واط، شاشة ردمي نوت 10)",
    "price": 0, // سعر البيع للمستهلك (إذا لم تجده، خمن سعراً مناسباً للبيع بناءً على سعر الشراء/الجملة بإضافة هامش ربح 20-30%)
    "wholesale_price": 0, // سعر الشراء / الجملة من المورد (إذا ذكر، وإذا لم يذكر اجعله 75% من سعر البيع)
    "cost": 0, // تكلفة المنتج (اجعلها مساوية لسعر الشراء/الجملة)
    "category": "اسم التصنيف من القائمة أو تصنيف جديد مناسب",
    "categoryType": "general", // "general" للبضائع والإكسسوارات، أو "part" لقطع غيار الصيانة والورشة
    "stock": 1, // الكمية أو العدد المكتوب بجانب الصنف (الافتراضي 1)
    "barcode": "", // رقم الباركود المكتوب بجانب الصنف إن وجد، وإذا لم يوجد اتركه فارغاً ""
    "imei": "" // رقم الـ IMEI الخاص بالهواتف إن وجد، وإذا لم يوجد اتركه فارغاً ""
  }
]
`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ]);
    
    let textResponse = result.response.text().trim();
    
    // Clean up if it contains markdown code blocks
    textResponse = textResponse.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

    const parsedData = JSON.parse(textResponse);
    if (!Array.isArray(parsedData)) {
      return [];
    }

    return parsedData.map(item => ({
      name: item.name || '',
      price: Number(item.price) || 0,
      wholesale_price: Number(item.wholesale_price) || 0,
      cost: Number(item.cost) || Number(item.wholesale_price) || 0,
      category: item.category || 'accessory',
      categoryType: item.categoryType || 'general',
      stock: Number(item.stock) || 1,
      barcode: item.barcode || '',
      imei: item.imei || ''
    }));
  } catch (error) {
    console.error('AI Image Parse Error:', error);
    throw new Error('مقدرتش أقرأ الصورة بشكل صحيح، تأكد من وضوح الصورة وتفاصيل البضاعة وسعرها والعدد.');
  }
}
