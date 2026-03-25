import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface SparklineProps {
  tokenAddress: string;
  chain: string;
  entryPrice?: number;
  currentPrice?: number;
  height?: number;
  showLabels?: boolean;
  className?: string;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

export function PriceSparkline({ 
  tokenAddress, 
  chain, 
  entryPrice,
  currentPrice: initialPrice,
  height = 40,
  showLabels = true,
  className = ''
}: SparklineProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(initialPrice || 0);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const mockPrices: PricePoint[] = [];
    const basePrice = initialPrice || 0.00001;
    const now = Date.now();
    
    for (let i = 30; i >= 0; i--) {
      const volatility = 0.05;
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      mockPrices.push({
        timestamp: now - i * 60000,
        price: basePrice * (1 + randomChange * (30 - i) / 30)
      });
    }
    setPriceHistory(mockPrices);
    setCurrentPrice(mockPrices[mockPrices.length - 1]?.price || basePrice);
    setIsLive(true);

    const interval = setInterval(() => {
      setPriceHistory(prev => {
        const lastPrice = prev[prev.length - 1]?.price || basePrice;
        const change = (Math.random() - 0.48) * 0.03;
        const newPrice = lastPrice * (1 + change);
        setCurrentPrice(newPrice);
        
        const newHistory = [...prev.slice(1), {
          timestamp: Date.now(),
          price: newPrice
        }];
        return newHistory;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [tokenAddress, chain, initialPrice]);

  const { pathD, minPrice, maxPrice, priceChange } = useMemo(() => {
    if (priceHistory.length < 2) return { pathD: '', minPrice: 0, maxPrice: 0, priceChange: 0 };
    
    const prices = priceHistory.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    
    const width = 200;
    const h = height;
    const padding = 2;
    
    const points = priceHistory.map((p, i) => {
      const x = (i / (priceHistory.length - 1)) * width;
      const y = h - padding - ((p.price - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    });
    
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    return {
      pathD: `M ${points.join(' L ')}`,
      minPrice: min,
      maxPrice: max,
      priceChange: change
    };
  }, [priceHistory, height]);

  const isPositive = priceChange >= 0;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const entryPriceY = useMemo(() => {
    if (!entryPrice || !minPrice || !maxPrice) return null;
    const range = maxPrice - minPrice || 1;
    return height - 2 - ((entryPrice - minPrice) / range) * (height - 4);
  }, [entryPrice, minPrice, maxPrice, height]);

  const pnlPercent = entryPrice ? ((currentPrice - entryPrice) / entryPrice) * 100 : null;

  return (
    <div className={`relative ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            {isLive && (
              <motion.div 
                className="w-2 h-2 rounded-full bg-green-500"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            <span className="text-xs text-gray-400">Live</span>
          </div>
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        </div>
      )}
      
      <div className="relative" style={{ height }}>
        <svg 
          viewBox={`0 0 200 ${height}`} 
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`sparkline-gradient-${tokenAddress}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {pathD && (
            <>
              <path
                d={`${pathD} L 200,${height} L 0,${height} Z`}
                fill={`url(#sparkline-gradient-${tokenAddress})`}
              />
              <motion.path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
              />
            </>
          )}
          
          {entryPriceY !== null && (
            <line
              x1="0"
              y1={entryPriceY}
              x2="200"
              y2={entryPriceY}
              stroke="#60a5fa"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.7"
            />
          )}
          
          {priceHistory.length > 0 && (
            <motion.circle
              cx="200"
              cy={height - 2 - ((currentPrice - minPrice) / (maxPrice - minPrice || 1)) * (height - 4)}
              r="4"
              fill={strokeColor}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </svg>
      </div>
      
      {showLabels && entryPrice && pnlPercent !== null && (
        <div className="flex items-center justify-between mt-1 text-xs">
          <span className="text-gray-500">Entry: ${entryPrice.toFixed(8)}</span>
          <span className={pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}>
            P&L: {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}

export function MiniSparkline({ 
  data, 
  width = 60, 
  height = 20,
  positive = true 
}: { 
  data: number[]; 
  width?: number; 
  height?: number;
  positive?: boolean;
}) {
  const pathD = useMemo(() => {
    if (data.length < 2) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((price, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 1 - ((price - min) / range) * (height - 2);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }, [data, width, height]);

  const strokeColor = positive ? '#10b981' : '#ef4444';

  return (
    <svg width={width} height={height} className="inline-block">
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
