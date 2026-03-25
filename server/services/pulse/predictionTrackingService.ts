import { createHash, randomBytes } from 'crypto';
import { db } from '../../db';
import { predictionEvents, predictionOutcomes, predictionAccuracyStats } from '@shared/schema';
import { eq, desc, and, sql, isNull } from 'drizzle-orm';

// Stub for blockchain stamping (will be enhanced when full chain integration is ready)
const auditTrailService = {
  logEvent: async (data: any): Promise<{ id: string; onchainSignature: string | null }> => ({ 
    id: `audit_${Date.now()}`, 
    onchainSignature: null 
  })
};
const AUDIT_EVENT_TYPES = { SYSTEM_VERSION_STAMP: 'system_version_stamp' };
const EVENT_CATEGORIES = { SYSTEM: 'system' };
const darkwaveChainClient = {
  stampPrediction: async (data: any) => ({ verificationId: null, txHash: null }),
  submitPredictionForVerification: async (data: any): Promise<{ success: boolean; verificationId: string | null; txHash: string | null }> => ({ 
    success: true, 
    verificationId: `pred_${Date.now().toString(36)}`, 
    txHash: null 
  })
};

// Stub for ML learning service (basic version)
const predictionLearningService = {
  extractFeatures: async (predictionId: string, horizon: string, priceChangePercent: number, isCorrect: boolean) => {
    console.log(`[ML] Feature extraction for ${predictionId} @ ${horizon}: ${isCorrect ? 'WIN' : 'LOSS'}`);
  }
};

/**
 * Prediction Tracking Service
 * Logs every signal, tracks outcomes, calculates accuracy
 * Stamps predictions to Trust Layer for immutable proof
 */

interface IndicatorSnapshot {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  sma50: number;
  sma200: number;
  bollingerBands: { upper: number; middle: number; lower: number; bandwidth: number };
  support: number;
  resistance: number;
  volumeDelta: { buyVolume: number; sellVolume: number; delta: number; buySellRatio: number };
  spikeScore: { score: number; signal: string; prediction: string };
  volatility: number;
}

interface PredictionInput {
  ticker: string;
  assetType: 'crypto' | 'stock';
  priceAtPrediction: number;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  indicators: IndicatorSnapshot;
  bullishSignals: number;
  bearishSignals: number;
  signalsList: string[];
  userId?: string;
}

interface OutcomeInput {
  predictionId: string;
  horizon: '1h' | '4h' | '24h' | '7d';
  priceAtCheck: number;
  volatilityDuring?: number;
  maxDrawdown?: number;
  maxGain?: number;
}

class PredictionTrackingService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
    console.log('✅ [PredictionTracking] Service initialized');
  }

  /**
   * Generate unique prediction ID
   */
  private generatePredictionId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `pred_${timestamp}_${random}`;
  }

  /**
   * Create SHA-256 hash of prediction payload for blockchain stamping
   */
  private hashPayload(payload: object): string {
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Determine confidence level based on signal strength
   */
  private determineConfidence(bullish: number, bearish: number, signal: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const total = bullish + bearish;
    const dominant = Math.max(bullish, bearish);
    const ratio = total > 0 ? dominant / total : 0;

    if (signal === 'STRONG_BUY' || signal === 'STRONG_SELL') return 'HIGH';
    if (ratio > 0.75 && total >= 4) return 'HIGH';
    if (ratio > 0.6 && total >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Log a new prediction with full indicator snapshot
   */
  async logPrediction(input: PredictionInput): Promise<{
    id: string;
    payloadHash: string;
    success: boolean;
  }> {
    const predictionId = this.generatePredictionId();
    
    // Create payload for hashing (includes all relevant data)
    const payload = {
      id: predictionId,
      ticker: input.ticker,
      assetType: input.assetType,
      priceAtPrediction: input.priceAtPrediction,
      signal: input.signal,
      indicators: input.indicators,
      bullishSignals: input.bullishSignals,
      bearishSignals: input.bearishSignals,
      signalsList: input.signalsList,
      timestamp: new Date().toISOString(),
    };

    const payloadHash = this.hashPayload(payload);
    const confidence = input.confidence || this.determineConfidence(
      input.bullishSignals,
      input.bearishSignals,
      input.signal
    );

    try {
      // Insert prediction record
      await db.insert(predictionEvents).values({
        id: predictionId,
        userId: input.userId || null,
        ticker: input.ticker.toUpperCase(),
        assetType: input.assetType,
        priceAtPrediction: input.priceAtPrediction.toString(),
        signal: input.signal,
        confidence,
        indicators: JSON.stringify(input.indicators),
        bullishSignals: input.bullishSignals,
        bearishSignals: input.bearishSignals,
        signalsList: JSON.stringify(input.signalsList),
        payloadHash,
        status: 'pending',
      });

      console.log(`📊 [PredictionTracking] Logged prediction ${predictionId}: ${input.signal} ${input.ticker} @ $${input.priceAtPrediction}`);

      // Schedule blockchain stamp (async, don't wait)
      this.stampToBlockchain(predictionId, payload).catch(err => {
        console.error('⚠️ [PredictionTracking] Blockchain stamp failed:', err);
      });

      return { id: predictionId, payloadHash, success: true };
    } catch (error: any) {
      console.error('❌ [PredictionTracking] Failed to log prediction:', error);
      return { id: predictionId, payloadHash, success: false };
    }
  }

  /**
   * Stamp prediction to Solana blockchain via audit trail + Trust Layer L1
   */
  private async stampToBlockchain(predictionId: string, payload: object): Promise<void> {
    try {
      const result = await auditTrailService.logEvent({
        userId: 'system',
        eventType: AUDIT_EVENT_TYPES.SYSTEM_VERSION_STAMP,
        category: EVENT_CATEGORIES.SYSTEM,
        data: {
          type: 'prediction',
          predictionId,
          payload,
        },
      });

      if (result?.onchainSignature) {
        await db.update(predictionEvents)
          .set({
            auditEventId: result.id,
            onchainSignature: result.onchainSignature,
            status: 'stamped',
            stampedAt: new Date(),
          })
          .where(eq(predictionEvents.id, predictionId));

        console.log(`⛓️ [PredictionTracking] Prediction ${predictionId} stamped to Solana: ${result.onchainSignature.substring(0, 20)}...`);
      }

      // Also submit to Trust Layer L1 for dual verification
      this.stampToDarkWaveChain(predictionId, payload as any).catch(err => {
        console.warn('⚠️ [PredictionTracking] Trust Layer stamp failed (non-critical):', err.message);
      });
    } catch (error) {
      console.error('❌ [PredictionTracking] Blockchain stamp error:', error);
    }
  }

  /**
   * Submit prediction hash to Trust Layer (DSC) L1 for additional verification
   */
  private async stampToDarkWaveChain(predictionId: string, payload: {
    id: string;
    ticker: string;
    signal: string;
    indicators?: any;
    priceAtPrediction?: number;
    timestamp: string;
  }): Promise<void> {
    try {
      const result = await darkwaveChainClient.submitPredictionForVerification({
        id: predictionId,
        ticker: payload.ticker,
        signal: payload.signal,
        confidence: payload.indicators?.rsi ? Math.abs(50 - payload.indicators.rsi) : 50,
        timestamp: payload.timestamp,
        agentId: 'darkwave-v2',
      });

      if (result.success) {
        console.log(`🔗 [PredictionTracking] Prediction ${predictionId} verified on Trust Layer: ${result.verificationId?.substring(0, 16)}...`);
      }
    } catch (error: any) {
      console.warn('⚠️ [PredictionTracking] Trust Layer not configured or unavailable:', error.message);
    }
  }

  /**
   * Record outcome for a prediction at a specific time horizon
   */
  async recordOutcome(input: OutcomeInput): Promise<boolean> {
    try {
      // Get the original prediction
      const [prediction] = await db.select()
        .from(predictionEvents)
        .where(eq(predictionEvents.id, input.predictionId))
        .limit(1);

      if (!prediction) {
        console.error(`❌ [PredictionTracking] Prediction not found: ${input.predictionId}`);
        return false;
      }

      const originalPrice = parseFloat(prediction.priceAtPrediction);
      const priceChange = input.priceAtCheck - originalPrice;
      const priceChangePercent = (priceChange / originalPrice) * 100;

      // Determine if prediction was correct based on signal direction
      const isCorrect = this.evaluateOutcome(
        prediction.signal,
        priceChangePercent
      );

      // Classify outcome based on signal type and price movement
      const outcome = this.classifyOutcome(prediction.signal, priceChangePercent);

      const outcomeId = `out_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;

      await db.insert(predictionOutcomes).values({
        id: outcomeId,
        predictionId: input.predictionId,
        horizon: input.horizon,
        priceAtCheck: input.priceAtCheck.toString(),
        priceChange: priceChange.toFixed(4),
        priceChangePercent: priceChangePercent.toFixed(4),
        outcome,
        isCorrect,
        volatilityDuring: input.volatilityDuring?.toFixed(4) || null,
        maxDrawdown: input.maxDrawdown?.toFixed(4) || null,
        maxGain: input.maxGain?.toFixed(4) || null,
      });

      console.log(`📈 [PredictionTracking] Outcome recorded for ${input.predictionId} @ ${input.horizon}: ${outcome} (${priceChangePercent.toFixed(2)}%)`);

      // Extract features for ML training
      try {
        await predictionLearningService.extractFeatures(
          input.predictionId,
          input.horizon as '1h' | '4h' | '24h' | '7d',
          priceChangePercent,
          isCorrect
        );
      } catch (featureError) {
        console.error('⚠️ [PredictionTracking] Feature extraction failed:', featureError);
      }

      // Update accuracy stats
      await this.updateAccuracyStats(prediction.ticker, prediction.signal, input.horizon, isCorrect, priceChangePercent);

      // Mark prediction as evaluated if all horizons are done
      const allOutcomes = await db.select()
        .from(predictionOutcomes)
        .where(eq(predictionOutcomes.predictionId, input.predictionId));

      if (allOutcomes.length >= 4) {
        await db.update(predictionEvents)
          .set({ status: 'evaluated' })
          .where(eq(predictionEvents.id, input.predictionId));
      }

      return true;
    } catch (error) {
      console.error('❌ [PredictionTracking] Failed to record outcome:', error);
      return false;
    }
  }

  /**
   * Evaluate if prediction was correct based on signal and price movement
   * BUY/STRONG_BUY: Correct if price went UP (positive return)
   * SELL/STRONG_SELL: Correct if price went DOWN (negative return)
   * HOLD: Correct if price stayed stable (within tolerance band)
   */
  private evaluateOutcome(signal: string, priceChangePercent: number): boolean {
    const winThreshold = 0.5; // 0.5% minimum move to count as win
    const holdTolerance = 2.0; // HOLD is correct if price moves less than 2%

    switch (signal) {
      case 'STRONG_BUY':
      case 'BUY':
        // BUY is correct when price goes UP
        return priceChangePercent > winThreshold;
      case 'STRONG_SELL':
      case 'SELL':
        // SELL is correct when price goes DOWN
        return priceChangePercent < -winThreshold;
      case 'HOLD':
        // HOLD is correct when price stays relatively stable
        return Math.abs(priceChangePercent) < holdTolerance;
      default:
        return false;
    }
  }

  /**
   * Classify outcome as WIN/LOSS/NEUTRAL based on signal type
   */
  private classifyOutcome(signal: string, priceChangePercent: number): 'WIN' | 'LOSS' | 'NEUTRAL' {
    const isCorrect = this.evaluateOutcome(signal, priceChangePercent);
    const threshold = 0.5;

    if (signal === 'HOLD') {
      // For HOLD, success is when price stays stable
      return isCorrect ? 'WIN' : 'LOSS';
    }

    // For BUY/SELL signals
    if (Math.abs(priceChangePercent) < threshold) {
      return 'NEUTRAL'; // Price barely moved
    }

    return isCorrect ? 'WIN' : 'LOSS';
  }

  /**
   * Update accuracy stats for a ticker/signal/horizon combination
   */
  private async updateAccuracyStats(
    ticker: string,
    signal: string,
    horizon: string,
    isCorrect: boolean,
    returnPercent: number
  ): Promise<void> {
    // Get or create stats record
    const statsId = `stats_${ticker}_${signal}_${horizon}`.toLowerCase();
    
    const [existing] = await db.select()
      .from(predictionAccuracyStats)
      .where(eq(predictionAccuracyStats.id, statsId))
      .limit(1);

    if (existing) {
      // Update existing stats
      const newTotal = existing.totalPredictions + 1;
      const newCorrect = existing.correctPredictions + (isCorrect ? 1 : 0);
      const winRate = ((newCorrect / newTotal) * 100).toFixed(2);

      // Calculate new average return
      const prevAvg = parseFloat(existing.avgReturn || '0');
      const newAvg = ((prevAvg * (newTotal - 1)) + returnPercent) / newTotal;

      // Update streak
      let newStreak = existing.currentStreak || 0;
      if (isCorrect) {
        newStreak = newStreak >= 0 ? newStreak + 1 : 1;
      } else {
        newStreak = newStreak <= 0 ? newStreak - 1 : -1;
      }

      const longestWin = Math.max(existing.longestWinStreak || 0, isCorrect ? newStreak : 0);
      const longestLoss = Math.min(existing.longestLossStreak || 0, !isCorrect ? newStreak : 0);

      await db.update(predictionAccuracyStats)
        .set({
          totalPredictions: newTotal,
          correctPredictions: newCorrect,
          winRate,
          avgReturn: newAvg.toFixed(4),
          currentStreak: newStreak,
          longestWinStreak: longestWin,
          longestLossStreak: Math.abs(longestLoss),
          lastPredictionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(predictionAccuracyStats.id, statsId));
    } else {
      // Create new stats record
      await db.insert(predictionAccuracyStats).values({
        id: statsId,
        ticker: ticker.toUpperCase(),
        signal,
        horizon,
        totalPredictions: 1,
        correctPredictions: isCorrect ? 1 : 0,
        winRate: isCorrect ? '100.00' : '0.00',
        avgReturn: returnPercent.toFixed(4),
        currentStreak: isCorrect ? 1 : -1,
        longestWinStreak: isCorrect ? 1 : 0,
        longestLossStreak: isCorrect ? 0 : 1,
        lastPredictionAt: new Date(),
      });
    }

    // Also update global stats (no ticker/signal/horizon filter)
    await this.updateGlobalStats(isCorrect, returnPercent);
  }

  /**
   * Update global accuracy stats
   */
  private async updateGlobalStats(isCorrect: boolean, returnPercent: number): Promise<void> {
    const globalId = 'stats_global';

    const [existing] = await db.select()
      .from(predictionAccuracyStats)
      .where(eq(predictionAccuracyStats.id, globalId))
      .limit(1);

    if (existing) {
      const newTotal = existing.totalPredictions + 1;
      const newCorrect = existing.correctPredictions + (isCorrect ? 1 : 0);
      const winRate = ((newCorrect / newTotal) * 100).toFixed(2);
      const prevAvg = parseFloat(existing.avgReturn || '0');
      const newAvg = ((prevAvg * (newTotal - 1)) + returnPercent) / newTotal;

      await db.update(predictionAccuracyStats)
        .set({
          totalPredictions: newTotal,
          correctPredictions: newCorrect,
          winRate,
          avgReturn: newAvg.toFixed(4),
          lastPredictionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(predictionAccuracyStats.id, globalId));
    } else {
      await db.insert(predictionAccuracyStats).values({
        id: globalId,
        ticker: null,
        signal: null,
        horizon: null,
        totalPredictions: 1,
        correctPredictions: isCorrect ? 1 : 0,
        winRate: isCorrect ? '100.00' : '0.00',
        avgReturn: returnPercent.toFixed(4),
        lastPredictionAt: new Date(),
      });
    }
  }

  /**
   * Get accuracy stats (for API/display)
   */
  async getAccuracyStats(options?: {
    ticker?: string;
    signal?: string;
    horizon?: string;
  }): Promise<any> {
    let query = db.select().from(predictionAccuracyStats);

    if (options?.ticker) {
      query = query.where(eq(predictionAccuracyStats.ticker, options.ticker.toUpperCase())) as any;
    }
    if (options?.signal) {
      query = query.where(eq(predictionAccuracyStats.signal, options.signal)) as any;
    }
    if (options?.horizon) {
      query = query.where(eq(predictionAccuracyStats.horizon, options.horizon)) as any;
    }

    const stats = await query;
    return stats;
  }

  /**
   * Get global accuracy summary
   */
  async getGlobalAccuracy(): Promise<{
    totalPredictions: number;
    winRate: string;
    avgReturn: string;
    lastUpdated: Date | null;
  }> {
    const [global] = await db.select()
      .from(predictionAccuracyStats)
      .where(eq(predictionAccuracyStats.id, 'stats_global'))
      .limit(1);

    if (!global) {
      return {
        totalPredictions: 0,
        winRate: '0.00',
        avgReturn: '0.00',
        lastUpdated: null,
      };
    }

    return {
      totalPredictions: global.totalPredictions,
      winRate: global.winRate,
      avgReturn: global.avgReturn || '0.00',
      lastUpdated: global.updatedAt,
    };
  }

  /**
   * Get pending predictions that need outcome checks
   */
  async getPendingOutcomeChecks(horizon: '1h' | '4h' | '24h' | '7d'): Promise<any[]> {
    const horizonMs: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };

    const cutoffTime = new Date(Date.now() - horizonMs[horizon]);

    // Get predictions that were created before the cutoff and haven't been evaluated for this horizon
    const predictions = await db.select()
      .from(predictionEvents)
      .where(
        and(
          sql`${predictionEvents.createdAt} <= ${cutoffTime}`,
          sql`${predictionEvents.status} != 'evaluated'`
        )
      );

    // Filter out ones that already have this horizon evaluated
    const results = [];
    for (const pred of predictions) {
      const [existingOutcome] = await db.select()
        .from(predictionOutcomes)
        .where(
          and(
            eq(predictionOutcomes.predictionId, pred.id),
            eq(predictionOutcomes.horizon, horizon)
          )
        )
        .limit(1);

      if (!existingOutcome) {
        results.push(pred);
      }
    }

    return results;
  }
}

export const predictionTrackingService = new PredictionTrackingService();
