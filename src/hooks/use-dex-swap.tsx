/**
 * DEX Swap Hook
 * Integrates dexSwapService with wallet hooks for seamless trading
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dexSwapService, SwapQuote, SwapQuoteRequest, TransactionResult } from '@/services/dex-swap-service';
import { useWallet } from './use-wallet';

interface SwapState {
  quote: SwapQuote | null;
  isQuoting: boolean;
  isSwapping: boolean;
  isTracking: boolean;
  txStatus: 'idle' | 'pending' | 'confirmed' | 'failed';
  txHash: string | null;
  explorerUrl: string | null;
  error: string | null;
}

export function useDexSwap() {
  const { evmAddress, solanaAddress } = useWallet();
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<SwapState>({
    quote: null,
    isQuoting: false,
    isSwapping: false,
    isTracking: false,
    txStatus: 'idle',
    txHash: null,
    explorerUrl: null,
    error: null,
  });

  const getActiveAddress = useCallback((chain: string): string | null => {
    if (chain === 'solana') return solanaAddress;
    return evmAddress;
  }, [evmAddress, solanaAddress]);

  const getQuote = useCallback(async (
    chain: string,
    inputToken: string,
    outputToken: string,
    amount: string,
    slippage: number = 5
  ): Promise<SwapQuote | null> => {
    const userAddress = getActiveAddress(chain);
    if (!userAddress) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return null;
    }

    setState(prev => ({ ...prev, isQuoting: true, error: null }));

    try {
      const quote = await dexSwapService.getQuote({
        chain,
        inputToken,
        outputToken,
        amount,
        slippage,
        userAddress,
      });

      setState(prev => ({ ...prev, quote, isQuoting: false }));
      return quote;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isQuoting: false,
        error: err.message || 'Failed to get quote',
      }));
      return null;
    }
  }, [getActiveAddress]);

  const executeSwap = useCallback(async (
    quote: SwapQuote,
    onSign?: () => void,
    onSubmit?: (txHash: string) => void
  ): Promise<TransactionResult | null> => {
    const userAddress = getActiveAddress(quote.chain);
    if (!userAddress) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return null;
    }

    setState(prev => ({ 
      ...prev, 
      isSwapping: true, 
      error: null,
      txStatus: 'idle',
      txHash: null,
    }));

    try {
      // Build the transaction
      const swapTx = await dexSwapService.buildSwapTransaction(quote, userAddress);
      
      onSign?.();

      let txHash: string;

      if (swapTx.type === 'solana') {
        // Sign with Phantom
        const provider = (window as any).solana;
        if (!provider?.isPhantom) {
          throw new Error('Phantom wallet not found');
        }

        const signedTx = await provider.signTransaction(swapTx.transaction);
        
        // Send the transaction
        const { Connection } = await import('@solana/web3.js');
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        txHash = await connection.sendRawTransaction(signedTx.serialize());
        
      } else {
        // Sign with MetaMask
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          throw new Error('MetaMask not found');
        }

        txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: userAddress,
            to: swapTx.transaction.to,
            data: swapTx.transaction.data,
            value: swapTx.transaction.value ? 
              '0x' + BigInt(swapTx.transaction.value).toString(16) : '0x0',
            gas: swapTx.transaction.gasLimit ? 
              '0x' + BigInt(swapTx.transaction.gasLimit).toString(16) : undefined,
          }],
        });
      }

      const explorerUrl = `${swapTx.explorerBaseUrl}${txHash}`;
      
      setState(prev => ({
        ...prev,
        isSwapping: false,
        isTracking: true,
        txStatus: 'pending',
        txHash,
        explorerUrl,
      }));

      onSubmit?.(txHash);

      // Track the transaction
      const result = await dexSwapService.trackTransaction(
        quote.chain,
        txHash,
        (status) => {
          setState(prev => ({ ...prev, txStatus: status }));
        }
      );

      setState(prev => ({
        ...prev,
        isTracking: false,
        txStatus: result.status,
      }));

      // Invalidate balance queries
      queryClient.invalidateQueries({ queryKey: ['eth-balances'] });
      queryClient.invalidateQueries({ queryKey: ['sol-balances'] });

      return result;

    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isSwapping: false,
        isTracking: false,
        txStatus: 'failed',
        error: err.message || 'Swap failed',
      }));
      return null;
    }
  }, [getActiveAddress, queryClient]);

  const reset = useCallback(() => {
    setState({
      quote: null,
      isQuoting: false,
      isSwapping: false,
      isTracking: false,
      txStatus: 'idle',
      txHash: null,
      explorerUrl: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    getQuote,
    executeSwap,
    reset,
    supportedChains: dexSwapService.getSupportedChains(),
    formatAmount: dexSwapService.formatAmount,
  };
}

/**
 * Simplified hook for quick swaps
 */
export function useQuickSwap() {
  const { getQuote, executeSwap, ...state } = useDexSwap();
  const { isConnected } = useWallet();

  const swap = useCallback(async (params: {
    chain: string;
    inputToken: string;
    outputToken: string;
    amount: string;
    slippage?: number;
  }) => {
    if (!isConnected) {
      throw new Error('Please connect your wallet first');
    }

    const quote = await getQuote(
      params.chain,
      params.inputToken,
      params.outputToken,
      params.amount,
      params.slippage || 5
    );

    if (!quote) {
      throw new Error('Failed to get quote');
    }

    return executeSwap(quote);
  }, [isConnected, getQuote, executeSwap]);

  return {
    ...state,
    swap,
    isConnected,
  };
}
