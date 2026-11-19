# بناء ملف Android APK تلقائياً عبر السحابة (GitHub Actions)

تم تجهيز هذا المشروع بملف `capacitor.config.json` وسكربت `.github/workflows/build-apk.yml` لتحويل اللعبة إلى ملف **`.apk`** حقيقي يعمل **بدون إنترنت بالكامل (Offline)** دون الحاجة لتثبيت Android Studio على جهازك.

## خطوات استخراج الـ APK (في 3 دقائق):

1. **تحميل المشروع من AI Studio:**
   - اضغط على أيقونة **Download / Export** لتحميل مجلد المشروع كاملاً على جهازك أو هاتفك.

2. **رفعه إلى GitHub:**
   - أنشئ حساباً مجانياً على [GitHub.com](https://github.com) وأنشئ مستودعاً جديداً (**New Repository**).
   - ارفع ملفات المشروع إلى المستودع (وتأكد من وجود مجلد `.github/workflows/build-apk.yml`).

3. **تشغيل البناء التلقائي:**
   - بمجرد الرفع إلى فرع `main` أو `master`، افتح تبويب **Actions** في المستودع.
   - ستجد مهمة باسم **Build MARY Android APK** تعمل تلقائياً (أو اضغط **Run workflow**).

4. **تحميل ملف APK:**
   - بعد انتهاء المهمة (~3 دقائق)، انزل إلى قسم **Artifacts** داخل صفحة المهمة.
   - اضغط على **`MARY-Prototype-V1-APK`** لتحميل ملف `app-debug.apk` المضغوط، فك الضغط وثبّت الـ APK على هاتفك الأندرويد.
