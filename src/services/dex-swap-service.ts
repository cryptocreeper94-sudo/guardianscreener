/**
 * DEX Swap Service
 * Handles building swap transactions for Jupiter (Solana) and 1inch (EVM chains)
 * Returns unsigned transactions for signing with Phantom/MetaMask
 */

import { Connection, PublicKey, VersionedTransaction, Transaction } from '@solana/web3.js';

// Jupiter API endpoints
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

// 1inch API endpoints (v5.2)
const ONEINCH_BASE_URL = 'https://api.1inch.dev/swap/v6.0';

// Chain IDs for EVM
const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  polygon: 137,
  optimism: 10,
  bsc: 56,
  avalanche: 43114,
};

// Native token addresses
const NATIVE_TOKENS: Record<string, string> = {
  solana: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  ethereum: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  base: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  arbitrum: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  polygon: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  optimism: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  bsc: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  avalanche: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
};

// RPC endpoints
const RPC_ENDPOINTS: Record<string, string> = {
  solana: 'https://api.mainnet-beta.solana.com',
  ethereum: 'https://eth.llamarpc.com',
  base: 'https://mainnet.base.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
  optimism: 'https://mainnet.optimism.io',
  bsc: 'https://bsc-dataseed.binance.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

export interface SwapQuoteRequest {
  chain: string;
  inputToken: string;
  outputToken: string;
  amount: string;
  slippage: number;
  userAddress: string;
}

export interface SwapQuote {
  chain: string;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  outputAmountMin: string;
  priceImpact: string;
  route: string;
  fee: string;
  estimatedGas?: string;
  rawQuote: any;
}

export interface SwapTransaction {
  chain: string;
  transaction: any;
  type: 'solana' | 'evm';
  explorerBaseUrl: string;
}

export interface TransactionResult {
  success: boolean;
  txHash: string;
  explorerUrl: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

class DexSwapService {
  private solanaConnection: Connection;
  private oneInchApiKey: string;

  constructor() {
    this.solanaConnection = new Connection(RPC_ENDPOINTS.solana, 'confirmed');
    this.oneInchApiKey = ''; // Will be set if available
  }

  setOneInchApiKey(apiKey: string) {
    this.oneInchApiKey = apiKey;
  }

  /**
   * Get a swap quote from the appropriate DEX
   */
  async getQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    const { chain, inputToken, outputToken, amount, slippage, userAddress } = request;

    if (chain === 'solana') {
      return this.getJupiterQuote(inputToken, outputToken, amount, slippage);
    } else {
      return this.get1inchQuote(chain, inputToken, outputToken, amount, slippage, userAddress);
    }
  }

  /**
   * Build a swap transaction ready for signing
   */
  async buildSwapTransaction(quote: SwapQuote, userAddress: string): Promise<SwapTransaction> {
    if (quote.chain === 'solana') {
      return this.buildJupiterSwapTransaction(quote, userAddress);
    } else {
      return this.build1inchSwapTransaction(quote, userAddress);
    }
  }

  /**
   * Track transaction status until confirmation
   */
  async trackTransaction(
    chain: string,
    txHash: string,
    onStatusUpdate?: (status: 'pending' | 'confirmed' | 'failed') => void
  ): Promise<TransactionResult> {
    if (chain === 'solana') {
      return this.trackSolanaTransaction(txHash, onStatusUpdate);
    } else {
      return this.trackEvmTransaction(chain, txHash, onStatusUpdate);
    }
  }

  // ==================== JUPITER (SOLANA) ====================

  private async getJupiterQuote(
    inputMint: string,
    outputMint: string,
    amount: string,
    slippageBps: number
  ): Promise<SwapQuote> {
    // Convert SOL to lamports (or token amount to smallest unit)
    const inputMintAddress = inputMint === 'SOL' ? NATIVE_TOKENS.solana : inputMint;
    const amountInLamports = inputMint === 'SOL' 
      ? Math.floor(parseFloat(amount) * 1e9).toString()
      : amount;

    const params = new URLSearchParams({
      inputMint: inputMintAddress,
      outputMint: outputMint,
      amount: amountInLamports,
      slippageBps: (slippageBps * 100).toString(), // Convert % to bps
      swapMode: 'ExactIn',
    });

    const response = await fetch(`${JUPITER_QUOTE_API}?${params}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jupiter quote failed: ${error}`);
    }

    const data = await response.json();

    return {
      chain: 'solana',
      inputToken: inputMintAddress,
      outputToken: outputMint,
      inputAmount: data.inAmount,
      outputAmount: data.outAmount,
      outputAmountMin: data.otherAmountThreshold,
      priceImpact: data.priceImpactPct || '0',
      route: data.routePlan?.map((r: any) => r.swapInfo?.label).join(' → ') || 'Jupiter',
      fee: '0.0025', // Jupiter fee
      rawQuote: data,
    };
  }

  private async buildJupiterSwapTransaction(
    quote: SwapQuote,
    userAddress: string
  ): Promise<SwapTransaction> {
    const response = await fetch(JUPITER_SWAP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote.rawQuote,
        userPublicKey: userAddress,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jupiter swap build failed: ${error}`);
    }

    const { swapTransaction } = await response.json();
    
    // Deserialize the transaction
    const transactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuf);

    return {
      chain: 'solana',
      transaction: transaction,
      type: 'solana',
      explorerBaseUrl: 'https://solscan.io/tx/',
    };
  }

  private async trackSolanaTransaction(
    signature: string,
    onStatusUpdate?: (status: 'pending' | 'confirmed' | 'failed') => void
  ): Promise<TransactionResult> {
    onStatusUpdate?.('pending');
    
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const status = await this.solanaConnection.getSignatureStatus(signature);
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          if (status.value.err) {
            onStatusUpdate?.('failed');
            return {
              success: false,
              txHash: signature,
              explorerUrl: `https://solscan.io/tx/${signature}`,
              status: 'failed',
              error: JSON.stringify(status.value.err),
            };
          }
          
          onStatusUpdate?.('confirmed');
          return {
            success: true,
            txHash: signature,
            explorerUrl: `https://solscan.io/tx/${signature}`,
            status: 'confirmed',
          };
        }
      } catch (err) {
        console.warn('Solana tx status check error:', err);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      retries++;
    }

    return {
      success: false,
      txHash: signature,
      explorerUrl: `https://solscan.io/tx/${signature}`,
      status: 'pending',
      error: 'Transaction confirmation timeout',
    };
  }

  // ==================== 1INCH (EVM CHAINS) ====================

  private async get1inchQuote(
    chain: string,
    inputToken: string,
    outputToken: string,
    amount: string,
    slippage: number,
    userAddress: string
  ): Promise<SwapQuote> {
    const chainId = CHAIN_IDS[chain];
    if (!chainId) throw new Error(`Unsupported chain: ${chain}`);

    // Convert to wei (18 decimals for native tokens)
    const inputTokenAddress = this.isNativeToken(inputToken) 
      ? NATIVE_TOKENS[chain] 
      : inputToken;
    const amountInWei = this.isNativeToken(inputToken)
      ? BigInt(Math.floor(parseFloat(amount) * 1e18)).toString()
      : amount;

    const params = new URLSearchParams({
      src: inputTokenAddress,
      dst: outputToken,
      amount: amountInWei,
      from: userAddress,
      slippage: slippage.toString(),
      disableEstimate: 'true',
    });

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.oneInchApiKey) {
      headers['Authorization'] = `Bearer ${this.oneInchApiKey}`;
    }

    const response = await fetch(
      `${ONEINCH_BASE_URL}/${chainId}/swap?${params}`,
      { headers }
    );

    if (!response.ok) {
      // Fallback to quote-only endpoint if swap fails
      const quoteParams = new URLSearchParams({
        src: inputTokenAddress,
        dst: outputToken,
        amount: amountInWei,
      });

      const quoteResponse = await fetch(
        `${ONEINCH_BASE_URL}/${chainId}/quote?${quoteParams}`,
        { headers }
      );

      if (!quoteResponse.ok) {
        throw new Error(`1inch quote failed: ${await quoteResponse.text()}`);
      }

      const quoteData = await quoteResponse.json();
      
      return {
        chain,
        inputToken: inputTokenAddress,
        outputToken,
        inputAmount: amountInWei,
        outputAmount: quoteData.dstAmount,
        outputAmountMin: this.calculateMinOutput(quoteData.dstAmount, slippage),
        priceImpact: '0',
        route: '1inch',
        fee: quoteData.gas ? (parseInt(quoteData.gas) * 0.00000001).toFixed(6) : '0',
        estimatedGas: quoteData.gas,
        rawQuote: { ...quoteData, needsSwapBuild: true, userAddress, slippage },
      };
    }

    const data = await response.json();

    return {
      chain,
      inputToken: inputTokenAddress,
      outputToken,
      inputAmount: amountInWei,
      outputAmount: data.dstAmount,
      outputAmountMin: this.calculateMinOutput(data.dstAmount, slippage),
      priceImpact: '0',
      route: data.protocols?.flat()?.map((p: any) => p.name).join(' → ') || '1inch',
      fee: data.tx?.gas ? (parseInt(data.tx.gas) * 0.00000001).toFixed(6) : '0',
      estimatedGas: data.tx?.gas,
      rawQuote: data,
    };
  }

  private async build1inchSwapTransaction(
    quote: SwapQuote,
    userAddress: string
  ): Promise<SwapTransaction> {
    const chainId = CHAIN_IDS[quote.chain];
    const explorerUrls: Record<string, string> = {
      ethereum: 'https://etherscan.io/tx/',
      base: 'https://basescan.org/tx/',
      arbitrum: 'https://arbiscan.io/tx/',
      polygon: 'https://polygonscan.com/tx/',
      optimism: 'https://optimistic.etherscan.io/tx/',
      bsc: 'https://bscscan.com/tx/',
      avalanche: 'https://snowtrace.io/tx/',
    };

    // If we already have the swap data from the quote
    if (quote.rawQuote.tx) {
      return {
        chain: quote.chain,
        transaction: {
          to: quote.rawQuote.tx.to,
          data: quote.rawQuote.tx.data,
          value: quote.rawQuote.tx.value,
          gasLimit: quote.rawQuote.tx.gas,
          from: userAddress,
        },
        type: 'evm',
        explorerBaseUrl: explorerUrls[quote.chain] || 'https://etherscan.io/tx/',
      };
    }

    // Need to fetch swap data
    if (quote.rawQuote.needsSwapBuild) {
      const params = new URLSearchParams({
        src: quote.inputToken,
        dst: quote.outputToken,
        amount: quote.inputAmount,
        from: quote.rawQuote.userAddress,
        slippage: quote.rawQuote.slippage.toString(),
        disableEstimate: 'true',
      });

      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (this.oneInchApiKey) {
        headers['Authorization'] = `Bearer ${this.oneInchApiKey}`;
      }

      const response = await fetch(
        `${ONEINCH_BASE_URL}/${chainId}/swap?${params}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`1inch swap build failed: ${await response.text()}`);
      }

      const data = await response.json();

      return {
        chain: quote.chain,
        transaction: {
          to: data.tx.to,
          data: data.tx.data,
          value: data.tx.value,
          gasLimit: data.tx.gas,
          from: userAddress,
        },
        type: 'evm',
        explorerBaseUrl: explorerUrls[quote.chain] || 'https://etherscan.io/tx/',
      };
    }

    throw new Error('Unable to build swap transaction');
  }

  private async trackEvmTransaction(
    chain: string,
    txHash: string,
    onStatusUpdate?: (status: 'pending' | 'confirmed' | 'failed') => void
  ): Promise<TransactionResult> {
    onStatusUpdate?.('pending');

    const rpcUrl = RPC_ENDPOINTS[chain];
    if (!rpcUrl) throw new Error(`No RPC for chain: ${chain}`);

    const explorerUrls: Record<string, string> = {
      ethereum: 'https://etherscan.io/tx/',
      base: 'https://basescan.org/tx/',
      arbitrum: 'https://arbiscan.io/tx/',
      polygon: 'https://polygonscan.com/tx/',
      optimism: 'https://optimistic.etherscan.io/tx/',
      bsc: 'https://bscscan.com/tx/',
      avalanche: 'https://snowtrace.io/tx/',
    };

    const maxRetries = 60;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          }),
        });

        const { result } = await response.json();

        if (result) {
          const success = result.status === '0x1';
          onStatusUpdate?.(success ? 'confirmed' : 'failed');
          
          return {
            success,
            txHash,
            explorerUrl: `${explorerUrls[chain] || 'https://etherscan.io/tx/'}${txHash}`,
            status: success ? 'confirmed' : 'failed',
            error: success ? undefined : 'Transaction reverted',
          };
        }
      } catch (err) {
        console.warn('EVM tx status check error:', err);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      retries++;
    }

    return {
      success: false,
      txHash,
      explorerUrl: `${explorerUrls[chain] || 'https://etherscan.io/tx/'}${txHash}`,
      status: 'pending',
      error: 'Transaction confirmation timeout',
    };
  }

  // ==================== UTILITIES ====================

  private isNativeToken(token: string): boolean {
    const natives = ['SOL', 'ETH', 'MATIC', 'BNB', 'AVAX', 'NATIVE'];
    return natives.includes(token.toUpperCase()) || 
           token === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  }

  private calculateMinOutput(amount: string, slippage: number): string {
    const amountBig = BigInt(amount);
    const slippageFactor = BigInt(Math.floor((100 - slippage) * 100));
    return ((amountBig * slippageFactor) / BigInt(10000)).toString();
  }

  /**
   * Format token amount for display
   */
  formatAmount(amount: string, decimals: number = 18): string {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toFixed(6);
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): string[] {
    return ['solana', 'ethereum', 'base', 'arbitrum', 'polygon', 'optimism', 'bsc', 'avalanche'];
  }
}

export const dexSwapService = new DexSwapService();
