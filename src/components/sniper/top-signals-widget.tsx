import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, RefreshCw, Zap, Shield, Flame, 
  Star, ChevronRight, ExternalLink, Activity
} from 'lucide-react';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';

interface TopSignal {
  rank: number;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  chain: string;
  currentPrice: number;
  priceChange24h: number;
  compositeScore: number;
  category: 'blue_chip' | 'defi' | 'meme' | 'dex' | 'new';
  indicators: string[];
  volume24h: number;
  marketCap: number | null;
}

const CHAINS = [
  { id: 'all', label: 'All Chains', icon: '🌐' },
  { id: 'solana', label: 'Solana', icon: '◎' },
  { id: 'ethereum', label: 'Ethereum', icon: 'Ξ' },
  { id: 'base', label: 'Base', icon: '🔵' },
  { id: 'polygon', label: 'Polygon', icon: '🟣' },
  { id: 'arbitrum', label: 'Arbitrum', icon: '🔷' },
  { id: 'bsc', label: 'BSC', icon: '🟡' },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  blue_chip: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Blue Chip' },
  defi: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'DeFi' },
  meme: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Meme' },
  dex: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'DEX' },
  new: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'New' },
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-cyan-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
};

const getScoreBg = (score: number) => {
  if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/30';
  if (score >= 60) return 'bg-cyan-500/20 border-cyan-500/30';
  if (score >= 40) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-red-500/20 border-red-500/30';
};

interface TopSignalsWidgetProps {
  onSelectToken?: (address: string, chain: string) => void;
  onSnipeToken?: (signal: { address: string; symbol: string; name: string; chain: string; price: number }) => void;
}

export function TopSignalsWidget({ onSelectToken, onSnipeToken }: TopSignalsWidgetProps) {
  const [selectedChain, setSelectedChain] = useState('all');
  const [countdown, setCountdown] = useState(60);

  const { data: signals = [], isLoading, refetch, isFetching } = useQuery<TopSignal[]>({
    queryKey: ['top-signals', selectedChain],
    queryFn: async () => {
      const res = await fetch(`/api/strike-agent/top-signals?chain=${selectedChain}`);
      if (!res.ok) throw new Error('Failed to fetch signals');
      return res.json();
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev <= 1 ? 60 : prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isFetching) setCountdown(60);
  }, [isFetching]);

  const formatPrice = (price: number) => {
    if (price < 0.00001) return price.toExponential(2);
    if (price < 1) return price.toFixed(6);
    if (price < 100) return price.toFixed(2);
    return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            AI Top 10 Signals
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">
            Refresh in {countdown}s
          </span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            data-testid="refresh-signals"
          >
            <RefreshCw className={`w-4 h-4 text-white/50 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
        {CHAINS.map((chain) => (
          <button
            key={chain.id}
            onClick={() => setSelectedChain(chain.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-xs transition-all ${
              selectedChain === chain.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
            }`}
            data-testid={`chain-filter-${chain.id}`}
          >
            <span>{chain.icon}</span>
            <span>{chain.label}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-3" />
          <span className="text-sm text-white/40">Analyzing markets...</span>
        </div>
      ) : signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="w-12 h-12 text-white/20 mb-3" />
          <p className="text-sm text-white/40">No signals for this chain</p>
          <p className="text-xs text-white/30">Try selecting a different chain</p>
        </div>
      ) : (
        <div className="space-y-2">
          {signals.slice(0, 10).map((signal, index) => (
            <motion.div
              key={signal.tokenAddress}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div
                onClick={() => onSelectToken?.(signal.tokenAddress, signal.chain)}
                className="cursor-pointer"
                data-testid={`signal-${index}`}
              >
              <GlassCard
                className="p-3 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border ${getScoreBg(signal.compositeScore)} ${getScoreColor(signal.compositeScore)}`}>
                    #{signal.rank}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate">{signal.tokenSymbol}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_STYLES[signal.category].bg} ${CATEGORY_STYLES[signal.category].text}`}>
                        {CATEGORY_STYLES[signal.category].label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 uppercase">
                        {signal.chain}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 truncate">{signal.tokenName}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-white">${formatPrice(signal.currentPrice)}</p>
                    <div className={`flex items-center justify-end gap-1 text-xs ${
                      signal.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {signal.priceChange24h >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {signal.priceChange24h >= 0 ? '+' : ''}{signal.priceChange24h.toFixed(2)}%
                    </div>
                  </div>

                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${getScoreBg(signal.compositeScore)}`}>
                    <span className={`text-lg font-bold ${getScoreColor(signal.compositeScore)}`}>
                      {signal.compositeScore}
                    </span>
                    <span className="text-[8px] text-white/40">SCORE</span>
                  </div>

                  {onSnipeToken && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSnipeToken({
                          address: signal.tokenAddress,
                          symbol: signal.tokenSymbol,
                          name: signal.tokenName,
                          chain: signal.chain,
                          price: signal.currentPrice,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium hover:from-cyan-500/30 hover:to-purple-500/30 transition-all"
                      data-testid={`snipe-signal-${signal.rank}`}
                    >
                      Snipe
                    </button>
                  )}
                  
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>

                {signal.indicators.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
                    {signal.indicators.slice(0, 3).map((indicator, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      >
                        {indicator}
                      </span>
                    ))}
                    {signal.indicators.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                        +{signal.indicators.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </GlassCard>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
