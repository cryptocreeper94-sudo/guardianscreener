import { Link } from "wouter";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, hasPlanAccess } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";

interface SubscriptionGateProps {
  requiredPlans: string[];
  productName: string;
  productDescription: string;
  price: string;
  checkoutPath: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function SubscriptionGate({
  requiredPlans,
  productName,
  productDescription,
  price,
  checkoutPath,
  icon,
  children,
}: SubscriptionGateProps) {
  const { user } = useAuth();
  const { plan, isActive, isPremium, isWhitelisted, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-white/50">Loading subscription status...</div>
      </div>
    );
  }

  const isOwner = (user as any)?.isOwner === true;
  const isAdmin = (user as any)?.isAdmin === true;
  const hasAccess = !user ? false : (isOwner || isAdmin || isWhitelisted || isPremium || hasPlanAccess(plan, requiredPlans));

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 overflow-hidden">
        <div className="blur-[6px] opacity-40 pointer-events-none">
          {children}
        </div>
      </div>
      
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">{productName}</h2>
          <p className="text-sm text-white/60 mb-4">{productDescription}</p>

          <div className="text-3xl font-bold text-white mb-1">{price}</div>
          <p className="text-xs text-white/40 mb-6">per month</p>

          {user ? (
            <Link href={checkoutPath}>
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold" data-testid="button-subscribe">
                Subscribe Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold" data-testid="button-sign-in-subscribe">
                Sign In to Subscribe
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}

          <p className="text-xs text-white/30 mt-4">
            Cancel anytime. 2-day free trial included.
          </p>
          
          {/* Referral Program Callout */}
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs">
              <Gift className="w-3.5 h-3.5" />
              <span>
                <span className="font-semibold">Earn rewards!</span>{' '}
                <Link href="/referral-program" className="underline hover:text-emerald-300">
                  Refer friends for free Shells
                </Link>
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
