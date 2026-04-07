# BuildAI ERP - دليل الإعداد الشامل

## المحتويات
1. [التشغيل المحلي](#التشغيل-المحلي)
2. [النشر على AWS](#النشر-على-aws)
3. [تفعيل الميزات المتقدمة](#تفعيل-الميزات-المتقدمة)
4. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## التشغيل المحلي

### المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:
- **Node.js 18+** (تحقق: `node --version`)
- **Git** (تحقق: `git --version`)
- **MySQL 8.0+** (تحقق: `mysql --version`)

### الخطوة 1: تثبيت MySQL

**على Windows:**
```bash
# باستخدام Chocolatey
choco install mysql

# أو حمل من: https://dev.mysql.com/downloads/mysql/
```

**على macOS:**
```bash
brew install mysql
brew services start mysql
```

**على Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
```

### الخطوة 2: إنشاء قاعدة البيانات

افتح MySQL Command Line:
```bash
mysql -u root -p
```

أدخل كلمة المرور (أو اضغط Enter إذا لم تكن هناك كلمة مرور)

ثم أنسخ والصق:
```sql
-- إنشاء قاعدة البيانات
CREATE DATABASE buildai_erp;

-- إنشاء مستخدم جديد
CREATE USER 'buildai_user'@'localhost' IDENTIFIED BY 'buildai_secure_pass_123';

-- إعطاء الصلاحيات
GRANT ALL PRIVILEGES ON buildai_erp.* TO 'buildai_user'@'localhost';

-- تطبيق التغييرات
FLUSH PRIVILEGES;

-- التحقق
SHOW DATABASES;
```

### الخطوة 3: إعداد المشروع

```bash
# انتقل إلى مجلد المشروع
cd /home/ubuntu/buildai-erp

# ثبت المكتبات
pnpm install
```

### الخطوة 4: إعداد متغيرات البيئة

أنشئ ملف `.env` في جذر المشروع:

```bash
# نسخ الملف النموذجي
cp .env.example .env
```

أو أنشئ ملف جديد وأضف:

```env
# قاعدة البيانات
DATABASE_URL=mysql://buildai_user:buildai_secure_pass_123@localhost:3306/buildai_erp

# الأمان
JWT_SECRET=your_jwt_secret_key_min_32_characters_long_for_security

# Redis (اختياري محلياً)
REDIS_URL=redis://localhost:6379

# OpenAI (للأوامر الصوتية)
OPENAI_API_KEY=sk-your-api-key-here

# البيئة
NODE_ENV=development
```

### الخطوة 5: تشغيل الترحيلات

```bash
# إنشاء ملفات الترحيل
pnpm drizzle-kit generate

# تطبيق الترحيلات على قاعدة البيانات
pnpm drizzle-kit migrate
```

### الخطوة 6: تشغيل التطبيق

```bash
# تشغيل في وضع التطوير
pnpm dev
```

ستظهر رسالة:
```
Server running on http://localhost:3000
```

افتح المتصفح وادخل: **http://localhost:3000**

---

## النشر على AWS

### المتطلبات

- حساب AWS (مجاني للسنة الأولى)
- بطاقة ائتمان للتحقق
- أساسيات استخدام AWS Console

### الخطوة 1: إنشاء حساب AWS

1. اذهب إلى https://aws.amazon.com
2. اضغط **Create AWS Account**
3. أكمل البيانات الشخصية
4. أدخل بيانات البطاقة الائتمانية
5. تحقق من رقم الهاتف

### الخطوة 2: إنشاء RDS (قاعدة البيانات السحابية)

1. ادخل **AWS Console**
2. ابحث عن **RDS** واضغط عليه
3. اضغط **Create Database**
4. اختر الإعدادات:
   - **Engine:** MySQL
   - **Version:** 8.0.35
   - **DB instance class:** db.t3.micro (مجاني)
   - **Storage:** 20 GB
   - **DB name:** buildai_erp
   - **Master username:** buildai_admin
   - **Master password:** اختر كلمة مرور قوية
5. اضغط **Create Database**
6. انتظر 5-10 دقائق

### الخطوة 3: الحصول على بيانات الاتصال

1. بعد إنشاء قاعدة البيانات، اضغط على اسمها
2. انسخ **Endpoint** (مثال: `buildai.xxxxx.us-east-1.rds.amazonaws.com`)
3. اضغط **Modify**
4. فعّل **Public accessibility**
5. اضغط **Continue** ثم **Apply immediately**

### الخطوة 4: إنشاء EC2 (الخادم)

1. ابحث عن **EC2** واضغط عليه
2. اضغط **Launch Instance**
3. اختر:
   - **AMI:** Ubuntu 22.04 LTS
   - **Instance type:** t3.micro (مجاني)
   - **Key pair:** أنشئ واحد جديد واحفظه بأمان
4. اضغط **Launch**
5. انتظر حتى يبدأ الخادم

### الخطوة 5: الاتصال بـ EC2

```bash
# على جهازك المحلي
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### الخطوة 6: تثبيت المتطلبات على EC2

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# تثبيت Git
sudo apt install git -y

# تثبيت PM2 (لتشغيل التطبيق في الخلفية)
sudo npm install -g pm2
```

### الخطوة 7: تحميل المشروع على EC2

```bash
# استنساخ المشروع
git clone https://github.com/your-repo/buildai-erp.git
cd buildai-erp

# تثبيت المكتبات
pnpm install
```

### الخطوة 8: إعداد البيئة على EC2

```bash
# أنشئ ملف .env
nano .env
```

أضف:
```env
DATABASE_URL=mysql://buildai_admin:your_rds_password@buildai.xxxxx.us-east-1.rds.amazonaws.com:3306/buildai_erp
JWT_SECRET=your_jwt_secret_key_min_32_characters
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-your-api-key
NODE_ENV=production
```

اضغط **Ctrl+X** ثم **Y** ثم **Enter**

### الخطوة 9: بناء وتشغيل التطبيق

```bash
# بناء التطبيق
pnpm build

# تشغيل باستخدام PM2
pm2 start "pnpm start" --name buildai
pm2 save
pm2 startup
```

### الخطوة 10: إعداد Domain (اختياري)

1. اشتري domain من GoDaddy أو Namecheap
2. في AWS Console، اذهب إلى **Route 53**
3. أنشئ **Hosted Zone** جديد
4. أضف **A Record:**
   - Name: your-domain.com
   - Value: EC2 Public IP
5. حدّث nameservers في موقع الـ Domain

### الخطوة 11: تفعيل HTTPS (SSL)

```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx -y

# إنشاء شهادة SSL
sudo certbot certonly --standalone -d your-domain.com
```

---

## تفعيل الميزات المتقدمة

### 1. تفعيل الأوامر الصوتية (Whisper)

**المتطلبات:**
- OpenAI API Key

**الخطوات:**

```bash
# تثبيت Whisper
pip install openai-whisper

# أضف المفتاح في .env
OPENAI_API_KEY=sk-your-api-key
```

### 2. تثبيت Redis (للتخزين المؤقت)

**محلياً:**
```bash
# على macOS
brew install redis
redis-server

# على Linux
sudo apt install redis-server
sudo systemctl start redis-server
```

**على AWS:**
1. اذهب إلى **ElastiCache**
2. اضغط **Create Cluster**
3. اختر **Redis**
4. اختر **t3.micro** (مجاني)
5. انسخ **Primary Endpoint**

### 3. تثبيت RabbitMQ (للمهام غير المتزامنة)

**محلياً:**
```bash
# على macOS
brew install rabbitmq
brew services start rabbitmq-server

# على Linux
sudo apt install rabbitmq-server
sudo systemctl start rabbitmq-server
```

**على AWS:**
1. استخدم **MQ** service
2. أنشئ broker جديد
3. اختر **RabbitMQ**

---

## استكشاف الأخطاء

### خطأ: "Connection refused"

**الحل:**
```bash
# تحقق من MySQL
mysql -u root -p

# أو أعد تشغيله
sudo systemctl restart mysql
```

### خطأ: "Database does not exist"

**الحل:**
```bash
# تحقق من اسم قاعدة البيانات
mysql -u buildai_user -p buildai_erp

# أو أعد تشغيل الترحيلات
pnpm drizzle-kit migrate
```

### خطأ: "Cannot connect to RDS"

**الحل:**
1. تحقق من Security Group في AWS
2. أضف inbound rule:
   - Type: MySQL/Aurora
   - Port: 3306
   - Source: 0.0.0.0/0 (أو IP محدد)

### خطأ: "OpenAI API key invalid"

**الحل:**
1. تحقق من المفتاح في https://platform.openai.com/api-keys
2. تأكد من أن الحساب له رصيد
3. أعد تشغيل التطبيق

---

## الخطوات التالية

بعد التشغيل الناجح:

1. **أنشئ حساب مدير:**
   - ادخل النظام
   - أنشئ مستخدم جديد مع دور "admin"

2. **أنشئ مشروع تجريبي:**
   - اسم: "مشروع تجريبي"
   - ميزانية: 100,000 ريال
   - موقع: الرياض

3. **أضف مواد:**
   - حديد: 50 طن × 1000 ريال
   - إسمنت: 100 شيكارة × 50 ريال

4. **اختبر الأوامر الصوتية:**
   - سجل أمر: "صرفت 5000 ريال على حديد"

5. **راقب الميزانية:**
   - شوف التنبيهات عند التجاوز

---

## الدعم والمساعدة

إذا واجهت مشكلة:

1. تحقق من السجلات:
   ```bash
   pm2 logs buildai
   ```

2. اتصل بفريق الدعم
3. راجع التوثيق الكاملة في `BUILDAI_README.md`

---

**آخر تحديث:** 7 أبريل 2026
**الإصدار:** 1.0.0
