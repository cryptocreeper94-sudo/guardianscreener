import axios from 'axios';
import { db } from '../../db';
import { strikeAgentSignals } from '@shared/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { safetyEngineService, type TokenSafetyReport } from './safetyEngineService';
import { evmSafetyEngine, type EvmTokenSafetyReport } from './evmSafetyEngine';
import { randomBytes } from 'crypto';
import { strikeAgentTrackingService } from './strikeAgentTrackingService';

export type ChainId = 'solana' | 'ethereum' | 'base' | 'polygon' | 'arbitrum' | 'bsc';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Supported chains for scanning
export const SUPPORTED_CHAINS: ChainId[] = ['solana', 'ethereum', 'base', 'polygon', 'arbitrum', 'bsc'];

// Chain-specific popular tokens for trending search
const CHAIN_POPULAR_TOKENS: Record<ChainId, string[]> = {
  solana: ['BONK', 'WIF', 'POPCAT', 'MEW', 'MYRO', 'BOME', 'JUP', 'PYTH', 'JTO', 'ORCA'],
  ethereum: ['PEPE', 'SHIB', 'FLOKI', 'MOG', 'TURBO', 'NEIRO', 'SPX', 'MAGA', 'AERO'],
  base: ['BRETT', 'DEGEN', 'TOSHI', 'HIGHER', 'MOCHI', 'NORMIE', 'KEYCAT', 'ROCKY'],
  polygon: ['QUICK', 'GHST', 'DFYN', 'ORBS', 'SAND', 'MANA', 'AAVEGOTCHI'],
  arbitrum: ['ARB', 'GMX', 'MAGIC', 'RDNT', 'PENDLE', 'GNS', 'GRAIL'],
  bsc: ['CAKE', 'BAKE', 'BURGER', 'DODO', 'BABY', 'FLOKI', 'GALA'],
};

// Normalize DexScreener chain IDs to our ChainId type
function normalizeChainId(dexScreenerChainId: string): ChainId | null {
  const mapping: Record<string, ChainId> = {
    'solana': 'solana',
    'ethereum': 'ethereum',
    'base': 'base',
    'polygon': 'polygon',
    'arbitrum': 'arbitrum',
    'bsc': 'bsc',
    'binance-smart-chain': 'bsc',
  };
  return mapping[dexScreenerChainId] || null;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  priceNative: string;
  liquidity: { usd: number };
  fdv: number;
  volume: { h24: number; h1: number; m5: number };
  priceChange: { h24: number; h1: number; m5: number };
  txns: {
    h24: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    m5: { buys: number; sells: number };
  };
  pairCreatedAt: number;
}

interface TokenSignal {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: string;
  priceUsd: number;
  marketCapUsd: number;
  liquidityUsd: number;
  compositeScore: number;
  technicalScore: number;
  safetyScore: number;
  momentumScore: number;
  mlConfidence: number | null;
  indicators: Record<string, any>;
  reasoning: string;
  rank: number;
  category: 'blue_chip' | 'defi' | 'meme' | 'dex' | 'new';
  dex: string;
}

interface TechnicalIndicators {
  rsiSignal: 'oversold' | 'neutral' | 'overbought';
  macdSignal: 'bullish' | 'neutral' | 'bearish';
  emaCrossover: 'golden' | 'none' | 'death';
  volumeSpike: boolean;
  priceAction: 'bullish' | 'neutral' | 'bearish';
}

const SCORING_WEIGHTS = {
  safety: 0.30,
  technical: 0.30,
  momentum: 0.25,
  mlConfidence: 0.15,
};

const CATEGORY_KEYWORDS = {
  blue_chip: ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'BONK', 'JUP', 'RAY', 'ORCA'],
  defi: ['SWAP', 'STAKE', 'FARM', 'YIELD', 'LEND', 'BORROW', 'LP', 'DEX'],
  meme: ['DOGE', 'SHIB', 'PEPE', 'WOJAK', 'FROG', 'CAT', 'DOG', 'MEME', 'INU', 'MOON', 'PUMP'],
  dex: ['RAY', 'JUP', 'ORCA', 'METEOR', 'LIFINITY'],
};

class TopSignalsService {
  private generateSignalId(): string {
    return `sig_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
  }

  async scanAndScoreTokens(chains: ChainId[] = SUPPORTED_CHAINS): Promise<TokenSignal[]> {
    console.log(`[TopSignals] Starting token scan across ${chains.length} chains: ${chains.join(', ')}...`);
    
    try {
      const [trendingTokens, gainersTokens] = await Promise.all([
        this.fetchTrendingTokens(chains),
        this.fetchTopGainers(chains),
      ]);

      const allPairs = [...trendingTokens, ...gainersTokens];
      const uniqueTokens = this.deduplicateByAddress(allPairs);
      
      console.log(`[TopSignals] Processing ${uniqueTokens.length} unique tokens across ${chains.length} chains...`);

      const signals: TokenSignal[] = [];

      for (const pair of uniqueTokens.slice(0, 50)) {
        try {
          const signal = await this.analyzeAndScoreToken(pair);
          if (signal && signal.compositeScore > 0) {
            signals.push(signal);
          }
        } catch (err) {
          console.warn(`[TopSignals] Failed to analyze ${pair.baseToken?.symbol}:`, err);
        }
      }

      signals.sort((a, b) => b.compositeScore - a.compositeScore);
      
      signals.forEach((signal, index) => {
        signal.rank = index + 1;
      });

      console.log(`[TopSignals] Scored ${signals.length} tokens across chains, saving to database...`);
      await this.saveSignals(signals);

      return signals;
    } catch (error) {
      console.error('[TopSignals] Scan error:', error);
      return [];
    }
  }

  async analyzeAndScoreToken(pair: DexScreenerPair): Promise<TokenSignal | null> {
    const tokenAddress = pair.baseToken?.address;
    if (!tokenAddress) return null;

    const chainId = normalizeChainId(pair.chainId);
    if (!chainId) {
      console.warn(`[TopSignals] Unsupported chain: ${pair.chainId}`);
      return null;
    }

    // Chain-aware safety check routing
    let safetyScore = 0;
    let safetyIndicators: Record<string, any> = {};
    let isHoneypot = false;
    let passesChecks = false;

    try {
      if (chainId === 'solana') {
        // Use Solana-specific safety engine
        const safetyReport = await safetyEngineService.runFullSafetyCheck(tokenAddress);
        safetyScore = safetyReport.safetyScore;
        isHoneypot = safetyReport.honeypotResult?.isHoneypot || false;
        passesChecks = safetyReport.passesAllChecks;
        safetyIndicators = {
          hasMintAuthority: safetyReport.hasMintAuthority,
          hasFreezeAuthority: safetyReport.hasFreezeAuthority,
          liquidityLocked: safetyReport.liquidityLocked,
          holderCount: safetyReport.holderCount,
          top10HoldersPercent: safetyReport.top10HoldersPercent,
        };
      } else {
        // Use EVM safety engine for Ethereum, Base, Polygon, Arbitrum, BSC
        const evmReport = await evmSafetyEngine.runFullSafetyCheck(chainId, tokenAddress);
        safetyScore = evmReport.safetyScore;
        isHoneypot = evmReport.honeypotResult?.isHoneypot || false;
        passesChecks = evmReport.passesAllChecks;
        safetyIndicators = {
          hasOwner: evmReport.hasOwner,
          isRenounced: evmReport.isRenounced,
          ownerCanMint: evmReport.ownerCanMint,
          ownerCanBlacklist: evmReport.ownerCanBlacklist,
          buyTax: evmReport.honeypotResult?.buyTax || 0,
          sellTax: evmReport.honeypotResult?.sellTax || 0,
          liquidityLocked: evmReport.liquidityLocked,
          holderCount: evmReport.holderCount,
          top10HoldersPercent: evmReport.top10HoldersPercent,
        };
      }
    } catch (error) {
      console.warn(`[TopSignals] Safety check failed for ${chainId}:${tokenAddress}:`, error);
      safetyScore = 50; // Default neutral score on error
    }

    // Filter out unsafe tokens
    if (!passesChecks && safetyScore < 30) {
      return null;
    }
    if (isHoneypot) {
      return null;
    }

    const technicalIndicators = this.analyzeTechnicalIndicators(pair);
    const technicalScore = this.calculateTechnicalScore(technicalIndicators);
    
    const momentumScore = this.calculateMomentumScore(pair);
    
    const mlConfidence = await this.getMLConfidence(tokenAddress);
    
    const compositeScore = this.calculateCompositeScore({
      safetyScore,
      technicalScore,
      momentumScore,
      mlConfidence,
    });

    const category = this.categorizeToken(pair.baseToken.symbol, pair.baseToken.name);
    const reasoning = this.generateReasoningMultiChain(pair, chainId, safetyScore, safetyIndicators, technicalIndicators, compositeScore);

    return {
      id: this.generateSignalId(),
      tokenAddress,
      tokenSymbol: pair.baseToken.symbol || 'UNKNOWN',
      tokenName: pair.baseToken.name || 'Unknown Token',
      chain: chainId,
      priceUsd: parseFloat(pair.priceUsd || '0'),
      marketCapUsd: pair.fdv || 0,
      liquidityUsd: pair.liquidity?.usd || 0,
      compositeScore,
      technicalScore,
      safetyScore,
      momentumScore,
      mlConfidence,
      indicators: {
        technical: technicalIndicators,
        safety: safetyIndicators,
        priceChange: pair.priceChange,
        volume: pair.volume,
      },
      reasoning,
      rank: 0,
      category,
      dex: pair.dexId || 'unknown',
    };
  }

  calculateCompositeScore(scores: {
    safetyScore: number;
    technicalScore: number;
    momentumScore: number;
    mlConfidence: number | null;
  }): number {
    let weightedSum = 0;
    let totalWeight = 0;

    weightedSum += scores.safetyScore * SCORING_WEIGHTS.safety;
    totalWeight += SCORING_WEIGHTS.safety;

    weightedSum += scores.technicalScore * SCORING_WEIGHTS.technical;
    totalWeight += SCORING_WEIGHTS.technical;

    weightedSum += scores.momentumScore * SCORING_WEIGHTS.momentum;
    totalWeight += SCORING_WEIGHTS.momentum;

    if (scores.mlConfidence !== null) {
      weightedSum += (scores.mlConfidence * 100) * SCORING_WEIGHTS.mlConfidence;
      totalWeight += SCORING_WEIGHTS.mlConfidence;
    }

    const composite = Math.round(weightedSum / totalWeight);
    return Math.max(0, Math.min(100, composite));
  }

  calculateTechnicalScore(indicators: TechnicalIndicators): number {
    let score = 50;

    if (indicators.rsiSignal === 'oversold') score += 15;
    else if (indicators.rsiSignal === 'overbought') score -= 10;

    if (indicators.macdSignal === 'bullish') score += 15;
    else if (indicators.macdSignal === 'bearish') score -= 10;

    if (indicators.emaCrossover === 'golden') score += 20;
    else if (indicators.emaCrossover === 'death') score -= 15;

    if (indicators.volumeSpike) score += 10;

    if (indicators.priceAction === 'bullish') score += 10;
    else if (indicators.priceAction === 'bearish') score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  calculateMomentumScore(pair: DexScreenerPair): number {
    let score = 50;

    const priceChange24h = pair.priceChange?.h24 || 0;
    if (priceChange24h > 50) score += 25;
    else if (priceChange24h > 20) score += 15;
    else if (priceChange24h > 5) score += 10;
    else if (priceChange24h < -20) score -= 20;
    else if (priceChange24h < -10) score -= 10;

    const priceChange1h = pair.priceChange?.h1 || 0;
    if (priceChange1h > 10) score += 15;
    else if (priceChange1h > 5) score += 10;
    else if (priceChange1h < -10) score -= 15;

    const volume24h = pair.volume?.h24 || 0;
    if (volume24h > 1000000) score += 15;
    else if (volume24h > 100000) score += 10;
    else if (volume24h < 10000) score -= 10;

    const txns = pair.txns?.h24;
    if (txns) {
      const buyRatio = txns.buys / (txns.buys + txns.sells || 1);
      if (buyRatio > 0.6) score += 10;
      else if (buyRatio < 0.4) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  analyzeTechnicalIndicators(pair: DexScreenerPair): TechnicalIndicators {
    const priceChange1h = pair.priceChange?.h1 || 0;
    const priceChange24h = pair.priceChange?.h24 || 0;
    const volume1h = pair.volume?.h1 || 0;
    const volume24hAvg = (pair.volume?.h24 || 0) / 24;

    let rsiSignal: 'oversold' | 'neutral' | 'overbought' = 'neutral';
    if (priceChange24h < -15 && priceChange1h > 0) {
      rsiSignal = 'oversold';
    } else if (priceChange24h > 50 && priceChange1h < 0) {
      rsiSignal = 'overbought';
    }

    let macdSignal: 'bullish' | 'neutral' | 'bearish' = 'neutral';
    if (priceChange1h > 5 && priceChange24h > 0) {
      macdSignal = 'bullish';
    } else if (priceChange1h < -5 && priceChange24h < 0) {
      macdSignal = 'bearish';
    }

    let emaCrossover: 'golden' | 'none' | 'death' = 'none';
    if (priceChange24h > 20 && priceChange1h > 5) {
      emaCrossover = 'golden';
    } else if (priceChange24h < -20 && priceChange1h < -5) {
      emaCrossover = 'death';
    }

    const volumeSpike = volume1h > volume24hAvg * 2;

    let priceAction: 'bullish' | 'neutral' | 'bearish' = 'neutral';
    if (priceChange1h > 3 && priceChange24h > 5) {
      priceAction = 'bullish';
    } else if (priceChange1h < -3 && priceChange24h < -5) {
      priceAction = 'bearish';
    }

    return { rsiSignal, macdSignal, emaCrossover, volumeSpike, priceAction };
  }

  async getMLConfidence(tokenAddress: string): Promise<number | null> {
    try {
      return null;
    } catch (error) {
      return null;
    }
  }

  categorizeToken(symbol: string, name: string): 'blue_chip' | 'defi' | 'meme' | 'dex' | 'new' {
    const upperSymbol = symbol.toUpperCase();
    const upperName = name.toUpperCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (upperSymbol.includes(keyword) || upperName.includes(keyword)) {
          return category as 'blue_chip' | 'defi' | 'meme' | 'dex';
        }
      }
    }

    return 'new';
  }

  generateReasoning(
    pair: DexScreenerPair,
    safetyReport: TokenSafetyReport,
    indicators: TechnicalIndicators,
    compositeScore: number
  ): string {
    const reasons: string[] = [];

    if (compositeScore >= 70) {
      reasons.push(`Strong overall score of ${compositeScore}/100.`);
    } else if (compositeScore >= 50) {
      reasons.push(`Moderate opportunity score of ${compositeScore}/100.`);
    }

    if (safetyReport.safetyScore >= 70) {
      reasons.push('Passes key safety checks.');
    }
    if (safetyReport.liquidityLocked || safetyReport.liquidityBurned) {
      reasons.push('Liquidity is locked or burned.');
    }

    if (indicators.rsiSignal === 'oversold') {
      reasons.push('RSI indicates oversold conditions - potential bounce.');
    }
    if (indicators.macdSignal === 'bullish') {
      reasons.push('MACD showing bullish momentum.');
    }
    if (indicators.emaCrossover === 'golden') {
      reasons.push('Golden cross pattern detected.');
    }
    if (indicators.volumeSpike) {
      reasons.push('Volume spike indicates increased interest.');
    }

    const priceChange24h = pair.priceChange?.h24 || 0;
    if (priceChange24h > 20) {
      reasons.push(`Strong 24h gain of +${priceChange24h.toFixed(1)}%.`);
    }

    const volume24h = pair.volume?.h24 || 0;
    if (volume24h > 500000) {
      reasons.push(`High trading volume ($${(volume24h / 1000000).toFixed(2)}M in 24h).`);
    }

    if (reasons.length === 0) {
      reasons.push('Token shows potential based on combined metrics.');
    }

    return reasons.join(' ');
  }

  generateReasoningMultiChain(
    pair: DexScreenerPair,
    chain: ChainId,
    safetyScore: number,
    safetyIndicators: Record<string, any>,
    indicators: TechnicalIndicators,
    compositeScore: number
  ): string {
    const reasons: string[] = [];
    const chainName = chain.charAt(0).toUpperCase() + chain.slice(1);

    if (compositeScore >= 70) {
      reasons.push(`Strong score of ${compositeScore}/100 on ${chainName}.`);
    } else if (compositeScore >= 50) {
      reasons.push(`Moderate opportunity (${compositeScore}/100) on ${chainName}.`);
    }

    if (safetyScore >= 70) {
      reasons.push('Passes key safety checks.');
    }
    
    // EVM-specific safety indicators
    if (safetyIndicators.isRenounced) {
      reasons.push('Ownership renounced.');
    }
    if (safetyIndicators.liquidityLocked) {
      reasons.push('Liquidity locked.');
    }
    if (safetyIndicators.buyTax === 0 && safetyIndicators.sellTax === 0) {
      reasons.push('No buy/sell tax.');
    } else if (safetyIndicators.buyTax > 0 || safetyIndicators.sellTax > 0) {
      const totalTax = (safetyIndicators.buyTax || 0) + (safetyIndicators.sellTax || 0);
      if (totalTax <= 10) {
        reasons.push(`Low tax (${safetyIndicators.buyTax || 0}%/${safetyIndicators.sellTax || 0}%).`);
      }
    }

    if (indicators.rsiSignal === 'oversold') {
      reasons.push('RSI oversold - potential bounce.');
    }
    if (indicators.macdSignal === 'bullish') {
      reasons.push('MACD bullish.');
    }
    if (indicators.emaCrossover === 'golden') {
      reasons.push('Golden cross detected.');
    }
    if (indicators.volumeSpike) {
      reasons.push('Volume spike.');
    }

    const priceChange24h = pair.priceChange?.h24 || 0;
    if (priceChange24h > 20) {
      reasons.push(`+${priceChange24h.toFixed(1)}% in 24h.`);
    }

    const volume24h = pair.volume?.h24 || 0;
    if (volume24h > 500000) {
      reasons.push(`$${(volume24h / 1000000).toFixed(2)}M volume.`);
    }

    if (reasons.length === 0) {
      reasons.push(`Token on ${chainName} shows potential.`);
    }

    return reasons.join(' ');
  }

  async getTopSignals(limit: number = 10, category?: string, chain?: ChainId | 'all'): Promise<TokenSignal[]> {
    try {
      let conditions: any[] = [];
      
      if (category) {
        conditions.push(eq(strikeAgentSignals.category, category));
      }
      
      if (chain && chain !== 'all') {
        conditions.push(eq(strikeAgentSignals.chain, chain));
      }

      let query;
      if (conditions.length > 0) {
        query = db.select()
          .from(strikeAgentSignals)
          .where(and(...conditions))
          .orderBy(desc(strikeAgentSignals.compositeScore));
      } else {
        query = db.select()
          .from(strikeAgentSignals)
          .orderBy(desc(strikeAgentSignals.compositeScore));
      }

      const results = await query.limit(limit);

      return results.map(row => ({
        id: row.id,
        tokenAddress: row.tokenAddress,
        tokenSymbol: row.tokenSymbol,
        tokenName: row.tokenName || 'Unknown',
        chain: row.chain,
        priceUsd: parseFloat(row.priceUsd || '0'),
        marketCapUsd: parseFloat(row.marketCapUsd || '0'),
        liquidityUsd: parseFloat(row.liquidityUsd || '0'),
        compositeScore: row.compositeScore,
        technicalScore: row.technicalScore,
        safetyScore: row.safetyScore,
        momentumScore: row.momentumScore,
        mlConfidence: row.mlConfidence ? parseFloat(row.mlConfidence) : null,
        indicators: row.indicators ? JSON.parse(row.indicators) : {},
        reasoning: row.reasoning || '',
        rank: row.rank,
        category: row.category as TokenSignal['category'],
        dex: row.dex || 'unknown',
      }));
    } catch (error) {
      console.error('[TopSignals] Error fetching signals:', error);
      return [];
    }
  }

  async saveSignals(signals: TokenSignal[]): Promise<void> {
    if (signals.length === 0) return;

    try {
      await db.delete(strikeAgentSignals);

      const records = signals.slice(0, 100).map(signal => ({
        id: signal.id,
        tokenAddress: signal.tokenAddress,
        tokenSymbol: signal.tokenSymbol,
        tokenName: signal.tokenName,
        chain: signal.chain,
        priceUsd: signal.priceUsd.toString(),
        marketCapUsd: signal.marketCapUsd.toString(),
        liquidityUsd: signal.liquidityUsd.toString(),
        compositeScore: signal.compositeScore,
        technicalScore: signal.technicalScore,
        safetyScore: signal.safetyScore,
        momentumScore: signal.momentumScore,
        mlConfidence: signal.mlConfidence?.toString() || null,
        indicators: JSON.stringify(signal.indicators),
        reasoning: signal.reasoning,
        rank: signal.rank,
        category: signal.category,
        dex: signal.dex,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(strikeAgentSignals).values(records);
      console.log(`[TopSignals] Saved ${records.length} signals to database`);

      // Log predictions for ML training (async, don't wait)
      for (const signal of signals.slice(0, 20)) {
        const aiRecommendation: 'snipe' | 'watch' | 'avoid' = 
          signal.compositeScore >= 70 ? 'snipe' :
          signal.compositeScore >= 50 ? 'watch' : 'avoid';

        strikeAgentTrackingService.logPrediction({
          tokenAddress: signal.tokenAddress,
          tokenSymbol: signal.tokenSymbol,
          tokenName: signal.tokenName,
          dex: signal.dex,
          chain: signal.chain,
          priceUsd: signal.priceUsd,
          marketCapUsd: signal.marketCapUsd,
          liquidityUsd: signal.liquidityUsd,
          aiRecommendation,
          aiScore: signal.compositeScore,
          aiReasoning: signal.reasoning,
          safetyMetrics: {
            botPercent: signal.indicators?.botPercent || 0,
            bundlePercent: signal.indicators?.bundlePercent || 0,
            top10HoldersPercent: signal.indicators?.top10HoldersPercent || 0,
            liquidityUsd: signal.liquidityUsd,
            holderCount: signal.indicators?.holderCount || 0,
            creatorWalletRisky: signal.indicators?.creatorWalletRisky || false,
            mintAuthorityActive: signal.indicators?.mintAuthorityActive,
            freezeAuthorityActive: signal.indicators?.freezeAuthorityActive,
            isHoneypot: signal.indicators?.isHoneypot,
            liquidityLocked: signal.indicators?.liquidityLocked,
            isPumpFun: signal.indicators?.isPumpFun,
          },
          movementMetrics: {
            priceChangePercent: signal.indicators?.priceChange24h || 0,
            volumeMultiplier: signal.indicators?.volumeMultiplier || 1,
            tradesPerMinute: signal.indicators?.tradesPerMinute || 0,
            buySellRatio: signal.indicators?.buySellRatio || 1,
            holderGrowthPercent: signal.indicators?.holderGrowthPercent || 0,
          },
        }).catch(err => {
          console.warn(`[TopSignals] Failed to log prediction for ${signal.tokenSymbol}:`, err.message);
        });
      }
    } catch (error) {
      console.error('[TopSignals] Error saving signals:', error);
      throw error;
    }
  }

  private async fetchTrendingTokens(chains: ChainId[] = SUPPORTED_CHAINS): Promise<DexScreenerPair[]> {
    try {
      const allPairs: DexScreenerPair[] = [];
      
      // Fetch trending tokens for each chain
      for (const chain of chains) {
        const tokens = CHAIN_POPULAR_TOKENS[chain] || [];
        for (const token of tokens.slice(0, 3)) {
          try {
            const response = await axios.get(`${DEX_SCREENER_API}/search?q=${token}`, {
              timeout: 10000,
            });
            // Filter to only include pairs from the target chain
            const pairs = (response.data?.pairs || []).filter((p: any) => 
              normalizeChainId(p.chainId) === chain
            );
            allPairs.push(...pairs.slice(0, 2));
          } catch (err) {
            console.warn(`[TopSignals] Failed to fetch ${token} on ${chain}`);
          }
        }
      }
      
      console.log(`[TopSignals] Fetched ${allPairs.length} trending tokens across ${chains.length} chains`);
      return allPairs;
    } catch (error) {
      console.error('[TopSignals] Error fetching trending tokens:', error);
      return [];
    }
  }

  private async fetchTopGainers(chains: ChainId[] = SUPPORTED_CHAINS): Promise<DexScreenerPair[]> {
    try {
      // Universal meme tokens that exist on multiple chains
      const memeTokens = ['DOGE', 'PEPE', 'SHIB', 'FLOKI', 'MOG', 'NEIRO', 'SPX', 'GIGA'];
      const allPairs: DexScreenerPair[] = [];
      
      for (const token of memeTokens.slice(0, 5)) {
        try {
          const response = await axios.get(`${DEX_SCREENER_API}/search?q=${token}`, {
            timeout: 10000,
          });
          // Include pairs from all target chains with positive price change
          const pairs = (response.data?.pairs || []).filter((p: any) => {
            const chain = normalizeChainId(p.chainId);
            return chain && chains.includes(chain) && (p.priceChange?.h24 || 0) > 5;
          });
          allPairs.push(...pairs.slice(0, 5));
        } catch (err) {
          console.warn(`[TopSignals] Failed to fetch ${token}`);
        }
      }
      
      const sorted = allPairs
        .sort((a, b) => (b.priceChange?.h24 || 0) - (a.priceChange?.h24 || 0))
        .slice(0, 50);
      
      console.log(`[TopSignals] Fetched ${sorted.length} gainers across ${chains.length} chains`);
      return sorted;
    } catch (error) {
      console.error('[TopSignals] Error fetching top gainers:', error);
      return [];
    }
  }

  private deduplicateByAddress(pairs: DexScreenerPair[]): DexScreenerPair[] {
    const seen = new Set<string>();
    const unique: DexScreenerPair[] = [];

    for (const pair of pairs) {
      const address = pair.baseToken?.address;
      if (address && !seen.has(address)) {
        seen.add(address);
        unique.push(pair);
      }
    }

    return unique;
  }
}

export const topSignalsService = new TopSignalsService();
