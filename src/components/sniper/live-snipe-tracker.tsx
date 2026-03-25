import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriceSparkline, MiniSparkline } from './price-sparkline';
import { CandleChart } from './candle-chart';
import { 
  Target, Clock, TrendingUp, TrendingDown, Zap, 
  X, ChevronUp, Eye, AlertTriangle, CheckCircle
} from 'lucide-react';

interface ActiveSnipe {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: string;
  entryPrice: number;
  currentPrice: number;
  entryTime: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  buyAmountSol: number;
  status: 'active' | 'pending_exit' | 'stopped_out' | 'take_profit';
  priceHistory: number[];
}

interface LiveSnipeTrackerProps {
  userId: string;
}

export function LiveSnipeTracker({ userId }: LiveSnipeTrackerProps) {
  const [activeSnipes, setActiveSnipes] = useState<ActiveSnipe[]>([]);
  const [expandedSnipe, setExpandedSnipe] = useState<string | null>(null);
  const [showChart, setShowChart] = useState<string | null>(null);

  useEffect(() => {
    const mockSnipes: ActiveSnipe[] = [
      {
        id: '1',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'PEPE',
        tokenName: 'Pepe Token',
        chain: 'Solana',
        entryPrice: 0.00000234,
        currentPrice: 0.00000267,
        entryTime: Date.now() - 1800000,
        stopLossPrice: 0.00000205,
        takeProfitPrice: 0.00000351,
        buyAmountSol: 0.5,
        status: 'active',
        priceHistory: Array.from({ length: 20 }, (_, i) => 
          0.00000234 * (1 + (Math.random() - 0.45) * 0.1 * (i / 20))
        )
      },
      {
        id: '2',
        tokenAddress: 'So11111111111111111111111111111111111111113',
        tokenSymbol: 'BONK',
        tokenName: 'Bonk',
        chain: 'Solana',
        entryPrice: 0.0000000123,
        currentPrice: 0.0000000118,
        entryTime: Date.now() - 3600000,
        stopLossPrice: 0.0000000108,
        takeProfitPrice: 0.0000000166,
        buyAmountSol: 0.25,
        status: 'active',
        priceHistory: Array.from({ length: 20 }, (_, i) => 
          0.0000000123 * (1 + (Math.random() - 0.52) * 0.08 * (i / 20))
        )
      }
    ];
    setActiveSnipes(mockSnipes);

    const interval = setInterval(() => {
      setActiveSnipes(prev => prev.map(snipe => {
        const change = (Math.random() - 0.48) * 0.02;
        const newPrice = snipe.currentPrice * (1 + change);
        const newHistory = [...snipe.priceHistory.slice(1), newPrice];
        
        let newStatus = snipe.status;
        if (newPrice <= snipe.stopLossPrice) {
          newStatus = 'stopped_out';
        } else if (newPrice >= snipe.takeProfitPrice) {
          newStatus = 'take_profit';
        }
        
        return {
          ...snipe,
          currentPrice: newPrice,
          priceHistory: newHistory,
          status: newStatus
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [userId]);

  const formatPrice = (price: number) => {
    if (price < 0.0000001) return price.toExponential(4);
    if (price < 0.0001) return price.toFixed(10);
    if (price < 1) return price.toFixed(8);
    return price.toFixed(4);
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  const getPnL = (snipe: ActiveSnipe) => {
    return ((snipe.currentPrice - snipe.entryPrice) / snipe.entryPrice) * 100;
  };

  const getStatusBadge = (status: ActiveSnipe['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Active</Badge>;
      case 'pending_exit':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending Exit</Badge>;
      case 'stopped_out':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Stopped</Badge>;
      case 'take_profit':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">TP Hit</Badge>;
    }
  };

  if (activeSnipes.length === 0) {
    return (
      <GlassCard glow className="p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Active Snipes</h3>
          <p className="text-sm text-gray-500">
            Set up a snipe from your watchlist to track positions in real-time
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div 
            className="w-3 h-3 rounded-full bg-green-500"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <h3 className="font-semibold text-white">Live Snipes</h3>
          <Badge variant="outline" className="text-xs">
            {activeSnipes.filter(s => s.status === 'active').length} active
          </Badge>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {showChart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {(() => {
              const snipe = activeSnipes.find(s => s.id === showChart);
              if (!snipe) return null;
              return (
                <CandleChart
                  tokenAddress={snipe.tokenAddress}
                  tokenSymbol={snipe.tokenSymbol}
                  chain={snipe.chain}
                  entryPrice={snipe.entryPrice}
                  stopLoss={snipe.stopLossPrice}
                  takeProfit={snipe.takeProfitPrice}
                  onClose={() => setShowChart(null)}
                />
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {activeSnipes.map((snipe) => {
        const pnl = getPnL(snipe);
        const isPositive = pnl >= 0;
        const isExpanded = expandedSnipe === snipe.id;

        return (
          <motion.div
            key={snipe.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassCard 
              glow
              className={`p-4 transition-colors ${
                snipe.status === 'stopped_out' ? 'border-red-500/30' :
                snipe.status === 'take_profit' ? 'border-green-500/30' :
                ''
              }`}
            >
              <div 
                className="cursor-pointer"
                onClick={() => setExpandedSnipe(isExpanded ? null : snipe.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {isPositive ? (
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{snipe.tokenSymbol}</span>
                        {getStatusBadge(snipe.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(snipe.entryTime)}</span>
                        <span className="text-gray-600">•</span>
                        <span>{snipe.chain}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16">
                      <MiniSparkline 
                        data={snipe.priceHistory} 
                        positive={isPositive}
                        width={64}
                        height={24}
                      />
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{pnl.toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-400">
                        ${formatPrice(snipe.currentPrice)}
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronUp className="w-5 h-5 text-gray-400" />
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
                    <div className="pt-3 border-t border-white/10 space-y-4">
                      <PriceSparkline
                        tokenAddress={snipe.tokenAddress}
                        chain={snipe.chain}
                        entryPrice={snipe.entryPrice}
                        currentPrice={snipe.currentPrice}
                        height={60}
                      />

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Entry</div>
                          <div className="text-sm font-mono text-blue-400">
                            ${formatPrice(snipe.entryPrice)}
                          </div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Stop Loss</div>
                          <div className="text-sm font-mono text-red-400">
                            ${formatPrice(snipe.stopLossPrice)}
                          </div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Take Profit</div>
                          <div className="text-sm font-mono text-green-400">
                            ${formatPrice(snipe.takeProfitPrice)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowChart(showChart === snipe.id ? null : snipe.id);
                          }}
                          data-testid={`view-chart-${snipe.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {showChart === snipe.id ? 'Hide Chart' : 'View Chart'}
                        </Button>
                        {snipe.status === 'active' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              data-testid={`close-snipe-${snipe.id}`}
                            >
                              Close Now
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              data-testid={`cancel-snipe-${snipe.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}
