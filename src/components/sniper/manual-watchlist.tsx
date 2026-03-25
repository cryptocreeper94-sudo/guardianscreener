import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, X, Play, Pause, Eye, Target, AlertTriangle, Check, 
  DollarSign, TrendingUp, TrendingDown, Loader2, ExternalLink, Copy
} from 'lucide-react';
import { GlassCard } from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPresetById } from '@/config/trading-presets';

interface LimitOrder {
  id: string;
  tokenAddress: string;
  tokenSymbol: string | null;
  chain: string | null;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  buyAmountSol: number | null;
  slotIndex: number | null;
  status: string | null;
  isActive: boolean | null;
  createdAt: string;
}

interface WatchlistSlot {
  index: number;
  order: LimitOrder | null;
  currentPrice: number | null;
  priceChange: number | null;
}

interface ManualWatchlistProps {
  userId: string;
  selectedPreset: string;
  walletAddress?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-white/10', text: 'text-white/50', label: 'Pending' },
  WATCHING: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Watching' },
  READY_TO_EXECUTE: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Ready!' },
  FILLED_ENTRY: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Position Open' },
  READY_TO_EXIT: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Take Profit!' },
  READY_TO_STOP: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Stop Loss!' },
  FILLED_EXIT: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Sold' },
  STOPPED_OUT: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Stopped' },
  CANCELLED: { bg: 'bg-white/10', text: 'text-white/30', label: 'Cancelled' },
};

export function ManualWatchlist({ userId, selectedPreset, walletAddress }: ManualWatchlistProps) {
  const queryClient = useQueryClient();
  const preset = getPresetById(selectedPreset);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    tokenAddress: '',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    buyAmountSol: preset.tradeConfig.buyAmountSol.toString(),
  });
  const [copied, setCopied] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery<LimitOrder[]>({
    queryKey: ['limit-orders', userId],
    queryFn: async () => {
      // UserId is derived from authenticated session on backend
      const res = await fetch('/api/limit-orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const slots: WatchlistSlot[] = Array.from({ length: 4 }, (_, index) => ({
    index,
    order: orders.find(o => o.slotIndex === index) || null,
    currentPrice: null,
    priceChange: null,
  }));

  const createOrder = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/limit-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create order');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limit-orders'] });
      setEditingSlot(null);
      resetForm();
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/limit-orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete order');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limit-orders'] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ orderId, isActive }: { orderId: string; isActive: boolean }) => {
      const res = await fetch(`/api/limit-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed to update order');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limit-orders'] });
    },
  });

  const resetForm = () => {
    setFormData({
      tokenAddress: '',
      entryPrice: '',
      exitPrice: '',
      stopLoss: '',
      buyAmountSol: preset.tradeConfig.buyAmountSol.toString(),
    });
  };

  const handleSubmit = (slotIndex: number) => {
    createOrder.mutate({
      userId,
      tokenAddress: formData.tokenAddress,
      entryPrice: parseFloat(formData.entryPrice) || null,
      exitPrice: parseFloat(formData.exitPrice) || null,
      stopLoss: parseFloat(formData.stopLoss) || null,
      buyAmountSol: parseFloat(formData.buyAmountSol) || preset.tradeConfig.buyAmountSol,
      slotIndex,
      walletAddress,
      chain: formData.tokenAddress.startsWith('0x') ? 'ethereum' : 'solana',
    });
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  };

  const shortenAddress = (addr: string) => 
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
          Watchlist Slots
        </h3>
        <span className="text-xs text-white/40">
          {orders.filter(o => o.status !== 'CANCELLED').length}/4 Active
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {slots.map((slot) => (
          <GlassCard 
            key={slot.index} 
            className="p-3"
            data-testid={`watchlist-slot-${slot.index}`}
          >
            {slot.order ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {slot.order.tokenSymbol?.slice(0, 2) || '??'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {slot.order.tokenSymbol || 'Loading...'}
                      </p>
                      <button
                        onClick={() => copyAddress(slot.order!.tokenAddress)}
                        className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60"
                        data-testid={`copy-address-${slot.index}`}
                      >
                        {shortenAddress(slot.order.tokenAddress)}
                        {copied === slot.order.tokenAddress ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span 
                      className={`text-[10px] px-2 py-1 rounded-full ${STATUS_STYLES[slot.order.status || 'PENDING'].bg} ${STATUS_STYLES[slot.order.status || 'PENDING'].text}`}
                    >
                      {STATUS_STYLES[slot.order.status || 'PENDING'].label}
                    </span>
                    <button
                      onClick={() => toggleActive.mutate({ 
                        orderId: slot.order!.id, 
                        isActive: !slot.order!.isActive 
                      })}
                      className={`p-1.5 rounded-lg transition-colors ${
                        slot.order.isActive 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-white/10 text-white/40'
                      }`}
                      data-testid={`toggle-active-${slot.index}`}
                    >
                      {slot.order.isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteOrder.mutate(slot.order!.id)}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      data-testid={`delete-order-${slot.index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-[10px] text-white/40">Entry</p>
                    <p className="text-cyan-400 font-medium">
                      ${slot.order.entryPrice?.toFixed(8) || '-'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-[10px] text-white/40">Take Profit</p>
                    <p className="text-emerald-400 font-medium">
                      ${slot.order.exitPrice?.toFixed(8) || '-'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-[10px] text-white/40">Stop Loss</p>
                    <p className="text-red-400 font-medium">
                      ${slot.order.stopLoss?.toFixed(8) || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">
                    Buy: <span className="text-white font-medium">{slot.order.buyAmountSol} SOL</span>
                  </span>
                  <a
                    href={slot.order.chain === 'solana' 
                      ? `https://solscan.io/token/${slot.order.tokenAddress}`
                      : `https://etherscan.io/token/${slot.order.tokenAddress}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : editingSlot === slot.index ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Slot {slot.index + 1}</span>
                  <button
                    onClick={() => {
                      setEditingSlot(null);
                      resetForm();
                    }}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                <Input
                  placeholder="Token address (SOL or EVM)"
                  value={formData.tokenAddress}
                  onChange={(e) => setFormData({ ...formData, tokenAddress: e.target.value })}
                  className="bg-white/5 border-white/10 text-white text-xs"
                  data-testid={`input-token-address-${slot.index}`}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Entry Price ($)</label>
                    <Input
                      type="number"
                      step="0.00000001"
                      placeholder="0.00001"
                      value={formData.entryPrice}
                      onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                      className="bg-white/5 border-white/10 text-white text-xs"
                      data-testid={`input-entry-price-${slot.index}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Buy Amount (SOL)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.buyAmountSol}
                      onChange={(e) => setFormData({ ...formData, buyAmountSol: e.target.value })}
                      className="bg-white/5 border-white/10 text-white text-xs"
                      data-testid={`input-buy-amount-${slot.index}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-emerald-400 block mb-1">Take Profit ($)</label>
                    <Input
                      type="number"
                      step="0.00000001"
                      placeholder="0.0001"
                      value={formData.exitPrice}
                      onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                      className="bg-white/5 border-emerald-500/30 text-white text-xs"
                      data-testid={`input-exit-price-${slot.index}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-red-400 block mb-1">Stop Loss ($)</label>
                    <Input
                      type="number"
                      step="0.00000001"
                      placeholder="0.000001"
                      value={formData.stopLoss}
                      onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                      className="bg-white/5 border-red-500/30 text-white text-xs"
                      data-testid={`input-stop-loss-${slot.index}`}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleSubmit(slot.index)}
                  disabled={!formData.tokenAddress || createOrder.isPending}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
                  data-testid={`submit-order-${slot.index}`}
                >
                  {createOrder.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Add to Watchlist
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setEditingSlot(slot.index)}
                className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-xl hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
                data-testid={`add-slot-${slot.index}`}
              >
                <Plus className="w-6 h-6 text-white/30" />
                <span className="text-xs text-white/30">Add Token to Slot {slot.index + 1}</span>
              </button>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
