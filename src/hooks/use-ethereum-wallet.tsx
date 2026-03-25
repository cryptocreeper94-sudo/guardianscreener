import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { EthereumWallet, TokenBalance, EthTransaction } from '@shared/wallet-types';

type ProviderName = 'MetaMask' | 'WalletConnect' | 'Unknown';

export function useEthereumWallet() {
  const [wallet, setWallet] = useState<EthereumWallet | null>(null);
  const [providerName, setProviderName] = useState<ProviderName>('Unknown');
  const queryClient = useQueryClient();

  const connectMetaMask = useCallback(async () => {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
        const address = accounts[0];
        const pw: EthereumWallet = {
          address,
          chainId: parseInt(chainId, 16),
          providerName: 'MetaMask',
          connectedAt: new Date().toISOString()
        };
        setProviderName('MetaMask');
        setWallet(pw);
        queryClient.invalidateQueries({ queryKey: ['eth-balances', address] });
      } catch (err) {
        console.error('MetaMask connect error', err);
        throw err;
      }
    } else {
      throw new Error('MetaMask not found');
    }
  }, [queryClient]);

  const disconnect = useCallback(() => {
    setWallet(null);
    setProviderName('Unknown');
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    if ((window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + chainId.toString(16) }]
        });
      } catch (err) {
        console.warn('Network switch request failed', err);
        throw err;
      }
    } else {
      throw new Error('No ethereum provider');
    }
  }, []);

  const fetchEthBalances = useCallback(async (address: string): Promise<TokenBalance[]> => {
    if (!(window as any).ethereum) {
      return [{ tokenAddress: null, symbol: 'ETH', decimals: 18, amountRaw: '0', amount: '0' }];
    }
    try {
      const balanceHex = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      const balanceWei = BigInt(balanceHex);
      const balanceEth = Number(balanceWei) / (10 ** 18);
      return [{
        tokenAddress: null,
        symbol: 'ETH',
        decimals: 18,
        amountRaw: balanceWei.toString(),
        amount: balanceEth.toFixed(6)
      }];
    } catch (err) {
      console.error('Failed to fetch ETH balance:', err);
      return [{ tokenAddress: null, symbol: 'ETH', decimals: 18, amountRaw: '0', amount: '0' }];
    }
  }, []);

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: wallet ? ['eth-balances', wallet.address] : ['eth-balances', 'none'],
    queryFn: () => fetchEthBalances(wallet!.address),
    enabled: !!wallet?.address,
    staleTime: 30_000
  });

  const signTransaction = useCallback(async (tx: Omit<EthTransaction, 'signedRaw'>) => {
    if (!wallet) throw new Error('Wallet not connected');
    if (!(window as any).ethereum) throw new Error('No Ethereum provider found');
    
    try {
      const txParams = {
        from: wallet.address,
        to: tx.to,
        value: tx.value ? '0x' + BigInt(tx.value).toString(16) : '0x0',
        data: tx.data || '0x',
        gas: tx.gasLimit ? '0x' + BigInt(tx.gasLimit).toString(16) : undefined,
      };
      
      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      
      return { ...tx, signedRaw: txHash, hash: txHash } as EthTransaction;
    } catch (err: any) {
      console.error('Transaction signing failed:', err);
      throw new Error(err.message || 'Failed to sign transaction');
    }
  }, [wallet]);

  const getBalance = useCallback(async (address: string): Promise<string> => {
    if (!(window as any).ethereum) return '0';
    try {
      const balance = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      return (BigInt(balance) / BigInt(10 ** 18)).toString();
    } catch {
      return '0';
    }
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!wallet) throw new Error('Wallet not connected');
    if (!(window as any).ethereum) throw new Error('No Ethereum provider found');
    
    try {
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, wallet.address],
      });
      return signature;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to sign message');
    }
  }, [wallet]);

  useEffect(() => {
  }, []);

  return {
    wallet,
    providerName,
    connectMetaMask,
    disconnect,
    switchNetwork,
    balances,
    balancesLoading,
    signTransaction,
    signMessage,
    getBalance,
    queryClient
  };
}
