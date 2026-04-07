import { eq, and, desc, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, transactions, materials, auditLogs, budgetTracking, voiceCommands } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ PROJECT QUERIES ============

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProjectsByManager(managerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(projects).where(eq(projects.managerId, managerId));
}

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function createProject(data: typeof projects.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(projects).values(data);
  return result;
}

// ============ TRANSACTION QUERIES ============

export async function getTransactionsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(transactions)
    .where(eq(transactions.projectId, projectId))
    .orderBy(desc(transactions.createdAt));
}

export async function getTransactionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTransaction(data: typeof transactions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(transactions).values(data);
  return result;
}

export async function updateTransactionStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(transactions)
    .set({ status: status as any })
    .where(eq(transactions.id, id));
}

// ============ MATERIAL QUERIES ============

export async function getMaterialsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(materials)
    .where(eq(materials.projectId, projectId))
    .orderBy(desc(materials.createdAt));
}

export async function getMaterialsByCategory(projectId: number, category: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(materials)
    .where(and(eq(materials.projectId, projectId), eq(materials.category, category)));
}

export async function createMaterial(data: typeof materials.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(materials).values(data);
  return result;
}

// ============ AUDIT LOG QUERIES ============

export async function createAuditLog(data: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(auditLogs).values(data);
}

export async function getAuditLogsByUser(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getAuditLogsByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(auditLogs)
    .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
    .orderBy(desc(auditLogs.createdAt));
}

// ============ BUDGET TRACKING QUERIES ============

export async function getBudgetTrackingByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(budgetTracking)
    .where(eq(budgetTracking.projectId, projectId));
}

export async function getBudgetTrackingByCategory(projectId: number, category: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(budgetTracking)
    .where(and(eq(budgetTracking.projectId, projectId), eq(budgetTracking.materialCategory, category)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrUpdateBudgetTracking(data: typeof budgetTracking.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getBudgetTrackingByCategory(data.projectId!, data.materialCategory);
  
  if (existing) {
    return await db.update(budgetTracking)
      .set(data)
      .where(eq(budgetTracking.id, existing.id));
  } else {
    return await db.insert(budgetTracking).values(data);
  }
}

// ============ VOICE COMMAND QUERIES ============

export async function createVoiceCommand(data: typeof voiceCommands.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(voiceCommands).values(data);
  return result;
}

export async function getVoiceCommandById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(voiceCommands).where(eq(voiceCommands.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateVoiceCommandStatus(id: number, status: string, processedData?: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {
    status: status as any,
    processedAt: new Date(),
  };
  
  if (processedData) {
    updateData.extractedData = processedData;
  }
  
  return await db.update(voiceCommands)
    .set(updateData)
    .where(eq(voiceCommands.id, id));
}

export async function getPendingVoiceCommands(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(voiceCommands)
    .where(eq(voiceCommands.status, 'pending'))
    .orderBy(voiceCommands.createdAt)
    .limit(limit);
}
