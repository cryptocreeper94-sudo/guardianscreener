import { useEffect, useRef, useState, useCallback } from 'react';

export interface PriceUpdate {
  tokenId: string;
  chain: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  timestamp: number;
}

interface UseGuardianWSOptions {
  chains?: string[];
  tokens?: string[];
  enabled?: boolean;
}

export function useGuardianWS(options: UseGuardianWSOptions = {}) {
  const { chains = ['all'], tokens = [], enabled = true } = options;
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<PriceUpdate | null>(null);
  const [updates, setUpdates] = useState<Map<string, PriceUpdate>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/guardian-screener`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptsRef.current = 0; // Reset backoff
      console.log('[Guardian WS] Connected');
      
      ws.send(JSON.stringify({
        type: 'subscribe',
        chains,
        tokens
      }));

      // Setup keep-alive ping loop (every 30s)
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'price_update') {
          const update = msg.data as PriceUpdate;
          setLastUpdate(update);
          setUpdates((prev: Map<string, PriceUpdate>) => {
            const next = new Map(prev);
            next.set(update.tokenId, update);
            return next;
          });
        }
      } catch (err) {
        console.error('[Guardian WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('[Guardian WS] Disconnected');
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      if (enabled) {
        const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        console.log(`[Guardian WS] Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (err) => {
      console.error('[Guardian WS] Error:', err);
    };
  }, [enabled, chains, tokens]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  const subscribe = useCallback((newTokens: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        tokens: newTokens
      }));
    }
  }, []);

  const getUpdate = useCallback((tokenId: string): PriceUpdate | undefined => {
    return updates.get(tokenId);
  }, [updates]);

  return {
    connected,
    lastUpdate,
    updates,
    getUpdate,
    subscribe,
    disconnect
  };
}
