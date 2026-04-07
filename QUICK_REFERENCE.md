# BuildAI ERP - دليل الأوامر السريعة

## 🚀 البدء السريع

### التشغيل المحلي (محطة واحدة)

```bash
# الخطوة 1: تشغيل setup script
./setup.sh

# الخطوة 2: تشغيل التطبيق
pnpm dev

# الخطوة 3: افتح المتصفح
# http://localhost:3000
```

### استخدام Docker

```bash
# تشغيل كل الخدمات
docker-compose up -d

# عرض السجلات
docker-compose logs -f

# إيقاف الخدمات
docker-compose down
```

---

## 📝 أوامر التطوير

### تثبيت المكتبات

```bash
# تثبيت جميع المكتبات
pnpm install

# إضافة مكتبة جديدة
pnpm add package-name

# إضافة مكتبة للتطوير فقط
pnpm add -D package-name
```

### تشغيل التطبيق

```bash
# وضع التطوير (مع Hot Reload)
pnpm dev

# بناء الإنتاج
pnpm build

# تشغيل الإنتاج
pnpm start

# فحص TypeScript
pnpm check

# تنسيق الكود
pnpm format

# الاختبارات
pnpm test
```

---

## 🗄️ أوامر قاعدة البيانات

### الترحيلات

```bash
# إنشاء ملف ترحيل جديد
pnpm drizzle-kit generate

# تطبيق الترحيلات
pnpm drizzle-kit migrate

# فتح واجهة Drizzle Studio
pnpm drizzle-kit studio
```

### الاتصال المباشر

```bash
# الاتصال بـ MySQL محلياً
mysql -u buildai_user -p buildai_erp

# الاتصال بـ RDS على AWS
mysql -h your-rds-endpoint -u buildai_admin -p buildai_erp

# أوامر SQL مفيدة
SHOW TABLES;
DESCRIBE users;
SELECT COUNT(*) FROM projects;
```

---

## 🔐 أوامر الأمان

### إدارة المفاتيح

```bash
# إنشاء JWT Secret جديد
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# إنشاء API Key
openssl rand -hex 32
```

### تشفير البيانات

```bash
# اختبار التشفير
node -e "
const crypto = require('crypto');
const plaintext = 'sensitive data';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update(plaintext, 'utf8', 'hex');
encrypted += cipher.final('hex');
console.log('Encrypted:', encrypted);
"
```

---

## 🚀 أوامر النشر

### AWS CLI

```bash
# تسجيل الدخول
aws configure

# إنشاء RDS
aws rds create-db-instance \
  --db-instance-identifier buildai-mysql \
  --db-instance-class db.t3.micro \
  --engine mysql

# إنشاء EC2
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro

# الاتصال بـ EC2
ssh -i buildai-key.pem ubuntu@YOUR_IP
```

### Docker

```bash
# بناء صورة Docker
docker build -t buildai-erp:latest .

# تشغيل الحاوية
docker run -p 3000:3000 buildai-erp:latest

# دفع إلى Docker Hub
docker push your-username/buildai-erp:latest
```

### PM2 (على الخادم)

```bash
# بدء التطبيق
pm2 start "pnpm start" --name buildai

# إيقاف التطبيق
pm2 stop buildai

# إعادة تشغيل
pm2 restart buildai

# عرض السجلات
pm2 logs buildai

# حفظ قائمة العمليات
pm2 save

# تشغيل عند بدء النظام
pm2 startup
```

---

## 🔍 أوامر المراقبة

### السجلات

```bash
# سجلات التطبيق
pm2 logs buildai

# سجلات Docker
docker-compose logs -f app

# سجلات MySQL
docker-compose logs -f mysql

# سجلات Redis
docker-compose logs -f redis
```

### الأداء

```bash
# استخدام الموارد
pm2 monit

# معلومات النظام
top
htop
df -h

# استخدام الشبكة
netstat -tuln
```

---

## 🧪 أوامر الاختبار

### Unit Tests

```bash
# تشغيل جميع الاختبارات
pnpm test

# تشغيل اختبار محدد
pnpm test auth.logout

# وضع المراقبة (تشغيل عند كل تغيير)
pnpm test --watch

# تقرير التغطية
pnpm test --coverage
```

### اختبار API

```bash
# اختبار endpoint
curl http://localhost:3000/api/health

# مع بيانات
curl -X POST http://localhost:3000/api/trpc/projects.create \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project"}'
```

---

## 🔧 استكشاف الأخطاء

### المشاكل الشائعة

```bash
# خطأ: "Port already in use"
# الحل: تغيير الـ port أو إيقاف العملية
lsof -i :3000
kill -9 PID

# خطأ: "Database connection refused"
# الحل: تحقق من MySQL
sudo systemctl status mysql
sudo systemctl restart mysql

# خطأ: "Cannot find module"
# الحل: أعد تثبيت المكتبات
rm -rf node_modules pnpm-lock.yaml
pnpm install

# خطأ: "Out of memory"
# الحل: زيادة الذاكرة المتاحة
export NODE_OPTIONS="--max-old-space-size=4096"
```

---

## 📊 أوامر الإحصائيات

### حجم المشروع

```bash
# عدد أسطر الكود
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l

# حجم المجلدات
du -sh *

# حجم الملفات الكبيرة
find . -size +10M
```

### الأداء

```bash
# سرعة البناء
time pnpm build

# سرعة الاختبارات
time pnpm test

# حجم الحزمة
npm run build && du -sh dist
```

---

## 🌐 أوامر الشبكة

### الاتصال

```bash
# اختبار الاتصال بـ RDS
telnet your-rds-endpoint 3306

# اختبار الاتصال بـ Redis
redis-cli -h localhost ping

# اختبار الاتصال بـ RabbitMQ
curl http://localhost:15672
```

### DNS

```bash
# اختبار DNS
nslookup your-domain.com

# معلومات DNS مفصلة
dig your-domain.com
```

---

## 💾 أوامر النسخ الاحتياطي

### قاعدة البيانات

```bash
# نسخ احتياطي
mysqldump -u buildai_user -p buildai_erp > backup.sql

# استعادة
mysql -u buildai_user -p buildai_erp < backup.sql

# AWS RDS Snapshot
aws rds create-db-snapshot \
  --db-instance-identifier buildai-mysql \
  --db-snapshot-identifier backup-$(date +%Y%m%d)
```

### الملفات

```bash
# نسخ احتياطي للمشروع
tar -czf buildai-backup-$(date +%Y%m%d).tar.gz .

# استعادة
tar -xzf buildai-backup-20240407.tar.gz
```

---

## 🎯 قائمة التحقق قبل الإنتاج

```bash
# ✓ فحص TypeScript
pnpm check

# ✓ تشغيل الاختبارات
pnpm test

# ✓ بناء الإنتاج
pnpm build

# ✓ فحص الأمان
npm audit

# ✓ فحص الأداء
pnpm build && du -sh dist

# ✓ تحديث المكتبات
pnpm update

# ✓ حذف الملفات غير المستخدمة
pnpm prune

# ✓ التحقق من الترخيص
npm license
```

---

## 📚 روابط مفيدة

- **Node.js Docs:** https://nodejs.org/docs
- **MySQL Docs:** https://dev.mysql.com/doc
- **AWS CLI:** https://docs.aws.amazon.com/cli
- **Docker Docs:** https://docs.docker.com
- **tRPC Docs:** https://trpc.io/docs
- **Drizzle ORM:** https://orm.drizzle.team

---

**آخر تحديث:** 7 أبريل 2026
**الإصدار:** 1.0.0
