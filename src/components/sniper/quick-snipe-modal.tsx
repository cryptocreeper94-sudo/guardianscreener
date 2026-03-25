import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TradingPreset, TRADING_PRESETS, getPresetById } from '@/config/trading-presets';
import {
  X, Target, Shield, Zap, AlertTriangle, CheckCircle,
  DollarSign, Percent, Clock, TrendingUp, TrendingDown,
  Lock, Unlock, Users, Droplets, Activity, ArrowRight
} from 'lucide-react';

interface QuickSnipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName?: string;
  chain: string;
  currentPrice: number;
  selectedPreset: string;
  onConfirm: (config: SnipeConfig) => void;
  safetyData?: {
    safetyScore: number;
    liquidityUsd: number;
    holderCount: number;
    isHoneypot: boolean;
    liquidityLocked: boolean;
  };
}

interface SnipeConfig {
  tokenAddress: string;
  chain: string;
  buyAmountSol: number;
  slippagePercent: number;
  priorityFeeSol: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  mevProtection: boolean;
  autoSell: boolean;
}

export function QuickSnipeModal({
  isOpen,
  onClose,
  tokenAddress,
  tokenSymbol,
  tokenName,
  chain,
  currentPrice,
  selectedPreset,
  onConfirm,
  safetyData
}: QuickSnipeModalProps) {
  const preset = getPresetById(selectedPreset);
  const [isConfirming, setIsConfirming] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const [config, setConfig] = useState<SnipeConfig>({
    tokenAddress,
    chain,
    buyAmountSol: preset.tradeConfig.buyAmountSol,
    slippagePercent: preset.executionConfig.slippagePercent,
    priorityFeeSol: preset.executionConfig.priorityFeeSol,
    stopLossPercent: preset.tradeConfig.stopLossPercent,
    takeProfitPercent: preset.tradeConfig.takeProfitPercent,
    mevProtection: preset.executionConfig.mevProtection,
    autoSell: preset.executionConfig.autoSell,
  });

  useEffect(() => {
    if (isOpen) {
      setConfig({
        tokenAddress,
        chain,
        buyAmountSol: preset.tradeConfig.buyAmountSol,
        slippagePercent: preset.executionConfig.slippagePercent,
        priorityFeeSol: preset.executionConfig.priorityFeeSol,
        stopLossPercent: preset.tradeConfig.stopLossPercent,
        takeProfitPercent: preset.tradeConfig.takeProfitPercent,
        mevProtection: preset.executionConfig.mevProtection,
        autoSell: preset.executionConfig.autoSell,
      });
      setIsConfirming(false);
      setCountdown(0);
    }
  }, [isOpen, tokenAddress, preset]);

  useEffect(() => {
    if (isConfirming && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [isConfirming, countdown]);

  const handleConfirmClick = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      setCountdown(3);
    } else if (countdown === 0) {
      onConfirm(config);
      onClose();
    }
  };

  const safetyColor = safetyData 
    ? safetyData.safetyScore >= 70 ? 'text-green-400' 
    : safetyData.safetyScore >= 40 ? 'text-yellow-400' 
    : 'text-red-400'
    : 'text-gray-400';

  const formatPrice = (price: number) => {
    if (price < 0.0000001) return price.toExponential(4);
    if (price < 0.0001) return price.toFixed(10);
    if (price < 1) return price.toFixed(8);
    return price.toFixed(4);
  };

  const solPrice = 180;
  const positionValueUsd = config.buyAmountSol * solPrice;
  const stopLossUsd = positionValueUsd * (config.stopLossPercent / 100);
  const takeProfitUsd = positionValueUsd * (config.takeProfitPercent / 100);
  const riskRewardRatio = config.takeProfitPercent / config.stopLossPercent;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <GlassCard glow className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Quick Snipe</h2>
                  <p className="text-xs text-gray-400">Confirm your trade</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-lg font-bold text-white">{tokenSymbol}</span>
                  {tokenName && <span className="text-xs text-gray-400 ml-2">{tokenName}</span>}
                </div>
                <Badge variant="outline">{chain}</Badge>
              </div>
              <div className="text-2xl font-mono text-cyan-400 mb-2">
                ${formatPrice(currentPrice)}
              </div>
              {safetyData && (
                <div className="flex items-center gap-3 text-xs">
                  <span className={safetyColor}>
                    Safety: {safetyData.safetyScore}/100
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">
                    ${(safetyData.liquidityUsd / 1000).toFixed(1)}K Liq
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">
                    {safetyData.holderCount} Holders
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-gray-400 text-sm">Buy Amount</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.buyAmountSol}
                    onChange={e => setConfig({ ...config, buyAmountSol: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 bg-slate-700/50 border border-white/10 rounded text-right text-white text-sm"
                    step="0.1"
                    min="0.01"
                  />
                  <span className="text-white text-sm">SOL</span>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-white">Position Calculator</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Position Value:</span>
                    <span className="ml-1 text-white font-medium">${positionValueUsd.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">R:R Ratio:</span>
                    <span className={`ml-1 font-medium ${riskRewardRatio >= 2 ? 'text-green-400' : riskRewardRatio >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                      1:{riskRewardRatio.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Max Loss:</span>
                    <span className="ml-1 text-red-400 font-medium">-${stopLossUsd.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Max Gain:</span>
                    <span className="ml-1 text-green-400 font-medium">+${takeProfitUsd.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-gray-400 text-sm">Slippage</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.slippagePercent}
                    onChange={e => setConfig({ ...config, slippagePercent: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 bg-slate-700/50 border border-white/10 rounded text-right text-white text-sm"
                    step="1"
                    min="1"
                    max="50"
                  />
                  <span className="text-white text-sm">%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="text-xs text-red-400 mb-1">Stop Loss</div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={config.stopLossPercent}
                      onChange={e => setConfig({ ...config, stopLossPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-slate-700/50 border border-white/10 rounded text-white text-sm"
                      step="1"
                    />
                    <span className="text-red-400 text-sm">%</span>
                  </div>
                </div>
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="text-xs text-green-400 mb-1">Take Profit</div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={config.takeProfitPercent}
                      onChange={e => setConfig({ ...config, takeProfitPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-slate-700/50 border border-white/10 rounded text-white text-sm"
                      step="5"
                    />
                    <span className="text-green-400 text-sm">%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-400 text-sm">MEV Protection</span>
                </div>
                <button
                  onClick={() => setConfig({ ...config, mevProtection: !config.mevProtection })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    config.mevProtection ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    config.mevProtection ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400 text-sm">Auto-Sell on TP/SL</span>
                </div>
                <button
                  onClick={() => setConfig({ ...config, autoSell: !config.autoSell })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    config.autoSell ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    config.autoSell ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {safetyData?.isHoneypot && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400">Warning: Potential honeypot detected!</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 ${
                  isConfirming && countdown > 0 
                    ? 'bg-yellow-500 hover:bg-yellow-600' 
                    : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700'
                }`}
                onClick={handleConfirmClick}
                data-testid="confirm-snipe-btn"
              >
                {isConfirming ? (
                  countdown > 0 ? (
                    <>Confirm ({countdown})</>
                  ) : (
                    <>Execute Snipe</>
                  )
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Snipe {config.buyAmountSol} SOL
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-3">
              Using {preset.name} preset • Priority: {(config.priorityFeeSol * 1000).toFixed(1)} mSOL
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
