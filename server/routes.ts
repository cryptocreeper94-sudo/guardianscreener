import { type Express } from "express";
import { getTokens, getTokenData } from "./guardian-scanner-service";
// import topSignals from pulse...

export function registerRoutes(app: Express) {
  app.get('/api/guardian-scanner/tokens', async (req, res) => {
    try {
      const chain = req.query.chain as string;
      const filter = req.query.filter as string;
      const data = await getTokens(chain, filter);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get('/api/guardian-scanner/token/:chain/:address', async (req, res) => {
    try {
      const { chain, address } = req.params;
      const data = await getTokenData(chain, address);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  // Add other routes mapped to pulse services as needed
}
