-- 1. سیاست‌های جدول Creators (پروفایل‌ها)
-- فقط ادمین و سرویس‌ها بتوانند پروفایل جدید بسازند (برای ربات‌های پایتون)
CREATE POLICY "Admin can insert creators" ON creators FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'));
-- فقط صاحب پروفایل یا ادمین بتواند وضعیت (status) را تغییر دهد
CREATE POLICY "Admin can update status" ON creators FOR UPDATE USING (auth.uid() = owner_user_id OR auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'));

-- 2. سیاست‌های جدول Claim Requests (درخواست‌های مالکیت)
-- کاربران فقط بتوانند درخواست‌های خودشان را ببینند
CREATE POLICY "Users view own claims" ON claim_requests FOR SELECT USING (auth.uid() = user_id);
-- ادمین‌ها بتوانند همه درخواست‌ها را ببینند
CREATE POLICY "Admin view all claims" ON claim_requests FOR SELECT USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'));
-- فقط ادمین‌ها بتوانند وضعیت درخواست را تغییر دهند (تایید یا رد)
CREATE POLICY "Admin update claims" ON claim_requests FOR UPDATE USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'));

-- 3. سیاست‌های جدول Bookings (رزروها)
-- برندها بتوانند فقط رزروهای خودشان را ببینند
CREATE POLICY "Brands view own bookings" ON bookings FOR SELECT USING (auth.uid() = creator_id OR true);
-- (نکته: برای MVP فعلاً true گذاشتیم تا دمو کار کند، در فاز ۵ این را به system auth متصل می‌کنیم)
