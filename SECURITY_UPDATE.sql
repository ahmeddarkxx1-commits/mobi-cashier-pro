-- =======================================================
-- SECURITY_UPDATE.sql
-- تحديثات الحماية والأمان وتفعيل RLS في Supabase
-- شغّل هذا الملف بالكامل في لوحة تحكم Supabase SQL Editor
-- =======================================================

-- 0. إضافة أعمدة التحكم والجهاز المفقودة لجدول profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lock_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_devices INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ip TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_wait_until TIMESTAMPTZ;

-- 1. تفعيل سياسة Row Level Security (RLS) لجميع الجداول
ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shop_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_notifications ENABLE ROW LEVEL SECURITY;

-- 2. إزالة أي سياسات قديمة لتجنب التعارض
DROP POLICY IF EXISTS "shops_select_policy" ON public.shops;
DROP POLICY IF EXISTS "shops_insert_policy" ON public.shops;
DROP POLICY IF EXISTS "shops_update_policy" ON public.shops;
DROP POLICY IF EXISTS "shops_delete_policy" ON public.shops;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

DROP POLICY IF EXISTS "products_all_policy" ON public.products;
DROP POLICY IF EXISTS "maint_all_policy" ON public.maintenance_jobs;
DROP POLICY IF EXISTS "debts_all_policy" ON public.debts;
DROP POLICY IF EXISTS "trans_all_policy" ON public.transactions;

DROP POLICY IF EXISTS "invites_all_policy" ON public.shop_invites;
DROP POLICY IF EXISTS "config_select_policy" ON public.app_config;
DROP POLICY IF EXISTS "config_all_policy" ON public.app_config;
DROP POLICY IF EXISTS "notif_select_policy" ON public.app_notifications;
DROP POLICY IF EXISTS "notif_all_policy" ON public.app_notifications;

-- 3. إنشاء دوال مساعدة معرّفة كـ SECURITY DEFINER للوصول المعزول
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

-- 4. سياسات جدول المحلات (shops)
CREATE POLICY "shops_select_policy" ON public.shops FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR id = public.get_user_tenant_id());
CREATE POLICY "shops_insert_policy" ON public.shops FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "shops_update_policy" ON public.shops FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "shops_delete_policy" ON public.shops FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- 5. سياسات جدول الملفات الشخصية (profiles)
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'OWNER'));
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'OWNER'))
  WITH CHECK (id = auth.uid() OR (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'OWNER'));
CREATE POLICY "profiles_delete_policy" ON public.profiles FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'OWNER');

-- 6. سياسات جدول المنتجات (products)
CREATE POLICY "products_all_policy" ON public.products FOR ALL TO authenticated
  USING (shop_id = public.get_user_tenant_id())
  WITH CHECK (shop_id = public.get_user_tenant_id());

-- 7. سياسات جدول أعمال الصيانة (maintenance_jobs)
CREATE POLICY "maint_all_policy" ON public.maintenance_jobs FOR ALL TO authenticated
  USING (shop_id = public.get_user_tenant_id())
  WITH CHECK (shop_id = public.get_user_tenant_id());

-- 8. سياسات جدول الديون والآجل (debts)
CREATE POLICY "debts_all_policy" ON public.debts FOR ALL TO authenticated
  USING (shop_id = public.get_user_tenant_id())
  WITH CHECK (shop_id = public.get_user_tenant_id());

-- 9. سياسات جدول المعاملات المالية (transactions)
CREATE POLICY "trans_all_policy" ON public.transactions FOR ALL TO authenticated
  USING (shop_id = public.get_user_tenant_id())
  WITH CHECK (shop_id = public.get_user_tenant_id());

-- 10. سياسات جدول دعوات الموظفين (shop_invites)
CREATE POLICY "invites_all_policy" ON public.shop_invites FOR ALL TO authenticated
  USING (shop_id = public.get_user_tenant_id() OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (shop_id = public.get_user_tenant_id());

-- 11. سياسات جدول إعدادات النظام العامة (app_config) - قراءة للجميع، كتابة للـ Super Admin فقط
CREATE POLICY "config_select_policy" ON public.app_config FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "config_all_policy" ON public.app_config FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.get_user_role() = 'SUPER_ADMIN');

-- 12. سياسات جدول إشعارات النظام (app_notifications)
CREATE POLICY "notif_select_policy" ON public.app_notifications FOR SELECT TO authenticated
  USING (is_active = true OR public.get_user_role() = 'SUPER_ADMIN');
CREATE POLICY "notif_all_policy" ON public.app_notifications FOR ALL TO authenticated
  USING (public.get_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.get_user_role() = 'SUPER_ADMIN');

-- 13. مزامنة الحسابات الموجودة (إنشاء shops وprofiles للي مش موجودة)
DO $$
DECLARE
  u RECORD;
  sid UUID;
  v_role TEXT;
BEGIN
  FOR u IN SELECT * FROM auth.users LOOP
    -- تحديد الدور بناءً على البريد الإلكتروني
    IF u.email LIKE 'admin%' OR u.email LIKE 'superadmin%' THEN
      v_role := 'SUPER_ADMIN';
    ELSE
      v_role := 'OWNER';
    END IF;

    -- تحقق إذا كان للمستخدم غير السوبر أدمن محل
    IF v_role <> 'SUPER_ADMIN' THEN
      IF NOT EXISTS (SELECT 1 FROM public.shops WHERE owner_id = u.id) THEN
        INSERT INTO public.shops (name, owner_id, owner_email, plan, status, duration, expiry_date)
        VALUES (
          COALESCE(u.raw_user_meta_data->>'shop_name', 'محل ' || SPLIT_PART(u.email, '@', 1)),
          u.id, u.email, 'BASIC', 'pending', '3_days_trial', NOW() + INTERVAL '3 days'
        ) RETURNING id INTO sid;
      ELSE
        SELECT id INTO sid FROM public.shops WHERE owner_id = u.id LIMIT 1;
      END IF;
    ELSE
      sid := NULL;
    END IF;

    -- تحقق إذا كان للمستخدم ملف شخصي (profile)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
      INSERT INTO public.profiles (id, full_name, role, tenant_id)
      VALUES (u.id, COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1)), v_role, sid)
      ON CONFLICT (id) DO NOTHING;
    ELSE
      -- تحديث tenant_id إذا كان فارغاً للملاك
      IF v_role <> 'SUPER_ADMIN' THEN
        UPDATE public.profiles SET tenant_id = sid WHERE id = u.id AND tenant_id IS NULL;
      END IF;
    END IF;
  END LOOP;
END $$;
