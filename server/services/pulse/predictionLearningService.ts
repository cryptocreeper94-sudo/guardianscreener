import { db } from '../../db';
import { 
  predictionEvents, 
  predictionOutcomes,
  predictionFeatures,
  predictionModelVersions,
  predictionModelMetrics
} from '@shared/schema';
import { eq, and, desc, sql, isNotNull, gte, lte } from 'drizzle-orm';
import { randomBytes } from 'crypto';

type TimeHorizon = '1h' | '4h' | '24h' | '7d';

interface FeatureVector {
  rsiNormalized: number;
  macdSignal: number;
  macdStrength: number;
  ema9Spread: number;
  ema21Spread: number;
  ema50Spread: number;
  ema200Spread: number;
  ema9Over21: number;
  ema50Over200: number;
  bbPosition: number;
  bbWidth: number;
  volumeDeltaNorm: number;
  spikeScoreNorm: number;
  volatilityNorm: number;
  distanceToSupport: number;
  distanceToResistance: number;
}

interface TrainingData {
  features: number[][];
  labels: number[];
  featureNames: string[];
}

interface ModelCoefficients {
  intercept: number;
  weights: Record<string, number>;
}

interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auroc: number;
}

interface ModelPrediction {
  probability: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  signal: 'BUY' | 'SELL' | 'HOLD';
  modelVersion: string;
  isModelBased: boolean;
}

const FEATURE_NAMES = [
  'rsiNormalized', 'macdSignal', 'macdStrength',
  'ema9Spread', 'ema21Spread', 'ema50Spread', 'ema200Spread',
  'ema9Over21', 'ema50Over200',
  'bbPosition', 'bbWidth',
  'volumeDeltaNorm', 'spikeScoreNorm', 'volatilityNorm',
  'distanceToSupport', 'distanceToResistance'
];

const MIN_TRAINING_SAMPLES = 50;

class PredictionLearningService {
  private modelCache: Map<TimeHorizon, { coefficients: ModelCoefficients; version: string }> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
    console.log('✅ [PredictionLearning] ML service initialized');
  }

  async extractFeatures(predictionId: string, horizon: TimeHorizon, priceChangePercent: number, isWin: boolean): Promise<void> {
    const prediction = await db.select().from(predictionEvents).where(eq(predictionEvents.id, predictionId)).limit(1);
    
    if (!prediction.length) {
      console.log(`[ML] Prediction ${predictionId} not found`);
      return;
    }

    const pred = prediction[0];
    const indicators = JSON.parse(pred.indicators);
    const price = parseFloat(pred.priceAtPrediction);

    const features = this.normalizeIndicators(indicators, price);
    
    const featureId = `feat_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
    
    await db.insert(predictionFeatures).values({
      id: featureId,
      predictionId,
      horizon,
      rsiNormalized: features.rsiNormalized.toFixed(4),
      macdSignal: features.macdSignal.toFixed(4),
      macdStrength: features.macdStrength.toFixed(4),
      ema9Spread: features.ema9Spread.toFixed(4),
      ema21Spread: features.ema21Spread.toFixed(4),
      ema50Spread: features.ema50Spread.toFixed(4),
      ema200Spread: features.ema200Spread.toFixed(4),
      ema9Over21: features.ema9Over21 > 0,
      ema50Over200: features.ema50Over200 > 0,
      bbPosition: features.bbPosition.toFixed(4),
      bbWidth: features.bbWidth.toFixed(4),
      volumeDeltaNorm: features.volumeDeltaNorm.toFixed(4),
      spikeScoreNorm: features.spikeScoreNorm.toFixed(4),
      volatilityNorm: features.volatilityNorm.toFixed(4),
      distanceToSupport: features.distanceToSupport.toFixed(4),
      distanceToResistance: features.distanceToResistance.toFixed(4),
      priceChangePercent: priceChangePercent.toFixed(4),
      isWin,
    });

    console.log(`[ML] Extracted features for prediction ${predictionId} horizon ${horizon}`);
  }

  private normalizeIndicators(indicators: any, price: number): FeatureVector {
    const rsi = this.safeNumber(indicators.rsi, 50);
    
    const macdHistogram = this.safeNumber(indicators.macd?.histogram, 0);
    const macdValue = this.safeNumber(indicators.macd?.value, 0);
    const macdSignalLine = this.safeNumber(indicators.macd?.signal, 0);
    
    const ema9 = this.safeNumber(indicators.ema9, price);
    const ema21 = this.safeNumber(indicators.ema21, price);
    const ema50 = this.safeNumber(indicators.ema50, price);
    const ema200 = this.safeNumber(indicators.ema200, price);
    
    const bbUpper = this.safeNumber(indicators.bollingerBands?.upper, price * 1.02);
    const bbLower = this.safeNumber(indicators.bollingerBands?.lower, price * 0.98);
    const bbMiddle = this.safeNumber(indicators.bollingerBands?.middle, price);
    
    const volumeDeltaValue = typeof indicators.volumeDelta === 'object' 
      ? this.safeNumber(indicators.volumeDelta?.delta, 0)
      : this.safeNumber(indicators.volumeDelta, 0);
    
    const spikeScoreValue = typeof indicators.spikeScore === 'object'
      ? this.safeNumber(indicators.spikeScore?.score, 0)
      : this.safeNumber(indicators.spikeScore, 0);
    
    const volatility = this.safeNumber(indicators.volatility, 0);
    
    const support = this.safeNumber(indicators.support, price * 0.95);
    const resistance = this.safeNumber(indicators.resistance, price * 1.05);

    const bbRange = bbUpper - bbLower;
    const bbPositionRaw = bbRange > 0 ? (price - bbMiddle) / (bbRange / 2) : 0;

    return {
      rsiNormalized: this.safeNumber(rsi / 100, 0.5),
      macdSignal: macdHistogram > 0 ? 1 : macdHistogram < 0 ? -1 : 0,
      macdStrength: price > 0 ? Math.min(Math.abs(macdValue - macdSignalLine) / price * 100, 1) : 0,
      ema9Spread: this.clamp((price - ema9) / (price || 1) * 100, -10, 10) / 10,
      ema21Spread: this.clamp((price - ema21) / (price || 1) * 100, -10, 10) / 10,
      ema50Spread: this.clamp((price - ema50) / (price || 1) * 100, -20, 20) / 20,
      ema200Spread: this.clamp((price - ema200) / (price || 1) * 100, -50, 50) / 50,
      ema9Over21: ema9 > ema21 ? 1 : 0,
      ema50Over200: ema50 > ema200 ? 1 : 0,
      bbPosition: this.clamp(bbPositionRaw, -1, 1),
      bbWidth: bbMiddle > 0 ? Math.min(bbRange / bbMiddle, 0.2) / 0.2 : 0,
      volumeDeltaNorm: this.clamp(volumeDeltaValue / 100, -1, 1),
      spikeScoreNorm: Math.min(Math.max(spikeScoreValue / 100, 0), 1),
      volatilityNorm: Math.min(Math.max(volatility / 10, 0), 1),
      distanceToSupport: this.clamp((price - support) / (price || 1) * 100, 0, 20) / 20,
      distanceToResistance: this.clamp((resistance - price) / (price || 1) * 100, 0, 20) / 20,
    };
  }

  private safeNumber(value: any, defaultValue: number): number {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  async getTrainingData(horizon: TimeHorizon): Promise<TrainingData> {
    const features = await db.select()
      .from(predictionFeatures)
      .where(and(
        eq(predictionFeatures.horizon, horizon),
        isNotNull(predictionFeatures.isWin)
      ));

    const featureVectors: number[][] = [];
    const labels: number[] = [];

    for (const f of features) {
      const vector = [
        parseFloat(f.rsiNormalized || '0.5'),
        parseFloat(f.macdSignal || '0'),
        parseFloat(f.macdStrength || '0'),
        parseFloat(f.ema9Spread || '0'),
        parseFloat(f.ema21Spread || '0'),
        parseFloat(f.ema50Spread || '0'),
        parseFloat(f.ema200Spread || '0'),
        f.ema9Over21 ? 1 : 0,
        f.ema50Over200 ? 1 : 0,
        parseFloat(f.bbPosition || '0'),
        parseFloat(f.bbWidth || '0'),
        parseFloat(f.volumeDeltaNorm || '0'),
        parseFloat(f.spikeScoreNorm || '0'),
        parseFloat(f.volatilityNorm || '0'),
        parseFloat(f.distanceToSupport || '0'),
        parseFloat(f.distanceToResistance || '0'),
      ];
      featureVectors.push(vector);
      labels.push(f.isWin ? 1 : 0);
    }

    return { features: featureVectors, labels, featureNames: FEATURE_NAMES };
  }

  async trainModel(horizon: TimeHorizon): Promise<{ success: boolean; modelId?: string; metrics?: TrainingMetrics; error?: string }> {
    console.log(`[ML] Starting model training for horizon ${horizon}`);
    
    const data = await this.getTrainingData(horizon);
    
    if (data.features.length < MIN_TRAINING_SAMPLES) {
      return { 
        success: false, 
        error: `Insufficient data: ${data.features.length}/${MIN_TRAINING_SAMPLES} samples` 
      };
    }

    const splitIndex = Math.floor(data.features.length * 0.8);
    const indices = this.shuffleArray(Array.from({ length: data.features.length }, (_, i) => i));
    
    const trainIndices = indices.slice(0, splitIndex);
    const valIndices = indices.slice(splitIndex);
    
    const trainX = trainIndices.map(i => data.features[i]);
    const trainY = trainIndices.map(i => data.labels[i]);
    const valX = valIndices.map(i => data.features[i]);
    const valY = valIndices.map(i => data.labels[i]);

    const coefficients = this.trainLogisticRegression(trainX, trainY, 0.01, 1000);
    const metrics = this.evaluateModel(coefficients, valX, valY);
    
    const existingModels = await db.select()
      .from(predictionModelVersions)
      .where(eq(predictionModelVersions.horizon, horizon))
      .orderBy(desc(predictionModelVersions.version))
      .limit(1);
    
    const newVersion = existingModels.length > 0 ? existingModels[0].version + 1 : 1;
    const modelId = `model_${horizon}_v${newVersion}_${randomBytes(4).toString('hex')}`;

    await db.insert(predictionModelVersions).values({
      id: modelId,
      modelName: 'logistic_v1',
      horizon,
      version: newVersion,
      coefficients: JSON.stringify(coefficients),
      featureNames: JSON.stringify(FEATURE_NAMES),
      trainingSamples: trainX.length,
      validationSamples: valX.length,
      trainingDateRange: JSON.stringify({ 
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }),
      accuracy: metrics.accuracy.toFixed(4),
      precision: metrics.precision.toFixed(4),
      recall: metrics.recall.toFixed(4),
      f1Score: metrics.f1Score.toFixed(4),
      auroc: metrics.auroc.toFixed(4),
      status: 'validated',
      isActive: false,
    });

    console.log(`[ML] Model ${modelId} trained - Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);

    if (metrics.accuracy >= 0.55) {
      await this.activateModel(modelId, horizon);
    }

    return { success: true, modelId, metrics };
  }

  private trainLogisticRegression(X: number[][], y: number[], learningRate: number, iterations: number): ModelCoefficients {
    const numFeatures = X[0].length;
    let weights = new Array(numFeatures).fill(0);
    let intercept = 0;

    for (let iter = 0; iter < iterations; iter++) {
      let interceptGrad = 0;
      const weightGrads = new Array(numFeatures).fill(0);

      for (let i = 0; i < X.length; i++) {
        const z = intercept + X[i].reduce((sum, x, j) => sum + x * weights[j], 0);
        const pred = this.sigmoid(z);
        const error = pred - y[i];

        interceptGrad += error;
        for (let j = 0; j < numFeatures; j++) {
          weightGrads[j] += error * X[i][j];
        }
      }

      intercept -= learningRate * (interceptGrad / X.length);
      for (let j = 0; j < numFeatures; j++) {
        weights[j] -= learningRate * (weightGrads[j] / X.length);
      }
    }

    const weightObj: Record<string, number> = {};
    FEATURE_NAMES.forEach((name, i) => {
      weightObj[name] = weights[i];
    });

    return { intercept, weights: weightObj };
  }

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
  }

  private evaluateModel(coefficients: ModelCoefficients, X: number[][], y: number[]): TrainingMetrics {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    const predictions: number[] = [];

    for (let i = 0; i < X.length; i++) {
      const prob = this.predictProbability(coefficients, X[i]);
      predictions.push(prob);
      const pred = prob >= 0.5 ? 1 : 0;
      
      if (pred === 1 && y[i] === 1) tp++;
      else if (pred === 1 && y[i] === 0) fp++;
      else if (pred === 0 && y[i] === 0) tn++;
      else fn++;
    }

    const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    const auroc = this.calculateAUROC(predictions, y);

    return { accuracy, precision, recall, f1Score, auroc };
  }

  private calculateAUROC(predictions: number[], labels: number[]): number {
    const pairs = predictions.map((p, i) => ({ pred: p, label: labels[i] }));
    pairs.sort((a, b) => b.pred - a.pred);

    let auc = 0;
    let tp = 0;
    let fp = 0;
    const totalPos = labels.filter(l => l === 1).length;
    const totalNeg = labels.length - totalPos;

    if (totalPos === 0 || totalNeg === 0) return 0.5;

    for (const pair of pairs) {
      if (pair.label === 1) {
        tp++;
      } else {
        auc += tp;
        fp++;
      }
    }

    return auc / (totalPos * totalNeg);
  }

  private predictProbability(coefficients: ModelCoefficients, features: number[]): number {
    let z = coefficients.intercept;
    FEATURE_NAMES.forEach((name, i) => {
      z += features[i] * (coefficients.weights[name] || 0);
    });
    return this.sigmoid(z);
  }

  async activateModel(modelId: string, horizon: TimeHorizon): Promise<void> {
    await db.update(predictionModelVersions)
      .set({ isActive: false })
      .where(and(
        eq(predictionModelVersions.horizon, horizon),
        eq(predictionModelVersions.isActive, true)
      ));

    await db.update(predictionModelVersions)
      .set({ isActive: true, status: 'active', activatedAt: new Date() })
      .where(eq(predictionModelVersions.id, modelId));

    this.modelCache.delete(horizon);
    console.log(`[ML] Activated model ${modelId} for horizon ${horizon}`);
  }

  async getActiveModel(horizon: TimeHorizon): Promise<{ coefficients: ModelCoefficients; version: string } | null> {
    if (this.modelCache.has(horizon)) {
      return this.modelCache.get(horizon)!;
    }

    const model = await db.select()
      .from(predictionModelVersions)
      .where(and(
        eq(predictionModelVersions.horizon, horizon),
        eq(predictionModelVersions.isActive, true)
      ))
      .limit(1);

    if (!model.length) return null;

    const cached = {
      coefficients: JSON.parse(model[0].coefficients) as ModelCoefficients,
      version: model[0].id,
    };
    this.modelCache.set(horizon, cached);
    return cached;
  }

  async predictWithModel(indicators: any, price: number, horizon: TimeHorizon = '24h'): Promise<ModelPrediction> {
    const model = await this.getActiveModel(horizon);
    
    if (!model) {
      return {
        probability: 0.5,
        confidence: 'LOW',
        signal: 'HOLD',
        modelVersion: 'none',
        isModelBased: false,
      };
    }

    const features = this.normalizeIndicators(indicators, price);
    const featureVector = FEATURE_NAMES.map(name => (features as any)[name]);
    const probability = this.predictProbability(model.coefficients, featureVector);

    let signal: 'BUY' | 'SELL' | 'HOLD';
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';

    if (probability >= 0.7) {
      signal = 'BUY';
      confidence = 'HIGH';
    } else if (probability >= 0.6) {
      signal = 'BUY';
      confidence = 'MEDIUM';
    } else if (probability <= 0.3) {
      signal = 'SELL';
      confidence = 'HIGH';
    } else if (probability <= 0.4) {
      signal = 'SELL';
      confidence = 'MEDIUM';
    } else {
      signal = 'HOLD';
      confidence = probability >= 0.45 && probability <= 0.55 ? 'MEDIUM' : 'LOW';
    }

    return {
      probability,
      confidence,
      signal,
      modelVersion: model.version,
      isModelBased: true,
    };
  }

  async getModelStatus(): Promise<{
    horizons: Record<TimeHorizon, {
      hasActiveModel: boolean;
      modelVersion?: string;
      accuracy?: number;
      trainingSamples?: number;
      trainedAt?: string;
    }>;
    totalFeatures: number;
    readyToTrain: Record<TimeHorizon, boolean>;
  }> {
    const horizons: TimeHorizon[] = ['1h', '4h', '24h', '7d'];
    const result: any = { horizons: {}, totalFeatures: 0, readyToTrain: {} };

    for (const horizon of horizons) {
      const model = await db.select()
        .from(predictionModelVersions)
        .where(and(
          eq(predictionModelVersions.horizon, horizon),
          eq(predictionModelVersions.isActive, true)
        ))
        .limit(1);

      const featureCount = await db.select({ count: sql<number>`count(*)` })
        .from(predictionFeatures)
        .where(and(
          eq(predictionFeatures.horizon, horizon),
          isNotNull(predictionFeatures.isWin)
        ));

      const count = Number(featureCount[0]?.count || 0);
      result.totalFeatures += count;
      result.readyToTrain[horizon] = count >= MIN_TRAINING_SAMPLES;

      if (model.length) {
        result.horizons[horizon] = {
          hasActiveModel: true,
          modelVersion: model[0].id,
          accuracy: parseFloat(model[0].accuracy),
          trainingSamples: model[0].trainingSamples,
          trainedAt: model[0].trainedAt?.toISOString(),
        };
      } else {
        result.horizons[horizon] = {
          hasActiveModel: false,
        };
      }
    }

    return result;
  }

  async trainAllHorizons(): Promise<Record<TimeHorizon, { success: boolean; error?: string; accuracy?: number }>> {
    const horizons: TimeHorizon[] = ['1h', '4h', '24h', '7d'];
    const results: any = {};

    for (const horizon of horizons) {
      const result = await this.trainModel(horizon);
      results[horizon] = {
        success: result.success,
        error: result.error,
        accuracy: result.metrics?.accuracy,
      };
    }

    return results;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async detectDrift(horizon: TimeHorizon, windowDays: number = 7): Promise<{
    hasDrift: boolean;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    metrics: {
      recentAccuracy: number;
      historicalAccuracy: number;
      accuracyDrop: number;
      recentSamples: number;
      historicalSamples: number;
    };
    recommendation: string;
  }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const historicalStart = new Date(windowStart.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const recentFeatures = await db.select()
      .from(predictionFeatures)
      .where(and(
        eq(predictionFeatures.horizon, horizon),
        isNotNull(predictionFeatures.isWin),
        gte(predictionFeatures.createdAt, windowStart)
      ));

    const historicalFeatures = await db.select()
      .from(predictionFeatures)
      .where(and(
        eq(predictionFeatures.horizon, horizon),
        isNotNull(predictionFeatures.isWin),
        gte(predictionFeatures.createdAt, historicalStart),
        lte(predictionFeatures.createdAt, windowStart)
      ));

    const recentWins = recentFeatures.filter(f => f.isWin).length;
    const recentTotal = recentFeatures.length;
    const historicalWins = historicalFeatures.filter(f => f.isWin).length;
    const historicalTotal = historicalFeatures.length;

    const recentAccuracy = recentTotal > 0 ? (recentWins / recentTotal) * 100 : 50;
    const historicalAccuracy = historicalTotal > 0 ? (historicalWins / historicalTotal) * 100 : 50;
    const accuracyDrop = historicalAccuracy - recentAccuracy;

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let hasDrift = false;
    let recommendation = 'Model performing within expected parameters';

    if (accuracyDrop > 5 && recentTotal >= 10) {
      hasDrift = true;
      if (accuracyDrop > 20) {
        severity = 'CRITICAL';
        recommendation = 'Immediate retraining required - significant performance degradation detected';
      } else if (accuracyDrop > 15) {
        severity = 'HIGH';
        recommendation = 'Schedule retraining soon - notable performance decline';
      } else if (accuracyDrop > 10) {
        severity = 'MEDIUM';
        recommendation = 'Monitor closely - moderate performance decline observed';
      } else {
        severity = 'LOW';
        recommendation = 'Minor drift detected - continue monitoring';
      }
    }

    if (recentAccuracy < 45 && recentTotal >= 10) {
      hasDrift = true;
      severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
      recommendation = 'Model accuracy below threshold - retraining recommended';
    }

    return {
      hasDrift,
      severity,
      metrics: {
        recentAccuracy: Math.round(recentAccuracy * 10) / 10,
        historicalAccuracy: Math.round(historicalAccuracy * 10) / 10,
        accuracyDrop: Math.round(accuracyDrop * 10) / 10,
        recentSamples: recentTotal,
        historicalSamples: historicalTotal,
      },
      recommendation,
    };
  }

  async checkAllHorizonsDrift(windowDays: number = 7): Promise<{
    hasAnyDrift: boolean;
    horizonStatus: Record<TimeHorizon, {
      hasDrift: boolean;
      severity: string;
      recentAccuracy: number;
      recommendation: string;
    }>;
    overallRecommendation: string;
  }> {
    const horizons: TimeHorizon[] = ['1h', '4h', '24h', '7d'];
    const results: any = { hasAnyDrift: false, horizonStatus: {}, overallRecommendation: '' };
    let highestSeverity = 'LOW';

    for (const horizon of horizons) {
      const drift = await this.detectDrift(horizon, windowDays);
      results.horizonStatus[horizon] = {
        hasDrift: drift.hasDrift,
        severity: drift.severity,
        recentAccuracy: drift.metrics.recentAccuracy,
        recommendation: drift.recommendation,
      };

      if (drift.hasDrift) {
        results.hasAnyDrift = true;
        if (drift.severity === 'CRITICAL' || (drift.severity === 'HIGH' && highestSeverity !== 'CRITICAL')) {
          highestSeverity = drift.severity;
        }
      }
    }

    if (highestSeverity === 'CRITICAL') {
      results.overallRecommendation = 'Immediate action needed: Critical drift detected in one or more models';
    } else if (highestSeverity === 'HIGH') {
      results.overallRecommendation = 'Schedule retraining: High drift detected';
    } else if (results.hasAnyDrift) {
      results.overallRecommendation = 'Monitor: Minor drift detected in some models';
    } else {
      results.overallRecommendation = 'All models performing within expected parameters';
    }

    return results;
  }
}

export const predictionLearningService = new PredictionLearningService();
