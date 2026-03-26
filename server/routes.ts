import { type Express } from "express";
import rateLimit from "express-rate-limit";
import { guardianScreenerService } from "./guardian-screener-service";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export function registerRoutes(app: Express) {
  // Apply the rate limiting middleware to API calls only
  app.use('/api', apiLimiter);
  
  app.get('/api/guardian-screener/tokens', async (req, res) => {
    try {
      const chain = req.query.chain as string;
      const filter = req.query.filter as string;
      
      let data = [];
      if (filter === "gainers") {
        data = await guardianScreenerService.getTopGainers(chain);
      } else if (filter === "new") {
        data = await guardianScreenerService.getNewPairs(chain);
      } else {
        data = await guardianScreenerService.getTrendingTokens(chain);
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
      const data = await guardianScreenerService.getTokenByAddress(address, true);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  // Add other routes mapped to pulse services as needed
}
