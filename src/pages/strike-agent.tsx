import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Bot, Target, TrendingUp, TrendingDown, Eye, AlertTriangle,
  Shield, Zap, Activity, RefreshCw, Bell, Settings, Filter,
  ChevronDown, ExternalLink, Copy, Check, Home, X, Volume2, VolumeX,
  Sliders, Clock, DollarSign, Percent, Star, StarOff, Play, Pause,
  BarChart3, Users, Droplets, Lock, Unlock, Flame, TrendingUp as Trending,
  ChevronRight, Info, Smartphone, Wallet, Globe, Search, ArrowUpRight, ArrowDownRight,
  ListOrdered, Crosshair, ShieldCheck
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/glass-card";
import { SubscriptionGate } from "@/components/subscription-gate";
import { QuickTradePanel } from "@/components/quick-trade-panel";
import { useSolanaWallet } from "@/hooks/use-solana-wallet";
import { useEthereumWallet } from "@/hooks/use-ethereum-wallet";
import { PresetSelector } from "@/components/sniper/preset-selector";
import { ManualWatchlist } from "@/components/sniper/manual-watchlist";
import { TopSignalsWidget } from "@/components/sniper/top-signals-widget";
import { SafetyReport } from "@/components/sniper/safety-report";
import { LiveSnipeTracker } from "@/components/sniper/live-snipe-tracker";
import { CandleChart } from "@/components/sniper/candle-chart";
import { TradeHistory } from "@/components/sniper/trade-history";
import { QuickSnipeModal } from "@/components/sniper/quick-snipe-modal";

interface MarketData {
  totalMarketCap: number;
  totalMarketCapChange: number;
  totalVolume: number;
  totalVolumeChange: number;
  btcDominance: number;
  fearGreed: number;
  fearGreedLabel: string;
  altcoinSeason: number;
}

interface StrikeRecommendation {
  id: string;
  tokenSymbol: string;
  tokenName: string | null;
  tokenAddress: string;
  priceUsd: string;
  priceSol: string | null;
  marketCapUsd: string | null;
  liquidityUsd: string | null;
  aiRecommendation: 'snipe' | 'watch' | 'avoid';
  aiScore: number;
  aiReasoning: string | null;
  mintAuthorityActive: boolean | null;
  freezeAuthorityActive: boolean | null;
  isHoneypot: boolean | null;
  liquidityLocked: boolean | null;
  createdAt: string;
  tokenAgeMinutes: number | null;
  holderCount: number | null;
  top10HoldersPercent: string | null;
  botPercent: string | null;
  bundlePercent: string | null;
  isPumpFun: boolean | null;
  creatorWalletRisky: boolean | null;
  payloadHash: string | null;
  status: string | null;
}

interface StrikeSettings {
  minScore: number;
  minMarketCap: number;
  maxMarketCap: number;
  refreshInterval: number;
  soundAlerts: boolean;
  pushNotifications: boolean;
  autoRefresh: boolean;
  showAvoid: boolean;
  slippage: number;
  priorityFee: number;
}

const DEFAULT_SETTINGS: StrikeSettings = {
  minScore: 0,
  minMarketCap: 0,
  maxMarketCap: 10000000,
  refreshInterval: 30,
  soundAlerts: false,
  pushNotifications: false,
  autoRefresh: true,
  showAvoid: true,
  slippage: 1,
  priorityFee: 0.0001,
};

const recommendationStyles = {
  snipe: {
    bg: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    icon: Target,
    label: 'SNIPE',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]'
  },
  watch: {
    bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    icon: Eye,
    label: 'WATCH',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]'
  },
  avoid: {
    bg: 'bg-gradient-to-r from-red-500/20 to-rose-500/20',
    border: 'border-red-500/40',
    text: 'text-red-400',
    icon: AlertTriangle,
    label: 'AVOID',
    glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]'
  }
};

function SettingsModal({ open, onClose, settings, onSave }: { 
  open: boolean; 
  onClose: () => void; 
  settings: StrikeSettings;
  onSave: (s: StrikeSettings) => void;
}) {
  const [local, setLocal] = useState(settings);
  
  useEffect(() => {
    setLocal(settings);
  }, [settings, open]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-white/10 max-h-[85vh] overflow-hidden"
      >
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <p className="text-xs text-white/40">Configure Strike Agent</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-5 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              Filters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-2 block">Minimum AI Score ({local.minScore}/100)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={local.minScore}
                  onChange={e => setLocal({ ...local, minScore: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-white/30 mt-1">
                  <span>Show All</span>
                  <span>High Quality Only</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Min Market Cap</label>
                  <select 
                    value={local.minMarketCap}
                    onChange={e => setLocal({ ...local, minMarketCap: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                  >
                    <option value="0">Any</option>
                    <option value="1000">$1K+</option>
                    <option value="10000">$10K+</option>
                    <option value="50000">$50K+</option>
                    <option value="100000">$100K+</option>
                    <option value="500000">$500K+</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Max Market Cap</label>
                  <select 
                    value={local.maxMarketCap}
                    onChange={e => setLocal({ ...local, maxMarketCap: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                  >
                    <option value="100000">$100K</option>
                    <option value="500000">$500K</option>
                    <option value="1000000">$1M</option>
                    <option value="5000000">$5M</option>
                    <option value="10000000">$10M</option>
                    <option value="999999999">Unlimited</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm text-white">Show Avoid Tokens</div>
                  <div className="text-xs text-white/40">Display risky tokens in feed</div>
                </div>
                <button
                  onClick={() => setLocal({ ...local, showAvoid: !local.showAvoid })}
                  className={`w-12 h-7 rounded-full transition-colors ${local.showAvoid ? 'bg-emerald-500' : 'bg-white/20'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${local.showAvoid ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Trading Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-2 block">Slippage Tolerance ({local.slippage}%)</label>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={local.slippage}
                  onChange={e => setLocal({ ...local, slippage: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-white/30 mt-1">
                  <span>0.1%</span>
                  <span>10%</span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-white/50 mb-2 block">Priority Fee (SOL)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0.0001, 0.0005, 0.001, 0.005].map(fee => (
                    <button
                      key={fee}
                      onClick={() => setLocal({ ...local, priorityFee: fee })}
                      className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                        local.priorityFee === fee 
                          ? 'bg-purple-500/30 text-purple-400 border border-purple-500/40' 
                          : 'bg-white/5 text-white/60 border border-white/10'
                      }`}
                    >
                      {fee}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Notifications
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {local.soundAlerts ? <Volume2 className="w-5 h-5 text-amber-400" /> : <VolumeX className="w-5 h-5 text-white/40" />}
                  <div>
                    <div className="text-sm text-white">Sound Alerts</div>
                    <div className="text-xs text-white/40">Play sound for new snipe opportunities</div>
                  </div>
                </div>
                <button
                  onClick={() => setLocal({ ...local, soundAlerts: !local.soundAlerts })}
                  className={`w-12 h-7 rounded-full transition-colors ${local.soundAlerts ? 'bg-amber-500' : 'bg-white/20'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${local.soundAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-white/40" />
                  <div>
                    <div className="text-sm text-white">Push Notifications</div>
                    <div className="text-xs text-white/40">Get alerts when app is closed</div>
                  </div>
                </div>
                <button
                  onClick={() => setLocal({ ...local, pushNotifications: !local.pushNotifications })}
                  className={`w-12 h-7 rounded-full transition-colors ${local.pushNotifications ? 'bg-emerald-500' : 'bg-white/20'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${local.pushNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Refresh
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <RefreshCw className={`w-5 h-5 ${local.autoRefresh ? 'text-cyan-400' : 'text-white/40'}`} />
                  <div>
                    <div className="text-sm text-white">Auto Refresh</div>
                    <div className="text-xs text-white/40">Automatically fetch new tokens</div>
                  </div>
                </div>
                <button
                  onClick={() => setLocal({ ...local, autoRefresh: !local.autoRefresh })}
                  className={`w-12 h-7 rounded-full transition-colors ${local.autoRefresh ? 'bg-cyan-500' : 'bg-white/20'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${local.autoRefresh ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              
              {local.autoRefresh && (
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Refresh Interval</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 60, 120].map(sec => (
                      <button
                        key={sec}
                        onClick={() => setLocal({ ...local, refreshInterval: sec })}
                        className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                          local.refreshInterval === sec 
                            ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/40' 
                            : 'bg-white/5 text-white/60 border border-white/10'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 p-4 flex gap-3">
          <button
            onClick={() => { setLocal(DEFAULT_SETTINGS); }}
            className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-medium text-sm hover:bg-white/10 transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={() => { onSave(local); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm"
          >
            Save Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TokenCard({ rec, expanded, onToggle, isFavorite, onToggleFavorite }: { 
  rec: StrikeRecommendation; 
  expanded: boolean; 
  onToggle: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const style = recommendationStyles[rec.aiRecommendation];
  const Icon = style.icon;
  const [copied, setCopied] = useState(false);
  const [showTradePanel, setShowTradePanel] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(rec.tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tokenAge = () => {
    const created = new Date(rec.createdAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${style.bg} ${style.glow} rounded-2xl border ${style.border} overflow-hidden`}
    >
      <div 
        className="p-4 cursor-pointer active:bg-white/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${style.bg} ${style.border} border relative`}>
              <Icon className={`w-5 h-5 ${style.text}`} />
              {rec.aiRecommendation === 'snipe' && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">${rec.tokenSymbol}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isFavorite ? (
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ) : (
                    <StarOff className="w-4 h-4 text-white/30" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className="truncate max-w-[100px]">
                  {rec.tokenName || rec.tokenAddress.slice(0, 8) + '...'}
                </span>
                <span className="text-white/30">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {tokenAge()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${style.bg} ${style.text} ${style.border} border`}>
              {style.label}
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-white/40" />
              <span className={`text-lg font-bold ${(rec.aiScore || 0) >= 70 ? 'text-emerald-400' : (rec.aiScore || 0) >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {rec.aiScore || 0}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-white/40 uppercase mb-0.5 flex items-center justify-center gap-1">
              <DollarSign className="w-3 h-3" />
              Price
            </div>
            <div className="text-sm font-semibold text-white">
              ${rec.priceUsd ? parseFloat(rec.priceUsd).toFixed(8) : '0.00'}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-white/40 uppercase mb-0.5 flex items-center justify-center gap-1">
              <Trending className="w-3 h-3" />
              MCap
            </div>
            <div className="text-sm font-semibold text-white">
              {rec.marketCapUsd ? `$${(parseFloat(rec.marketCapUsd) / 1000).toFixed(0)}K` : 'N/A'}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-white/40 uppercase mb-0.5 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Safety
            </div>
            <div className={`text-sm font-semibold ${
              rec.isHoneypot ? 'text-red-400' : 
              (rec.mintAuthorityActive === false && rec.freezeAuthorityActive === false) ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {rec.isHoneypot ? 'Risk' : 
               (rec.mintAuthorityActive === false && rec.freezeAuthorityActive === false) ? 'Safe' : 'Check'}
            </div>
          </div>
        </div>
        
        <div className="flex gap-1.5 flex-wrap mt-3">
          {rec.mintAuthorityActive === false && (
            <span className="text-[10px] px-2 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/30 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Mint Off
            </span>
          )}
          {rec.freezeAuthorityActive === false && (
            <span className="text-[10px] px-2 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/30 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Freeze Off
            </span>
          )}
          {rec.liquidityLocked && (
            <span className="text-[10px] px-2 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/30 flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              LP Locked
            </span>
          )}
          {rec.isPumpFun && (
            <span className="text-[10px] px-2 py-1 bg-purple-500/15 text-purple-400 rounded-lg border border-purple-500/30 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Pump.fun
            </span>
          )}
          {rec.isHoneypot && (
            <span className="text-[10px] px-2 py-1 bg-red-500/15 text-red-400 rounded-lg border border-red-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Honeypot
            </span>
          )}
          {rec.creatorWalletRisky && (
            <span className="text-[10px] px-2 py-1 bg-red-500/15 text-red-400 rounded-lg border border-red-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Risky Creator
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-center mt-3">
          <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-white/10">
              {rec.aiReasoning && (
                <div className="mb-4">
                  <div className="text-[10px] text-white/40 uppercase mb-2 flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    AI Analysis
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{rec.aiReasoning}</p>
                </div>
              )}
              
              <div className="mb-4">
                <div className="text-[10px] text-white/40 uppercase mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Advanced Safety Metrics
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {rec.botPercent && (
                    <div className="bg-white/5 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[10px] text-white/50">Bot Activity</span>
                      <span className={`text-xs font-bold ${parseFloat(rec.botPercent) > 30 ? 'text-red-400' : parseFloat(rec.botPercent) > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {parseFloat(rec.botPercent).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {rec.bundlePercent && (
                    <div className="bg-white/5 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[10px] text-white/50">Bundle Txns</span>
                      <span className={`text-xs font-bold ${parseFloat(rec.bundlePercent) > 30 ? 'text-red-400' : parseFloat(rec.bundlePercent) > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {parseFloat(rec.bundlePercent).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {rec.top10HoldersPercent && (
                    <div className="bg-white/5 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[10px] text-white/50">Top 10 Holders</span>
                      <span className={`text-xs font-bold ${parseFloat(rec.top10HoldersPercent) > 70 ? 'text-red-400' : parseFloat(rec.top10HoldersPercent) > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {parseFloat(rec.top10HoldersPercent).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {rec.holderCount && (
                    <div className="bg-white/5 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[10px] text-white/50">Holders</span>
                      <span className={`text-xs font-bold ${rec.holderCount > 100 ? 'text-emerald-400' : rec.holderCount > 30 ? 'text-amber-400' : 'text-red-400'}`}>
                        {rec.holderCount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {rec.liquidityUsd && (
                    <div className="bg-white/5 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[10px] text-white/50">Liquidity</span>
                      <span className={`text-xs font-bold ${parseFloat(rec.liquidityUsd) > 10000 ? 'text-emerald-400' : parseFloat(rec.liquidityUsd) > 1000 ? 'text-amber-400' : 'text-red-400'}`}>
                        ${(parseFloat(rec.liquidityUsd) / 1000).toFixed(1)}K
                      </span>
                    </div>
                  )}
                  {rec.tokenAgeMinutes && (
                    <div className="bg-white/5 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[10px] text-white/50">Token Age</span>
                      <span className="text-xs font-bold text-white">
                        {rec.tokenAgeMinutes < 60 ? `${rec.tokenAgeMinutes}m` : rec.tokenAgeMinutes < 1440 ? `${Math.floor(rec.tokenAgeMinutes / 60)}h` : `${Math.floor(rec.tokenAgeMinutes / 1440)}d`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {rec.payloadHash && (
                <div className="mb-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-2 text-[10px] text-cyan-400">
                    <Shield className="w-3 h-3" />
                    <span className="font-semibold">Verified Prediction</span>
                  </div>
                  <div className="text-[9px] text-cyan-400/60 font-mono mt-1 truncate">
                    Hash: {rec.payloadHash.slice(0, 16)}...{rec.payloadHash.slice(-8)}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-xs text-white/50 truncate font-mono">
                  {rec.tokenAddress}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); copyAddress(); }}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  data-testid="button-copy-address"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/50" />}
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                <a
                  href={`https://dexscreener.com/solana/${rec.tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 py-2.5 bg-white/10 rounded-xl text-xs text-white hover:bg-white/20 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="link-dexscreener"
                >
                  <BarChart3 className="w-4 h-4" />
                  DexScreener
                </a>
                <a
                  href={`https://solscan.io/token/${rec.tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 py-2.5 bg-white/10 rounded-xl text-xs text-white hover:bg-white/20 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="link-solscan"
                >
                  <ExternalLink className="w-4 h-4" />
                  Solscan
                </a>
                <a
                  href={`https://birdeye.so/token/${rec.tokenAddress}?chain=solana`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 py-2.5 bg-white/10 rounded-xl text-xs text-white hover:bg-white/20 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="link-birdeye"
                >
                  <Eye className="w-4 h-4" />
                  Birdeye
                </a>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/coin/${rec.tokenAddress}`}>
                  <a
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 transition-all"
                    onClick={(e) => e.stopPropagation()}
                    data-testid="button-analyze"
                  >
                    <Bot className="w-4 h-4" />
                    Full Analysis
                  </a>
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowTradePanel(!showTradePanel); }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                    rec.aiRecommendation === 'snipe' 
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white' 
                      : rec.aiRecommendation === 'watch'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                      : 'bg-white/10 text-white/60'
                  }`}
                  data-testid="button-trade"
                >
                  <Zap className="w-4 h-4" />
                  {showTradePanel ? 'Close Trade' : 'Trade Now'}
                </button>
              </div>
              
              {/* Multi-Chain Trade Panel */}
              <AnimatePresence>
                {showTradePanel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QuickTradePanel
                      tokenAddress={rec.tokenAddress}
                      tokenSymbol={rec.tokenSymbol}
                      tokenName={rec.tokenName || undefined}
                      recommendation={rec.aiRecommendation}
                      aiScore={rec.aiScore}
                      price={parseFloat(rec.priceUsd)}
                      marketCap={rec.marketCapUsd ? parseFloat(rec.marketCapUsd) : undefined}
                      liquidity={rec.liquidityUsd ? parseFloat(rec.liquidityUsd) : undefined}
                      onClose={() => setShowTradePanel(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type MainTab = 'discover' | 'live' | 'signals' | 'strategy' | 'watchlist' | 'analyze' | 'history';

export default function StrikeAgentPage() {
  const [filter, setFilter] = useState<'all' | 'snipe' | 'watch' | 'avoid' | 'favorites'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('discover');
  const [selectedPreset, setSelectedPreset] = useState<string>('pathfinder');
  const [analyzeAddress, setAnalyzeAddress] = useState<string>('');
  const [snipeModalOpen, setSnipeModalOpen] = useState(false);
  const [snipeTarget, setSnipeTarget] = useState<{
    address: string;
    symbol: string;
    name?: string;
    chain: string;
    price: number;
  } | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('strike-favorites') || '[]');
    } catch { return []; }
  });
  const [settings, setSettings] = useState<StrikeSettings>(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('strike-settings') || '{}') };
    } catch { return DEFAULT_SETTINGS; }
  });
  
  // Multi-wallet support
  const solanaWallet = useSolanaWallet();
  const ethereumWallet = useEthereumWallet();
  
  const hasAnyWallet = !!solanaWallet.wallet || !!ethereumWallet.wallet;
  
  // Get current user ID for watchlist
  const currentUserId = solanaWallet.wallet?.publicKey?.slice(0, 20) || ethereumWallet.wallet?.address?.slice(0, 20) || 'guest';
  
  useEffect(() => {
    localStorage.setItem('strike-favorites', JSON.stringify(favorites));
  }, [favorites]);
  
  useEffect(() => {
    localStorage.setItem('strike-settings', JSON.stringify(settings));
  }, [settings]);
  
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['strike-agent-recommendations-full'],
    queryFn: async () => {
      const res = await fetch('/api/pulse/strike-agent/recommendations?limit=30');
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      return res.json();
    },
    refetchInterval: settings.autoRefresh ? settings.refreshInterval * 1000 : false
  });

  const { data: marketData } = useQuery<MarketData>({
    queryKey: ['strike-market-overview'],
    queryFn: async () => {
      const res = await fetch('/api/pulse/market');
      if (!res.ok) throw new Error('Failed to fetch market');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const market = marketData || {
    totalMarketCap: 2.5e12,
    totalMarketCapChange: 1.5,
    totalVolume: 95e9,
    totalVolumeChange: -2.3,
    btcDominance: 52.4,
    fearGreed: 65,
    fearGreedLabel: 'Greed',
    altcoinSeason: 45,
  };

  const recommendations = (data?.recommendations || []) as StrikeRecommendation[];
  
  const filteredRecs = recommendations.filter(r => {
    if (!settings.showAvoid && r.aiRecommendation === 'avoid') return false;
    if (r.aiScore < settings.minScore) return false;
    const mcap = r.marketCapUsd ? parseFloat(r.marketCapUsd) : 0;
    if (mcap < settings.minMarketCap) return false;
    if (mcap > settings.maxMarketCap) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = r.tokenName?.toLowerCase().includes(q) || false;
      const matchesSymbol = r.tokenSymbol.toLowerCase().includes(q);
      const matchesAddress = r.tokenAddress.toLowerCase().includes(q);
      if (!matchesName && !matchesSymbol && !matchesAddress) return false;
    }
    return true;
  });
  
  const displayRecs = filter === 'all' 
    ? filteredRecs 
    : filter === 'favorites'
    ? filteredRecs.filter(r => favorites.includes(r.id))
    : filteredRecs.filter(r => r.aiRecommendation === filter);

  const counts = {
    all: filteredRecs.length,
    snipe: filteredRecs.filter(r => r.aiRecommendation === 'snipe').length,
    watch: filteredRecs.filter(r => r.aiRecommendation === 'watch').length,
    avoid: filteredRecs.filter(r => r.aiRecommendation === 'avoid').length,
    favorites: filteredRecs.filter(r => favorites.includes(r.id)).length,
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <SubscriptionGate
      requiredPlans={["strike_agent"]}
      productName="Strike Agent"
      productDescription="Solana memecoin sniper with AI risk scoring, honeypot detection, and one-click Phantom wallet integration."
      price="$30"
      checkoutPath="/billing"
      icon={<Target className="w-10 h-10 text-red-400" />}
    >
    <div className="min-h-screen bg-slate-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>
      
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 safe-area-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-purple-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Strike Agent</h1>
              <p className="text-[10px] text-white/40 flex items-center gap-1">
                {settings.autoRefresh && <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />}
                AI Token Discovery
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Wallet Connection Button */}
            <div className="relative">
              <button
                onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  hasAnyWallet 
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' 
                    : 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                }`}
                data-testid="button-wallet-menu"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">
                  {hasAnyWallet ? 'Connected' : 'Connect'}
                </span>
              </button>
              
              <AnimatePresence>
                {walletMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-slate-800 border border-white/10 rounded-xl p-3 shadow-2xl z-50"
                  >
                    <h3 className="text-white font-bold text-sm mb-3">Wallet Connections</h3>
                    
                    {/* Solana (Phantom) */}
                    <div className="mb-3 p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">◎</span>
                          <span className="text-white text-sm font-medium">Phantom (Solana)</span>
                        </div>
                        {solanaWallet.wallet ? (
                          <span className="text-xs text-emerald-400">Connected</span>
                        ) : null}
                      </div>
                      {solanaWallet.wallet ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50 font-mono">
                            {solanaWallet.wallet.publicKey.slice(0, 8)}...{solanaWallet.wallet.publicKey.slice(-6)}
                          </span>
                          <button
                            onClick={() => solanaWallet.disconnect()}
                            className="text-xs text-red-400 hover:underline"
                            data-testid="button-disconnect-phantom"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => solanaWallet.connectPhantom().catch(() => {})}
                          className="w-full py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-bold rounded-lg"
                          data-testid="button-connect-phantom"
                        >
                          Connect Phantom
                        </button>
                      )}
                    </div>
                    
                    {/* EVM (MetaMask) */}
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">Ξ</span>
                          <span className="text-white text-sm font-medium">MetaMask (EVM)</span>
                        </div>
                        {ethereumWallet.wallet ? (
                          <span className="text-xs text-emerald-400">Connected</span>
                        ) : null}
                      </div>
                      {ethereumWallet.wallet ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50 font-mono">
                            {ethereumWallet.wallet.address.slice(0, 8)}...{ethereumWallet.wallet.address.slice(-6)}
                          </span>
                          <button
                            onClick={() => ethereumWallet.disconnect()}
                            className="text-xs text-red-400 hover:underline"
                            data-testid="button-disconnect-metamask"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => ethereumWallet.connectMetaMask().catch(() => {})}
                          className="w-full py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs font-bold rounded-lg"
                          data-testid="button-connect-metamask"
                        >
                          Connect MetaMask
                        </button>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-white/30 mt-3 text-center">
                      Connect wallets to trade directly from signals
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button 
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-5 h-5 text-white ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
            <Link href="/">
              <a className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-colors" data-testid="link-home">
                <Home className="w-5 h-5 text-white" />
              </a>
            </Link>
          </div>
        </div>
        
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {(['all', 'snipe', 'watch', 'avoid', 'favorites'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === f 
                  ? f === 'snipe' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : f === 'watch' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : f === 'avoid' ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : f === 'favorites' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  : 'bg-white/20 text-white border border-white/40'
                  : 'bg-white/5 text-white/60 border border-transparent'
              }`}
              data-testid={`filter-${f}`}
            >
              {f === 'all' && <Filter className="w-4 h-4" />}
              {f === 'snipe' && <Target className="w-4 h-4" />}
              {f === 'watch' && <Eye className="w-4 h-4" />}
              {f === 'avoid' && <AlertTriangle className="w-4 h-4" />}
              {f === 'favorites' && <Star className="w-4 h-4" />}
              <span className="capitalize">{f}</span>
              <span className="text-xs opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
      </header>
      
      <main className="relative z-10 px-4 py-4 pb-28">
        {/* Main Tab Navigation */}
        <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto scrollbar-hide">
          {([
            { id: 'discover' as MainTab, label: 'Discover', icon: Target },
            { id: 'live' as MainTab, label: 'Live', icon: Activity },
            { id: 'signals' as MainTab, label: 'AI Signals', icon: Zap },
            { id: 'strategy' as MainTab, label: 'Strategy', icon: Shield },
            { id: 'watchlist' as MainTab, label: 'Watchlist', icon: ListOrdered },
            { id: 'analyze' as MainTab, label: 'Analyze', icon: ShieldCheck },
            { id: 'history' as MainTab, label: 'History', icon: Clock },
          ]).map(({ id, label, icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                mainTab === id
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
              data-testid={`main-tab-${id}`}
            >
              <TabIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        {mainTab === 'live' && (
          <div className="mb-6 space-y-4">
            <LiveSnipeTracker userId={currentUserId} />
            
            {/* Quick Chart Access */}
            <GlassCard glow className="p-4">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                Quick Chart
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Enter token address to view chart..."
                  value={analyzeAddress || ''}
                  onChange={(e) => setAnalyzeAddress(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50"
                  data-testid="chart-address-input"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnalyzeAddress('')}
                  className="border-white/10"
                >
                  Clear
                </Button>
              </div>
              {analyzeAddress && (
                <CandleChart
                  tokenAddress={analyzeAddress}
                  tokenSymbol={analyzeAddress.slice(0, 6).toUpperCase()}
                  chain={analyzeAddress.startsWith('0x') ? 'Ethereum' : 'Solana'}
                />
              )}
            </GlassCard>
          </div>
        )}
        
        {mainTab === 'signals' && (
          <div className="mb-6">
            <TopSignalsWidget 
              onSelectToken={(address, chain) => {
                setAnalyzeAddress(address);
                setMainTab('analyze');
              }}
              onSnipeToken={(signal) => {
                setSnipeTarget(signal);
                setSnipeModalOpen(true);
              }}
            />
          </div>
        )}
        
        {mainTab === 'strategy' && (
          <div className="mb-6">
            <PresetSelector 
              selectedPreset={selectedPreset}
              onPresetChange={setSelectedPreset}
            />
          </div>
        )}
        
        {mainTab === 'watchlist' && (
          <div className="mb-6">
            <ManualWatchlist 
              userId={currentUserId}
              selectedPreset={selectedPreset}
              walletAddress={solanaWallet.wallet?.publicKey || ethereumWallet.wallet?.address || undefined}
            />
          </div>
        )}
        
        {mainTab === 'analyze' && (
          <div className="mb-6">
            <SafetyReport 
              tokenAddress={analyzeAddress || undefined}
              chain={analyzeAddress?.startsWith('0x') ? 'ethereum' : 'solana'}
            />
          </div>
        )}
        
        {mainTab === 'history' && (
          <div className="mb-6">
            <TradeHistory userId={currentUserId} />
          </div>
        )}
        
        {mainTab === 'discover' && (
          <>
        {/* Market Overview Panel */}
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Fear & Greed */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                market.fearGreed >= 75 ? 'bg-emerald-500/20 text-emerald-400' :
                market.fearGreed >= 55 ? 'bg-amber-500/20 text-amber-400' :
                market.fearGreed >= 45 ? 'bg-white/10 text-white/70' :
                market.fearGreed >= 25 ? 'bg-orange-500/20 text-orange-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {market.fearGreed}
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase">Fear & Greed</p>
                <p className={`text-xs font-semibold ${
                  market.fearGreed >= 55 ? 'text-emerald-400' : market.fearGreed >= 45 ? 'text-white' : 'text-red-400'
                }`}>{market.fearGreedLabel}</p>
              </div>
            </div>
          </div>

          {/* Market Cap */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-3">
            <p className="text-[10px] text-white/40 uppercase">Market Cap</p>
            <p className="text-sm font-bold text-white">${(market.totalMarketCap / 1e12).toFixed(2)}T</p>
            <div className={`flex items-center gap-1 text-[10px] ${market.totalMarketCapChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {market.totalMarketCapChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {market.totalMarketCapChange >= 0 ? '+' : ''}{market.totalMarketCapChange.toFixed(2)}%
            </div>
          </div>

          {/* Volume */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-3">
            <p className="text-[10px] text-white/40 uppercase">24h Volume</p>
            <p className="text-sm font-bold text-white">${(market.totalVolume / 1e9).toFixed(1)}B</p>
            <div className={`flex items-center gap-1 text-[10px] ${market.totalVolumeChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {market.totalVolumeChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {market.totalVolumeChange >= 0 ? '+' : ''}{market.totalVolumeChange.toFixed(2)}%
            </div>
          </div>

          {/* BTC Dominance / Altcoin Season */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-3">
            <p className="text-[10px] text-white/40 uppercase">Altcoin Season</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${market.altcoinSeason >= 75 ? 'bg-emerald-500' : market.altcoinSeason >= 25 ? 'bg-cyan-500' : 'bg-amber-500'}`}
                  style={{ width: `${market.altcoinSeason}%` }}
                />
              </div>
              <span className="text-xs font-bold text-white">{market.altcoinSeason}%</span>
            </div>
            <p className="text-[10px] text-white/40 mt-1">BTC {market.btcDominance.toFixed(1)}%</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search tokens by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
            data-testid="input-search"
          />
        </div>

        {settings.minScore > 0 || settings.minMarketCap > 0 || settings.maxMarketCap < 10000000 ? (
          <div className="mb-4 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center gap-2 text-xs text-cyan-400">
            <Filter className="w-4 h-4" />
            <span>Filters active: </span>
            {settings.minScore > 0 && <span className="bg-cyan-500/20 px-2 py-0.5 rounded">Score ≥{settings.minScore}</span>}
            {settings.minMarketCap > 0 && <span className="bg-cyan-500/20 px-2 py-0.5 rounded">MCap ≥${(settings.minMarketCap/1000).toFixed(0)}K</span>}
            {settings.maxMarketCap < 10000000 && <span className="bg-cyan-500/20 px-2 py-0.5 rounded">MCap ≤${(settings.maxMarketCap/1000000).toFixed(0)}M</span>}
          </div>
        ) : null}
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <span className="text-sm text-white/50">Scanning tokens...</span>
          </div>
        ) : error || displayRecs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Shield className="w-16 h-16 text-emerald-500/30 mb-4" />
            <p className="text-lg text-white/50 mb-2">
              {filter === 'favorites' ? 'No favorites yet' : 'No recommendations'}
            </p>
            <p className="text-sm text-white/30 text-center max-w-xs">
              {filter === 'favorites' 
                ? 'Star tokens to add them to your favorites'
                : 'Strike Agent is actively monitoring the market for opportunities'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayRecs.map((rec) => (
              <TokenCard 
                key={rec.id} 
                rec={rec} 
                expanded={expandedId === rec.id}
                onToggle={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                isFavorite={favorites.includes(rec.id)}
                onToggleFavorite={() => toggleFavorite(rec.id)}
              />
            ))}
          </div>
        )}
        </>
        )}
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        <div className="flex items-center justify-around py-3">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">{counts.snipe} Snipe</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[10px] text-amber-400 font-medium">{counts.watch} Watch</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-[10px] text-red-400 font-medium">{counts.avoid} Avoid</span>
          </div>
          <Link href="/pulse">
            <a className="flex flex-col items-center gap-1" data-testid="link-pulse">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-[10px] text-purple-400 font-medium">Pulse AI</span>
            </a>
          </Link>
        </div>
      </nav>
      
      <AnimatePresence>
        <SettingsModal 
          open={settingsOpen} 
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onSave={setSettings}
        />
      </AnimatePresence>
      
      {snipeTarget && (
        <QuickSnipeModal
          isOpen={snipeModalOpen}
          onClose={() => {
            setSnipeModalOpen(false);
            setSnipeTarget(null);
          }}
          tokenAddress={snipeTarget.address}
          tokenSymbol={snipeTarget.symbol}
          tokenName={snipeTarget.name}
          chain={snipeTarget.chain}
          currentPrice={snipeTarget.price}
          selectedPreset={selectedPreset}
          onConfirm={(config) => {
            console.log('[StrikeAgent] Snipe confirmed:', config);
            setSnipeModalOpen(false);
            setSnipeTarget(null);
          }}
        />
      )}
    </div>
    </SubscriptionGate>
  );
}
