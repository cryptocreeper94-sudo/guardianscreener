import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, ChevronDown, ExternalLink, Loader2, Check, AlertTriangle,
  Zap, ArrowRight, X, RefreshCw, Shield, Bot, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSolanaWallet } from '@/hooks/use-solana-wallet';
import { useEthereumWallet } from '@/hooks/use-ethereum-wallet';
import { dexSwapService, type SwapQuote } from '@/services/dex-swap-service';

interface QuickTradePanelProps {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName?: string;
  tokenLogo?: string;
  recommendation?: 'snipe' | 'watch' | 'avoid';
  aiScore?: number;
  chain?: string;
  dex?: string;
  price?: number;
  marketCap?: number;
  liquidity?: number;
  safetyScore?: number;
  onClose?: () => void;
}

type Chain = 'solana' | 'ethereum' | 'base' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism' | 'avalanche';

const CHAINS: { id: Chain; name: string; icon: string; color: string; native: string }[] = [
  { id: 'solana', name: 'Solana', icon: '◎', color: 'from-purple-500 to-cyan-500', native: 'SOL' },
  { id: 'ethereum', name: 'Ethereum', icon: 'Ξ', color: 'from-blue-500 to-purple-500', native: 'ETH' },
  { id: 'base', name: 'Base', icon: '🔵', color: 'from-blue-400 to-blue-600', native: 'ETH' },
  { id: 'polygon', name: 'Polygon', icon: '⬡', color: 'from-purple-400 to-purple-600', native: 'MATIC' },
  { id: 'bsc', name: 'BNB Chain', icon: '🔶', color: 'from-yellow-400 to-yellow-600', native: 'BNB' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷', color: 'from-blue-500 to-cyan-500', native: 'ETH' },
  { id: 'optimism', name: 'Optimism', icon: '🔴', color: 'from-red-400 to-red-600', native: 'ETH' },
  { id: 'avalanche', name: 'Avalanche', icon: '🔺', color: 'from-red-500 to-red-600', native: 'AVAX' },
];

const SOLANA_DEXES = [
  { name: 'Jupiter', url: (token: string) => `https://jup.ag/swap/SOL-${token}`, color: 'bg-gradient-to-r from-emerald-500 to-cyan-500', primary: true },
  { name: 'Raydium', url: (token: string) => `https://raydium.io/swap/?inputMint=sol&outputMint=${token}`, color: 'bg-purple-500/80' },
  { name: 'Meteora', url: (token: string) => `https://app.meteora.ag/swap/SOL-${token}`, color: 'bg-cyan-500/80' },
  { name: 'Orca', url: (token: string) => `https://www.orca.so/swap?inputMint=sol&outputMint=${token}`, color: 'bg-blue-500/80' },
];

const EVM_DEXES: Record<string, { name: string; url: (token: string) => string; color: string }[]> = {
  ethereum: [
    { name: '1inch', url: (token: string) => `https://app.1inch.io/#/1/simple/swap/ETH/${token}`, color: 'bg-gradient-to-r from-blue-500 to-purple-500' },
    { name: 'Uniswap', url: (token: string) => `https://app.uniswap.org/swap?outputCurrency=${token}`, color: 'bg-pink-500/80' },
    { name: 'SushiSwap', url: (token: string) => `https://www.sushi.com/swap?chainId=1&token1=${token}`, color: 'bg-purple-500/80' },
  ],
  base: [
    { name: '1inch', url: (token: string) => `https://app.1inch.io/#/8453/simple/swap/ETH/${token}`, color: 'bg-gradient-to-r from-blue-400 to-blue-600' },
    { name: 'Aerodrome', url: (token: string) => `https://aerodrome.finance/swap?to=${token}`, color: 'bg-blue-500/80' },
    { name: 'Uniswap', url: (token: string) => `https://app.uniswap.org/swap?chain=base&outputCurrency=${token}`, color: 'bg-pink-500/80' },
  ],
  polygon: [
    { name: '1inch', url: (token: string) => `https://app.1inch.io/#/137/simple/swap/MATIC/${token}`, color: 'bg-gradient-to-r from-purple-400 to-purple-600' },
    { name: 'QuickSwap', url: (token: string) => `https://quickswap.exchange/#/swap?outputCurrency=${token}`, color: 'bg-blue-500/80' },
  ],
  bsc: [
    { name: '1inch', url: (token: string) => `https://app.1inch.io/#/56/simple/swap/BNB/${token}`, color: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
    { name: 'PancakeSwap', url: (token: string) => `https://pancakeswap.finance/swap?outputCurrency=${token}`, color: 'bg-yellow-500/80' },
  ],
  arbitrum: [
    { name: '1inch', url: (token: string) => `https://app.1inch.io/#/42161/simple/swap/ETH/${token}`, color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { name: 'Camelot', url: (token: string) => `https://app.camelot.exchange/?token2=${token}`, color: 'bg-amber-500/80' },
  ],
  optimism: [
    { name: '1inch', url: (token: string) => `https://app.1inch.io/#/10/simple/swap/ETH/${token}`, color: 'bg-gradient-to-r from-red-400 to-red-600' },
    { name: 'Velodrome', url: (token: string) => `https://app.velodrome.finance/swap?to=${token}`, color: 'bg-white/20' },
  ],
  avalanche: [
    { name: '1inch', url: (token: string) => `https://app.1inch.io/#/43114/simple/swap/AVAX/${token}`, color: 'bg-gradient-to-r from-red-500 to-red-600' },
    { name: 'TraderJoe', url: (token: string) => `https://traderjoexyz.com/avalanche/trade?outputCurrency=${token}`, color: 'bg-red-500/80' },
  ],
};

const PRESET_AMOUNTS = ['0.1', '0.25', '0.5', '1'];

// Detect if an address is Solana (base58) vs EVM (0x hex)
function isSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded, typically 32-44 chars, no 0x prefix
  return !address.startsWith('0x') && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function isEvmAddress(address: string): boolean {
  return address.startsWith('0x') && address.length === 42;
}

async function logStrikeAgentTrade(data: {
  tokenAddress: string; tokenSymbol: string; tokenName?: string; dex?: string;
  chain?: string; priceUsd: number; aiRecommendation: string; aiScore: number;
  marketCapUsd?: number; liquidityUsd?: number;
}) {
  try {
    await fetch('/api/pulse/strike-agent/log-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.warn('[StrikeAgent] Failed to log trade prediction:', e);
  }
}

export function QuickTradePanel({ tokenAddress, tokenSymbol, tokenName, recommendation, aiScore, chain: tokenChainProp, dex: tokenDex, price, marketCap, liquidity, safetyScore, onClose }: QuickTradePanelProps) {
  const tokenIsSolana = isSolanaAddress(tokenAddress);
  const tokenIsEvm = isEvmAddress(tokenAddress);
  
  const availableChains = tokenIsSolana 
    ? CHAINS.filter(c => c.id === 'solana')
    : tokenIsEvm 
      ? CHAINS.filter(c => c.id !== 'solana')
      : CHAINS;
  
  const [selectedChain, setSelectedChain] = useState<Chain>(tokenIsSolana ? 'solana' : 'ethereum');
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false);
  const [amount, setAmount] = useState('0.1');
  const [customAmount, setCustomAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<{ success: boolean; txHash: string; explorerUrl: string } | null>(null);

  const solanaWallet = useSolanaWallet();
  const ethereumWallet = useEthereumWallet();

  const currentChainInfo = CHAINS.find(c => c.id === selectedChain)!;
  const isSolana = selectedChain === 'solana';
  const wallet = isSolana ? solanaWallet.wallet : ethereumWallet.wallet;
  const isConnected = isSolana ? !!solanaWallet.wallet : !!ethereumWallet.wallet;
  const balance = isSolana 
    ? solanaWallet.balances?.[0]?.amount || '0'
    : ethereumWallet.balances?.[0]?.amount || '0';

  const connectWallet = useCallback(async () => {
    try {
      if (isSolana) {
        await solanaWallet.connectPhantom();
      } else {
        await ethereumWallet.connectMetaMask();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  }, [isSolana, solanaWallet, ethereumWallet]);

  const [evmFallback, setEvmFallback] = useState(false);

  const getQuote = useCallback(async () => {
    if (!wallet) return;
    setQuoteLoading(true);
    setError(null);
    setEvmFallback(false);
    try {
      const inputAmount = customAmount || amount;
      const nativeToken = currentChainInfo.native;
      
      const q = await dexSwapService.getQuote({
        chain: selectedChain,
        inputToken: nativeToken,
        outputToken: tokenAddress,
        amount: inputAmount,
        slippage: 1,
        userAddress: isSolana ? solanaWallet.wallet!.publicKey : ethereumWallet.wallet!.address,
      });
      setQuote(q);
    } catch (err: any) {
      if (!isSolana) {
        setEvmFallback(true);
      } else {
        setError(err.message || 'Failed to get quote');
      }
    } finally {
      setQuoteLoading(false);
    }
  }, [wallet, amount, customAmount, selectedChain, tokenAddress, isSolana, currentChainInfo.native, solanaWallet.wallet, ethereumWallet.wallet]);

  const executeSwap = useCallback(async () => {
    if (!quote || !wallet) return;
    setIsSwapping(true);
    setError(null);
    try {
      const userAddress = isSolana ? solanaWallet.wallet!.publicKey : ethereumWallet.wallet!.address;
      const swapTx = await dexSwapService.buildSwapTransaction(quote, userAddress);
      
      let signature: string;
      if (isSolana) {
        // Solana: Sign and send via Phantom
        const signedTx = await solanaWallet.signTransaction({ rawTransaction: swapTx.transaction });
        signature = signedTx.signature || '';
      } else {
        // EVM: ethereumWallet.signTransaction sends the tx and returns the hash
        const txData = swapTx.transaction as { to: string; data: string; value: string; gasLimit?: string };
        const signedTx = await ethereumWallet.signTransaction({
          to: txData.to,
          data: txData.data,
          value: txData.value || '0',
          gasLimit: txData.gasLimit,
          // Don't set nonce - MetaMask calculates it automatically
        });
        signature = signedTx.hash || signedTx.signedRaw || '';
      }
      
      const result = await dexSwapService.trackTransaction(selectedChain, signature);
      setTxResult(result);

      if (recommendation && typeof aiScore === 'number' && !isNaN(aiScore) && typeof price === 'number' && !isNaN(price) && price > 0) {
        logStrikeAgentTrade({
          tokenAddress,
          tokenSymbol,
          tokenName,
          dex: tokenDex,
          chain: tokenChainProp || selectedChain,
          priceUsd: price,
          aiRecommendation: recommendation,
          aiScore,
          marketCapUsd: marketCap && !isNaN(marketCap) ? marketCap : undefined,
          liquidityUsd: liquidity && !isNaN(liquidity) ? liquidity : undefined,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  }, [quote, wallet, isSolana, selectedChain, solanaWallet, ethereumWallet, recommendation, aiScore, price, tokenAddress, tokenSymbol, tokenName, tokenDex, tokenChainProp, marketCap, liquidity]);

  const dexes = isSolana ? SOLANA_DEXES : (EVM_DEXES[selectedChain] || []);

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-4" data-testid="quick-trade-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${currentChainInfo.color} flex items-center justify-center text-white font-bold`}>
            {currentChainInfo.icon}
          </div>
          <div>
            <h3 className="text-white font-bold">Trade ${tokenSymbol}</h3>
            <p className="text-[10px] text-white/50">{tokenName || tokenAddress.slice(0, 8)}...</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg" data-testid="button-close-trade">
            <X className="w-4 h-4 text-white/50" />
          </button>
        )}
      </div>

      {aiScore !== undefined && recommendation && (
        <div className={`rounded-xl p-3 border ${
          recommendation === 'snipe' ? 'bg-emerald-500/10 border-emerald-500/20' :
          recommendation === 'watch' ? 'bg-amber-500/10 border-amber-500/20' :
          'bg-red-500/10 border-red-500/20'
        }`} data-testid="strike-agent-assessment">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase">Strike Agent</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              recommendation === 'snipe' ? 'bg-emerald-500/20 text-emerald-400' :
              recommendation === 'watch' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              <Target className="w-3 h-3" />
              {recommendation.toUpperCase()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-white/50">Pulse AI Score</span>
                <span className="text-white font-bold">{aiScore}/100</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    aiScore >= 70 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' :
                    aiScore >= 40 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                    'bg-gradient-to-r from-red-500 to-pink-500'
                  }`}
                  style={{ width: `${aiScore}%` }}
                />
              </div>
            </div>
            {safetyScore !== undefined && !isNaN(safetyScore) && (
              <div className="flex flex-col items-center gap-0.5">
                <Shield className="w-3 h-3 text-white/50" />
                <span className={`text-xs font-bold ${safetyScore >= 60 ? 'text-emerald-400' : safetyScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                  {safetyScore}
                </span>
                <span className="text-[8px] text-white/30">GUARD</span>
              </div>
            )}
          </div>
          {recommendation === 'avoid' && (
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-red-400">
              <AlertTriangle className="w-3 h-3" />
              <span>Strike Agent recommends caution - high risk detected</span>
            </div>
          )}
        </div>
      )}

      {/* Chain Selector */}
      <div className="relative">
        {availableChains.length === 1 ? (
          <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentChainInfo.icon}</span>
              <span className="text-white font-medium">{currentChainInfo.name}</span>
            </div>
            <span className="text-xs text-white/50">
              {tokenIsSolana ? 'Solana token' : 'EVM token'}
            </span>
          </div>
        ) : (
          <button
            onClick={() => setChainDropdownOpen(!chainDropdownOpen)}
            className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            data-testid="button-chain-select"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentChainInfo.icon}</span>
              <span className="text-white font-medium">{currentChainInfo.name}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${chainDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
        
        <AnimatePresence>
          {chainDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl"
            >
              {availableChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => { setSelectedChain(chain.id); setChainDropdownOpen(false); setQuote(null); }}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors ${selectedChain === chain.id ? 'bg-white/10' : ''}`}
                  data-testid={`chain-option-${chain.id}`}
                >
                  <span className="text-lg">{chain.icon}</span>
                  <span className="text-white">{chain.name}</span>
                  {selectedChain === chain.id && <Check className="w-4 h-4 text-emerald-400 ml-auto" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Wallet Connection */}
      {!isConnected ? (
        <Button
          onClick={connectWallet}
          className={`w-full bg-gradient-to-r ${currentChainInfo.color} text-white font-bold py-3`}
          data-testid="button-connect-wallet"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Connect {isSolana ? 'Phantom' : 'MetaMask'}
        </Button>
      ) : (
        <>
          {/* Balance Display */}
          <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/50 uppercase">Your Balance</p>
              <p className="text-white font-bold">{parseFloat(balance).toFixed(4)} {currentChainInfo.native}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/50">Connected</p>
              <p className="text-xs text-emerald-400 font-mono">
                {(isSolana ? solanaWallet.wallet?.publicKey : ethereumWallet.wallet?.address)?.slice(0, 6)}...
              </p>
            </div>
          </div>

          {/* Amount Selection */}
          <div>
            <p className="text-xs text-white/50 mb-2">Amount ({currentChainInfo.native})</p>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => { setAmount(preset); setCustomAmount(''); setQuote(null); }}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    amount === preset && !customAmount
                      ? `bg-gradient-to-r ${currentChainInfo.color} text-white`
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  data-testid={`amount-${preset}`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Custom amount..."
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setQuote(null); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
              data-testid="input-custom-amount"
            />
          </div>

          {/* Get Quote Button */}
          <Button
            onClick={getQuote}
            disabled={quoteLoading}
            className="w-full bg-white/10 hover:bg-white/20 text-white"
            data-testid="button-get-quote"
          >
            {quoteLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Getting Quote...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" /> Get Quote</>
            )}
          </Button>

          {/* Quote Display */}
          {quote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/50">You'll receive (est.)</span>
                <span className="text-xs text-emerald-400">{quote.priceImpact}% impact</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">
                  {parseFloat(quote.outputAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-white/70">${tokenSymbol}</span>
              </div>
              <p className="text-[10px] text-white/40 mt-1">Min: {parseFloat(quote.outputAmountMin).toLocaleString()} (with slippage)</p>
              
              <Button
                onClick={executeSwap}
                disabled={isSwapping}
                className={`w-full mt-3 bg-gradient-to-r ${
                  recommendation === 'snipe' ? 'from-emerald-500 to-cyan-500' :
                  recommendation === 'watch' ? 'from-amber-500 to-orange-500' :
                  'from-red-500 to-pink-500'
                } text-white font-bold`}
                data-testid="button-execute-swap"
              >
                {isSwapping ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Swapping...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Execute Swap</>
                )}
              </Button>
            </motion.div>
          )}

          {/* Transaction Result */}
          {txResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-3 rounded-xl ${txResult.success ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}
            >
              <div className="flex items-center gap-2">
                {txResult.success ? <Check className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                <span className={txResult.success ? 'text-emerald-400' : 'text-red-400'}>
                  {txResult.success ? 'Swap Successful!' : 'Swap Failed'}
                </span>
              </div>
              {txResult.txHash && (
                <a
                  href={txResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-2"
                >
                  View on Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {evmFallback && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400">Trade on {currentChainInfo.name}</span>
          </div>
          <p className="text-[10px] text-white/50 mb-3">
            Select a DEX below to complete your swap for {tokenSymbol}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {dexes.map((dex, i) => (
              <a
                key={dex.name}
                href={dex.url(tokenAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white ${dex.color} hover:opacity-90 transition-opacity shadow-lg`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (recommendation && typeof aiScore === 'number' && !isNaN(aiScore) && typeof price === 'number' && !isNaN(price) && price > 0) {
                    logStrikeAgentTrade({
                      tokenAddress, tokenSymbol, tokenName, dex: dex.name,
                      chain: tokenChainProp || selectedChain,
                      priceUsd: price, aiRecommendation: recommendation,
                      aiScore, marketCapUsd: marketCap && !isNaN(marketCap) ? marketCap : undefined,
                      liquidityUsd: liquidity && !isNaN(liquidity) ? liquidity : undefined,
                    });
                  }
                }}
                data-testid={`link-dex-${dex.name.toLowerCase()}`}
              >
                {i === 0 && <Zap className="w-4 h-4" />}
                {dex.name}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* DEX Links */}
      {!evmFallback && (
        <div>
          <p className="text-xs text-white/50 mb-2">Or trade on:</p>
          <div className="grid grid-cols-2 gap-2">
            {dexes.map((dex, i) => (
              <a
                key={dex.name}
                href={dex.url(tokenAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-white ${dex.color} hover:opacity-90 transition-opacity ${i === 0 ? 'col-span-2' : ''}`}
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-dex-${dex.name.toLowerCase()}`}
              >
                {dex.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickTradePanel;
