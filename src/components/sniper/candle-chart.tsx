import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, TrendingUp, TrendingDown, Clock, 
  Maximize2, RefreshCw, Crosshair
} from 'lucide-react';

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandleChartProps {
  tokenAddress: string;
  tokenSymbol: string;
  chain: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  onClose?: () => void;
}

type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h';

export function CandleChart({
  tokenAddress,
  tokenSymbol,
  chain,
  entryPrice,
  stopLoss,
  takeProfit,
  onClose
}: CandleChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>('5m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsLoading(true);
    
    const basePrice = 0.00001;
    const mockCandles: Candle[] = [];
    const now = Date.now();
    const intervalMs = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000
    }[timeframe];

    let price = basePrice;
    for (let i = 50; i >= 0; i--) {
      const volatility = 0.02;
      const trend = Math.sin(i / 10) * 0.01;
      const open = price;
      const change = (Math.random() - 0.5) * volatility + trend;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      mockCandles.push({
        timestamp: now - i * intervalMs,
        open,
        high,
        low,
        close,
        volume: Math.random() * 100000 + 10000
      });
      
      price = close;
    }
    
    setCandles(mockCandles);
    setCurrentPrice(mockCandles[mockCandles.length - 1]?.close || basePrice);
    setIsLoading(false);

    const interval = setInterval(() => {
      setCandles(prev => {
        const lastCandle = prev[prev.length - 1];
        if (!lastCandle) return prev;
        
        const change = (Math.random() - 0.48) * 0.015;
        const newClose = lastCandle.close * (1 + change);
        const newHigh = Math.max(lastCandle.high, newClose);
        const newLow = Math.min(lastCandle.low, newClose);
        
        setCurrentPrice(newClose);
        
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...lastCandle,
          close: newClose,
          high: newHigh,
          low: newLow,
          volume: lastCandle.volume + Math.random() * 1000
        };
        return updated;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [tokenAddress, timeframe]);

  const chartData = useMemo(() => {
    if (candles.length === 0) return null;
    
    const prices = candles.flatMap(c => [c.high, c.low]);
    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);
    
    if (entryPrice) {
      minPrice = Math.min(minPrice, entryPrice);
      maxPrice = Math.max(maxPrice, entryPrice);
    }
    if (stopLoss) {
      minPrice = Math.min(minPrice, stopLoss);
      maxPrice = Math.max(maxPrice, stopLoss);
    }
    if (takeProfit) {
      maxPrice = Math.max(maxPrice, takeProfit);
    }
    
    const padding = (maxPrice - minPrice) * 0.1;
    minPrice -= padding;
    maxPrice += padding;
    const range = maxPrice - minPrice || 1;
    
    return { minPrice, maxPrice, range };
  }, [candles, entryPrice, stopLoss, takeProfit]);

  const priceChange = candles.length >= 2 
    ? ((candles[candles.length - 1].close - candles[0].open) / candles[0].open) * 100 
    : 0;

  const width = 600;
  const height = 300;
  const candleWidth = (width - 60) / candles.length;
  const candleGap = 2;

  const priceToY = (price: number) => {
    if (!chartData) return height / 2;
    return height - 30 - ((price - chartData.minPrice) / chartData.range) * (height - 50);
  };

  const formatPrice = (price: number) => {
    if (price < 0.0001) return price.toExponential(4);
    if (price < 1) return price.toFixed(8);
    return price.toFixed(4);
  };

  const timeframes: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h'];

  return (
    <GlassCard glow className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white">{tokenSymbol}/USD</h3>
              <Badge variant="outline" className="text-xs">
                {chain}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono text-white">
                ${formatPrice(currentPrice)}
              </span>
              <span className={`text-sm flex items-center gap-1 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800/50 rounded-lg p-1">
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  timeframe === tf 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid={`timeframe-${tf}`}
              >
                {tf}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCrosshair(!showCrosshair)}
            className={showCrosshair ? 'text-cyan-400' : ''}
          >
            <Crosshair className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div 
        className="relative bg-slate-900/50 rounded-lg overflow-hidden"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        }}
      >
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <svg 
            width="100%" 
            height={height} 
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {[0.25, 0.5, 0.75].map((pct, i) => {
              const y = height - 30 - pct * (height - 50);
              const price = chartData ? chartData.minPrice + pct * chartData.range : 0;
              return (
                <g key={i}>
                  <line x1="50" y1={y} x2={width} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4,4" />
                  <text x="45" y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">
                    {formatPrice(price)}
                  </text>
                </g>
              );
            })}

            {candles.map((candle, i) => {
              const x = 55 + i * candleWidth;
              const isGreen = candle.close >= candle.open;
              const color = isGreen ? '#10b981' : '#ef4444';
              
              const bodyTop = priceToY(Math.max(candle.open, candle.close));
              const bodyBottom = priceToY(Math.min(candle.open, candle.close));
              const bodyHeight = Math.max(1, bodyBottom - bodyTop);
              const wickTop = priceToY(candle.high);
              const wickBottom = priceToY(candle.low);
              const wickX = x + (candleWidth - candleGap) / 2;
              
              return (
                <g key={i}>
                  <line
                    x1={wickX}
                    y1={wickTop}
                    x2={wickX}
                    y2={wickBottom}
                    stroke={color}
                    strokeWidth="1"
                  />
                  <rect
                    x={x}
                    y={bodyTop}
                    width={candleWidth - candleGap}
                    height={bodyHeight}
                    fill={color}
                    rx="1"
                  />
                </g>
              );
            })}

            {entryPrice && chartData && (
              <g>
                <line
                  x1="50"
                  y1={priceToY(entryPrice)}
                  x2={width}
                  y2={priceToY(entryPrice)}
                  stroke="#60a5fa"
                  strokeWidth="1.5"
                  strokeDasharray="6,3"
                />
                <rect x="50" y={priceToY(entryPrice) - 8} width="45" height="16" fill="#60a5fa" rx="3" />
                <text x="72" y={priceToY(entryPrice) + 4} fill="white" fontSize="9" textAnchor="middle">
                  Entry
                </text>
              </g>
            )}

            {stopLoss && chartData && (
              <g>
                <line
                  x1="50"
                  y1={priceToY(stopLoss)}
                  x2={width}
                  y2={priceToY(stopLoss)}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="6,3"
                />
                <rect x="50" y={priceToY(stopLoss) - 8} width="30" height="16" fill="#ef4444" rx="3" />
                <text x="65" y={priceToY(stopLoss) + 4} fill="white" fontSize="9" textAnchor="middle">
                  SL
                </text>
              </g>
            )}

            {takeProfit && chartData && (
              <g>
                <line
                  x1="50"
                  y1={priceToY(takeProfit)}
                  x2={width}
                  y2={priceToY(takeProfit)}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="6,3"
                />
                <rect x="50" y={priceToY(takeProfit) - 8} width="30" height="16" fill="#10b981" rx="3" />
                <text x="65" y={priceToY(takeProfit) + 4} fill="white" fontSize="9" textAnchor="middle">
                  TP
                </text>
              </g>
            )}

            {showCrosshair && mousePos.x > 50 && mousePos.x < width && mousePos.y > 0 && mousePos.y < height - 30 && (
              <g>
                <line x1={mousePos.x} y1="0" x2={mousePos.x} y2={height - 30} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <line x1="50" y1={mousePos.y} x2={width} y2={mousePos.y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                {chartData && (
                  <rect x={mousePos.x - 35} y={mousePos.y - 10} width="70" height="20" fill="#1e293b" rx="4" />
                )}
                {chartData && (
                  <text x={mousePos.x} y={mousePos.y + 4} fill="white" fontSize="10" textAnchor="middle">
                    {formatPrice(chartData.minPrice + ((height - 30 - mousePos.y) / (height - 50)) * chartData.range)}
                  </text>
                )}
              </g>
            )}
          </svg>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <motion.div 
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span>Live</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Last update: just now</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {entryPrice && (
            <span className="text-blue-400">Entry: ${formatPrice(entryPrice)}</span>
          )}
          {stopLoss && (
            <span className="text-red-400">SL: ${formatPrice(stopLoss)}</span>
          )}
          {takeProfit && (
            <span className="text-green-400">TP: ${formatPrice(takeProfit)}</span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
