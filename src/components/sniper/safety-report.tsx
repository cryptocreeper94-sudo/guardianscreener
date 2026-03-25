import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Check, X,
  Droplets, Bot, Users, Lock, Unlock, FileCheck, Loader2,
  TrendingUp, ExternalLink, RefreshCw
} from 'lucide-react';
import { GlassCard } from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SafetyMetrics {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: string;
  overallScore: number;
  metrics: {
    liquidity: {
      value: number;
      pass: boolean;
      label: string;
    };
    botPercent: {
      value: number;
      pass: boolean;
      label: string;
    };
    top10Holders: {
      value: number;
      pass: boolean;
      label: string;
    };
    holderCount: {
      value: number;
      pass: boolean;
      label: string;
    };
    contractVerified: {
      value: boolean;
      pass: boolean;
      label: string;
    };
    mintAuthority: {
      value: boolean;
      pass: boolean;
      label: string;
    };
    freezeAuthority: {
      value: boolean;
      pass: boolean;
      label: string;
    };
    honeypot: {
      value: boolean;
      pass: boolean;
      label: string;
    };
  };
  recommendation: 'safe' | 'caution' | 'danger';
  reasoning: string;
}

const getScoreColor = (score: number) => {
  if (score >= 70) return { text: 'text-emerald-400', bg: 'bg-emerald-500', glow: 'shadow-emerald-500/30' };
  if (score >= 40) return { text: 'text-amber-400', bg: 'bg-amber-500', glow: 'shadow-amber-500/30' };
  return { text: 'text-red-400', bg: 'bg-red-500', glow: 'shadow-red-500/30' };
};

const RECOMMENDATION_STYLES = {
  safe: { icon: ShieldCheck, bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'SAFE TO TRADE' },
  caution: { icon: Shield, bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', label: 'PROCEED WITH CAUTION' },
  danger: { icon: ShieldAlert, bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', label: 'HIGH RISK' },
};

interface SafetyReportProps {
  tokenAddress?: string;
  chain?: string;
  onClose?: () => void;
}

export function SafetyReport({ tokenAddress: initialAddress, chain: initialChain, onClose }: SafetyReportProps) {
  const [inputAddress, setInputAddress] = useState(initialAddress || '');
  const [queryAddress, setQueryAddress] = useState(initialAddress || '');

  const { data: report, isLoading, error, refetch } = useQuery<SafetyMetrics>({
    queryKey: ['safety-report', queryAddress],
    queryFn: async () => {
      if (!queryAddress) throw new Error('No address');
      const res = await fetch('/api/sniper/analyze-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tokenAddress: queryAddress,
          chain: initialChain || (queryAddress.startsWith('0x') ? 'ethereum' : 'solana')
        }),
      });
      if (!res.ok) throw new Error('Failed to analyze token');
      return res.json();
    },
    enabled: !!queryAddress,
  });

  const handleAnalyze = () => {
    if (inputAddress) setQueryAddress(inputAddress);
  };

  const formatLiquidity = (val: number) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  const scoreColors = report ? getScoreColor(report.overallScore) : getScoreColor(0);
  const recStyle = report ? RECOMMENDATION_STYLES[report.recommendation] : RECOMMENDATION_STYLES.caution;
  const RecIcon = recStyle.icon;

  return (
    <GlassCard className="p-4" data-testid="safety-report">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Token Safety Report
          </h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4 text-white/50" />
          </button>
        )}
      </div>

      {!initialAddress && (
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Enter token address..."
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            className="flex-1 bg-white/5 border-white/10 text-white text-sm"
            data-testid="input-safety-address"
          />
          <Button
            onClick={handleAnalyze}
            disabled={!inputAddress || isLoading}
            className="bg-cyan-500 hover:bg-cyan-600"
            data-testid="btn-analyze"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4" />
          <span className="text-sm text-white/50">Analyzing token safety...</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400/50 mb-3" />
          <p className="text-sm text-white/50">Failed to analyze token</p>
          <p className="text-xs text-white/30 mb-4">Check the address and try again</p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {report && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-white">{report.tokenSymbol}</h4>
              <p className="text-xs text-white/40">{report.tokenName}</p>
            </div>
            <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${scoreColors.bg}/20 border border-${scoreColors.bg}/30 shadow-lg ${scoreColors.glow}`}>
              <span className={`text-2xl font-bold ${scoreColors.text}`}>
                {report.overallScore}
              </span>
              <span className="text-[8px] text-white/40 uppercase">Score</span>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-xl ${recStyle.bg} border ${recStyle.border}`}>
            <RecIcon className={`w-6 h-6 ${recStyle.text}`} />
            <div>
              <p className={`text-sm font-bold ${recStyle.text}`}>{recStyle.label}</p>
              <p className="text-xs text-white/50">{report.reasoning}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              icon={<Droplets className="w-4 h-4" />}
              label="Liquidity"
              value={formatLiquidity(report.metrics.liquidity.value)}
              pass={report.metrics.liquidity.pass}
            />
            <MetricCard
              icon={<Bot className="w-4 h-4" />}
              label="Bot Activity"
              value={`${report.metrics.botPercent.value.toFixed(0)}%`}
              pass={report.metrics.botPercent.pass}
            />
            <MetricCard
              icon={<Users className="w-4 h-4" />}
              label="Top 10 Holders"
              value={`${report.metrics.top10Holders.value.toFixed(0)}%`}
              pass={report.metrics.top10Holders.pass}
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Holder Count"
              value={report.metrics.holderCount.value.toLocaleString()}
              pass={report.metrics.holderCount.pass}
            />
            <MetricCard
              icon={<FileCheck className="w-4 h-4" />}
              label="Contract"
              value={report.metrics.contractVerified.value ? 'Verified' : 'Unverified'}
              pass={report.metrics.contractVerified.pass}
            />
            <MetricCard
              icon={report.metrics.mintAuthority.value ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              label="Mint Authority"
              value={report.metrics.mintAuthority.value ? 'Active' : 'Revoked'}
              pass={report.metrics.mintAuthority.pass}
            />
            <MetricCard
              icon={report.metrics.freezeAuthority.value ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              label="Freeze Authority"
              value={report.metrics.freezeAuthority.value ? 'Active' : 'Revoked'}
              pass={report.metrics.freezeAuthority.pass}
            />
            <MetricCard
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Honeypot"
              value={report.metrics.honeypot.value ? 'Detected!' : 'Not Detected'}
              pass={report.metrics.honeypot.pass}
            />
          </div>

          <a
            href={report.chain === 'solana'
              ? `https://rugcheck.xyz/tokens/${report.tokenAddress}`
              : `https://tokensniffer.com/token/${report.chain}/${report.tokenAddress}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 text-sm transition-colors"
          >
            View Full Report <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>
      )}
    </GlassCard>
  );
}

function MetricCard({ 
  icon, 
  label, 
  value, 
  pass 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  pass: boolean;
}) {
  return (
    <div className={`p-2.5 rounded-xl border ${
      pass 
        ? 'bg-emerald-500/5 border-emerald-500/20' 
        : 'bg-red-500/5 border-red-500/20'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <div className={`${pass ? 'text-emerald-400' : 'text-red-400'}`}>
          {icon}
        </div>
        {pass ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <X className="w-3 h-3 text-red-400" />
        )}
      </div>
      <p className="text-[10px] text-white/40 uppercase">{label}</p>
      <p className={`text-sm font-medium ${pass ? 'text-emerald-400' : 'text-red-400'}`}>
        {value}
      </p>
    </div>
  );
}
