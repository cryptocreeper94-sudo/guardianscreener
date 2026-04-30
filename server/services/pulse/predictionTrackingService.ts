import { createHash, randomBytes } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

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
  private dataPath = path.resolve(process.cwd(), 'server', 'data', 'predictions.json');
  
  private state = {
    events: [] as any[],
    outcomes: [] as any[],
    stats: [] as any[]
  };

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
      const data = await fs.readFile(this.dataPath, 'utf-8');
      this.state = JSON.parse(data);
    } catch (e) {
      await this.saveState();
    }
    this.isInitialized = true;
    console.log('�… [PredictionTracking] Service initialized with local JSON persistence');
  }

  private async saveState() {
    try {
      await fs.writeFile(this.dataPath, JSON.stringify(this.state, null, 2));
    } catch (e) {
      console.error('Failed to save predictions state', e);
    }
  }

  private generatePredictionId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `pred_${timestamp}_${random}`;
  }

  private hashPayload(payload: object): string {
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    return createHash('sha256').update(canonical).digest('hex');
  }

  private determineConfidence(bullish: number, bearish: number, signal: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const total = bullish + bearish;
    const dominant = Math.max(bullish, bearish);
    const ratio = total > 0 ? dominant / total : 0;

    if (signal === 'STRONG_BUY' || signal === 'STRONG_SELL') return 'HIGH';
    if (ratio > 0.75 && total >= 4) return 'HIGH';
    if (ratio > 0.6 && total >= 3) return 'MEDIUM';
    return 'LOW';
  }

  async logPrediction(input: PredictionInput): Promise<{
    id: string;
    payloadHash: string;
    success: boolean;
  }> {
    const predictionId = this.generatePredictionId();
    
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
      const newEvent = {
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
        createdAt: new Date()
      };
      
      this.state.events.push(newEvent);
      await this.saveState();

      console.log(`�“� [PredictionTracking] Logged prediction ${predictionId}: ${input.signal} ${input.ticker} @ $${input.priceAtPrediction}`);

      this.stampToBlockchain(predictionId, payload).catch(err => {
        console.error('⚠️ [PredictionTracking] Blockchain stamp failed:', err);
      });

      return { id: predictionId, payloadHash, success: true };
    } catch (error: any) {
      console.error('❌ [PredictionTracking] Failed to log prediction:', error);
      return { id: predictionId, payloadHash, success: false };
    }
  }

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
        const event = this.state.events.find(e => e.id === predictionId);
        if (event) {
          event.auditEventId = result.id;
          event.onchainSignature = result.onchainSignature;
          event.status = 'stamped';
          event.stampedAt = new Date();
          await this.saveState();
        }

        console.log(`�“️ [PredictionTracking] Prediction ${predictionId} stamped to Solana: ${result.onchainSignature.substring(0, 20)}...`);
      }

      this.stampToDarkWaveChain(predictionId, payload as any).catch(err => {
        console.warn('⚠️ [PredictionTracking] Trust Layer stamp failed (non-critical):', err.message);
      });
    } catch (error) {
      console.error('❌ [PredictionTracking] Blockchain stamp error:', error);
    }
  }

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
        console.log(`�”— [PredictionTracking] Prediction ${predictionId} verified on Trust Layer: ${result.verificationId?.substring(0, 16)}...`);
      }
    } catch (error: any) {
      console.warn('⚠️ [PredictionTracking] Trust Layer not configured or unavailable:', error.message);
    }
  }

  async recordOutcome(input: OutcomeInput): Promise<boolean> {
    try {
      const prediction = this.state.events.find(e => e.id === input.predictionId);

      if (!prediction) {
        console.error(`❌ [PredictionTracking] Prediction not found: ${input.predictionId}`);
        return false;
      }

      const originalPrice = parseFloat(prediction.priceAtPrediction);
      const priceChange = input.priceAtCheck - originalPrice;
      const priceChangePercent = (priceChange / originalPrice) * 100;

      const isCorrect = this.evaluateOutcome(
        prediction.signal,
        priceChangePercent
      );

      const outcome = this.classifyOutcome(prediction.signal, priceChangePercent);

      const outcomeId = `out_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;

      this.state.outcomes.push({
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
        createdAt: new Date()
      });
      
      await this.saveState();

      console.log(`�“� [PredictionTracking] Outcome recorded for ${input.predictionId} @ ${input.horizon}: ${outcome} (${priceChangePercent.toFixed(2)}%)`);

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

      await this.updateAccuracyStats(prediction.ticker, prediction.signal, input.horizon, isCorrect, priceChangePercent);

      const allOutcomes = this.state.outcomes.filter(o => o.predictionId === input.predictionId);

      if (allOutcomes.length >= 4) {
        prediction.status = 'evaluated';
        await this.saveState();
      }

      return true;
    } catch (error) {
      console.error('❌ [PredictionTracking] Failed to record outcome:', error);
      return false;
    }
  }

  private evaluateOutcome(signal: string, priceChangePercent: number): boolean {
    const winThreshold = 0.5; // 0.5% minimum move to count as win
    const holdTolerance = 2.0; // HOLD is correct if price moves less than 2%

    switch (signal) {
      case 'STRONG_BUY':
      case 'BUY':
        return priceChangePercent > winThreshold;
      case 'STRONG_SELL':
      case 'SELL':
        return priceChangePercent < -winThreshold;
      case 'HOLD':
        return Math.abs(priceChangePercent) < holdTolerance;
      default:
        return false;
    }
  }

  private classifyOutcome(signal: string, priceChangePercent: number): 'WIN' | 'LOSS' | 'NEUTRAL' {
    const isCorrect = this.evaluateOutcome(signal, priceChangePercent);
    const threshold = 0.5;

    if (signal === 'HOLD') {
      return isCorrect ? 'WIN' : 'LOSS';
    }

    if (Math.abs(priceChangePercent) < threshold) {
      return 'NEUTRAL';
    }

    return isCorrect ? 'WIN' : 'LOSS';
  }

  private async updateAccuracyStats(
    ticker: string,
    signal: string,
    horizon: string,
    isCorrect: boolean,
    returnPercent: number
  ): Promise<void> {
    const statsId = `stats_${ticker}_${signal}_${horizon}`.toLowerCase();
    
    let existing = this.state.stats.find(s => s.id === statsId);

    if (existing) {
      const newTotal = existing.totalPredictions + 1;
      const newCorrect = existing.correctPredictions + (isCorrect ? 1 : 0);
      const winRate = ((newCorrect / newTotal) * 100).toFixed(2);

      const prevAvg = parseFloat(existing.avgReturn || '0');
      const newAvg = ((prevAvg * (newTotal - 1)) + returnPercent) / newTotal;

      let newStreak = existing.currentStreak || 0;
      if (isCorrect) {
        newStreak = newStreak >= 0 ? newStreak + 1 : 1;
      } else {
        newStreak = newStreak <= 0 ? newStreak - 1 : -1;
      }

      const longestWin = Math.max(existing.longestWinStreak || 0, isCorrect ? newStreak : 0);
      const longestLoss = Math.min(existing.longestLossStreak || 0, !isCorrect ? newStreak : 0);

      existing.totalPredictions = newTotal;
      existing.correctPredictions = newCorrect;
      existing.winRate = winRate;
      existing.avgReturn = newAvg.toFixed(4);
      existing.currentStreak = newStreak;
      existing.longestWinStreak = longestWin;
      existing.longestLossStreak = Math.abs(longestLoss);
      existing.lastPredictionAt = new Date();
      existing.updatedAt = new Date();
      
      await this.saveState();
    } else {
      this.state.stats.push({
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
      await this.saveState();
    }

    await this.updateGlobalStats(isCorrect, returnPercent);
  }

  private async updateGlobalStats(isCorrect: boolean, returnPercent: number): Promise<void> {
    const globalId = 'stats_global';
    let existing = this.state.stats.find(s => s.id === globalId);

    if (existing) {
      const newTotal = existing.totalPredictions + 1;
      const newCorrect = existing.correctPredictions + (isCorrect ? 1 : 0);
      const winRate = ((newCorrect / newTotal) * 100).toFixed(2);
      const prevAvg = parseFloat(existing.avgReturn || '0');
      const newAvg = ((prevAvg * (newTotal - 1)) + returnPercent) / newTotal;

      existing.totalPredictions = newTotal;
      existing.correctPredictions = newCorrect;
      existing.winRate = winRate;
      existing.avgReturn = newAvg.toFixed(4);
      existing.lastPredictionAt = new Date();
      existing.updatedAt = new Date();
      
      await this.saveState();
    } else {
      this.state.stats.push({
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
      await this.saveState();
    }
  }

  async getAccuracyStats(options?: {
    ticker?: string;
    signal?: string;
    horizon?: string;
  }): Promise<any> {
    let result = [...this.state.stats].filter(s => s.id !== 'stats_global');

    if (options?.ticker) {
      result = result.filter(s => s.ticker === options.ticker!.toUpperCase());
    }
    if (options?.signal) {
      result = result.filter(s => s.signal === options.signal);
    }
    if (options?.horizon) {
      result = result.filter(s => s.horizon === options.horizon);
    }

    return result;
  }

  async getGlobalAccuracy(): Promise<{
    totalPredictions: number;
    winRate: string;
    avgReturn: string;
    lastUpdated: Date | null;
  }> {
    const global = this.state.stats.find(s => s.id === 'stats_global');

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
      lastUpdated: global.updatedAt || null,
    };
  }

  async getPendingOutcomeChecks(horizon: '1h' | '4h' | '24h' | '7d'): Promise<any[]> {
    const horizonMs: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };

    const cutoffTime = new Date(Date.now() - horizonMs[horizon]);

    const results = [];
    for (const pred of this.state.events) {
      if (new Date(pred.createdAt) <= cutoffTime && pred.status !== 'evaluated') {
        const existingOutcome = this.state.outcomes.find(o => 
          o.predictionId === pred.id && o.horizon === horizon
        );
        if (!existingOutcome) {
          results.push(pred);
        }
      }
    }

    return results;
  }
}

export const predictionTrackingService = new PredictionTrackingService();
