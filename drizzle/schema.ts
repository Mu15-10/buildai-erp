import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "engineer", "accountant", "manager"]).default("user").notNull(),
  departmentId: int("departmentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  openIdIdx: index("openId_idx").on(table.openId),
  roleIdx: index("role_idx").on(table.role),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Projects table
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["planning", "active", "paused", "completed", "cancelled"]).default("planning").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  location: varchar("location", { length: 255 }),
  managerId: int("managerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("project_status_idx").on(table.status),
  managerIdx: index("project_manager_idx").on(table.managerId),
}));

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// Transactions table (Finance Service)
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  type: mysqlEnum("type", ["expense", "income", "adjustment"]).notNull(),
  category: varchar("category", { length: 100 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  invoiceUrl: varchar("invoiceUrl", { length: 512 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "reconciled"]).default("pending").notNull(),
  createdBy: int("createdBy").notNull(),
  approvedBy: int("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  projectIdx: index("transaction_project_idx").on(table.projectId),
  typeIdx: index("transaction_type_idx").on(table.type),
  statusIdx: index("transaction_status_idx").on(table.status),
}));

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// Materials/Inventory table
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }),
  budgetedQuantity: decimal("budgetedQuantity", { precision: 15, scale: 2 }),
  status: mysqlEnum("status", ["ordered", "received", "used", "returned"]).default("ordered").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  projectIdx: index("material_project_idx").on(table.projectId),
  categoryIdx: index("material_category_idx").on(table.category),
}));

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

// Audit Logs table (Immutable)
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  changes: json("changes"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  location: varchar("location", { length: 255 }),
  fingerprint: varchar("fingerprint", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("audit_user_idx").on(table.userId),
  actionIdx: index("audit_action_idx").on(table.action),
  entityIdx: index("audit_entity_idx").on(table.entityType, table.entityId),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Budget Tracking table
export const budgetTracking = mysqlTable("budgetTracking", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  materialCategory: varchar("materialCategory", { length: 100 }).notNull(),
  budgetedAmount: decimal("budgetedAmount", { precision: 15, scale: 2 }).notNull(),
  spentAmount: decimal("spentAmount", { precision: 15, scale: 2 }).default("0"),
  projectionPercentage: decimal("projectionPercentage", { precision: 5, scale: 2 }).default("0"),
  projectCompletionPercentage: decimal("projectCompletionPercentage", { precision: 5, scale: 2 }).default("0"),
  alertThreshold: decimal("alertThreshold", { precision: 5, scale: 2 }).default("10"),
  lastAlertSent: timestamp("lastAlertSent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  projectIdx: index("budget_project_idx").on(table.projectId),
  categoryIdx: index("budget_category_idx").on(table.materialCategory),
}));

export type BudgetTracking = typeof budgetTracking.$inferSelect;
export type InsertBudgetTracking = typeof budgetTracking.$inferInsert;

// Voice Commands table
export const voiceCommands = mysqlTable("voiceCommands", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  audioUrl: varchar("audioUrl", { length: 512 }),
  transcription: text("transcription"),
  extractedData: json("extractedData"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  status: mysqlEnum("status", ["pending", "processed", "failed", "manual_review"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
}, (table) => ({
  userIdx: index("voice_user_idx").on(table.userId),
  statusIdx: index("voice_status_idx").on(table.status),
}));

export type VoiceCommand = typeof voiceCommands.$inferSelect;
export type InsertVoiceCommand = typeof voiceCommands.$inferInsert;