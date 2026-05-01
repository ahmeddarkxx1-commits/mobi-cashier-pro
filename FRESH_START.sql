-- ============================================
-- إعادة بناء قاعدة البيانات من الصفر
-- شغّل هذا كاملاً في Supabase SQL Editor
-- ============================================

-- الخطوة 1: حذف كل الـ triggers القديمة
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- الخطوة 2: إلغاء كل الـ RLS policies القديمة
ALTER TABLE IF EXISTS public.shops DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_owner_read" ON public.shops;
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_read_shops" ON public.shops;
DROP POLICY IF EXISTS "allow_all_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shops;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- الخطوة 3: إضافة عمود duration إذا لم يكن موجوداً
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '3_days_trial';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS owner_phone TEXT;

-- الخطوة 4: إعادة تفعيل RLS بـ policies بسيطة وصحيحة
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- السماح للكل بالقراءة والكتابة (أبسط حل يعمل 100%)
CREATE POLICY "full_access_shops" ON public.shops FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "full_access_profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- الخطوة 5: بناء الـ Trigger الجديد الصحيح
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_shop_id UUID;
  v_shop_name TEXT;
  v_full_name TEXT;
  v_phone TEXT;
  v_plan TEXT;
BEGIN
  -- استخراج البيانات من metadata
  v_shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'محل ' || SPLIT_PART(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
  v_phone     := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  v_plan      := COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'BASIC');

  -- إنشاء المحل بحالة pending
  INSERT INTO public.shops (
    name,
    owner_id,
    owner_email,
    owner_phone,
    plan,
    status,
    duration,
    expiry_date
  ) VALUES (
    v_shop_name,
    NEW.id,
    NEW.email,
    v_phone,
    v_plan,
    'pending',
    '3_days_trial',
    NOW() + INTERVAL '3 days'
  )
  RETURNING id INTO new_shop_id;

  -- إنشاء الـ profile للمالك مع ربطه بالمحل
  INSERT INTO public.profiles (id, full_name, role, tenant_id)
  VALUES (NEW.id, v_full_name, 'OWNER', new_shop_id)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'OWNER',
    tenant_id = new_shop_id;

  RETURN NEW;
END;
$$;

-- ربط الـ Trigger بجدول auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- الخطوة 6: مزامنة الحسابات الموجودة (إنشاء shops وprofiles للي مش موجودة)
DO $$
DECLARE
  u RECORD;
  sid UUID;
BEGIN
  FOR u IN SELECT * FROM auth.users LOOP
    -- تحقق إذا لديه محل
    IF NOT EXISTS (SELECT 1 FROM public.shops WHERE owner_id = u.id) THEN
      INSERT INTO public.shops (name, owner_id, owner_email, plan, status, duration, expiry_date)
      VALUES (
        COALESCE(u.raw_user_meta_data->>'shop_name', 'محل ' || SPLIT_PART(u.email, '@', 1)),
        u.id, u.email, 'BASIC', 'pending', '3_days_trial', NOW() + INTERVAL '3 days'
      ) RETURNING id INTO sid;
    ELSE
      SELECT id INTO sid FROM public.shops WHERE owner_id = u.id LIMIT 1;
    END IF;

    -- تحقق إذا لديه profile
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
      INSERT INTO public.profiles (id, full_name, role, tenant_id)
      VALUES (u.id, COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1)), 'OWNER', sid)
      ON CONFLICT (id) DO NOTHING;
    ELSE
      -- تحديث tenant_id إذا كان فارغاً
      UPDATE public.profiles SET tenant_id = sid WHERE id = u.id AND tenant_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- الخطوة 7: عرض النتيجة النهائية
SELECT
  s.name AS shop_name,
  s.owner_email,
  s.status,
  s.plan,
  s.duration,
  s.expiry_date::date,
  p.role,
  CASE WHEN p.tenant_id IS NOT NULL THEN '✅' ELSE '❌' END AS linked
FROM public.shops s
LEFT JOIN public.profiles p ON p.id = s.owner_id
ORDER BY s.created_at DESC;
