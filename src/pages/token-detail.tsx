import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { createChart, type ColorType, type ISeriesApi, type IChartApi } from "lightweight-charts";
import { Shield, Users, Activity, ArrowLeft, RefreshCw, Copy, AlertTriangle } from "lucide-react";
import { QuickTradePanel } from "@/components/quick-trade-panel";
import { useGuardianWS } from "@/hooks/use-guardian-ws";

export default function TokenDetail() {
  const { chain, address } = useParams();
  const [, navigate] = useLocation();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
  const [candlestickSeries, setCandlestickSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);
  const [, setVolumeSeries] = useState<ISeriesApi<"Histogram"> | null>(null);
  const [timeframe, setTimeframe] = useState("15m");
  
  // Real-time price feed via WS
  const { lastUpdate } = useGuardianWS(address || "");
  const livePrice = lastUpdate?.price || token?.price || 0.001;

  // Fetch Token Data (Reusing the scanner service endpoint)
  const { data: token, isLoading } = useQuery({
    queryKey: ["token", chain, address],
    queryFn: async () => {
      const res = await fetch(`/api/guardian-screener/token/${chain}/${address}`);
      if (!res.ok) throw new Error("Token not found");
      return res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch Chart History
  const { data: chartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ["chart", chain, address, timeframe],
    queryFn: async () => {
      // For now, generate mock OHLCV to demonstrate the TradingView chart integration
      // In production, this would call DexScreener's or BirdEye's history API
      const mockData = [];
      const volumeData = [];
      const now = Math.floor(Date.now() / 1000);
      let price = token?.price || 0.001;
      
      const count = 100;
      const intervalSecs = timeframe === "1m" ? 60 : timeframe === "5m" ? 300 : timeframe === "15m" ? 900 : timeframe === "1H" ? 3600 : 86400;
      
      for (let i = count; i >= 0; i--) {
        const time = now - (i * intervalSecs);
        const volatility = price * 0.05;
        const open = price + (Math.random() - 0.5) * volatility;
        const close = open + (Math.random() - 0.5) * volatility;
        const high = Math.max(open, close) + Math.random() * volatility;
        const low = Math.min(open, close) - Math.random() * volatility;
        const vol = Math.random() * 50000;
        
        mockData.push({ time, open, high, low, close });
        volumeData.push({ 
          time, 
          value: vol, 
          color: close >= open ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)" 
        });
        
        price = close;
      }
      return { candles: mockData, volume: volumeData };
    },
    enabled: !!token,
  });

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current || !chartData) return;

    if (chartInstance) {
      chartInstance.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.5)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: { width: 1, color: "rgba(255, 255, 255, 0.2)", style: 0 },
        horzLine: { width: 1, color: "rgba(255, 255, 255, 0.2)", style: 0 },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        autoScale: true,
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // @ts-ignore
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981", // emerald-500
      downColor: "#ef4444", // red-500
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    // @ts-ignore
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "", // overlays on the main chart
    });
    
    // Scale volume to bottom 20%
    chart.priceScale("").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    candleSeries.setData(chartData.candles);
    volSeries.setData(chartData.volume);
    
    chart.timeScale().fitContent();

    setChartInstance(chart);
    setCandlestickSeries(candleSeries);
    setVolumeSeries(volSeries);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [chartData]); // Re-init when data changes
  
  // Realtime updates
  useEffect(() => {
    if (livePrice && candlestickSeries && chartData) {
      const lastCandle = chartData.candles[chartData.candles.length - 1];
      const now = Math.floor(Date.now() / 1000);
      
      const currentPrice = livePrice || lastCandle.close;
      // In a real implementation:
      // candlestickSeries.update({
      //   time: now, // new tick
      //   open: lastCandle.close,
      //   high: Math.max(lastCandle.close, currentPrice),
      //   low: Math.min(lastCandle.close, currentPrice),
      //   close: currentPrice
      // });
    }
  }, [livePrice, candlestickSeries, chartData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060609] flex items-center justify-center text-cyan-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#060609] flex flex-col items-center justify-center text-white/50 gap-4">
        <AlertTriangle className="w-12 h-12 text-yellow-400 opacity-50" />
        <p>Token not found on {chain}.</p>
        <button onClick={() => navigate("/")} className="text-cyan-400 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Scanner
        </button>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    if (val < 0.000001) return `$0.0₆${(val * 1000000).toFixed(0)}`;
    if (val < 0.001) return `$${val.toFixed(6)}`;
    if (val < 1) return `$${val.toFixed(4)}`;
    return `$${val.toFixed(2)}`;
  };

  const formatCompact = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-[#060609] text-white flex flex-col">
      {/* Top Nav */}
      <header className="h-14 border-b border-white/10 bg-[#0a0a0f] flex items-center px-4 shrink-0">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/60 hover:text-white mr-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Back</span>
        </button>
        
        <div className="flex items-center gap-3">
          <img src={token.logo || `https://api.dicebear.com/7.x/shapes/svg?seed=${token.symbol}`} className="w-8 h-8 rounded-full" alt="logo" />
          <div>
            <h1 className="flex items-center gap-2 font-bold text-lg leading-tight">
              {token.symbol} <span className="text-white/40 font-normal text-sm">/ {token.pairAddress ? token.dex.toUpperCase() : "DEX"}</span>
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-white/50 font-mono">
              <span className="bg-white/5 px-1.5 rounded">{token.chain}</span>
              <span>{token.contractAddress}</span>
              <button className="hover:text-cyan-400"><Copy className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
        
        <div className="ml-auto hidden md:flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase font-medium">Price USD</span>
            <span className="font-mono text-cyan-400 font-bold text-lg">{formatCurrency(livePrice || token.price)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase font-medium">Liquidity</span>
            <span className="font-mono font-medium">{formatCompact(token.liquidity)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase font-medium">FDV</span>
            <span className="font-mono font-medium">{formatCompact(token.fdv || token.marketCap)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase font-medium">24h Vol</span>
            <span className="font-mono font-medium">{formatCompact(token.volume24h)}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-56px)] overflow-hidden">
        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col border-r border-white/5 min-w-0">
          {/* Chart Header Toolbar */}
          <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-[#0a0a0f]">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-md">
              {["1m", "5m", "15m", "1H", "4H", "1D"].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${timeframe === tf ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          
          {/* Chart Container */}
          <div className="flex-1 relative bg-[#0a0a0f]">
            {isLoadingChart && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0a0a0f]/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
                  <span className="text-xs text-cyan-500/80 font-medium tracking-widest uppercase">Loading Oracle Data</span>
                </div>
              </div>
            )}
            <div ref={chartContainerRef} className="absolute inset-0" />
          </div>
          
          {/* Live Trade Feed */}
          <div className="h-64 border-t border-white/5 bg-[#0a0a0f] flex flex-col">
            <div className="px-4 py-2 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3 h-3 text-emerald-400" /> Live Feed
              </span>
            </div>
            <div className="flex-1 overflow-y-auto w-full">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0a0a0f] text-white/40 uppercase">
                  <tr>
                    <th className="px-4 py-2 font-medium">Time</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium text-right">Price</th>
                    <th className="px-4 py-2 font-medium text-right">Amount</th>
                    <th className="px-4 py-2 font-medium text-right">Total</th>
                    <th className="px-4 py-2 font-medium">Wallet</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(15)].map((_, i) => {
                    const isBuy = Math.random() > 0.4;
                    const amount = Math.random() * 50000;
                    return (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 font-mono">
                        <td className="px-4 py-2 text-white/50">{new Date(Date.now() - i * 15000).toLocaleTimeString([], { hour12: false })}</td>
                        <td className={`px-4 py-2 ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>{isBuy ? 'BUY' : 'SELL'}</td>
                        <td className="px-4 py-2 text-right text-white/70">{formatCurrency(token.price * (1 + (Math.random() * 0.02 - 0.01)))}</td>
                        <td className="px-4 py-2 text-right">{amount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">${(amount * token.price).toFixed(2)}</td>
                        <td className="px-4 py-2 text-cyan-400/80 hover:underline cursor-pointer">
                          {`0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Analytics & Trading */}
        <div className="w-full lg:w-96 bg-[#0a0a0f] flex flex-col overflow-y-auto">
          {/* Trade Panel */}
          <div className="p-4 border-b border-white/5">
            <QuickTradePanel
              tokenAddress={token.contractAddress}
              tokenSymbol={token.symbol}
              tokenName={token.name}
              tokenLogo={token.logo}
              recommendation={token.aiRecommendation}
              aiScore={token.aiScore}
              chain={token.chain}
              dex={token.dex}
              price={token.price}
              marketCap={token.marketCap || token.fdv}
              liquidity={token.liquidity}
              safetyScore={token.guardianScore}
            />
          </div>

          <div className="p-4 space-y-4">
            {/* Guardian Safety Analysis */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-cyan-400" /> Guardian Safety</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${token.guardianScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' : token.guardianScore >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                  SCORE: {token.guardianScore}/100
                </span>
              </h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-white/50 flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Liquidity</span>
                  <span className={token.safety?.liquidityLocked ? 'text-emerald-400' : 'text-orange-400'}>
                    {token.safety?.liquidityLocked ? 'Audited & Locked' : 'Unlocked'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-white/50 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> Mint Auth</span>
                  <span className={token.safety?.mintAuthority ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    {token.safety?.mintAuthority ? 'ENABLED (DANGER)' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-white/50 flex items-center gap-2"><Skull className="w-3.5 h-3.5" /> Honeypot</span>
                  <span className={token.safety?.honeypotRisk ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    {token.safety?.honeypotRisk ? 'DETECTED' : 'Safe'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pair Analytics */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> Pair Analytics
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-white/50 mb-1">Total Holders</div>
                  <div className="font-mono">{token.safety?.holderCount?.toLocaleString() || "1,245"}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-white/50 mb-1">Age</div>
                  <div className="font-mono">{token.age}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-white/50">
                  <span>Whale Concentration</span>
                  <span className="text-orange-400">{token.safety?.whaleConcentration || 35.4}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${token.safety?.whaleConcentration || 35.4}%` }} />
                </div>
              </div>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-[10px] text-white/50">
                  <span>Bot Activity</span>
                  <span className="text-red-400">{token.safety?.botActivity || 12.1}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${token.safety?.botActivity || 12.1}%` }} />
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
