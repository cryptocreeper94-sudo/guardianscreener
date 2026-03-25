/**
 * DEX Swap Widget Component
 * Example implementation showing how to use the DEX swap hooks
 * Can be embedded in StrikeAgent or any trading UI
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Loader2, ExternalLink, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard } from '@/components/glass-card';
import { useDexSwap } from '@/hooks/use-dex-swap';
import { useWallet } from '@/hooks/use-wallet';

interface SwapWidgetProps {
  chain?: string;
  defaultInputToken?: string;
  defaultOutputToken?: string;
  onSwapComplete?: (result: { txHash: string; success: boolean }) => void;
}

export function DexSwapWidget({
  chain = 'solana',
  defaultInputToken = 'SOL',
  defaultOutputToken = '',
  onSwapComplete,
}: SwapWidgetProps) {
  const { isConnected, connectEVM, connectSolana } = useWallet();
  const {
    quote,
    isQuoting,
    isSwapping,
    isTracking,
    txStatus,
    txHash,
    explorerUrl,
    error,
    getQuote,
    executeSwap,
    reset,
    formatAmount,
  } = useDexSwap();

  const [inputToken, setInputToken] = useState(defaultInputToken);
  const [outputToken, setOutputToken] = useState(defaultOutputToken);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(5);

  const handleConnect = async () => {
    if (chain === 'solana') {
      await connectSolana();
    } else {
      await connectEVM();
    }
  };

  const handleGetQuote = async () => {
    if (!amount || !outputToken) return;
    await getQuote(chain, inputToken, outputToken, amount, slippage);
  };

  const handleSwap = async () => {
    if (!quote) return;
    
    const result = await executeSwap(
      quote,
      () => console.log('Waiting for signature...'),
      (hash) => console.log('Transaction submitted:', hash)
    );

    if (result) {
      onSwapComplete?.({ txHash: result.txHash, success: result.success });
    }
  };

  const handleReset = () => {
    reset();
    setAmount('');
  };

  const isLoading = isQuoting || isSwapping || isTracking;

  return (
    <GlassCard glow className="w-full max-w-md">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Swap</h3>
          <div className="text-xs text-muted-foreground capitalize">{chain}</div>
        </div>

        {!isConnected ? (
          <Button onClick={handleConnect} className="w-full">
            Connect {chain === 'solana' ? 'Phantom' : 'MetaMask'}
          </Button>
        ) : (
          <>
            {/* Input Token */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-muted-foreground mb-2">You Pay</div>
              <div className="flex gap-3">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent border-none text-xl font-bold"
                  disabled={isLoading}
                />
                <Input
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Token"
                  className="w-24 text-center font-bold"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center">
              <motion.button
                className="p-2 rounded-full bg-background border border-white/10"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
                onClick={() => {
                  const temp = inputToken;
                  setInputToken(outputToken);
                  setOutputToken(temp);
                }}
              >
                <ArrowUpDown className="w-4 h-4 text-primary" />
              </motion.button>
            </div>

            {/* Output Token */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-muted-foreground mb-2">You Receive</div>
              <div className="flex gap-3">
                <div className="flex-1 text-xl font-bold text-muted-foreground">
                  {quote ? formatAmount(quote.outputAmount, chain === 'solana' ? 9 : 18) : '—'}
                </div>
                <Input
                  value={outputToken}
                  onChange={(e) => setOutputToken(e.target.value)}
                  placeholder="Token Address"
                  className="w-32 text-center font-mono text-xs"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Slippage */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Slippage</span>
              <div className="flex gap-1">
                {[1, 5, 10].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    className={`px-2 py-1 rounded ${
                      slippage === s 
                        ? 'bg-primary text-background' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>

            {/* Quote Info */}
            <AnimatePresence>
              {quote && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-white/5 space-y-2 text-xs"
                >
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Route</span>
                    <span>{quote.route}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price Impact</span>
                    <span className={parseFloat(quote.priceImpact) > 5 ? 'text-red-400' : ''}>
                      {parseFloat(quote.priceImpact).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Received</span>
                    <span>{formatAmount(quote.outputAmountMin, chain === 'solana' ? 9 : 18)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Transaction Status */}
            <AnimatePresence>
              {txHash && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    txStatus === 'confirmed' 
                      ? 'bg-green-500/10 border border-green-500/30' 
                      : txStatus === 'failed'
                      ? 'bg-red-500/10 border border-red-500/30'
                      : 'bg-amber-500/10 border border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {txStatus === 'pending' && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
                    {txStatus === 'confirmed' && <Check className="w-4 h-4 text-green-400" />}
                    {txStatus === 'failed' && <X className="w-4 h-4 text-red-400" />}
                    <span className="text-xs font-mono">
                      {txHash.slice(0, 8)}...{txHash.slice(-6)}
                    </span>
                  </div>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!quote ? (
                <Button
                  onClick={handleGetQuote}
                  disabled={!amount || !outputToken || isQuoting}
                  className="flex-1"
                >
                  {isQuoting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Getting Quote...
                    </>
                  ) : (
                    'Get Quote'
                  )}
                </Button>
              ) : txStatus === 'confirmed' || txStatus === 'failed' ? (
                <Button onClick={handleReset} className="flex-1">
                  New Swap
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSwapping || isTracking}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSwap}
                    disabled={isSwapping || isTracking}
                    className="flex-1"
                  >
                    {isSwapping ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing...
                      </>
                    ) : isTracking ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      'Swap'
                    )}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </GlassCard>
  );
}

/**
 * Quick Buy Button for StrikeAgent signals
 * One-click buy with preset parameters
 */
interface QuickBuyButtonProps {
  chain: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  onComplete?: (result: { txHash: string; success: boolean }) => void;
}

export function QuickBuyButton({
  chain,
  tokenAddress,
  tokenSymbol,
  amount,
  onComplete,
}: QuickBuyButtonProps) {
  const { isConnected } = useWallet();
  const { isQuoting, isSwapping, isTracking, error, getQuote, executeSwap } = useDexSwap();

  const [status, setStatus] = useState<'idle' | 'quoting' | 'signing' | 'confirming' | 'done' | 'error'>('idle');

  const handleBuy = async () => {
    if (!isConnected) {
      setStatus('error');
      return;
    }

    setStatus('quoting');
    const inputToken = chain === 'solana' ? 'SOL' : 'ETH';
    const quote = await getQuote(chain, inputToken, tokenAddress, amount, 5);

    if (!quote) {
      setStatus('error');
      return;
    }

    setStatus('signing');
    const result = await executeSwap(
      quote,
      () => setStatus('signing'),
      () => setStatus('confirming')
    );

    if (result?.success) {
      setStatus('done');
      onComplete?.({ txHash: result.txHash, success: true });
    } else {
      setStatus('error');
      onComplete?.({ txHash: result?.txHash || '', success: false });
    }
  };

  const isLoading = status === 'quoting' || status === 'signing' || status === 'confirming';

  return (
    <Button
      onClick={handleBuy}
      disabled={isLoading || status === 'done'}
      size="sm"
      className={
        status === 'done' ? 'bg-green-500' : 
        status === 'error' ? 'bg-red-500' : 
        'bg-primary'
      }
    >
      {status === 'quoting' && <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Quote</>}
      {status === 'signing' && <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sign</>}
      {status === 'confirming' && <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Tx</>}
      {status === 'done' && <><Check className="w-3 h-3 mr-1" /> Bought</>}
      {status === 'error' && <><X className="w-3 h-3 mr-1" /> Failed</>}
      {status === 'idle' && <>Buy {tokenSymbol}</>}
    </Button>
  );
}
