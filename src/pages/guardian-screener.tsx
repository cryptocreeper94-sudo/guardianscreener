import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Shield,
  TrendingUp,
  TrendingDown,
  Star,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronRight,
  Flame,
  Skull,
  CheckCircle,
  Lock,
  Copy,
  Check,
  Menu,
  X,
  Bell,
  LayoutGrid,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  BarChart3,
  Megaphone,
  Target,
  AlertTriangle,
  Ban,
  Activity,
  Users,
  Bot,
  Droplets,
  Brain,
  Crosshair,
  Clock,
  ExternalLink,
  Info,
  DollarSign,
  Download,
  Home,
  Compass,
  ListFilter
} from "lucide-react";
import { useGuardianWS } from "@/hooks/use-guardian-screener-ws";
import { QuickTradePanel } from "@/components/quick-trade-panel";
import { PriceSparkline } from "@/components/sniper/price-sparkline";

const CHAINS = [
  { id: "all", name: "All Chains", short: "All", icon: "üåê", color: "from-white/20 to-white/10" },
  { id: "solana", name: "Solana", short: "SOL", icon: "‚‚Äîé", color: "from-purple-500 to-green-400" },
  { id: "ethereum", name: "Ethereum", short: "ETH", icon: "Œû", color: "from-blue-500 to-purple-500" },
  { id: "bsc", name: "BNB Chain", short: "BSC", icon: "üü°", color: "from-yellow-400 to-yellow-600" },
  { id: "arbitrum", name: "Arbitrum", short: "ARB", icon: "ü‚Äù∑", color: "from-blue-400 to-cyan-500" },
  { id: "polygon", name: "Polygon", short: "MATIC", icon: "üü£", color: "from-purple-500 to-purple-700" },
  { id: "base", name: "Base", short: "BASE", icon: "ü‚Äùµ", color: "from-blue-400 to-blue-600" },
  { id: "avalanche", name: "Avalanche", short: "AVAX", icon: "ü‚Äù∫", color: "from-red-500 to-red-700" },
  { id: "fantom", name: "Fantom", short: "FTM", icon: "ü‚Äòª", color: "from-blue-600 to-blue-800" },
  { id: "optimism", name: "Optimism", short: "OP", icon: "ü‚Äù¥", color: "from-red-500 to-red-600" },
  { id: "cronos", name: "Cronos", short: "CRO", icon: "ü‚Äô†", color: "from-cyan-600 to-blue-800" },
  { id: "tron", name: "Tron", short: "TRX", icon: "ü‚Äôé", color: "from-red-600 to-red-800" },
  { id: "zksync", name: "zkSync", short: "ZK", icon: "‚ö°", color: "from-indigo-500 to-blue-600" },
  { id: "darkwave", name: "DarkWave", short: "DW", icon: "‚‚ÄîÜ", color: "from-cyan-400 to-purple-500" },
];

const TIME_FILTERS = [
  { id: "5m", label: "5M" },
  { id: "1h", label: "1H" },
  { id: "6h", label: "6H" },
  { id: "24h", label: "24H" },
];

const SORT_OPTIONS = [
  { id: "trending", label: "Trending 6H", icon: Flame },
  { id: "volume", label: "Volume", icon: BarChart3 },
  { id: "gainers", label: "Top Gainers", icon: TrendingUp },
  { id: "losers", label: "Top Losers", icon: TrendingDown },
  { id: "newest", label: "Newest", icon: Sparkles },
  { id: "score", label: "Guardian Score", icon: Shield },
  { id: "ai", label: "AI Confidence", icon: Brain },
  { id: "txns", label: "Transactions", icon: Activity },
  { id: "liquidity", label: "Liquidity", icon: Droplets },
  { id: "mcap", label: "Market Cap", icon: DollarSign },
  { id: "5m", label: "5M Change", icon: Clock },
  { id: "1h", label: "1H Change", icon: Clock },
  { id: "6h", label: "6H Change", icon: Clock },
];

// Category filters for different token types
const CATEGORY_FILTERS = [
  { id: "all", label: "All", icon: "üåê", color: "bg-white/10" },
  { id: "meme", label: "Meme", icon: "üê∏", color: "bg-green-500/20" },
  { id: "defi", label: "DeFi", icon: "üè¶", color: "bg-blue-500/20" },
  { id: "bluechip", label: "Blue Chip", icon: "ü‚Äôé", color: "bg-purple-500/20" },
  { id: "gaming", label: "Gaming", icon: "üéÆ", color: "bg-pink-500/20" },
  { id: "ai", label: "AI", icon: "ü§‚Äì", color: "bg-cyan-500/20" },
  { id: "nft", label: "NFT", icon: "ü‚ÄìºÔ∏è", color: "bg-orange-500/20" },
  { id: "stable", label: "Stable", icon: "ü‚Äôµ", color: "bg-emerald-500/20" },
  { id: "rwa", label: "RWA", icon: "üè†", color: "bg-amber-500/20" },
];

interface SafetyData {
  honeypotRisk: boolean;
  mintAuthority: boolean;
  freezeAuthority: boolean;
  liquidityLocked: boolean;
  holderCount: number;
  whaleConcentration: number;
  botActivity: number;
  safetyScore: number;
  safetyGrade: string;
  risks: string[];
  warnings: string[];
}

interface MLPrediction {
  direction: 'up' | 'down' | 'neutral';
  confidence: number;
  accuracy: number;
  shortTerm: { direction: 'up' | 'down'; percent: number };
  longTerm: { direction: 'up' | 'down'; percent: number };
}

interface Token {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  logo: string;
  contractAddress: string;
  pairAddress: string;
  chain: string;
  chainIcon: string;
  dex: string;
  dexShort: string;
  price: number;
  priceUsd: string;
  age: string;
  ageMinutes: number;
  txns: number;
  buys: number;
  sells: number;
  volume24h: number;
  makers: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  liquidity: number;
  marketCap: number;
  guardianScore: number;
  boosts: number;
  isWatchlisted: boolean;
  aiRecommendation: 'snipe' | 'watch' | 'avoid';
  aiScore: number;
  mlPrediction: MLPrediction;
  safety: SafetyData;
  twitter?: string;
  telegram?: string;
  websites?: string[];
  category: string;
}

function formatPrice(price: number): string {
  if (price < 0.000001) return `$0.0‚ÇÜ${(price * 1000000).toFixed(0)}`;
  if (price < 0.0001) return `$0.0‚ÇÑ${(price * 10000).toFixed(2)}`;
  if (price < 0.001) return `$${price.toFixed(6)}`;
  if (price < 0.01) return `$${price.toFixed(5)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}

function formatCompact(num: number): string {
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
  return num.toLocaleString();
}

function PriceChange({ value, className = "" }: { value: number; className?: string }) {
  const isPositive = value >= 0;
  return (
    <span className={`tabular-nums font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'} ${className}`}>
      {value.toFixed(2)}%
    </span>
  );
}

function AIRecommendationBadge({ recommendation, score }: { recommendation: 'snipe' | 'watch' | 'avoid'; score: number }) {
  const config = {
    snipe: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', icon: Crosshair, label: 'SNIPE' },
    watch: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', icon: Eye, label: 'WATCH' },
    avoid: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', icon: Ban, label: 'AVOID' },
  }[recommendation];
  
  const Icon = config.icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${config.bg} ${config.border} ${config.text}`}>
            <Icon className="w-3 h-3" />
            <span className="text-[10px] font-bold">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 border-white/10">
          <div className="text-xs">
            <div className="font-medium mb-1">Guardian AI Score</div>
            <div className="text-white/60">Score: {score}/100</div>
            <div className="text-white/40 text-[10px] mt-0.5">Safety 30% + Technical 30% + Momentum 25% + ML 15%</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MLPredictionBadge({ prediction }: { prediction: MLPrediction }) {
  const directionConfig = {
    up: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    down: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
    neutral: { icon: Activity, color: 'text-white/50', bg: 'bg-white/5' },
  }[prediction.direction];
  
  const Icon = directionConfig.icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${directionConfig.bg}`}>
            <Brain className="w-3 h-3 text-purple-400" />
            <Icon className={`w-3 h-3 ${directionConfig.color}`} />
            <span className={`text-[10px] font-medium ${directionConfig.color}`}>{prediction.confidence}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 border-white/10">
          <div className="text-xs space-y-1">
            <div className="font-medium text-purple-400 flex items-center gap-1">
              <Brain className="w-3 h-3" /> ML Prediction
            </div>
            <div className="text-white/60">Direction: <span className={directionConfig.color}>{prediction.direction.toUpperCase()}</span></div>
            <div className="text-white/60">Confidence: {prediction.confidence}%</div>
            <div className="text-white/60">Model Accuracy: {prediction.accuracy}%</div>
            <div className="border-t border-white/10 pt-1 mt-1">
              <div className="text-white/60">Short-term: <span className={prediction.shortTerm.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}>{prediction.shortTerm.direction === 'up' ? '+' : '-'}{prediction.shortTerm.percent.toFixed(1)}%</span></div>
              <div className="text-white/60">Long-term: <span className={prediction.longTerm.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}>{prediction.longTerm.direction === 'up' ? '+' : '-'}{prediction.longTerm.percent.toFixed(1)}%</span></div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function GuardianScoreBadge({ score, grade }: { score: number; grade?: string }) {
  let color = "bg-red-500/20 text-red-400 border-red-500/30";
  if (score >= 80) color = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  else if (score >= 60) color = "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
  else if (score >= 40) color = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  else if (score >= 20) color = "bg-orange-500/20 text-orange-400 border-orange-500/30";
  
  return (
    <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold ${color}`}>
      <Shield className="w-2.5 h-2.5" />
      {score}
      {grade && <span className="ml-0.5 opacity-70">({grade})</span>}
    </div>
  );
}

function SafetyIndicators({ safety }: { safety: SafetyData }) {
  return (
    <div className="flex items-center gap-1">
      {safety.honeypotRisk && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Skull className="w-3.5 h-3.5 text-red-400" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-white/10">
              <span className="text-xs text-red-400">Honeypot Risk Detected</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {safety.liquidityLocked && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Lock className="w-3 h-3 text-emerald-400" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-white/10">
              <span className="text-xs text-emerald-400">Liquidity Locked</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {safety.mintAuthority && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-white/10">
              <span className="text-xs text-yellow-400">Mint Authority Enabled</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {safety.whaleConcentration > 40 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Users className="w-3 h-3 text-orange-400" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-white/10">
              <span className="text-xs text-orange-400">High Whale Concentration: {safety.whaleConcentration.toFixed(1)}%</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

function BoostBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-yellow-400 font-medium">
      <Zap className="w-3 h-3 fill-yellow-400" />
      {formatCompact(count)}
    </span>
  );
}

function ExpandedTokenDetails({ token }: { token: Token }) {
  return (
    <motion.tr
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <td colSpan={14} className="bg-slate-900/50 border-b border-white/5">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Safety Analysis */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Safety Analysis</span>
              <GuardianScoreBadge score={token.safety.safetyScore} grade={token.safety.safetyGrade} />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Honeypot Risk</span>
                <span className={token.safety.honeypotRisk ? 'text-red-400' : 'text-emerald-400'}>
                  {token.safety.honeypotRisk ? 'DETECTED' : 'Safe'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Mint Authority</span>
                <span className={token.safety.mintAuthority ? 'text-yellow-400' : 'text-emerald-400'}>
                  {token.safety.mintAuthority ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Freeze Authority</span>
                <span className={token.safety.freezeAuthority ? 'text-yellow-400' : 'text-emerald-400'}>
                  {token.safety.freezeAuthority ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Liquidity</span>
                <span className={token.safety.liquidityLocked ? 'text-emerald-400' : 'text-orange-400'}>
                  {token.safety.liquidityLocked ? 'Locked' : 'Unlocked'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Holder Analysis */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-white">Holder Analysis</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Total Holders</span>
                <span className="text-white">{formatCompact(token.safety.holderCount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Whale Concentration</span>
                <span className={token.safety.whaleConcentration > 50 ? 'text-red-400' : token.safety.whaleConcentration > 30 ? 'text-yellow-400' : 'text-emerald-400'}>
                  {token.safety.whaleConcentration.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Bot Activity</span>
                <span className={token.safety.botActivity > 30 ? 'text-red-400' : token.safety.botActivity > 15 ? 'text-yellow-400' : 'text-emerald-400'}>
                  {token.safety.botActivity.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-white/40 text-[10px] mb-1">Whale Distribution</div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500" 
                    style={{ width: `${Math.min(token.safety.whaleConcentration, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* AI Predictions */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">AI Predictions</span>
              <AIRecommendationBadge recommendation={token.aiRecommendation} score={token.aiScore} />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/50">ML Direction</span>
                <span className={token.mlPrediction.direction === 'up' ? 'text-emerald-400' : token.mlPrediction.direction === 'down' ? 'text-red-400' : 'text-white/50'}>
                  {token.mlPrediction.direction.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Confidence</span>
                <span className="text-cyan-400">{token.mlPrediction.confidence}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Model Accuracy</span>
                <span className="text-purple-400">{token.mlPrediction.accuracy}%</span>
              </div>
              <div className="border-t border-white/10 pt-2 mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/40">Short-term</span>
                  <span className={token.mlPrediction.shortTerm.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                    {token.mlPrediction.shortTerm.direction === 'up' ? '+' : '-'}{token.mlPrediction.shortTerm.percent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40">Long-term</span>
                  <span className={token.mlPrediction.longTerm.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                    {token.mlPrediction.longTerm.direction === 'up' ? '+' : '-'}{token.mlPrediction.longTerm.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Token Info */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-white/50" />
              <span className="text-xs font-semibold text-white">Token Info</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-white/40">Contract</span>
                <div className="text-white/70 font-mono text-[10px] truncate">{token.contractAddress}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Market Cap</span>
                <span className="text-white">${formatNumber(token.marketCap)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Liquidity</span>
                <span className="text-white">${formatNumber(token.liquidity)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Link href={`/guardian-screener/${token.chain}/${token.contractAddress}`}>
                  <button className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-[10px] hover:bg-cyan-500/30">
                    <ExternalLink className="w-3 h-3" />
                    Full Analysis
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Risks & Warnings */}
        {(token.safety.risks.length > 0 || token.safety.warnings.length > 0) && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {token.safety.risks.map((risk, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  {risk}
                </div>
              ))}
              {token.safety.warnings.map((warning, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] text-yellow-400">
                  <AlertTriangle className="w-3 h-3" />
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}
      </td>
    </motion.tr>
  );
}

function TokenRow({ token, isExpanded, onToggleExpand, onToggleWatchlist, onTrade }: { 
  token: Token; 
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleWatchlist: (id: string) => void;
  onTrade: (token: Token) => void;
}) {
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const copyAddress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(token.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRowClick = () => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      navigate(`/guardian-screener/${token.chain}/${token.contractAddress}`);
    } else {
      onToggleExpand();
    }
  };
  
  return (
    <>
      <tr 
        className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors group cursor-pointer ${isExpanded ? 'bg-white/[0.02]' : ''}`} 
        onClick={handleRowClick}
        data-testid={`token-row-${token.id}`}
      >
        {/* Expand Arrow */}
        <td className="pl-2 pr-1 py-3 md:py-2 w-6">
          <ChevronRight className={`w-3.5 h-3.5 text-white/30 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </td>
        
        {/* Rank */}
        <td className="pr-2 py-2 text-xs text-white/40 w-8 text-center">{token.rank}</td>
        
        {/* Token Info */}
        <td className="py-2 pr-3 min-w-[180px]">
          <Link href={`/guardian-screener/${token.chain}/${token.contractAddress}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <img src={token.logo} alt="" className="w-7 h-7 rounded-full bg-white/10" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.symbol}&background=0D0D12&color=fff&rounded=true&font-size=0.45`; }} />
                <span className="absolute -bottom-0.5 -right-0.5 text-[8px] bg-slate-900 rounded px-0.5">{token.chainIcon}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors">{token.symbol}</span>
                  <span className="text-[10px] text-white/30">/{token.dexShort}</span>
                  <BoostBadge count={token.boosts} />
                </div>
                <div className="flex items-center gap-1">
                  <SafetyIndicators safety={token.safety} />
                </div>
              </div>
            </div>
          </Link>
        </td>
        
        {/* AI Recommendation */}
        <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
          <AIRecommendationBadge recommendation={token.aiRecommendation} score={token.aiScore} />
        </td>
        
        {/* ML Prediction */}
        <td className="py-2 pr-3 hidden xl:table-cell" onClick={(e) => e.stopPropagation()}>
          <MLPredictionBadge prediction={token.mlPrediction} />
        </td>
        
        {/* Price */}
        <td className="py-2 pr-4 text-right">
          {token.price < 0.0001 ? (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span className="text-xs font-medium text-white tabular-nums cursor-help border-b border-dashed border-white/20 pb-[1px]" data-testid="price-subscript">
                    {token.priceUsd}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-white/10" side="top" sideOffset={5}>
                  <p className="text-xs text-white font-mono">${token.price.toFixed(12).replace(/0+$/, '').replace(/\.$/, '')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-xs font-medium text-white tabular-nums">{token.priceUsd}</span>
          )}
        </td>
        
        {/* Age */}
        <td className="py-2 pr-4 text-right hidden lg:table-cell">
          <span className="text-xs text-white/50">{token.age}</span>
        </td>
        
        {/* Txns */}
        <td className="py-2 pr-4 text-right hidden lg:table-cell">
          <span className="text-xs text-white/60 tabular-nums">{formatCompact(token.txns)}</span>
        </td>
        
        {/* Volume */}
        <td className="py-2 pr-4 text-right">
          <span className="text-xs text-white/70 tabular-nums">${formatNumber(token.volume24h)}</span>
        </td>
        
        {/* Chart Sparkline */}
        <td className="py-1 pr-4 hidden xl:table-cell w-[120px]">
          <PriceSparkline 
            tokenAddress={token.contractAddress}
            chain={token.chain}
            currentPrice={token.price}
            height={24}
            showLabels={false}
          />
        </td>
        
        {/* 5M Change */}
        <td className="py-2 pr-4 text-right hidden xl:table-cell">
          <PriceChange value={token.priceChange5m} className="text-xs" />
        </td>
        
        {/* 1H Change */}
        <td className="py-2 pr-4 text-right">
          <PriceChange value={token.priceChange1h} className="text-xs" />
        </td>
        
        {/* 6H Change */}
        <td className="py-2 pr-4 text-right hidden lg:table-cell">
          <PriceChange value={token.priceChange6h} className="text-xs" />
        </td>
        
        {/* Liquidity */}
        <td className="py-2 pr-4 text-right hidden xl:table-cell">
          <span className="text-xs text-white/60 tabular-nums">${formatNumber(token.liquidity)}</span>
        </td>
        
        {/* Guardian Score */}
        <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
          <GuardianScoreBadge score={token.guardianScore} grade={token.safety.safetyGrade} />
        </td>
        
        {/* Actions */}
        <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTrade(token); }} 
              className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-[10px] font-medium"
              data-testid={`trade-${token.id}`}
            >
              Trade
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWatchlist(token.id); }} 
              className="p-1 hover:bg-white/10 rounded"
              data-testid={`watchlist-${token.id}`}
            >
              <Star className={`w-3.5 h-3.5 ${token.isWatchlisted ? 'fill-yellow-400 text-yellow-400' : 'text-white/30'}`} />
            </button>
            <button onClick={copyAddress} className="p-1 hover:bg-white/10 rounded" data-testid={`copy-${token.id}`}>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/30" />}
            </button>
          </div>
        </td>
      </tr>
      
      <AnimatePresence>
        {isExpanded && <ExpandedTokenDetails token={token} />}
      </AnimatePresence>
    </>
  );
}

function LeftSidebar({ 
  watchlistedTokens, 
  onSelectToken,
  stats
}: { 
  watchlistedTokens: Token[]; 
  onSelectToken: (token: Token) => void;
  stats: { snipeCount: number; watchCount: number; avoidCount: number };
}) {
  return (
    <div className="w-52 bg-[#0d0d0d] border-r border-white/5 flex-shrink-0 hidden lg:flex flex-col">
      {/* Logo */}
      <div className="p-3 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col ml-3">
            <span className="font-bold text-lg tracking-tight leading-none text-white">GUARDIAN</span>
            <span className="text-[9px] text-white/40">SCREENER PRO</span>
          </div>
        </Link>
      </div>
      
      {/* AI Stats */}
      <div className="p-3 border-b border-white/5">
        <div className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Strike Agent Summary</div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-emerald-500/10 rounded p-1.5">
            <div className="text-emerald-400 font-bold text-sm">{stats.snipeCount}</div>
            <div className="text-[9px] text-emerald-400/70">SNIPE</div>
          </div>
          <div className="bg-yellow-500/10 rounded p-1.5">
            <div className="text-yellow-400 font-bold text-sm">{stats.watchCount}</div>
            <div className="text-[9px] text-yellow-400/70">WATCH</div>
          </div>
          <div className="bg-red-500/10 rounded p-1.5">
            <div className="text-red-400 font-bold text-sm">{stats.avoidCount}</div>
            <div className="text-[9px] text-red-400/70">AVOID</div>
          </div>
        </div>
      </div>
      
      {/* Search */}
      <div className="p-2 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            type="text"
            placeholder="Search"
            className="h-8 pl-8 pr-2 text-xs bg-white/5 border-white/10 focus:border-cyan-500/50"
          />
        </div>
      </div>
      
      {/* Nav Items */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <Link href="/guardian-screener">
          <div className="flex items-center gap-2 px-3 py-2 text-white/80 hover:bg-white/5 hover:text-white cursor-pointer">
            <Star className="w-4 h-4" />
            <span className="text-xs font-medium">Watchlist</span>
            {watchlistedTokens.length > 0 && (
              <span className="ml-auto text-[10px] bg-white/10 px-1.5 rounded">{watchlistedTokens.length}</span>
            )}
          </div>
        </Link>
        <Link href="/strike-agent">
          <div className="flex items-center gap-2 px-3 py-2 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer">
            <Crosshair className="w-4 h-4" />
            <span className="text-xs font-medium">Strike Agent</span>
            <span className="ml-auto text-[9px] bg-cyan-500/20 px-1.5 rounded text-cyan-400">AI</span>
          </div>
        </Link>
        <Link href="/guardian-screener">
          <div className="flex items-center gap-2 px-3 py-2 text-white/80 hover:bg-white/5 hover:text-white cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="text-xs font-medium">Alerts</span>
          </div>
        </Link>
        <Link href="/guardian-screener">
          <div className="flex items-center gap-2 px-3 py-2 text-white/80 hover:bg-white/5 hover:text-white cursor-pointer">
            <LayoutGrid className="w-4 h-4" />
            <span className="text-xs font-medium">Multicharts</span>
          </div>
        </Link>
        <div className="h-px bg-white/5 my-2" />
        <Link href="/guardian-screener?filter=new">
          <div className="flex items-center gap-2 px-3 py-2 text-white/80 hover:bg-white/5 hover:text-white cursor-pointer">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">New Pairs</span>
          </div>
        </Link>
        <Link href="/guardian-screener?filter=gainers">
          <div className="flex items-center gap-2 px-3 py-2 text-white/80 hover:bg-white/5 hover:text-white cursor-pointer">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Gainers & Losers</span>
          </div>
        </Link>
        <div className="h-px bg-white/5 my-2" />
        <Link href="/pulse">
          <div className="flex items-center gap-2 px-3 py-2 text-purple-400 hover:bg-purple-500/10 cursor-pointer">
            <Brain className="w-4 h-4" />
            <span className="text-xs font-medium">Pulse AI</span>
            <span className="ml-auto text-[9px] bg-purple-500/20 px-1.5 rounded text-purple-400">ML</span>
          </div>
        </Link>
        <Link href="/guardian-shield">
          <div className="flex items-center gap-2 px-3 py-2 text-white/80 hover:bg-white/5 hover:text-white cursor-pointer">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">Guardian Shield</span>
          </div>
        </Link>
        <Link href="/portfolio">
          <div className="flex items-center gap-2 px-3 py-2 text-white/80 hover:bg-white/5 hover:text-white cursor-pointer">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium">Portfolio</span>
          </div>
        </Link>
      </nav>
      
      {/* Watchlist Preview */}
      <div className="border-t border-white/5 p-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[10px] font-medium text-white/50 uppercase tracking-wide">Quick Watch</span>
        </div>
        <div className="max-h-32 overflow-y-auto">
          {watchlistedTokens.length === 0 ? (
            <div className="text-[10px] text-white/30 px-2 py-3 text-center">
              Star tokens to add here
            </div>
          ) : (
            watchlistedTokens.slice(0, 5).map(t => (
              <div 
                key={t.id} 
                className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"
                onClick={() => onSelectToken(t)}
              >
                <img src={t.logo} alt="" className="w-4 h-4 rounded-full" />
                <span className="text-[11px] text-white/70 flex-1">{t.symbol}</span>
                <PriceChange value={t.priceChange1h} className="text-[10px]" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuardianScreener() {
  const [selectedChain, setSelectedChain] = useState("solana");
  const [activeTimeFilter, setActiveTimeFilter] = useState("24h");
  const [rankBy, setRankBy] = useState("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState("trending");
  const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const existingManifest = document.querySelector('link[rel="manifest"]');
    const guardianManifest = document.createElement('link');
    guardianManifest.rel = 'manifest';
    guardianManifest.href = '/manifest-guardian.webmanifest';
    if (existingManifest) existingManifest.remove();
    document.head.appendChild(guardianManifest);

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', '#06b6d4');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/guardian-screener-sw.js', { scope: '/guardian-screener' }).catch(() => {});
    }

    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => {
      clearTimeout(timer);
      if (existingManifest) document.head.appendChild(existingManifest);
      guardianManifest.remove();
      if (themeColor) themeColor.setAttribute('content', '#00ffff');
    };
  }, []);
  
  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIos) {
        alert('To install: tap the Share button in Safari, then "Add to Home Screen"');
      }
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Contract address search state
  const [contractSearch, setContractSearch] = useState("");
  const [isSearchingContract, setIsSearchingContract] = useState(false);
  const [contractSearchError, setContractSearchError] = useState<string | null>(null);
  
  // Trading state
  const [tradingToken, setTradingToken] = useState<Token | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  
  // Handle contract address search
  const handleContractSearch = async () => {
    if (!contractSearch.trim()) return;
    
    setIsSearchingContract(true);
    setContractSearchError(null);
    
    try {
      // Detect chain from address format
      let detectedChain = 'ethereum';
      if (contractSearch.length >= 32 && !contractSearch.startsWith('0x')) {
        detectedChain = 'solana';
      } else if (contractSearch.startsWith('0x') && contractSearch.length === 42) {
        detectedChain = selectedChain !== 'all' ? selectedChain : 'ethereum';
      }
      
      // Try to fetch token by contract address
      const response = await fetch(`/api/guardian-screener/contract/${detectedChain}/${contractSearch}`);
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          // Navigate to token detail
          window.location.href = `/guardian-screener/${detectedChain}/${data.token.symbol}`;
          return;
        }
      }
      
      // Fallback: search in current tokens
      const found = tokens.find(t => 
        t.contractAddress.toLowerCase() === contractSearch.toLowerCase() ||
        t.pairAddress.toLowerCase() === contractSearch.toLowerCase()
      );
      
      if (found) {
        window.location.href = `/guardian-screener/${found.chain}/${found.symbol}`;
      } else {
        setContractSearchError('Token not found. Try a different address or chain.');
      }
    } catch {
      setContractSearchError('Failed to search. Please try again.');
    } finally {
      setIsSearchingContract(false);
    }
  };

  const { connected } = useGuardianWS({ 
    chains: selectedChain === 'all' ? ['all'] : [selectedChain],
    enabled: true 
  });

  const totalVolume = useMemo(() => tokens.reduce((acc, t) => acc + t.volume24h, 0), [tokens]);
  const totalTxns = useMemo(() => tokens.reduce((acc, t) => acc + t.txns, 0), [tokens]);
  
  const aiStats = useMemo(() => ({
    snipeCount: tokens.filter(t => t.aiRecommendation === 'snipe').length,
    watchCount: tokens.filter(t => t.aiRecommendation === 'watch').length,
    avoidCount: tokens.filter(t => t.aiRecommendation === 'avoid').length,
  }), [tokens]);

  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoading(true);
      try {
        const chainParam = selectedChain === 'darkwave' ? '' : selectedChain;
        const url = `/api/guardian-screener/tokens?chain=${chainParam}&filter=trending`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.tokens && data.tokens.length > 0) {
          const transformed: Token[] = data.tokens.map((t: any, i: number) => {
            const guardianScore = t.guardianScore || 50;
            const safetyGrade = guardianScore >= 80 ? 'A' : guardianScore >= 60 ? 'B' : guardianScore >= 40 ? 'C' : guardianScore >= 20 ? 'D' : 'F';
            
            return {
              id: t.id,
              rank: i + 1,
              name: t.name || 'Unknown',
              symbol: t.symbol || 'UNK',
              logo: t.imageUrl || `https://ui-avatars.com/api/?name=${t.symbol}&background=0D0D12&color=fff&rounded=true&font-size=0.45`,
              contractAddress: t.contractAddress || '',
              pairAddress: t.pairAddress || '',
              chain: t.chain || selectedChain,
              chainIcon: CHAINS.find(c => c.id === (t.chain || selectedChain))?.icon || "‚‚Äîé",
              dex: t.dex || 'DEX',
              dexShort: t.dexShort || 'DEX',
              price: t.price || 0,
              priceUsd: formatPrice(t.price || 0),
              age: t.ageHours < 1 ? `${Math.floor((t.ageHours || 0) * 60)}m` : 
                   t.ageHours < 24 ? `${Math.floor(t.ageHours)}h` : 
                   `${Math.floor(t.ageHours / 24)}d`,
              ageMinutes: (t.ageHours || 0) * 60,
              txns: (t.txns24h?.buys || 0) + (t.txns24h?.sells || 0),
              buys: t.txns24h?.buys || 0,
              sells: t.txns24h?.sells || 0,
              volume24h: t.volume24h || 0,
              makers: t.makers || 0,
              priceChange5m: t.priceChange5m || 0,
              priceChange1h: t.priceChange1h || 0,
              priceChange6h: t.priceChange6h || 0,
              priceChange24h: t.priceChange24h || 0,
              liquidity: t.liquidity || 0,
              marketCap: t.marketCap || t.fdv || 0,
              guardianScore,
              boosts: t.boosts || 0,
              isWatchlisted: false,
              aiRecommendation: t.aiRecommendation || 'watch',
              aiScore: t.aiScore || 50,
              mlPrediction: t.mlPrediction || {
                direction: 'neutral' as const,
                confidence: 50,
                accuracy: 55,
                shortTerm: { direction: 'up' as const, percent: 0 },
                longTerm: { direction: 'up' as const, percent: 0 },
              },
              safety: t.safety || {
                honeypotRisk: false,
                mintAuthority: false,
                freezeAuthority: false,
                liquidityLocked: false,
                holderCount: 0,
                whaleConcentration: 0,
                botActivity: 0,
                safetyScore: guardianScore,
                safetyGrade,
                risks: [],
                warnings: [],
              },
              category: t.category || 'other',
            };
          });
          setTokens(transformed);
        } else {
          setTokens([]);
        }
      } catch {
        setTokens([]);
      }
      setIsLoading(false);
    };
    
    fetchTokens();
  }, [selectedChain]);

  const filteredTokens = useMemo(() => {
    let result = [...tokens];
    
    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(t => t.category === selectedCategory);
    }
    
    // Filter by new pairs (last 24 hours)
    if (activeFilter === 'new') {
      result = result.filter(t => t.ageMinutes <= 1440); // 24 hours
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(t => 
        t.symbol.toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query) ||
        t.contractAddress.toLowerCase().includes(query)
      );
    }
    
    // Sorting
    switch (rankBy) {
      case "volume": result.sort((a, b) => b.volume24h - a.volume24h); break;
      case "gainers": result.sort((a, b) => b.priceChange24h - a.priceChange24h); break;
      case "losers": result.sort((a, b) => a.priceChange24h - b.priceChange24h); break;
      case "newest": result.sort((a, b) => a.ageMinutes - b.ageMinutes); break;
      case "score": result.sort((a, b) => b.guardianScore - a.guardianScore); break;
      case "ai": result.sort((a, b) => b.aiScore - a.aiScore); break;
      case "txns": result.sort((a, b) => b.txns - a.txns); break;
      case "liquidity": result.sort((a, b) => b.liquidity - a.liquidity); break;
      case "mcap": result.sort((a, b) => b.marketCap - a.marketCap); break;
      case "5m": result.sort((a, b) => b.priceChange5m - a.priceChange5m); break;
      case "1h": result.sort((a, b) => b.priceChange1h - a.priceChange1h); break;
      case "6h": result.sort((a, b) => b.priceChange6h - a.priceChange6h); break;
      default: result.sort((a, b) => (b.volume24h * Math.abs(b.priceChange6h)) - (a.volume24h * Math.abs(a.priceChange6h)));
    }
    
    return result.map((t, i) => ({ ...t, rank: i + 1 }));
  }, [tokens, searchQuery, rankBy, selectedCategory, activeFilter]);

  const watchlistedTokens = useMemo(() => tokens.filter(t => t.isWatchlisted), [tokens]);

  const toggleWatchlist = (id: string) => {
    setTokens(prev => prev.map(t => t.id === id ? { ...t, isWatchlisted: !t.isWatchlisted } : t));
  };

  const selectedChainData = CHAINS.find(c => c.id === selectedChain);
  const selectedSortData = SORT_OPTIONS.find(s => s.id === rankBy);

  return (
    <>
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a14]"
          data-testid="guardian-splash-screen"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <img src="/icons/guardian-screener-icon-512.png" alt="Guardian Screener" className="w-28 h-28 rounded-3xl shadow-2xl shadow-cyan-500/30" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-3 border-2 border-cyan-500/30 rounded-full border-t-cyan-400"
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white tracking-wider">GUARDIAN SCREENER</h1>
              <p className="text-xs text-cyan-400/70 mt-1 tracking-widest uppercase">by DarkWave Studios</p>
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 160 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="h-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 rounded-full"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <div className="min-h-screen bg-[#0a0a0a] flex pt-14">
      {/* Left Sidebar */}
      <LeftSidebar 
        watchlistedTokens={watchlistedTokens} 
        onSelectToken={(t) => setExpandedTokenId(expandedTokenId === t.id ? null : t.id)}
        stats={aiStats}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Stats Bar */}
        <div className="bg-[#0d0d0d] border-b border-white/5 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">24H VOLUME:</span>
              <span className="text-sm font-bold text-white">${formatNumber(totalVolume * 50)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">24H TXNS:</span>
              <span className="text-sm font-bold text-white">{formatCompact(totalTxns * 100)}</span>
            </div>
            <div className="hidden md:flex items-center gap-4 border-l border-white/10 pl-4">
              <div className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">{aiStats.snipeCount} Snipe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-yellow-400 font-medium">{aiStats.watchCount} Watch</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-400 font-medium">{aiStats.avoidCount} Avoid</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'} text-[10px] px-2 py-0.5`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
              {connected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </div>
        </div>
        
        {/* Mobile Header */}
        <div className="lg:hidden bg-[#0d0d0d] border-b border-white/5 px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">GUARDIAN</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded">
              <Crosshair className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">{aiStats.snipeCount}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded">
              <Eye className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-medium">{aiStats.watchCount}</span>
            </div>
            <Badge className={`${connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'} text-[10px] px-2 py-0.5`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1 inline-block ${connected ? 'bg-emerald-400' : 'bg-white/30'}`} />
              {connected ? 'LIVE' : ''}
            </Badge>
          </div>
        </div>
        
        {/* Filters Bar - Horizontally scrollable on mobile */}
        <div className="bg-[#0d0d0d] border-b border-white/5 px-3 md:px-4 py-2 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 md:gap-3 min-w-max">
          {/* Chain Selector */}
          <div className="relative">
            <button
              onClick={() => setShowChainDropdown(!showChainDropdown)}
              className="flex items-center gap-1.5 px-3 py-2.5 md:py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 min-h-[44px] md:min-h-0"
              data-testid="chain-selector"
            >
              <span>{selectedChainData?.icon}</span>
              <span>{selectedChainData?.short}</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/50" />
            </button>
            <AnimatePresence>
              {showChainDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 top-full mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl min-w-[140px] py-1"
                >
                  {CHAINS.map(chain => (
                    <button
                      key={chain.id}
                      onClick={() => { setSelectedChain(chain.id); setShowChainDropdown(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${
                        selectedChain === chain.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/70 hover:bg-white/5'
                      }`}
                    >
                      <span>{chain.icon}</span>
                      <span>{chain.short}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Trending Button */}
          <button 
            onClick={() => { setActiveFilter("trending"); setRankBy("trending"); }}
            className={`flex items-center gap-1.5 px-3 py-2.5 md:py-1.5 rounded-lg text-xs font-medium min-h-[44px] md:min-h-0 ${
              activeFilter === "trending" 
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Trending
          </button>

          {/* Time Filters */}
          <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5">
            {TIME_FILTERS.map(tf => (
              <button
                key={tf.id}
                onClick={() => setActiveTimeFilter(tf.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  activeTimeFilter === tf.id 
                    ? 'bg-cyan-500 text-white' 
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Quick Filters */}
          <button 
            onClick={() => { setActiveFilter("ai"); setRankBy("ai"); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              activeFilter === "ai" ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            AI Score
          </button>
          <button 
            onClick={() => { setActiveFilter("gainers"); setRankBy("gainers"); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              activeFilter === "gainers" ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Gainers
          </button>
          <button 
            onClick={() => { setActiveFilter("new"); setRankBy("newest"); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              activeFilter === "new" ? 'bg-purple-500/20 text-purple-400' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            New
          </button>

          <div className="hidden md:block flex-1" />

          {/* Rank By Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
              data-testid="sort-selector"
            >
              <span>Rank by:</span>
              <span className="text-white">{selectedSortData?.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/50" />
            </button>
            <AnimatePresence>
              {showSortDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl min-w-[160px] py-1"
                >
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setRankBy(opt.id); setShowSortDropdown(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${
                        rankBy === opt.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/70 hover:bg-white/5'
                      }`}
                    >
                      <opt.icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search */}
          <div className="relative w-32 md:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 md:h-8 pl-8 pr-3 text-xs bg-white/5 border-white/10 focus:border-cyan-500/50"
              data-testid="search-input"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => {
              setIsLoading(true);
              const chainParam = selectedChain === 'darkwave' ? '' : selectedChain;
              fetch(`/api/guardian-screener/tokens?chain=${chainParam}&filter=trending`)
                .then(r => r.json())
                .then(data => {
                  if (data.tokens && data.tokens.length > 0) {
                    const guardianScoreCalc = (s: number) => s >= 80 ? 'A' : s >= 60 ? 'B' : s >= 40 ? 'C' : s >= 20 ? 'D' : 'F';
                    setTokens(data.tokens.map((t: any, i: number) => {
                      const gs = t.guardianScore || 50;
                      return {
                        id: t.id, rank: i + 1, name: t.name || 'Unknown', symbol: t.symbol || 'UNK',
                        logo: t.imageUrl || `https://ui-avatars.com/api/?name=${t.symbol}&background=0D0D12&color=fff&rounded=true&font-size=0.45`,
                        contractAddress: t.contractAddress || '', pairAddress: t.pairAddress || '',
                        chain: t.chain || selectedChain, chainIcon: CHAINS.find(c => c.id === (t.chain || selectedChain))?.icon || "‚‚Äîé",
                        dex: t.dex || 'DEX', dexShort: t.dexShort || 'DEX', price: t.price || 0, priceUsd: formatPrice(t.price || 0),
                        age: (t.ageHours || 0) < 1 ? `${Math.floor((t.ageHours || 0) * 60)}m` : (t.ageHours || 0) < 24 ? `${Math.floor(t.ageHours)}h` : `${Math.floor(t.ageHours / 24)}d`,
                        ageMinutes: (t.ageHours || 0) * 60, txns: (t.txns24h?.buys || 0) + (t.txns24h?.sells || 0),
                        buys: t.txns24h?.buys || 0, sells: t.txns24h?.sells || 0, volume24h: t.volume24h || 0,
                        makers: t.makers || 0, priceChange5m: t.priceChange5m || 0, priceChange1h: t.priceChange1h || 0,
                        priceChange6h: t.priceChange6h || 0, priceChange24h: t.priceChange24h || 0,
                        liquidity: t.liquidity || 0, marketCap: t.marketCap || t.fdv || 0, guardianScore: gs,
                        boosts: t.boosts || 0, isWatchlisted: false, aiRecommendation: t.aiRecommendation || 'watch',
                        aiScore: t.aiScore || 50, mlPrediction: t.mlPrediction || { direction: 'neutral', confidence: 50, accuracy: 55, shortTerm: { direction: 'up', percent: 0 }, longTerm: { direction: 'up', percent: 0 } },
                        safety: t.safety || { honeypotRisk: false, mintAuthority: false, freezeAuthority: false, liquidityLocked: false, holderCount: 0, whaleConcentration: 0, botActivity: 0, safetyScore: gs, safetyGrade: guardianScoreCalc(gs), risks: [], warnings: [] },
                        category: t.category || 'other',
                      };
                    }));
                  }
                })
                .catch(() => {})
                .finally(() => setIsLoading(false));
            }}
            className="p-2.5 md:p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
            data-testid="refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          </div>
        </div>

        {/* Contract Address Search */}
        <div className="px-3 py-2 border-b border-white/5 bg-slate-900/30">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                type="text"
                placeholder="Search by contract address (0x... or Solana address)"
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleContractSearch()}
                className="h-10 pl-10 pr-3 text-sm bg-slate-800/50 border-white/10 focus:border-cyan-500/50 font-mono"
                data-testid="contract-search-input"
              />
            </div>
            <button
              onClick={handleContractSearch}
              disabled={isSearchingContract || !contractSearch.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
              data-testid="contract-search-btn"
            >
              {isSearchingContract ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Target className="w-4 h-4" />
              )}
              Lookup
            </button>
          </div>
          {contractSearchError && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {contractSearchError}
            </p>
          )}
        </div>

        {/* Category Filters */}
        <div className="px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-[10px] text-white/40 uppercase tracking-wider mr-1">Category:</span>
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[36px] ${
                  selectedCategory === cat.id 
                    ? `${cat.color} border border-white/20 text-white` 
                    : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                }`}
                data-testid={`category-${cat.id}`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#0d0d0d] border-b border-white/10 z-10">
              <tr className="text-[10px] uppercase tracking-wider text-white/40">
                <th className="pl-2 pr-1 py-2 font-medium w-6"></th>
                <th className="pr-2 py-2 font-medium w-8">#</th>
                <th className="py-2 pr-3 font-medium min-w-[180px]">TOKEN</th>
                <th className="py-2 pr-3 font-medium">AI</th>
                <th className="py-2 pr-3 font-medium hidden xl:table-cell">ML</th>
                <th className="py-2 pr-4 font-medium text-right">PRICE</th>
                <th className="py-2 pr-4 font-medium text-right hidden lg:table-cell">AGE</th>
                <th className="py-2 pr-4 font-medium text-right hidden lg:table-cell">TXNS</th>
                <th className="py-2 pr-4 font-medium text-right">VOLUME</th>
                <th className="py-2 pr-4 font-medium text-center hidden xl:table-cell w-[120px]">CHART</th>
                <th className="py-2 pr-4 font-medium text-right hidden xl:table-cell">5M</th>
                <th className="py-2 pr-4 font-medium text-right">1H</th>
                <th className="py-2 pr-4 font-medium text-right hidden lg:table-cell">6H</th>
                <th className="py-2 pr-4 font-medium text-right hidden xl:table-cell">LIQUIDITY</th>
                <th className="py-2 pr-3 font-medium">SCORE</th>
                <th className="py-2 pr-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="pl-2 pr-1 py-3 w-6"><Skeleton className="h-4 w-4 rounded-sm bg-white/5" /></td>
                    <td className="pr-2 py-3 w-8"><Skeleton className="h-4 w-4 bg-white/5" /></td>
                    <td className="py-3 pr-3 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-7 w-7 rounded-full bg-white/5 flex-shrink-0" />
                        <div className="space-y-1 w-full max-w-[120px]">
                          <Skeleton className="h-3 w-full bg-white/5" />
                          <Skeleton className="h-2 w-2/3 bg-white/5" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3"><Skeleton className="h-5 w-16 rounded-full bg-white/5" /></td>
                    <td className="py-3 pr-3 hidden xl:table-cell"><Skeleton className="h-5 w-12 rounded-full bg-white/5" /></td>
                    <td className="py-3 pr-4 text-right"><Skeleton className="h-4 w-16 ml-auto bg-white/5" /></td>
                    <td className="py-3 pr-4 text-right hidden lg:table-cell"><Skeleton className="h-4 w-10 ml-auto bg-white/5" /></td>
                    <td className="py-3 pr-4 text-right hidden lg:table-cell"><Skeleton className="h-4 w-12 ml-auto bg-white/5" /></td>
                    <td className="py-3 pr-4 text-right"><Skeleton className="h-4 w-16 ml-auto bg-white/5" /></td>
                    <td className="py-3 pr-4 hidden xl:table-cell w-[120px]"><Skeleton className="h-6 w-full bg-white/5" /></td>
                    <td className="py-3 pr-4 text-right hidden xl:table-cell"><Skeleton className="h-4 w-12 ml-auto bg-white/5" /></td>
                    <td className="py-3 pr-4 text-right"><Skeleton className="h-4 w-12 ml-auto bg-white/5" /></td>
                    <td className="py-3 pr-4 text-right hidden lg:table-cell"><Skeleton className="h-4 w-12 ml-auto bg-white/5" /></td>
                    <td className="py-3 pr-4 text-right hidden xl:table-cell"><Skeleton className="h-4 w-16 ml-auto bg-white/5" /></td>
                    <td className="py-3 pr-3"><Skeleton className="h-6 w-8 rounded-md bg-white/5" /></td>
                    <td className="py-3 pr-3 w-16">
                      <div className="flex gap-1">
                        <Skeleton className="h-6 w-10 rounded bg-white/5" />
                        <Skeleton className="h-6 w-6 rounded bg-white/5" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredTokens.map(token => (
                  <TokenRow 
                    key={token.id} 
                    token={token}
                    isExpanded={expandedTokenId === token.id}
                    onToggleExpand={() => setExpandedTokenId(expandedTokenId === token.id ? null : token.id)}
                    onToggleWatchlist={toggleWatchlist}
                    onTrade={(t) => { setTradingToken(t); setShowTradeModal(true); }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Trade Modal */}
      <AnimatePresence>
        {showTradeModal && tradingToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowTradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <button
                  onClick={() => setShowTradeModal(false)}
                  className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-slate-700"
                  data-testid="close-trade-modal"
                >
                  <X className="w-4 h-4" />
                </button>
                <QuickTradePanel
                  tokenAddress={tradingToken.contractAddress}
                  tokenSymbol={tradingToken.symbol}
                  tokenName={tradingToken.name}
                  tokenLogo={tradingToken.logo}
                  recommendation={tradingToken.aiRecommendation}
                  aiScore={tradingToken.aiScore}
                  chain={tradingToken.chain}
                  dex={tradingToken.dex}
                  price={tradingToken.price}
                  marketCap={tradingToken.marketCap}
                  liquidity={tradingToken.liquidity}
                  safetyScore={tradingToken.guardianScore}
                  onClose={() => setShowTradeModal(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Mobile Bottom Navigation */}
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
      {/* PWA Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-b border-white/5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white">Install Guardian Screener</p>
                <p className="text-[10px] text-white/50">Get the full app experience</p>
              </div>
              <button
                onClick={handleInstallPWA}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium rounded-lg flex-shrink-0"
                data-testid="install-pwa-banner-btn"
              >
                Install
              </button>
              <button onClick={() => setShowInstallBanner(false)} className="p-1 text-white/40 hover:text-white flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/5"
          >
            <div className="px-3 py-2.5 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type="text"
                  placeholder="Search token name, symbol, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-10 pr-3 text-sm bg-white/5 border-white/10 focus:border-cyan-500/50"
                  data-testid="mobile-search-input"
                  autoFocus
                />
              </div>
              <button onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); }} className="p-2 text-white/50">
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-around px-2 py-1.5">
        <button
          onClick={() => { setActiveFilter("trending"); setRankBy("trending"); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] ${activeFilter === 'trending' ? 'text-cyan-400' : 'text-white/40'}`}
          data-testid="mobile-nav-trending"
        >
          <Flame className="w-5 h-5" />
          <span className="text-[9px] font-medium">Trending</span>
        </button>
        <button
          onClick={() => { setActiveFilter("gainers"); setRankBy("gainers"); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] ${activeFilter === 'gainers' ? 'text-emerald-400' : 'text-white/40'}`}
          data-testid="mobile-nav-gainers"
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[9px] font-medium">Gainers</span>
        </button>
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] ${mobileSearchOpen ? 'text-cyan-400' : 'text-white/40'}`}
          data-testid="mobile-nav-search"
        >
          <Search className="w-5 h-5" />
          <span className="text-[9px] font-medium">Search</span>
        </button>
        <button
          onClick={() => { setActiveFilter("new"); setRankBy("newest"); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] ${activeFilter === 'new' ? 'text-purple-400' : 'text-white/40'}`}
          data-testid="mobile-nav-new"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-medium">New</span>
        </button>
        <button
          onClick={handleInstallPWA}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] text-white/40 hover:text-cyan-400"
          data-testid="mobile-nav-install"
        >
          <Download className="w-5 h-5" />
          <span className="text-[9px] font-medium">Install</span>
        </button>
      </div>
    </div>

    {/* Bottom padding spacer for mobile nav */}
    <div className="lg:hidden h-20" />
    </>
  );
}
