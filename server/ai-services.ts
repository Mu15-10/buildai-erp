import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import * as db from "./db";

// ============ SMART BUDGET GUARD ============

interface BudgetAnalysisResult {
  status: 'OK' | 'WARNING' | 'CRITICAL';
  predictedOverrunPercentage: number;
  confidence: number;
  recommendation: string;
  shouldAlert: boolean;
}

/**
 * Analyzes project budget burn rate using polynomial regression
 * Monitors if material consumption exceeds project completion percentage
 */
export async function analyzeBudgetBurnRate(
  projectId: number,
  materialCategory: string,
  historicalData: Array<{ day: number; consumptionPct: number; totalDays: number }>
): Promise<BudgetAnalysisResult> {
  if (historicalData.length < 3) {
    return {
      status: 'OK',
      predictedOverrunPercentage: 0,
      confidence: 0,
      recommendation: 'Insufficient historical data for prediction',
      shouldAlert: false,
    };
  }

  // Simple polynomial regression simulation
  // In production, use numpy/sklearn or similar
  const avgConsumption = historicalData.reduce((sum, d) => sum + d.consumptionPct, 0) / historicalData.length;
  const trend = historicalData.length > 1 
    ? (historicalData[historicalData.length - 1].consumptionPct - historicalData[0].consumptionPct) / (historicalData.length - 1)
    : 0;

  const totalDays = historicalData[historicalData.length - 1].totalDays;
  const daysElapsed = historicalData.length;
  const remainingDays = totalDays - daysElapsed;

  // Predict final consumption
  const predictedFinalConsumption = avgConsumption + (trend * remainingDays);
  const overrunPercentage = Math.max(0, predictedFinalConsumption - 1.0);

  let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
  let recommendation = 'استهلاك المواد ضمن الحدود الطبيعية';

  if (predictedFinalConsumption > 1.15) {
    status = predictedFinalConsumption > 1.30 ? 'CRITICAL' : 'WARNING';
    recommendation = predictedFinalConsumption > 1.30
      ? 'إيقاف الطلبات الجديدة ومراجعة عاجلة مع مدير المشروع'
      : 'مراجعة كميات الطلبات والتحقق من الهدر في الموقع';
  }

  // Calculate confidence (R² approximation)
  const confidence = Math.min(0.95, 0.5 + (historicalData.length * 0.1));

  return {
    status,
    predictedOverrunPercentage: overrunPercentage * 100,
    confidence: confidence * 100,
    recommendation,
    shouldAlert: status !== 'OK',
  };
}

/**
 * Monitors budget vs actual spending and triggers alerts
 */
export async function checkBudgetAlerts(projectId: number): Promise<Array<{
  category: string;
  alert: BudgetAnalysisResult;
}>> {
  const budgets = await db.getBudgetTrackingByProject(projectId);
  const alerts: Array<{ category: string; alert: BudgetAnalysisResult }> = [];

  for (const budget of budgets) {
    // Simulate historical data - in production, fetch from transactions
    const historicalData = [
      { day: 1, consumptionPct: 0.05, totalDays: 30 },
      { day: 5, consumptionPct: 0.15, totalDays: 30 },
      { day: 10, consumptionPct: 0.35, totalDays: 30 },
    ];

    const analysis = await analyzeBudgetBurnRate(projectId, budget.materialCategory, historicalData);

    if (analysis.shouldAlert) {
      alerts.push({
        category: budget.materialCategory,
        alert: analysis,
      });
    }
  }

  return alerts;
}

// ============ VOICE-TO-ERP ============

interface ExtractedVoiceData {
  action: 'expense' | 'income' | 'attendance' | 'material_request' | 'other';
  amount: number | null;
  currency: string | null;
  item: string | null;
  projectId: string | null;
  employeeName: string | null;
  confidence: number;
}

/**
 * Transcribes audio and extracts structured data using GPT-4
 */
export async function processVoiceCommand(audioUrl: string, language: string = 'ar'): Promise<{
  transcription: string;
  extracted: ExtractedVoiceData;
  success: boolean;
  error?: string;
}> {
  try {
    // Step 1: Transcribe audio using Whisper
    const transcriptionResult = await transcribeAudio({
      audioUrl,
      language,
      prompt: 'نظام محاسبة للمقاولات - استخرج المبالغ والمواد والمشاريع',
    });

    const transcription = (transcriptionResult as any).text || '';

    // Step 2: Extract structured data using GPT-4
    const extractionPrompt = `أنت محلل بيانات لنظام ERP للمقاولات.
استخرج البيانات التالية من النص بصيغة JSON:
{
  "action": "expense|income|attendance|material_request|other",
  "amount": number_or_null,
  "currency": "SAR|USD|AED|null",
  "item": "string_or_null",
  "projectId": "string_or_null",
  "employeeName": "string_or_null",
  "confidence": 0.0_to_1.0
}

النص: "${transcription}"

أرجع JSON فقط بدون شرح إضافي.`;

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'أنت مساعد استخراج البيانات المالية من الأوامر الصوتية. أرجع JSON فقط.',
        },
        {
          role: 'user',
          content: extractionPrompt as any,
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    const responseText = typeof messageContent === 'string' ? messageContent : '{}';
    const extracted = JSON.parse(responseText) as ExtractedVoiceData;

    return {
      transcription,
      extracted,
      success: extracted.confidence >= 0.7,
    };
  } catch (error) {
    console.error('Voice command processing error:', error);
    return {
      transcription: '',
      extracted: {
        action: 'other',
        amount: null,
        currency: null,
        item: null,
        projectId: null,
        employeeName: null,
        confidence: 0,
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Converts extracted voice data into accounting entries
 */
export async function voiceCommandToTransaction(
  userId: number,
  extracted: ExtractedVoiceData
): Promise<{ success: boolean; transactionId?: number; error?: string }> {
  try {
    if (extracted.confidence < 0.7) {
      return {
        success: false,
        error: 'Confidence score too low for automatic processing',
      };
    }

    if (!extracted.projectId || !extracted.amount) {
      return {
        success: false,
        error: 'Missing required fields: projectId or amount',
      };
    }

    const projectId = parseInt(extracted.projectId);

    // Create transaction based on action type
    let transactionType: 'expense' | 'income' | 'adjustment' = 'expense';
    if (extracted.action === 'income') {
      transactionType = 'income';
    }

    await db.createTransaction({
      projectId,
      type: transactionType,
      category: extracted.item || 'voice_command',
      amount: extracted.amount.toString() as any,
      description: `Voice command: ${extracted.action} - ${extracted.item}`,
      status: 'pending',
      createdBy: userId,
    });

    return {
      success: true,
      transactionId: projectId,
    };
  } catch (error) {
    console.error('Voice to transaction conversion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============ OCR & INVOICE PROCESSING ============

/**
 * Simulates local OCR processing for invoices
 * In production, use AWS Textract or Google Vision
 */
export async function processInvoiceLocally(imageBase64: string): Promise<{
  success: boolean;
  data?: {
    vendor: string;
    date: string;
    amount: number;
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
    taxAmount: number;
    totalAmount: number;
  };
  error?: string;
}> {
  try {
    // In production, use actual OCR library
    // For now, return mock data
    return {
      success: true,
      data: {
        vendor: 'Vendor Name',
        date: new Date().toISOString(),
        amount: 0,
        items: [],
        taxAmount: 0,
        totalAmount: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed',
    };
  }
}

// ============ COMPUTER VISION (YOLOv8) ============

interface SafetyAnalysisResult {
  workerCount: number;
  safetyViolations: string[];
  progressIndicators: string[];
  timestamp: string;
}

/**
 * Analyzes video frames for safety compliance and progress tracking
 * In production, integrate with YOLOv8 model
 */
export async function analyzeFrameForSafety(frameBase64: string): Promise<SafetyAnalysisResult> {
  // Simulated YOLOv8 analysis
  // In production, use actual model inference
  return {
    workerCount: 0,
    safetyViolations: [],
    progressIndicators: [],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Detects workers without proper PPE (Personal Protective Equipment)
 */
export async function detectPPEViolations(frameBase64: string): Promise<{
  violations: Array<{ type: 'no_hard_hat' | 'no_safety_vest'; count: number }>;
  confidence: number;
}> {
  // Simulated detection
  return {
    violations: [],
    confidence: 0,
  };
}

/**
 * Estimates project completion percentage from visual analysis
 */
export async function estimateProjectProgress(
  projectId: number,
  frameBase64: string
): Promise<{
  estimatedCompletion: number;
  confidence: number;
  details: string;
}> {
  // Simulated progress estimation
  return {
    estimatedCompletion: 0,
    confidence: 0,
    details: 'Progress estimation requires multiple frames over time',
  };
}
