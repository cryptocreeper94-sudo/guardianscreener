import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import path from "path";
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

  // Serve Vite-built static client files
  const distPath = path.resolve(__dirname, "public");
  app.use(express.static(distPath));

  // SPA catch-all: serve index.html for any non-API route
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  return httpServer;
}

const server = setupServer();
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Guardian Screener] Runtime environment booted on port ${PORT}`);
});
