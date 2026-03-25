import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MiniSparkline } from './price-sparkline';
import {
  TrendingUp, TrendingDown, Clock, DollarSign,
  ChevronDown, Filter, Download, BarChart3,
  Target, AlertTriangle, CheckCircle, XCircle,
  Calendar, Percent, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

interface Trade {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  chain: string;
  type: 'buy' | 'sell';
  status: 'filled' | 'partial' | 'cancelled' | 'pending';
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  amountUsd: number;
  pnlPercent?: number;
  pnlUsd?: number;
  timestamp: number;
  txHash?: string;
  preset?: string;
  exitReason?: 'take_profit' | 'stop_loss' | 'manual' | 'trailing_stop';
  priceHistory?: number[];
}

interface TradeHistoryProps {
  userId: string;
}

export function TradeHistory({ userId }: TradeHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);

  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: ['trade-history', userId, timeframe],
    queryFn: async () => {
      const mockTrades: Trade[] = [
        {
          id: '1',
          tokenSymbol: 'PEPE',
          tokenName: 'Pepe Token',
          tokenAddress: 'So111...abc',
          chain: 'Solana',
          type: 'sell',
          status: 'filled',
          entryPrice: 0.00000234,
          exitPrice: 0.00000312,
          amount: 0.5,
          amountUsd: 125,
          pnlPercent: 33.3,
          pnlUsd: 41.65,
          timestamp: Date.now() - 3600000,
          txHash: '5abc...xyz',
          preset: 'pathfinder',
          exitReason: 'take_profit',
          priceHistory: Array.from({ length: 15 }, () => Math.random() * 0.00001),
        },
        {
          id: '2',
          tokenSymbol: 'BONK',
          tokenName: 'Bonk',
          tokenAddress: 'So222...def',
          chain: 'Solana',
          type: 'sell',
          status: 'filled',
          entryPrice: 0.0000000150,
          exitPrice: 0.0000000125,
          amount: 0.25,
          amountUsd: 75,
          pnlPercent: -16.7,
          pnlUsd: -12.50,
          timestamp: Date.now() - 7200000,
          txHash: '6def...uvw',
          preset: 'guardian',
          exitReason: 'stop_loss',
          priceHistory: Array.from({ length: 15 }, () => Math.random() * 0.00000002),
        },
        {
          id: '3',
          tokenSymbol: 'WIF',
          tokenName: 'dogwifhat',
          tokenAddress: 'So333...ghi',
          chain: 'Solana',
          type: 'buy',
          status: 'pending',
          entryPrice: 0.00234,
          amount: 0.75,
          amountUsd: 185,
          timestamp: Date.now() - 1800000,
          preset: 'velocity',
          priceHistory: Array.from({ length: 15 }, () => Math.random() * 0.003),
        },
        {
          id: '4',
          tokenSymbol: 'MYRO',
          tokenName: 'Myro',
          tokenAddress: 'So444...jkl',
          chain: 'Solana',
          type: 'sell',
          status: 'filled',
          entryPrice: 0.000456,
          exitPrice: 0.000789,
          amount: 0.5,
          amountUsd: 200,
          pnlPercent: 73.0,
          pnlUsd: 146.00,
          timestamp: Date.now() - 86400000,
          txHash: '7ghi...rst',
          preset: 'velocity',
          exitReason: 'manual',
          priceHistory: Array.from({ length: 15 }, () => Math.random() * 0.001),
        },
      ];
      return mockTrades;
    },
    refetchInterval: 30000,
  });

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      if (filter === 'wins') return (trade.pnlPercent || 0) > 0;
      if (filter === 'losses') return (trade.pnlPercent || 0) < 0;
      return true;
    });
  }, [trades, filter]);

  const stats = useMemo(() => {
    const completedTrades = trades.filter(t => t.status === 'filled' && t.pnlPercent !== undefined);
    const wins = completedTrades.filter(t => (t.pnlPercent || 0) > 0);
    const losses = completedTrades.filter(t => (t.pnlPercent || 0) < 0);
    const totalPnlUsd = completedTrades.reduce((sum, t) => sum + (t.pnlUsd || 0), 0);
    const avgWin = wins.length > 0 
      ? wins.reduce((sum, t) => sum + (t.pnlPercent || 0), 0) / wins.length 
      : 0;
    const avgLoss = losses.length > 0 
      ? losses.reduce((sum, t) => sum + (t.pnlPercent || 0), 0) / losses.length 
      : 0;

    return {
      totalTrades: completedTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: completedTrades.length > 0 
        ? (wins.length / completedTrades.length * 100).toFixed(1) 
        : '0.0',
      totalPnlUsd,
      avgWin: avgWin.toFixed(1),
      avgLoss: avgLoss.toFixed(1),
    };
  }, [trades]);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatPrice = (price: number) => {
    if (price < 0.0000001) return price.toExponential(4);
    if (price < 0.0001) return price.toFixed(10);
    if (price < 1) return price.toFixed(8);
    return price.toFixed(4);
  };

  const getExitReasonBadge = (reason?: string) => {
    switch (reason) {
      case 'take_profit':
        return <Badge className="bg-green-500/20 text-green-400 text-xs">TP</Badge>;
      case 'stop_loss':
        return <Badge className="bg-red-500/20 text-red-400 text-xs">SL</Badge>;
      case 'trailing_stop':
        return <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Trail</Badge>;
      case 'manual':
        return <Badge className="bg-blue-500/20 text-blue-400 text-xs">Manual</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard glow className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalTrades}</div>
            <div className="text-xs text-gray-400">Total Trades</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.winRate}%</div>
            <div className="text-xs text-gray-400">Win Rate</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${stats.totalPnlUsd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.totalPnlUsd >= 0 ? '+' : ''}${stats.totalPnlUsd.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400">Total P&L</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="flex justify-center gap-2">
              <span className="text-green-400 text-sm">+{stats.avgWin}%</span>
              <span className="text-gray-500">/</span>
              <span className="text-red-400 text-sm">{stats.avgLoss}%</span>
            </div>
            <div className="text-xs text-gray-400">Avg W/L</div>
          </div>
        </div>
      </GlassCard>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
          {(['all', 'wins', 'losses'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid={`filter-${f}`}
            >
              {f === 'all' ? 'All' : f === 'wins' ? 'Wins' : 'Losses'}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
          {(['24h', '7d', '30d', 'all'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                timeframe === t
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid={`timeframe-${t}`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-800/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTrades.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-500 mb-3" />
          <p className="text-gray-400">No trades found</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredTrades.map((trade) => {
              const isPositive = (trade.pnlPercent || 0) >= 0;
              const isExpanded = expandedTrade === trade.id;

              return (
                <motion.div
                  key={trade.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <GlassCard 
                    className={`p-3 cursor-pointer transition-colors ${
                      trade.status === 'pending' ? 'border-yellow-500/20' : ''
                    }`}
                  >
                    <div onClick={() => setExpandedTrade(isExpanded ? null : trade.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            trade.status === 'pending' ? 'bg-yellow-500/20' :
                            isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                            {trade.status === 'pending' ? (
                              <Clock className="w-4 h-4 text-yellow-400" />
                            ) : isPositive ? (
                              <ArrowUpRight className="w-4 h-4 text-green-400" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{trade.tokenSymbol}</span>
                              <Badge variant="outline" className="text-[10px]">{trade.chain}</Badge>
                              {trade.preset && (
                                <Badge className="bg-purple-500/20 text-purple-400 text-[10px] capitalize">
                                  {trade.preset}
                                </Badge>
                              )}
                              {getExitReasonBadge(trade.exitReason)}
                            </div>
                            <div className="text-xs text-gray-400">{formatTime(trade.timestamp)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {trade.priceHistory && (
                            <MiniSparkline 
                              data={trade.priceHistory} 
                              positive={isPositive}
                              width={50}
                              height={20}
                            />
                          )}
                          <div className="text-right">
                            {trade.pnlPercent !== undefined ? (
                              <>
                                <div className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                  {isPositive ? '+' : ''}{trade.pnlPercent.toFixed(1)}%
                                </div>
                                <div className={`text-xs ${isPositive ? 'text-green-400/70' : 'text-red-400/70'}`}>
                                  {isPositive ? '+' : ''}${(trade.pnlUsd || 0).toFixed(2)}
                                </div>
                              </>
                            ) : (
                              <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
                            )}
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 mt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-gray-400">Entry:</span>
                              <span className="ml-1 text-white font-mono">${formatPrice(trade.entryPrice)}</span>
                            </div>
                            {trade.exitPrice && (
                              <div>
                                <span className="text-gray-400">Exit:</span>
                                <span className="ml-1 text-white font-mono">${formatPrice(trade.exitPrice)}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-400">Size:</span>
                              <span className="ml-1 text-white">{trade.amount} SOL</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Value:</span>
                              <span className="ml-1 text-white">${trade.amountUsd.toFixed(2)}</span>
                            </div>
                          </div>
                          {trade.txHash && (
                            <div className="mt-2 text-xs">
                              <a 
                                href={`https://solscan.io/tx/${trade.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:underline"
                              >
                                View on Solscan →
                              </a>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
