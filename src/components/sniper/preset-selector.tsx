import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Check, Shield, Scale, Rocket, DollarSign, Percent, Users, Droplets, Bot, Zap, Lock, Clock, TrendingUp, Activity } from 'lucide-react';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { TRADING_PRESETS, PRESET_ORDER, type TradingPreset } from '@/config/trading-presets';

interface PresetSelectorProps {
  selectedPreset: string;
  onPresetChange: (presetId: string) => void;
}

const presetIcons: Record<string, React.ReactNode> = {
  guardian: <Shield className="w-6 h-6" />,
  pathfinder: <Scale className="w-6 h-6" />,
  velocity: <Rocket className="w-6 h-6" />,
};

export function PresetSelector({ selectedPreset, onPresetChange }: PresetSelectorProps) {
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);

  const toggleExpand = (presetId: string) => {
    setExpandedPreset(expandedPreset === presetId ? null : presetId);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
        Trading Strategy
      </h3>
      
      {PRESET_ORDER.map((presetId) => {
        const preset = TRADING_PRESETS[presetId];
        const isSelected = selectedPreset === presetId;
        const isExpanded = expandedPreset === presetId;
        
        return (
          <motion.div
            key={presetId}
            layout
            className="relative"
          >
            <div
              onClick={() => onPresetChange(presetId)}
              className="cursor-pointer"
              style={{
                borderColor: isSelected ? preset.color : undefined,
                boxShadow: isSelected ? `0 0 20px rgba(${preset.colorRgb}, 0.3)` : undefined,
              }}
              data-testid={`preset-${presetId}`}
            >
            <GlassCard 
              glow={isSelected}
              className={`
                relative overflow-hidden transition-all duration-300
                ${isSelected 
                  ? 'border-2' 
                  : 'border border-white/10 hover:border-white/20'
                }
              `}
            >
              {isSelected && (
                <div 
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: preset.color }}
                >
                  <Check className="w-4 h-4 text-black" />
                </div>
              )}
              
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `rgba(${preset.colorRgb}, 0.2)`, color: preset.color }}
                  >
                    {presetIcons[presetId]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">{preset.icon} {preset.name}</span>
                      {isSelected && (
                        <span 
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `rgba(${preset.colorRgb}, 0.2)`, color: preset.color }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50">{preset.tagline}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(presetId);
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    data-testid={`preset-expand-${presetId}`}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-white/50" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    )}
                  </button>
                </div>
                
                <p className="text-xs text-white/40">{preset.description}</p>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-white/50 uppercase">Trade Config</p>
                            <div className="flex items-center gap-2 text-xs">
                              <DollarSign className="w-3 h-3 text-cyan-400" />
                              <span className="text-white/70">Buy:</span>
                              <span className="text-white font-medium">{preset.tradeConfig.buyAmountSol} SOL</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Percent className="w-3 h-3 text-red-400" />
                              <span className="text-white/70">Stop Loss:</span>
                              <span className="text-red-400 font-medium">-{preset.tradeConfig.stopLossPercent}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Percent className="w-3 h-3 text-emerald-400" />
                              <span className="text-white/70">Take Profit:</span>
                              <span className="text-emerald-400 font-medium">+{preset.tradeConfig.takeProfitPercent}%</span>
                            </div>
                            {preset.tradeConfig.trailingStopEnabled && (
                              <div className="flex items-center gap-2 text-xs">
                                <TrendingUp className="w-3 h-3 text-yellow-400" />
                                <span className="text-white/70">Trail Stop:</span>
                                <span className="text-yellow-400 font-medium">{preset.tradeConfig.trailingStopPercent}%</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-white/50 uppercase">Execution</p>
                            <div className="flex items-center gap-2 text-xs">
                              <Activity className="w-3 h-3 text-orange-400" />
                              <span className="text-white/70">Slippage:</span>
                              <span className="text-white font-medium">{preset.executionConfig.slippagePercent}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Zap className="w-3 h-3 text-yellow-400" />
                              <span className="text-white/70">Priority:</span>
                              <span className="text-white font-medium">{(preset.executionConfig.priorityFeeSol * 1000).toFixed(1)} mSOL</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Shield className="w-3 h-3 text-cyan-400" />
                              <span className="text-white/70">MEV:</span>
                              <Badge className={`text-[9px] ${preset.executionConfig.mevProtection ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {preset.executionConfig.mevProtection ? 'ON' : 'OFF'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-white/50 uppercase">Safety Filters</p>
                            <div className="flex items-center gap-2 text-xs">
                              <Droplets className="w-3 h-3 text-blue-400" />
                              <span className="text-white/70">Min Liq:</span>
                              <span className="text-white font-medium">${(preset.safetyFilters.minLiquidityUsd / 1000).toFixed(0)}K</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Bot className="w-3 h-3 text-amber-400" />
                              <span className="text-white/70">Max Bot:</span>
                              <span className="text-white font-medium">{preset.safetyFilters.maxBotPercent}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Users className="w-3 h-3 text-purple-400" />
                              <span className="text-white/70">Min Holders:</span>
                              <span className="text-white font-medium">{preset.safetyFilters.minHolders}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-white/50 uppercase">Filters Cont.</p>
                            <div className="flex items-center gap-2 text-xs">
                              <Clock className="w-3 h-3 text-pink-400" />
                              <span className="text-white/70">Max Age:</span>
                              <span className="text-white font-medium">{preset.safetyFilters.maxTokenAgeMinutes}m</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Lock className="w-3 h-3 text-green-400" />
                              <span className="text-white/70">Req Lock:</span>
                              <Badge className={`text-[9px] ${preset.safetyFilters.requireLiquidityLock ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {preset.safetyFilters.requireLiquidityLock ? 'YES' : 'NO'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Zap className="w-3 h-3 text-cyan-400" />
                              <span className="text-white/70">Auto-Sell:</span>
                              <Badge className={`text-[9px] ${preset.executionConfig.autoSell ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {preset.executionConfig.autoSell ? 'ON' : 'OFF'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {preset.tradeConfig.takeProfitLevels.length > 1 && (
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-[10px] font-semibold text-white/50 uppercase mb-2">Take Profit Levels</p>
                            <div className="flex gap-2 flex-wrap">
                              {preset.tradeConfig.takeProfitLevels.map((level, i) => (
                                <Badge key={i} className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">
                                  +{level.percent}% → Sell {level.sellPercent}%
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
