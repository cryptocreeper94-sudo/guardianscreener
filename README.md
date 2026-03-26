# GuardianScreener

GuardianScreener is a high-performance multi-chain token screener and analysis dashboard built by DarkWave Studios for the Trust Layer ecosystem. It provides real-time token filtering across 12 blockchain networks using DexScreener data, enhanced with AI-driven Snipe/Watch/Avoid recommendations and automated token safety grading (Guardian Score).

## Features

- **Multi-Chain Screening**: Real-time filtering across 12 chains (Solana, Ethereum, BSC, Arbitrum, Polygon, Base, Avalanche, Fantom, Optimism, Cronos, Tron, zkSync).
- **AI Token Scoring**: Machine learning models grade tokens on a 0-100 Guardian Score and output Snipe, Watch, or Avoid recommendations.
- **WebSocket Price Feeds**: Live price, volume, and tick updates powered by robust heartbeat/reconnect-enabled WebSockets.
- **Strike Agent Dashboard**: Granular per-token safety reports (HoneyPot risk, contract mint/freeze authorities, and liquidity locks), presets, and watchlists.
- **Embedded Trading Widgets**: In-line DEX swap widgets and QuickTradePanel for immediate trade execution.
- **Professional Aesthetics**: Ultra-Premium design system with bento-box layouts, glassmorphism, UI-Avatar identity generation, and robust loading skeletons.
- **Persistent Analytics**: Intelligent prediction tracking and ML outcome validation stored securely via local disk persistence engine.

## Technology Stack

### Frontend
- React 19 + TypeScript
- Vite Build Tooling
- TailwindCSS v4 + Framer Motion
- Shadcn UI (Radix Primitives)
- Wouter (Routing)

### Backend
- Express.js Node Server
- `express-rate-limit` (IPv6-safe DDoS Protection)
- Native `ws` for WebSocket feeds

## Running Locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start Development Environment**
   This launches both the Vite client server and the Express backend simultaneously via `tsx`.
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

## Architecture Notes
- The `server/services/pulse` directory contains the core AI engines and tracking modules.
- `src/hooks/use-guardian-screener-ws.ts` handles the resilient client-side WebSocket context.
- UI assets heavily leverage Lucide-React iconography and specialized `.webmanifest` configurations optimized for Progressive Web Application (PWA) installation.
