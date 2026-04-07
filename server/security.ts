import crypto from 'crypto';
import { createHmac } from 'crypto';

// ============ ENCRYPTION & DECRYPTION (AES-256-GCM) ============

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV size
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Derives encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
}

/**
 * Encrypts sensitive data using AES-256-GCM
 */
export function encryptData(data: string, password: string): {
  ciphertext: string;
  tag: string;
  iv: string;
  salt: string;
} {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(salt); // Authenticate salt as additional data

  let ciphertext = cipher.update(data, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    tag: tag.toString('hex'),
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
  };
}

/**
 * Decrypts data encrypted with encryptData
 */
export function decryptData(
  encrypted: {
    ciphertext: string;
    tag: string;
    iv: string;
    salt: string;
  },
  password: string
): string {
  const salt = Buffer.from(encrypted.salt, 'hex');
  const key = deriveKey(password, salt);
  const iv = Buffer.from(encrypted.iv, 'hex');
  const tag = Buffer.from(encrypted.tag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(salt);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

// ============ WEBHOOK SIGNATURE VERIFICATION ============

/**
 * Generates HMAC-SHA256 signature for webhook verification
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verifies webhook signature using constant-time comparison
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ============ IDEMPOTENCY KEY MANAGEMENT ============

/**
 * Generates a unique idempotency key
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Validates idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

// ============ AUDIT LOG FINGERPRINTING ============

interface DeviceFingerprint {
  userId: number;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
}

/**
 * Generates a unique fingerprint for audit logging
 */
export function generateFingerprint(data: DeviceFingerprint): string {
  const combined = `${data.userId}:${data.ipAddress}:${data.userAgent}:${data.timestamp}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Verifies fingerprint consistency
 */
export function verifyFingerprint(
  data: DeviceFingerprint,
  storedFingerprint: string
): boolean {
  const generated = generateFingerprint(data);
  return crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(storedFingerprint));
}

// ============ KEY ROTATION ============

interface KeyRotationRecord {
  keyId: string;
  createdAt: Date;
  rotatedAt?: Date;
  isActive: boolean;
}

/**
 * Generates a new encryption key
 */
export function generateNewKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Schedules key rotation (90-day cycle)
 */
export function getKeyRotationSchedule(): {
  nextRotationDate: Date;
  rotationIntervalDays: number;
} {
  const rotationIntervalDays = 90;
  const nextRotationDate = new Date();
  nextRotationDate.setDate(nextRotationDate.getDate() + rotationIntervalDays);

  return {
    nextRotationDate,
    rotationIntervalDays,
  };
}

// ============ RATE LIMITING ============

interface RateLimitRecord {
  clientId: string;
  requestCount: number;
  windowStart: number;
  windowEnd: number;
}

/**
 * Implements token bucket rate limiting algorithm
 */
export function checkRateLimit(
  clientId: string,
  maxRequests: number = 100,
  windowSeconds: number = 60,
  store: Map<string, RateLimitRecord> = new Map()
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = store.get(clientId);

  if (!record || now > record.windowEnd) {
    // New window
    store.set(clientId, {
      clientId,
      requestCount: 1,
      windowStart: now,
      windowEnd: now + windowSeconds * 1000,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowSeconds * 1000,
    };
  }

  if (record.requestCount < maxRequests) {
    record.requestCount++;
    return {
      allowed: true,
      remaining: maxRequests - record.requestCount,
      resetTime: record.windowEnd,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetTime: record.windowEnd,
  };
}

// ============ JWT TOKEN MANAGEMENT ============

/**
 * Generates a secure JWT token (simplified - use jsonwebtoken in production)
 */
export function generateToken(payload: any, secret: string, expiresIn: number = 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verifies JWT token signature
 */
export function verifyToken(token: string, secret: string): { valid: boolean; payload?: any } {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSignature = createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false };
  }
}

// ============ ZERO TRUST SECURITY CHECKS ============

interface SecurityContext {
  userId: number;
  ipAddress: string;
  userAgent: string;
  resourceId: string;
  action: string;
}

/**
 * Performs Zero Trust security validation
 */
export function validateZeroTrust(context: SecurityContext): {
  allowed: boolean;
  reason?: string;
} {
  // Check for suspicious patterns
  if (!context.userId || !context.ipAddress || !context.userAgent) {
    return {
      allowed: false,
      reason: 'Missing security context',
    };
  }

  // In production, implement:
  // - IP whitelist/blacklist checks
  // - Geolocation anomaly detection
  // - Device fingerprint verification
  // - Behavior analysis

  return { allowed: true };
}

/**
 * Logs security event for audit trail
 */
export function logSecurityEvent(
  event: string,
  context: SecurityContext,
  result: 'success' | 'failure'
): void {
  console.log(`[SECURITY] ${event} - User: ${context.userId}, IP: ${context.ipAddress}, Result: ${result}`);
  // In production, persist to immutable audit log
}
