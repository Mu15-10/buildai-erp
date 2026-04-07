# BuildAI ERP - دليل النشر على AWS

## الخطوات السريعة

### 1. إعداد الحساب

```bash
# تسجيل الدخول إلى AWS CLI
aws configure

# أدخل:
# AWS Access Key ID: [من AWS Console]
# AWS Secret Access Key: [من AWS Console]
# Default region: us-east-1
# Default output format: json
```

### 2. إنشاء RDS (قاعدة البيانات)

```bash
# إنشاء قاعدة بيانات MySQL
aws rds create-db-instance \
  --db-instance-identifier buildai-mysql \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username buildai_admin \
  --master-user-password 'YourSecurePassword123!' \
  --allocated-storage 20 \
  --publicly-accessible \
  --region us-east-1

# الحصول على Endpoint
aws rds describe-db-instances \
  --db-instance-identifier buildai-mysql \
  --query 'DBInstances[0].Endpoint.Address' \
  --region us-east-1
```

### 3. إنشاء EC2 (الخادم)

```bash
# إنشاء key pair
aws ec2 create-key-pair \
  --key-name buildai-key \
  --region us-east-1 \
  --query 'KeyMaterial' \
  --output text > buildai-key.pem

chmod 400 buildai-key.pem

# إنشاء security group
aws ec2 create-security-group \
  --group-name buildai-sg \
  --description "BuildAI ERP Security Group" \
  --region us-east-1

# السماح بـ SSH و HTTP و HTTPS
aws ec2 authorize-security-group-ingress \
  --group-name buildai-sg \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

aws ec2 authorize-security-group-ingress \
  --group-name buildai-sg \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

aws ec2 authorize-security-group-ingress \
  --group-name buildai-sg \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

aws ec2 authorize-security-group-ingress \
  --group-name buildai-sg \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

# إنشاء EC2 Instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name buildai-key \
  --security-groups buildai-sg \
  --region us-east-1

# الحصول على Public IP
aws ec2 describe-instances \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --region us-east-1
```

### 4. الاتصال بـ EC2

```bash
# الاتصال بالخادم
ssh -i buildai-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Docker و Docker Compose
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu

# تحميل المشروع
git clone https://github.com/your-repo/buildai-erp.git
cd buildai-erp

# إعداد البيئة
cat > .env << EOF
DATABASE_URL=mysql://buildai_admin:YourSecurePassword123!@YOUR_RDS_ENDPOINT:3306/buildai_erp
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672
JWT_SECRET=your_jwt_secret_key_min_32_characters_long
NODE_ENV=production
OPENAI_API_KEY=sk-your-api-key
EOF

# تشغيل Docker Compose
docker-compose up -d

# التحقق من الحالة
docker-compose logs -f app
```

### 5. إعداد Domain

```bash
# في Route 53 في AWS Console:
# 1. أنشئ Hosted Zone جديد
# 2. أضف A Record:
#    Name: your-domain.com
#    Value: YOUR_EC2_PUBLIC_IP
# 3. حدّث nameservers في موقع الـ Domain

# تفعيل HTTPS
ssh -i buildai-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --standalone -d your-domain.com

# تحديث nginx config
sudo nano /etc/nginx/sites-available/default
```

---

## استخدام CloudFormation (الطريقة المتقدمة)

### إنشاء Stack

```bash
aws cloudformation create-stack \
  --stack-name buildai-erp-stack \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=DBPassword,ParameterValue=YourSecurePassword123! \
    ParameterKey=KeyName,ParameterValue=buildai-key \
  --region us-east-1

# مراقبة الإنشاء
aws cloudformation describe-stacks \
  --stack-name buildai-erp-stack \
  --region us-east-1
```

---

## التكاليف المتوقعة

| الخدمة | السعر شهري | ملاحظات |
|-------|----------|--------|
| RDS (MySQL t3.micro) | $10-15 | مجاني السنة الأولى |
| EC2 (t3.micro) | $5-10 | مجاني السنة الأولى |
| Data Transfer | $1-5 | خارج AWS |
| Route 53 | $0.50 | لكل hosted zone |
| **الإجمالي** | **$16-30** | **مجاني السنة الأولى** |

---

## المراقبة والتنبيهات

### إعداد CloudWatch

```bash
# إنشاء alarm لـ CPU
aws cloudwatch put-metric-alarm \
  --alarm-name buildai-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1

# إنشاء alarm لـ RDS
aws cloudwatch put-metric-alarm \
  --alarm-name buildai-rds-cpu \
  --alarm-description "Alert when RDS CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

---

## النسخ الاحتياطي

### نسخ احتياطي تلقائي لـ RDS

```bash
aws rds modify-db-instance \
  --db-instance-identifier buildai-mysql \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately
```

### نسخ احتياطي يدوي

```bash
aws rds create-db-snapshot \
  --db-instance-identifier buildai-mysql \
  --db-snapshot-identifier buildai-snapshot-$(date +%Y%m%d)
```

---

## استكشاف الأخطاء

### فحص الاتصال بـ RDS

```bash
# من EC2
mysql -h YOUR_RDS_ENDPOINT -u buildai_admin -p buildai_erp

# اختبر الاتصال
SHOW TABLES;
```

### فحص السجلات

```bash
# سجلات التطبيق
docker-compose logs app

# سجلات MySQL
docker-compose logs mysql

# سجلات Redis
docker-compose logs redis
```

### إعادة تشغيل الخدمات

```bash
# إعادة تشغيل التطبيق
docker-compose restart app

# إعادة تشغيل كل شيء
docker-compose down
docker-compose up -d
```

---

## الأمان

### Best Practices

1. **استخدم VPC Private Subnets** لـ RDS
2. **فعّل Encryption at Rest** لـ RDS
3. **استخدم SSL/TLS** لكل الاتصالات
4. **فعّل IAM Roles** لـ EC2
5. **استخدم Secrets Manager** لتخزين كلمات المرور
6. **فعّل Multi-AZ** لـ RDS (للإنتاج)

### تخزين الأسرار بأمان

```bash
# إنشاء secret في AWS Secrets Manager
aws secretsmanager create-secret \
  --name buildai/db-password \
  --secret-string 'YourSecurePassword123!'

# استرجاع السر
aws secretsmanager get-secret-value \
  --secret-id buildai/db-password
```

---

## النسخ والاستعادة

### نسخ احتياطي كامل

```bash
# نسخ احتياطي لـ RDS
aws rds create-db-snapshot \
  --db-instance-identifier buildai-mysql \
  --db-snapshot-identifier buildai-full-backup-$(date +%Y%m%d-%H%M%S)

# نسخ احتياطي لـ EBS (جميع البيانات)
aws ec2 create-snapshot \
  --volume-id vol-xxxxx \
  --description "BuildAI ERP Full Backup"
```

### الاستعادة

```bash
# استعادة من Snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier buildai-mysql-restored \
  --db-snapshot-identifier buildai-full-backup-20240407
```

---

## الدعم

للمساعدة:
- AWS Support: https://console.aws.amazon.com/support
- AWS Documentation: https://docs.aws.amazon.com
- BuildAI Documentation: BUILDAI_README.md

---

**آخر تحديث:** 7 أبريل 2026
**الإصدار:** 1.0.0
