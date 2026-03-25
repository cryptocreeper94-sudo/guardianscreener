import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface PriceUpdate {
  tokenId: string;
  chain: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  timestamp: number;
}

interface Subscription {
  ws: WebSocket;
  tokens: Set<string>;
  chains: Set<string>;
}

const subscriptions = new Map<WebSocket, Subscription>();
let wss: WebSocketServer | null = null;

export function setupGuardianScannerWS(server: Server) {
  wss = new WebSocketServer({ 
    server, 
    path: '/ws/guardian-scanner'
  });

  console.log('[Guardian WS] WebSocket server initialized on /ws/guardian-scanner');

  wss.on('connection', (ws) => {
    console.log('[Guardian WS] Client connected');
    
    const subscription: Subscription = {
      ws,
      tokens: new Set(),
      chains: new Set(['all'])
    };
    subscriptions.set(ws, subscription);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleMessage(ws, msg, subscription);
      } catch (err) {
        console.error('[Guardian WS] Invalid message:', err);
      }
    });

    ws.on('close', () => {
      subscriptions.delete(ws);
      console.log('[Guardian WS] Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('[Guardian WS] WebSocket error:', err);
      subscriptions.delete(ws);
    });

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Guardian Scanner live feed connected',
      timestamp: Date.now()
    }));
  });

  startPriceSimulation();

  return wss;
}

function handleMessage(ws: WebSocket, msg: any, sub: Subscription) {
  switch (msg.type) {
    case 'subscribe':
      if (msg.tokens) {
        msg.tokens.forEach((t: string) => sub.tokens.add(t));
      }
      if (msg.chains) {
        sub.chains.clear();
        msg.chains.forEach((c: string) => sub.chains.add(c));
      }
      ws.send(JSON.stringify({
        type: 'subscribed',
        tokens: Array.from(sub.tokens),
        chains: Array.from(sub.chains)
      }));
      break;

    case 'unsubscribe':
      if (msg.tokens) {
        msg.tokens.forEach((t: string) => sub.tokens.delete(t));
      }
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
  }
}

function broadcastPriceUpdate(update: PriceUpdate) {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'price_update',
    data: update
  });

  subscriptions.forEach((sub) => {
    const chainMatch = sub.chains.has('all') || sub.chains.has(update.chain);
    const tokenMatch = sub.tokens.size === 0 || sub.tokens.has(update.tokenId);

    if (chainMatch && tokenMatch && sub.ws.readyState === WebSocket.OPEN) {
      sub.ws.send(message);
    }
  });
}

const SIMULATED_TOKENS = [
  { id: 'pepe', chain: 'Ethereum', basePrice: 0.00001234 },
  { id: 'bonk', chain: 'Solana', basePrice: 0.00000234 },
  { id: 'wif', chain: 'Solana', basePrice: 2.45 },
  { id: 'degen', chain: 'Base', basePrice: 0.012 },
  { id: 'brett', chain: 'Base', basePrice: 0.089 },
  { id: 'floki', chain: 'BSC', basePrice: 0.00018 },
  { id: 'shib', chain: 'Ethereum', basePrice: 0.000024 },
  { id: 'arb', chain: 'Arbitrum', basePrice: 1.12 },
  { id: 'op', chain: 'Optimism', basePrice: 2.34 },
  { id: 'matic', chain: 'Polygon', basePrice: 0.78 },
];

function startPriceSimulation() {
  setInterval(() => {
    const token = SIMULATED_TOKENS[Math.floor(Math.random() * SIMULATED_TOKENS.length)];
    const priceChange = (Math.random() - 0.5) * 0.02;
    const newPrice = token.basePrice * (1 + priceChange);
    
    const update: PriceUpdate = {
      tokenId: token.id,
      chain: token.chain,
      price: newPrice,
      priceChange24h: (Math.random() - 0.3) * 30,
      volume24h: Math.random() * 10000000,
      marketCap: newPrice * (1000000000 + Math.random() * 9000000000),
      timestamp: Date.now()
    };

    broadcastPriceUpdate(update);
  }, 500);
}

export function getConnectedClients(): number {
  return subscriptions.size;
}
