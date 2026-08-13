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

-- إضافة أعمدة حماية الجهاز لجدول profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_wait_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ip TEXT;

-- الخطوة 4: إعادة تفعيل RLS وكتابة سياسات عزل المحلات والمستخدمين (Tenant Isolation)
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- حذف أي سياسات قديمة إن وجدت
DROP POLICY IF EXISTS "full_access_shops" ON public.shops;
DROP POLICY IF EXISTS "full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "products_tenant_isolation" ON public.products;
DROP POLICY IF EXISTS "maint_tenant_isolation" ON public.maintenance_jobs;
DROP POLICY IF EXISTS "debts_tenant_isolation" ON public.debts;
DROP POLICY IF EXISTS "trans_tenant_isolation" ON public.transactions;

-- دوال مساعدة معرّفة كـ SECURITY DEFINER لمنع التكرار اللانهائي (Infinite Recursion)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- سياسات جدول المحلات (shops)
CREATE POLICY "shops_select_policy" ON public.shops FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR id = public.get_user_tenant_id());
CREATE POLICY "shops_insert_policy" ON public.shops FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "shops_update_policy" ON public.shops FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "shops_delete_policy" ON public.shops FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- سياسات جدول الملفات الشخصية (profiles)
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'OWNER'));
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'OWNER'))
  WITH CHECK (id = auth.uid() OR (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'OWNER'));
CREATE POLICY "profiles_delete_policy" ON public.profiles FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'OWNER');

-- سياسات جدول المنتجات (products)
CREATE POLICY "products_all_policy" ON public.products FOR ALL TO authenticated
  USING (shop_id = public.get_user_tenant_id())
  WITH CHECK (shop_id = public.get_user_tenant_id());

-- سياسات جدول أعمال الصيانة (maintenance_jobs)
CREATE POLICY "maint_all_policy" ON public.maintenance_jobs FOR ALL TO authenticated
  USING (shop_id = public.get_user_tenant_id())
  WITH CHECK (shop_id = public.get_user_tenant_id());

-- سياسات جدول الديون والآجل (debts)
CREATE POLICY "debts_all_policy" ON public.debts FOR ALL TO authenticated
  USING (shop_id = public.get_user_tenant_id())
  WITH CHECK (shop_id = public.get_user_tenant_id());

-- سياسات جدول المعاملات المالية (transactions)
CREATE POLICY "trans_all_policy" ON public.transactions FOR ALL TO authenticated
  USING (shop_id = public.get_user_tenant_id())
  WITH CHECK (shop_id = public.get_user_tenant_id());

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
