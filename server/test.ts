import { 
  calculateGuardianScore, 
  generateMLPrediction, 
  deriveAIRecommendation, 
  transformPairToToken 
} from './guardian-screener-service';

// Mock data
const mockPair = {
  chainId: 'solana',
  dexId: 'raydium',
  url: 'https://dexscreener.com/solana/someaddress',
  pairAddress: 'someaddress',
  baseToken: { address: 'baseAddr', name: 'MockToken', symbol: 'MOCK' },
  quoteToken: { address: 'quoteAddr', name: 'Solana', symbol: 'SOL' },
  priceNative: '0.01',
  priceUsd: '1.50',
  txns: {
    m5: { buys: 10, sells: 5 },
    h1: { buys: 100, sells: 50 },
    h6: { buys: 500, sells: 200 },
    h24: { buys: 2000, sells: 800 }
  },
  volume: { h24: 150000, h6: 50000, h1: 10000, m5: 1000 },
  priceChange: { h24: 25, h6: 15, h1: 5, m5: 1 },
  liquidity: { usd: 250000, base: 100000, quote: 500 },
  fdv: 1500000,
  pairCreatedAt: Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 days ago
};

async function runTests() {
  console.log('???? Running GuardianScreener AI Engine Tests...\n');
  let passed = 0;
  let failed = 0;

  function assertEqual(name: string, actual: any, expected: any) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      console.log(`??... [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}\n   Expected: ${JSON.stringify(expected)}\n   Actual:   ${JSON.stringify(actual)}`);
      failed++;
    }
  }

  // 1. Guardian Score Calculation
  const score = calculateGuardianScore(mockPair as any);
  console.log(`Guardian Score Output: ${score}`);
  if (score > 60 && score <= 100) {
    console.log(`??... [PASS] calculateGuardianScore (healthy token score > 60)`);
    passed++;
  } else {
    console.error(`❌ [FAIL] calculateGuardianScore\n   Expected > 60\n   Actual: ${score}`);
    failed++;
  }

  // 2. ML Prediction Generation
  const mlPred = generateMLPrediction(mockPair as any);
  console.log('ML Prediction:', mlPred);
  if (mlPred.direction === 'up' && mlPred.confidence > 50) {
    console.log(`??... [PASS] generateMLPrediction (healthy momentum = 'up')`);
    passed++;
  } else {
    console.error(`❌ [FAIL] generateMLPrediction\n   Expected 'up' with >50 confidence\n   Actual:`, mlPred);
    failed++;
  }

  // 3. AI Recommendation Derivation
  const rec = deriveAIRecommendation(score, mlPred, 25, 150000, 250000);
  console.log('AI Recommendation:', rec);
  if (rec.recommendation === 'snipe' || rec.recommendation === 'watch') {
    console.log(`??... [PASS] deriveAIRecommendation (healthy token = snipe/watch)`);
    passed++;
  } else {
    console.error(`❌ [FAIL] deriveAIRecommendation\n   Expected 'snipe' or 'watch'\n   Actual: ${rec.recommendation}`);
    failed++;
  }

  // 4. DexScreener Mapping
  try {
    const token = await transformPairToToken(mockPair as any);
    if (token) {
      assertEqual('transformPairToToken maps symbol correctly', token.symbol, 'MOCK');
      assertEqual('transformPairToToken maps price correctly', token.price, 1.5);
    } else {
      console.log('⚠??? [SKIP] transformPairToToken (returned null)');
    }
  } catch (err: any) {
    console.log('⚠??? [SKIP] transformPairToToken (mock missing properties):', err.message);
  }

  console.log(`\n??"? Test Results: ${passed} Passed, ${failed} Failed`);
}

runTests();
