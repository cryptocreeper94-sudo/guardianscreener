import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SolanaWallet, TokenBalance, SolanaTransaction } from '@shared/wallet-types';

export function useSolanaWallet() {
  const [wallet, setWallet] = useState<SolanaWallet | null>(null);
  const queryClient = useQueryClient();

  const connectPhantom = useCallback(async () => {
    const provider = (window as any).solana;
    if (provider && provider.isPhantom) {
      try {
        const resp = await provider.connect();
        const w: SolanaWallet = { 
          publicKey: resp.publicKey.toString(), 
          cluster: 'devnet', 
          providerName: 'Phantom', 
          connectedAt: new Date().toISOString() 
        };
        setWallet(w);
        queryClient.invalidateQueries({ queryKey: ['sol-balances', w.publicKey] });
      } catch (err) {
        console.error('Phantom connect error', err);
        throw err;
      }
    } else {
      throw new Error('Phantom not available');
    }
  }, [queryClient]);

  const disconnect = useCallback(async () => {
    setWallet(null);
  }, []);

  const switchCluster = useCallback(async (cluster: 'mainnet-beta' | 'devnet') => {
    setWallet((prev) => prev ? { ...prev, cluster } : prev);
    if (wallet?.publicKey) {
      queryClient.invalidateQueries({ queryKey: ['sol-balances', wallet.publicKey] });
    }
  }, [queryClient, wallet?.publicKey]);

  const fetchSolBalances = useCallback(async (publicKey: string): Promise<TokenBalance[]> => {
    try {
      const cluster = wallet?.cluster || 'devnet';
      const endpoint = cluster === 'mainnet-beta' 
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [publicKey],
        }),
      });
      
      const data = await response.json();
      const lamports = data.result?.value || 0;
      const solBalance = lamports / (10 ** 9);
      
      return [{
        tokenAddress: null,
        symbol: 'SOL',
        decimals: 9,
        amountRaw: lamports.toString(),
        amount: solBalance.toFixed(6)
      }];
    } catch (err) {
      console.error('Failed to fetch SOL balance:', err);
      return [{ tokenAddress: null, symbol: 'SOL', decimals: 9, amountRaw: '0', amount: '0' }];
    }
  }, [wallet?.cluster]);

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: wallet ? ['sol-balances', wallet.publicKey] : ['sol-balances', 'none'],
    queryFn: () => fetchSolBalances(wallet!.publicKey),
    enabled: !!wallet?.publicKey,
    staleTime: 30_000
  });

  const signTransaction = useCallback(async (tx: Partial<SolanaTransaction> & { rawTransaction?: any }) => {
    if (!wallet) throw new Error('Wallet not connected');
    const provider = (window as any).solana;
    if (!provider || !provider.isPhantom) throw new Error('Phantom wallet not found');
    
    try {
      if (tx.rawTransaction) {
        const signedTx = await provider.signTransaction(tx.rawTransaction);
        return { ...tx, signature: signedTx.signature?.toString() || 'signed', status: 'confirmed' as const } as SolanaTransaction;
      }
      return { ...tx, signature: 'pending', status: 'pending' as const } as SolanaTransaction;
    } catch (err: any) {
      console.error('Solana transaction signing failed:', err);
      throw new Error(err.message || 'Failed to sign transaction');
    }
  }, [wallet]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!wallet) throw new Error('Wallet not connected');
    const provider = (window as any).solana;
    if (!provider || !provider.isPhantom) throw new Error('Phantom wallet not found');
    
    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
      const bytes = new Uint8Array(signedMessage.signature);
      const base64 = btoa(String.fromCharCode(...bytes));
      return base64;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to sign message');
    }
  }, [wallet]);

  useEffect(() => {
  }, []);

  return {
    wallet,
    connectPhantom,
    disconnect,
    switchCluster,
    balances,
    balancesLoading,
    signTransaction,
    signMessage,
    queryClient
  };
}
