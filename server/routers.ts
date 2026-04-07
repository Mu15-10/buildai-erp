import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { createAuditLog } from "./db";
import { TRPCError } from "@trpc/server";

// ============ AUDIT LOGGING HELPER ============

async function logAuditEvent(userId: number, action: string, entityType: string, entityId: number | null, changes?: any, ipAddress?: string, userAgent?: string) {
  try {
    await createAuditLog({
      userId,
      action,
      entityType,
      entityId,
      changes: changes ? JSON.stringify(changes) : null,
      ipAddress,
      userAgent,
      fingerprint: `${userId}-${Date.now()}`,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

// ============ PROJECT ROUTER ============

const projectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const projects = await db.getAllProjects();
    return projects;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const project = await db.getProjectById(input.id);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      return project;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      budget: z.string().optional(),
      location: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only managers can create projects" });
      }

      const result = await db.createProject({
        name: input.name,
        description: input.description,
        budget: input.budget ? parseFloat(input.budget).toString() as any : null,
        location: input.location,
        startDate: input.startDate,
        endDate: input.endDate,
        managerId: ctx.user.id,
        status: 'planning',
      });

      await logAuditEvent(ctx.user.id, "CREATE", "project", null, input);
      return result;
    }),
});

// ============ FINANCE ROUTER ============

const financeRouter = router({
  getTransactions: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTransactionsByProject(input.projectId);
    }),

  createTransaction: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      type: z.enum(['expense', 'income', 'adjustment']),
      category: z.string().optional(),
      amount: z.string(),
      description: z.string().optional(),
      invoiceUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createTransaction({
        projectId: input.projectId,
        type: input.type,
        category: input.category,
        amount: parseFloat(input.amount).toString() as any,
        description: input.description,
        invoiceUrl: input.invoiceUrl,
        status: 'pending',
        createdBy: ctx.user.id,
      });

      await logAuditEvent(ctx.user.id, "CREATE_TRANSACTION", "transaction", null, input);
      return result;
    }),

  approveTransaction: protectedProcedure
    .input(z.object({ transactionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'accountant') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only accountants can approve transactions" });
      }

      await db.updateTransactionStatus(input.transactionId, 'approved');
      await logAuditEvent(ctx.user.id, "APPROVE_TRANSACTION", "transaction", input.transactionId);
      return { success: true };
    }),

  getBudgetTracking: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await db.getBudgetTrackingByProject(input.projectId);
    }),
});

// ============ INVENTORY ROUTER ============

const inventoryRouter = router({
  getMaterials: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await db.getMaterialsByProject(input.projectId);
    }),

  createMaterial: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string().min(1),
      category: z.string(),
      quantity: z.string(),
      unit: z.string(),
      unitPrice: z.string().optional(),
      budgetedQuantity: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createMaterial({
        projectId: input.projectId,
        name: input.name,
        category: input.category,
        quantity: parseFloat(input.quantity).toString() as any,
        unit: input.unit,
        unitPrice: input.unitPrice ? parseFloat(input.unitPrice).toString() as any : null,
        budgetedQuantity: input.budgetedQuantity ? parseFloat(input.budgetedQuantity).toString() as any : null,
        status: 'ordered',
      });

      await logAuditEvent(ctx.user.id, "CREATE_MATERIAL", "material", null, input);
      return result;
    }),
});

// ============ VOICE COMMAND ROUTER ============

const voiceRouter = router({
  submitVoiceCommand: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      audioUrl: z.string(),
      transcription: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createVoiceCommand({
        userId: ctx.user.id,
        projectId: input.projectId,
        audioUrl: input.audioUrl,
        transcription: input.transcription,
        status: 'pending',
      });

      await logAuditEvent(ctx.user.id, "VOICE_COMMAND_SUBMITTED", "voiceCommand", null, input);
      return result;
    }),

  getVoiceCommandStatus: protectedProcedure
    .input(z.object({ commandId: z.number() }))
    .query(async ({ input }) => {
      const command = await db.getVoiceCommandById(input.commandId);
      if (!command) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Voice command not found" });
      }
      return command;
    }),
});

// ============ AUDIT ROUTER ============

const auditRouter = router({
  getMyAuditLog: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      return await db.getAuditLogsByUser(ctx.user.id, input.limit);
    }),

  getEntityAuditLog: protectedProcedure
    .input(z.object({ entityType: z.string(), entityId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAuditLogsByEntity(input.entityType, input.entityId);
    }),
});

// ============ MAIN APP ROUTER ============

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  projects: projectRouter,
  finance: financeRouter,
  inventory: inventoryRouter,
  voice: voiceRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
