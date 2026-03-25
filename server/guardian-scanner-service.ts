import axios from 'axios';
import { tokenDataCache, CACHE_TTL } from './guardian-scanner-cache';
import { safetyEngineService, TokenSafetyReport } from './pulse/safetyEngineService';
import { evmSafetyEngine, EvmTokenSafetyReport, EvmChainId } from './pulse/evmSafetyEngine';

const EVM_CHAINS: EvmChainId[] = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'avalanche', 'fantom', 'optimism', 'cronos'];

interface SafetyData {
  honeypotRisk: boolean;
  mintAuthority: boolean;
  freezeAuthority: boolean;
  liquidityLocked: boolean;
  holderCount: number;
  whaleConcentration: number;
  safetyScore: number;
  safetyGrade: string;
  risks: string[];
  warnings: string[];
}

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';
const DEX_SCREENER_V1 = 'https://api.dexscreener.com';

export const SUPPORTED_CHAINS = [
  'solana', 'ethereum', 'bsc', 'arbitrum', 'polygon', 
  'base', 'avalanche', 'fantom', 'optimism', 'cronos', 'tron', 'zksync'
] as const;

export type ChainId = typeof SUPPORTED_CHAINS[number];

const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  solana: 'Solana',
  ethereum: 'Ethereum',
  bsc: 'BNB Chain',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  base: 'Base',
  avalanche: 'Avalanche',
  fantom: 'Fantom',
  optimism: 'Optimism',
  cronos: 'Cronos',
  tron: 'Tron',
  zksync: 'zkSync',
};

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  priceNative: string;
  liquidity: { usd: number };
  fdv: number;
  marketCap?: number;
  volume: { h24: number; h6: number; h1: number; m5: number };
  priceChange: { h24: number; h6: number; h1: number; m5: number };
  txns: {
    h24: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    m5: { buys: number; sells: number };
  };
  pairCreatedAt: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string }[];
    socials?: { type: string; url: string }[];
  };
}

export interface GuardianToken {
  id: string;
  symbol: string;
  name: string;
  contractAddress: string;
  pairAddress: string;
  chain: string;
  chainName: string;
  dex: string;
  dexShort: string;
  price: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  volume24h: number;
  volume6h: number;
  volume1h: number;
  volume5m: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
  txns24h: { buys: number; sells: number };
  txns6h: { buys: number; sells: number };
  txns1h: { buys: number; sells: number };
  txns5m: { buys: number; sells: number };
  makers: number;
  buyRatio: number;
  createdAt: number;
  ageHours: number;
  guardianScore: number;
  aiScore: number;
  aiRecommendation: 'snipe' | 'watch' | 'avoid';
  category: string;
  boosts: number;
  mlPrediction: {
    direction: 'up' | 'down' | 'neutral';
    confidence: number;
    accuracy: number;
    shortTerm: { direction: 'up' | 'down'; percent: number };
    longTerm: { direction: 'up' | 'down'; percent: number };
  };
  safety?: SafetyData;
  imageUrl?: string;
  websites?: string[];
  twitter?: string;
  telegram?: string;
}

async function runSafetyCheck(chain: string, tokenAddress: string): Promise<SafetyData | null> {
  const cacheKey = `safety:${chain}:${tokenAddress}`;
  const cached = tokenDataCache.get<SafetyData>(cacheKey);
  if (cached) return cached;
  
  try {
    let safetyData: SafetyData;
    
    if (chain === 'solana') {
      const report = await safetyEngineService.runFullSafetyCheck(tokenAddress);
      safetyData = {
        honeypotRisk: report.honeypotResult?.isHoneypot || false,
        mintAuthority: report.hasMintAuthority,
        freezeAuthority: report.hasFreezeAuthority,
        liquidityLocked: report.liquidityLocked || report.liquidityBurned,
        holderCount: report.holderCount || 0,
        whaleConcentration: report.top10HoldersPercent || 0,
        safetyScore: report.safetyScore,
        safetyGrade: report.safetyGrade,
        risks: report.risks || [],
        warnings: report.warnings || []
      };
    } else if (EVM_CHAINS.includes(chain as EvmChainId)) {
      const report = await evmSafetyEngine.runFullSafetyCheck(chain as EvmChainId, tokenAddress);
      safetyData = {
        honeypotRisk: report.honeypotResult?.isHoneypot || false,
        mintAuthority: report.ownerCanMint,
        freezeAuthority: report.ownerCanPause || report.ownerCanBlacklist,
        liquidityLocked: report.liquidityLocked || report.liquidityBurned,
        holderCount: report.holderCount || 0,
        whaleConcentration: report.top10HoldersPercent || 0,
        safetyScore: report.safetyScore,
        safetyGrade: report.safetyGrade,
        risks: report.risks || [],
        warnings: report.warnings || []
      };
    } else {
      return null;
    }
    
    tokenDataCache.set(cacheKey, safetyData, 5 * 60 * 1000);
    return safetyData;
  } catch (error) {
    console.warn(`[GuardianScanner] Safety check failed for ${chain}:${tokenAddress}:`, error);
    return null;
  }
}

function calculateGuardianScore(pair: DexScreenerPair): number {
  let score = 50;
  
  const liq = pair.liquidity?.usd || 0;
  if (liq > 1000000) score += 15;
  else if (liq > 100000) score += 10;
  else if (liq > 10000) score += 5;
  else if (liq < 1000) score -= 15;
  
  const vol24h = pair.volume?.h24 || 0;
  if (vol24h > 1000000) score += 10;
  else if (vol24h > 100000) score += 5;
  else if (vol24h < 1000) score -= 10;
  
  const age = Date.now() - (pair.pairCreatedAt || 0);
  const ageHours = age / (1000 * 60 * 60);
  if (ageHours > 720) score += 10; // 30+ days
  else if (ageHours > 168) score += 5; // 7+ days
  else if (ageHours < 1) score -= 15; // < 1 hour (high risk)
  else if (ageHours < 24) score -= 5;
  
  const buys = pair.txns?.h24?.buys || 0;
  const sells = pair.txns?.h24?.sells || 0;
  const total = buys + sells;
  if (total > 100) {
    const buyRatio = buys / total;
    if (buyRatio > 0.7) score += 5;
    else if (buyRatio < 0.3) score -= 10;
  }
  
  if (pair.info?.websites?.length) score += 3;
  if (pair.info?.socials?.length) score += 2;
  
  return Math.max(0, Math.min(100, score));
}

function generateMLPrediction(pair: DexScreenerPair): GuardianToken['mlPrediction'] {
  const change24h = pair.priceChange?.h24 || 0;
  const change1h = pair.priceChange?.h1 || 0;
  const change6h = pair.priceChange?.h6 || 0;
  const vol1h = pair.volume?.h1 || 0;
  const vol24h = pair.volume?.h24 || 0;
  const buys = pair.txns?.h24?.buys || 0;
  const sells = pair.txns?.h24?.sells || 0;
  const total = buys + sells;

  let momentum = 0;
  if (change1h > 10) momentum += 2;
  else if (change1h > 0) momentum += 1;
  else if (change1h < -10) momentum -= 2;
  else if (change1h < 0) momentum -= 1;

  if (vol1h > vol24h / 12) momentum += 1;
  if (total > 50 && buys / total > 0.6) momentum += 1;
  if (total > 50 && buys / total < 0.4) momentum -= 1;
  if (change6h > 15) momentum += 1;
  else if (change6h < -15) momentum -= 1;

  const direction: 'up' | 'down' | 'neutral' = momentum > 1 ? 'up' : momentum < -1 ? 'down' : 'neutral';

  const signalStrength = Math.min(5, Math.abs(momentum));
  const confidence = Math.min(95, 40 + signalStrength * 11);

  const liq = pair.liquidity?.usd || 0;
  const dataQuality = liq > 100000 ? 15 : liq > 10000 ? 8 : 0;
  const accuracy = Math.min(90, 55 + dataQuality + signalStrength * 3);

  return {
    direction,
    confidence,
    accuracy,
    shortTerm: {
      direction: change1h >= 0 ? 'up' : 'down',
      percent: Math.abs(change1h) * 0.7
    },
    longTerm: {
      direction: change24h >= 0 ? 'up' : 'down',
      percent: Math.abs(change24h) * 0.5
    }
  };
}

const DEX_SHORT_NAMES: Record<string, string> = {
  raydium: 'Ray', 'pump.fun': 'Pump', pumpswap: 'Pump', orca: 'Orca',
  uniswap: 'Uni', 'uniswap_v3': 'UniV3', 'uniswap_v2': 'UniV2',
  sushiswap: 'Sushi', pancakeswap: 'Cake', 'pancakeswap_v3': 'CakeV3',
  baseswap: 'Base', aerodrome: 'Aero', jupiter: 'Jup',
  camelot: 'Cam', trader_joe: 'Joe', quickswap: 'Quick',
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  meme: ['doge', 'shib', 'pepe', 'bonk', 'floki', 'wif', 'cat', 'dog', 'frog', 'meme', 'wojak', 'chad', 'pnut', 'brett', 'popcat', 'mog', 'bome', 'ponke', 'mew', 'degen', 'slerf', 'myro', 'hoppy', 'duko', 'neiro', 'mother', 'toshi'],
  defi: ['swap', 'dex', 'lend', 'aave', 'compound', 'curve', 'maker', 'lido', 'rocket', 'synthetix', 'balancer', 'yearn', 'drift', 'kamino', 'mango', 'jupiter', 'raydium', 'orca', 'sushi', 'uniswap', '1inch'],
  ai: ['ai', 'gpt', 'neural', 'render', 'fetch', 'singularity', 'ocean', 'bittensor', 'akash', 'numeraire', 'arkham', 'olas', 'vana', 'io.net', 'grass', 'hodl ai'],
  gaming: ['game', 'play', 'axie', 'sandbox', 'decentraland', 'enjin', 'illuvium', 'magic', 'prime', 'beam', 'pixel', 'portal', 'super', 'gods', 'gala', 'immutable'],
  nft: ['nft', 'blur', 'looksrare', 'rare', 'x2y2', 'moonbird', 'ape', 'bayc'],
  rwa: ['rwa', 'ondo', 'real', 'estate', 'asset', 'centrifuge', 'maple'],
  bluechip: ['bitcoin', 'ethereum', 'solana', 'bnb', 'arbitrum', 'optimism', 'polygon', 'avalanche', 'chainlink', 'polkadot', 'cosmos', 'cardano'],
  stable: ['usdc', 'usdt', 'dai', 'busd', 'tusd', 'usdp', 'frax'],
};

function detectCategory(name: string, symbol: string): string {
  const lower = `${name} ${symbol}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'other';
}

const PULSE_SCORING_WEIGHTS = {
  safety: 0.30,
  technical: 0.30,
  momentum: 0.25,
  mlConfidence: 0.15,
};

function analyzePulseTechnicalIndicators(pair: DexScreenerPair): { rsiSignal: string; macdSignal: string; emaCrossover: string; volumeSpike: boolean; priceAction: string } {
  const priceChange1h = pair.priceChange?.h1 || 0;
  const priceChange24h = pair.priceChange?.h24 || 0;
  const volume1h = pair.volume?.h1 || 0;
  const volume24hAvg = (pair.volume?.h24 || 0) / 24;

  let rsiSignal = 'neutral';
  if (priceChange24h < -15 && priceChange1h > 0) rsiSignal = 'oversold';
  else if (priceChange24h > 50 && priceChange1h < 0) rsiSignal = 'overbought';

  let macdSignal = 'neutral';
  if (priceChange1h > 5 && priceChange24h > 0) macdSignal = 'bullish';
  else if (priceChange1h < -5 && priceChange24h < 0) macdSignal = 'bearish';

  let emaCrossover = 'none';
  if (priceChange24h > 20 && priceChange1h > 5) emaCrossover = 'golden';
  else if (priceChange24h < -20 && priceChange1h < -5) emaCrossover = 'death';

  const volumeSpike = volume1h > volume24hAvg * 2;

  let priceAction = 'neutral';
  if (priceChange1h > 3 && priceChange24h > 5) priceAction = 'bullish';
  else if (priceChange1h < -3 && priceChange24h < -5) priceAction = 'bearish';

  return { rsiSignal, macdSignal, emaCrossover, volumeSpike, priceAction };
}

function calculatePulseTechnicalScore(indicators: { rsiSignal: string; macdSignal: string; emaCrossover: string; volumeSpike: boolean; priceAction: string }): number {
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

function calculatePulseMomentumScore(pair: DexScreenerPair): number {
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

function calculateAIScore(pair: DexScreenerPair, guardianScore: number): { score: number; recommendation: 'snipe' | 'watch' | 'avoid'; technicalScore: number; momentumScore: number } {
  const safetyScore = guardianScore;
  const indicators = analyzePulseTechnicalIndicators(pair);
  const technicalScore = calculatePulseTechnicalScore(indicators);
  const momentumScore = calculatePulseMomentumScore(pair);
  const mlPrediction = generateMLPrediction(pair);
  const mlConfidenceScore = mlPrediction.confidence;

  let weightedSum = 0;
  let totalWeight = 0;

  weightedSum += safetyScore * PULSE_SCORING_WEIGHTS.safety;
  totalWeight += PULSE_SCORING_WEIGHTS.safety;

  weightedSum += technicalScore * PULSE_SCORING_WEIGHTS.technical;
  totalWeight += PULSE_SCORING_WEIGHTS.technical;

  weightedSum += momentumScore * PULSE_SCORING_WEIGHTS.momentum;
  totalWeight += PULSE_SCORING_WEIGHTS.momentum;

  weightedSum += mlConfidenceScore * PULSE_SCORING_WEIGHTS.mlConfidence;
  totalWeight += PULSE_SCORING_WEIGHTS.mlConfidence;

  const score = Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight)));

  const recommendation: 'snipe' | 'watch' | 'avoid' =
    score >= 70 ? 'snipe' : score >= 40 ? 'watch' : 'avoid';

  return { score, recommendation, technicalScore, momentumScore };
}

function transformPairToToken(pair: DexScreenerPair): GuardianToken {
  const buys24h = pair.txns?.h24?.buys || 0;
  const sells24h = pair.txns?.h24?.sells || 0;
  const total24h = buys24h + sells24h;
  
  const twitter = pair.info?.socials?.find(s => s.type === 'twitter')?.url;
  const telegram = pair.info?.socials?.find(s => s.type === 'telegram')?.url;
  
  const ageMs = Date.now() - (pair.pairCreatedAt || Date.now());
  const ageHours = ageMs / (1000 * 60 * 60);
  
  const dexId = (pair.dexId || 'unknown').toLowerCase();
  const dexShort = DEX_SHORT_NAMES[dexId] || dexId.charAt(0).toUpperCase() + dexId.slice(1, 5);
  
  const guardianScore = calculateGuardianScore(pair);
  const { score: aiScore, recommendation: aiRecommendation } = calculateAIScore(pair, guardianScore);
  const category = detectCategory(pair.baseToken?.name || '', pair.baseToken?.symbol || '');
  
  const buys1h = pair.txns?.h1?.buys || 0;
  const sells1h = pair.txns?.h1?.sells || 0;
  const uniqueMakers = Math.floor((buys1h + sells1h) * 0.6 * 24);
  
  const hasSocials = (pair.info?.socials?.length || 0) > 0;
  const hasWebsite = (pair.info?.websites?.length || 0) > 0;
  const boosts = (hasWebsite ? 500 : 0) + (hasSocials ? 300 : 0) + 
    Math.min(Math.floor((pair.volume?.h24 || 0) / 10000), 2000);
  
  return {
    id: `${pair.chainId}-${pair.pairAddress}`,
    symbol: pair.baseToken?.symbol || 'UNKNOWN',
    name: pair.baseToken?.name || 'Unknown Token',
    contractAddress: pair.baseToken?.address || '',
    pairAddress: pair.pairAddress || '',
    chain: pair.chainId,
    chainName: CHAIN_DISPLAY_NAMES[pair.chainId] || pair.chainId,
    dex: pair.dexId || 'Unknown DEX',
    dexShort,
    price: parseFloat(pair.priceUsd || '0'),
    priceChange5m: pair.priceChange?.m5 || 0,
    priceChange1h: pair.priceChange?.h1 || 0,
    priceChange6h: pair.priceChange?.h6 || 0,
    priceChange24h: pair.priceChange?.h24 || 0,
    volume24h: pair.volume?.h24 || 0,
    volume6h: pair.volume?.h6 || 0,
    volume1h: pair.volume?.h1 || 0,
    volume5m: pair.volume?.m5 || 0,
    liquidity: pair.liquidity?.usd || 0,
    marketCap: pair.marketCap || pair.fdv || 0,
    fdv: pair.fdv || 0,
    txns24h: { buys: buys24h, sells: sells24h },
    txns6h: pair.txns?.h6 || { buys: 0, sells: 0 },
    txns1h: pair.txns?.h1 || { buys: 0, sells: 0 },
    txns5m: pair.txns?.m5 || { buys: 0, sells: 0 },
    makers: uniqueMakers,
    buyRatio: total24h > 0 ? buys24h / total24h : 0.5,
    createdAt: pair.pairCreatedAt || Date.now(),
    ageHours,
    guardianScore,
    aiScore,
    aiRecommendation,
    category,
    boosts,
    mlPrediction: generateMLPrediction(pair),
    imageUrl: pair.info?.imageUrl,
    websites: pair.info?.websites?.map(w => w.url),
    twitter,
    telegram
  };
}

class GuardianScannerService {
  
  async getTrendingTokens(chain?: string): Promise<GuardianToken[]> {
    const cacheKey = `trending:${chain || 'all'}`;
    const cached = tokenDataCache.get<GuardianToken[]>(cacheKey);
    if (cached) {
      console.log(`[GuardianScanner] Cache hit for ${cacheKey}`);
      return cached;
    }
    
    try {
      const allTokens: GuardianToken[] = [];
      const iconMap = new Map<string, string>();
      
      // Step 1: Get boosted/trending token addresses with icons from token-boosts/top
      try {
        const boostRes = await axios.get(`${DEX_SCREENER_V1}/token-boosts/top/v1`, {
          timeout: 10000,
          headers: { 'Accept': 'application/json' }
        });
        const boosts: any[] = Array.isArray(boostRes.data) ? boostRes.data : [];
        for (const b of boosts) {
          if (b.tokenAddress && b.icon) {
            iconMap.set(`${b.chainId}:${b.tokenAddress}`.toLowerCase(), b.icon);
          }
        }
        
        // Group boosted tokens by chain
        const chainGroups = new Map<string, string[]>();
        for (const b of boosts) {
          if (!b.chainId || !b.tokenAddress) continue;
          if (chain && chain !== 'all' && b.chainId !== chain) continue;
          const group = chainGroups.get(b.chainId) || [];
          if (!group.includes(b.tokenAddress)) group.push(b.tokenAddress);
          chainGroups.set(b.chainId, group);
        }
        
        // Step 2: Fetch pair data for boosted tokens (up to 30 per chain)
        const chainEntries = Array.from(chainGroups.entries());
        for (const [chainId, addresses] of chainEntries) {
          try {
            const batch = addresses.slice(0, 30).join(',');
            const pairRes = await axios.get(`${DEX_SCREENER_V1}/tokens/v1/${chainId}/${batch}`, {
              timeout: 10000,
              headers: { 'Accept': 'application/json' }
            });
            const pairs: DexScreenerPair[] = Array.isArray(pairRes.data) ? pairRes.data : (pairRes.data?.pairs || []);
            const bestPairs = new Map<string, DexScreenerPair>();
            for (const p of pairs) {
              const key = `${p.chainId}:${p.baseToken?.address}`.toLowerCase();
              const existing = bestPairs.get(key);
              if (!existing || (p.liquidity?.usd || 0) > (existing.liquidity?.usd || 0)) {
                bestPairs.set(key, p);
              }
            }
            const tokens = Array.from(bestPairs.values()).map(p => {
              const token = transformPairToToken(p);
              const iconKey = `${p.chainId}:${p.baseToken?.address}`.toLowerCase();
              if (iconMap.has(iconKey)) {
                token.imageUrl = iconMap.get(iconKey);
              }
              return token;
            });
            allTokens.push(...tokens);
          } catch (err) {
            console.warn(`[GuardianScanner] Failed to fetch pairs for ${chainId}:`, err);
          }
        }
      } catch (err) {
        console.warn('[GuardianScanner] Boost endpoint failed, falling back to token-profiles:', err);
      }
      
      // Step 3: If we got fewer than 20 tokens, supplement with token-profiles
      if (allTokens.length < 20) {
        try {
          const profileRes = await axios.get(`${DEX_SCREENER_V1}/token-profiles/latest/v1`, {
            timeout: 10000,
            headers: { 'Accept': 'application/json' }
          });
          const profiles: any[] = Array.isArray(profileRes.data) ? profileRes.data : [];
          
          const existingAddrs = new Set(allTokens.map(t => `${t.chain}:${t.contractAddress}`.toLowerCase()));
          const chainGroups2 = new Map<string, string[]>();
          
          for (const p of profiles) {
            if (!p.chainId || !p.tokenAddress) continue;
            if (chain && chain !== 'all' && p.chainId !== chain) continue;
            const key = `${p.chainId}:${p.tokenAddress}`.toLowerCase();
            if (existingAddrs.has(key)) continue;
            if (p.icon) iconMap.set(key, p.icon);
            const group = chainGroups2.get(p.chainId) || [];
            if (!group.includes(p.tokenAddress)) group.push(p.tokenAddress);
            chainGroups2.set(p.chainId, group);
          }
          
          const chainEntries2 = Array.from(chainGroups2.entries());
          for (const [chainId, addresses] of chainEntries2) {
            try {
              const batch = addresses.slice(0, 30).join(',');
              const pairRes = await axios.get(`${DEX_SCREENER_V1}/tokens/v1/${chainId}/${batch}`, {
                timeout: 10000,
                headers: { 'Accept': 'application/json' }
              });
              const pairs: DexScreenerPair[] = Array.isArray(pairRes.data) ? pairRes.data : (pairRes.data?.pairs || []);
              const bestPairs = new Map<string, DexScreenerPair>();
              for (const p of pairs) {
                const pKey = `${p.chainId}:${p.baseToken?.address}`.toLowerCase();
                const existing = bestPairs.get(pKey);
                if (!existing || (p.liquidity?.usd || 0) > (existing.liquidity?.usd || 0)) {
                  bestPairs.set(pKey, p);
                }
              }
              const tokens = Array.from(bestPairs.values()).map(p => {
                const token = transformPairToToken(p);
                const iconKey = `${p.chainId}:${p.baseToken?.address}`.toLowerCase();
                if (iconMap.has(iconKey)) {
                  token.imageUrl = iconMap.get(iconKey);
                }
                return token;
              });
              allTokens.push(...tokens);
            } catch (err) {
              console.warn(`[GuardianScanner] Profile pair lookup failed for ${chainId}:`, err);
            }
          }
        } catch (err) {
          console.warn('[GuardianScanner] Token profiles fallback failed:', err);
        }
      }
      
      // Deduplicate final list by contract address
      const seen = new Set<string>();
      const deduped = allTokens.filter(t => {
        const key = `${t.chain}:${t.contractAddress}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      const sorted = deduped
        .filter(t => t.volume24h > 0 || t.liquidity > 0)
        .sort((a, b) => b.volume24h - a.volume24h);
      tokenDataCache.set(cacheKey, sorted, CACHE_TTL.TOKEN_LIST);
      
      console.log(`[GuardianScanner] Fetched ${sorted.length} trending tokens for ${chain || 'all'}`);
      return sorted;
    } catch (error) {
      console.error('[GuardianScanner] getTrendingTokens error:', error);
      return [];
    }
  }
  
  async getTopGainers(chain?: string): Promise<GuardianToken[]> {
    const cacheKey = `gainers:${chain || 'all'}`;
    const cached = tokenDataCache.get<GuardianToken[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=pump`, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      const pairs: DexScreenerPair[] = response.data?.pairs || [];
      const filtered = chain && chain !== 'all' ? pairs.filter(p => p.chainId === chain) : pairs;
      const tokens = filtered
        .filter(p => (p.priceChange?.h24 || 0) > 0)
        .sort((a, b) => (b.priceChange?.h24 || 0) - (a.priceChange?.h24 || 0))
        .slice(0, 50)
        .map(transformPairToToken);
      
      tokenDataCache.set(cacheKey, tokens, CACHE_TTL.TOKEN_LIST);
      return tokens;
    } catch (error) {
      console.error('[GuardianScanner] getTopGainers error:', error);
      return [];
    }
  }
  
  async getNewPairs(chain?: string): Promise<GuardianToken[]> {
    const cacheKey = `newpairs:${chain || 'all'}`;
    const cached = tokenDataCache.get<GuardianToken[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const chainParam = chain && chain !== 'all' ? chain : 'solana';
      const response = await axios.get(`${DEX_SCREENER_API}/pairs/${chainParam}`, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      const pairs: DexScreenerPair[] = response.data?.pairs || [];
      const tokens = pairs
        .sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0))
        .slice(0, 50)
        .map(transformPairToToken);
      
      tokenDataCache.set(cacheKey, tokens, CACHE_TTL.TOKEN_LIST);
      return tokens;
    } catch (error) {
      console.error('[GuardianScanner] getNewPairs error:', error);
      return [];
    }
  }
  
  async searchTokens(query: string, chain?: string): Promise<GuardianToken[]> {
    if (!query || query.length < 2) return [];
    
    const cacheKey = `search:${query}:${chain || 'all'}`;
    const cached = tokenDataCache.get<GuardianToken[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${encodeURIComponent(query)}`, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      const pairs: DexScreenerPair[] = response.data?.pairs || [];
      const filtered = chain && chain !== 'all' ? pairs.filter(p => p.chainId === chain) : pairs;
      const tokens = filtered.slice(0, 100).map(transformPairToToken);
      
      tokenDataCache.set(cacheKey, tokens, 60000); // 1 min cache for searches
      return tokens;
    } catch (error) {
      console.error('[GuardianScanner] searchTokens error:', error);
      return [];
    }
  }
  
  async getTokenByAddress(address: string, includeSafety = false): Promise<GuardianToken | null> {
    if (!address) return null;
    
    const cacheKey = `token:${address}:${includeSafety}`;
    const cached = tokenDataCache.get<GuardianToken>(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await axios.get(`${DEX_SCREENER_API}/tokens/${address}`, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      const pairs: DexScreenerPair[] = response.data?.pairs || [];
      if (pairs.length === 0) return null;
      
      const bestPair = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      const token = transformPairToToken(bestPair);
      
      if (includeSafety) {
        const safety = await runSafetyCheck(token.chain, token.contractAddress);
        if (safety) {
          token.safety = safety;
          token.guardianScore = Math.round((token.guardianScore + safety.safetyScore) / 2);
        }
      }
      
      tokenDataCache.set(cacheKey, token, CACHE_TTL.TOKEN_DETAIL);
      return token;
    } catch (error) {
      console.error('[GuardianScanner] getTokenByAddress error:', error);
      return null;
    }
  }
  
  async getPairByAddress(pairAddress: string, chain: string, includeSafety = false): Promise<GuardianToken | null> {
    if (!pairAddress || !chain) return null;
    
    const cacheKey = `pair:${chain}:${pairAddress}:${includeSafety}`;
    const cached = tokenDataCache.get<GuardianToken>(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await axios.get(`${DEX_SCREENER_API}/pairs/${chain}/${pairAddress}`, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      const pair: DexScreenerPair = response.data?.pair || response.data?.pairs?.[0];
      if (!pair) return null;
      
      const token = transformPairToToken(pair);
      
      if (includeSafety) {
        const safety = await runSafetyCheck(token.chain, token.contractAddress);
        if (safety) {
          token.safety = safety;
          token.guardianScore = Math.round((token.guardianScore + safety.safetyScore) / 2);
        }
      }
      
      tokenDataCache.set(cacheKey, token, CACHE_TTL.TOKEN_DETAIL);
      return token;
    } catch (error) {
      console.error('[GuardianScanner] getPairByAddress error:', error);
      return null;
    }
  }
  
  async runSafetyCheckForToken(chain: string, tokenAddress: string): Promise<SafetyData | null> {
    return runSafetyCheck(chain, tokenAddress);
  }
}

export const guardianScannerService = new GuardianScannerService();
