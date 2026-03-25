import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupGuardianScreenerWS as setupGuardianWS } from "./guardian-screener-ws";
import { registerRoutes } from "./routes";

export function setupServer(): Server {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time prices
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws/guardian-screener' 
  });
  
  setupGuardianWS(wss);
  
  // Register API routes
  registerRoutes(app);

  return httpServer;
}

const server = setupServer();
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Guardian Screener] Runtime environment booted on port ${PORT}`);
});
