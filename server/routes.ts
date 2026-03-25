import { type Express } from "express";
import { GuardianScreenerService } from "./guardian-screener-service";

export function registerRoutes(app: Express) {
  app.get('/api/guardian-screener/tokens', async (req, res) => {
    try {
      const chain = req.query.chain as string;
      const filter = req.query.filter as string;
      
      let data = [];
      if (filter === "gainers") {
        data = await GuardianScreenerService.getTopGainers(chain);
      } else if (filter === "new") {
        data = await GuardianScreenerService.getNewPairs(chain);
      } else {
        data = await GuardianScreenerService.getTrendingTokens(chain);
      }
      
      res.json({ tokens: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get('/api/guardian-screener/token/:chain/:address', async (req, res) => {
    try {
      const { chain, address } = req.params;
      const data = await GuardianScreenerService.getTokenByAddress(address, true);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  // Add other routes mapped to pulse services as needed
}
