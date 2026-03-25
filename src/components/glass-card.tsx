import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  locked?: boolean;
  glow?: boolean;
  hover?: boolean;
  variant?: "default" | "stat" | "feature";
}

export function GlassCard({ 
  children, 
  className = "", 
  locked = false,
  glow = false,
  hover = true,
  variant = "default"
}: GlassCardProps) {
  const baseStyles = `
    relative h-full overflow-hidden rounded-xl
    bg-[rgba(12,18,36,0.65)] backdrop-blur-2xl
    border border-white/[0.08]
    transition-all duration-300
  `;

  const glowStyles = glow 
    ? 'shadow-[0_0_40px_rgba(0,255,255,0.15)]' 
    : 'shadow-lg shadow-black/20';

  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -2 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`relative group ${className}`}
    >
      <div className={`${baseStyles} ${glowStyles}`}>
        {locked && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10">
              <Lock className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-white/80">Coming Soon</span>
            </div>
          </div>
        )}
        {children}
      </div>
      {glow && (
        <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-primary/30 via-cyan-400/20 to-secondary/30 -z-10 blur-sm opacity-50" />
      )}
    </motion.div>
  );
}

export function StatCard({ 
  value, 
  label, 
  icon: Icon,
  live = false 
}: { 
  value: string; 
  label: string; 
  icon?: React.ComponentType<{ className?: string }>;
  live?: boolean;
}) {
  return (
    <GlassCard hover={false}>
      <div className="p-4 md:p-5 flex flex-col justify-center h-full">
        <div className="flex items-center justify-between mb-2">
          {Icon && <Icon className="w-4 h-4 text-primary/60" />}
          {live && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] text-green-400/80 uppercase tracking-wider">Live</span>
            </div>
          )}
        </div>
        <div className="text-xl md:text-2xl font-bold text-white font-display">{value}</div>
        <div className="text-[10px] md:text-xs text-white/50 uppercase tracking-wider mt-1">{label}</div>
      </div>
    </GlassCard>
  );
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient = "from-primary to-cyan-400"
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  gradient?: string;
}) {
  return (
    <GlassCard>
      <div className="p-4 md:p-5 h-full flex flex-col">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
        <p className="text-[11px] text-white/50 leading-relaxed">{description}</p>
      </div>
    </GlassCard>
  );
}
