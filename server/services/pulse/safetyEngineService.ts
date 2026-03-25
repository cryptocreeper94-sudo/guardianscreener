import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import axios from 'axios';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const PUBLIC_SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const HELIUS_RPC = HELIUS_API_KEY 
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}` 
  : PUBLIC_SOLANA_RPC;
const RUGCHECK_API = 'https://api.rugcheck.xyz/v1';

export interface TokenSafetyReport {
  tokenAddress: string;
  tokenSymbol?: string;
  tokenName?: string;
  
  // Authority Checks
  hasMintAuthority: boolean;
  hasFreezeAuthority: boolean;
  mintAuthorityAddress?: string;
  freezeAuthorityAddress?: string;
  
  // Liquidity Safety
  liquidityLocked: boolean;
  liquidityBurned: boolean;
  liquidityLockDuration?: number; // days
  liquidityLockPlatform?: string;
  lpTokenAddress?: string;
  
  // Honeypot Detection
  honeypotResult: {
    canSell: boolean;
    sellTax: number;
    buyTax: number;
    isHoneypot: boolean;
    simulationError?: string;
  };
  
  // Token Age
  tokenAgeMinutes: number;
  createdAt?: Date;
  
  // Creator Analysis
  creatorWallet: string;
  creatorPreviousTokens: number;
  creatorRugCount: number;
  creatorSuccessRate: number;
  creatorRiskScore: number; // 0-100, higher = riskier
  
  // Holder Distribution
  top10HoldersPercent: number;
  holderCount: number;
  
  // Overall Safety Score
  safetyScore: number; // 0-100, higher = safer
  safetyGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  risks: string[];
  warnings: string[];
  passesAllChecks: boolean;
}

export interface SafetyCheckConfig {
  requireNoMintAuthority: boolean;
  requireNoFreezeAuthority: boolean;
  requireLockedOrBurnedLiquidity: boolean;
  requireHoneypotCheck: boolean;
  minTokenAgeMinutes: number;
  maxCreatorRiskScore: number;
  maxTop10HoldersPercent: number;
  minHolderCount: number;
  minLiquidityUsd: number;
}

export const DEFAULT_SAFETY_CONFIG: SafetyCheckConfig = {
  requireNoMintAuthority: true,
  requireNoFreezeAuthority: true,
  requireLockedOrBurnedLiquidity: true,
  requireHoneypotCheck: true,
  minTokenAgeMinutes: 5,
  maxCreatorRiskScore: 70,
  maxTop10HoldersPercent: 50,
  minHolderCount: 50,
  minLiquidityUsd: 5000,
};

class SafetyEngineService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(HELIUS_RPC, 'confirmed');
  }

  // ============================================
  // MAIN SAFETY CHECK
  // ============================================

  async runFullSafetyCheck(
    tokenAddress: string,
    config: SafetyCheckConfig = DEFAULT_SAFETY_CONFIG
  ): Promise<TokenSafetyReport> {
    console.log(`[SafetyEngine] Running full safety check for ${tokenAddress}`);
    
    const risks: string[] = [];
    const warnings: string[] = [];
    
    // Run all checks in parallel for speed
    const [
      authorityCheck,
      liquidityCheck,
      honeypotCheck,
      tokenInfo,
      creatorAnalysis,
      holderAnalysis,
    ] = await Promise.all([
      this.checkTokenAuthorities(tokenAddress),
      this.checkLiquiditySafety(tokenAddress),
      this.simulateHoneypot(tokenAddress),
      this.getTokenInfo(tokenAddress),
      this.analyzeCreatorWallet(tokenAddress),
      this.analyzeHolderDistribution(tokenAddress),
    ]);

    // Evaluate mint authority
    if (authorityCheck.hasMintAuthority) {
      if (config.requireNoMintAuthority) {
        risks.push('Token has active mint authority - supply can be inflated');
      } else {
        warnings.push('Mint authority exists but not blocking');
      }
    }

    // Evaluate freeze authority
    if (authorityCheck.hasFreezeAuthority) {
      if (config.requireNoFreezeAuthority) {
        risks.push('Token has freeze authority - your wallet can be frozen');
      } else {
        warnings.push('Freeze authority exists but not blocking');
      }
    }

    // Evaluate liquidity
    if (!liquidityCheck.liquidityLocked && !liquidityCheck.liquidityBurned) {
      if (config.requireLockedOrBurnedLiquidity) {
        risks.push('Liquidity is not locked or burned - rug pull possible');
      } else {
        warnings.push('Liquidity not locked/burned - exercise caution');
      }
    }

    // Evaluate honeypot
    if (honeypotCheck.isHoneypot) {
      risks.push('HONEYPOT DETECTED - Cannot sell this token');
    } else if (!honeypotCheck.canSell) {
      risks.push(`Sell simulation failed: ${honeypotCheck.simulationError}`);
    } else if (honeypotCheck.sellTax > 10) {
      warnings.push(`High sell tax detected: ${honeypotCheck.sellTax}%`);
    }

    // Evaluate token age
    if (tokenInfo.ageMinutes < config.minTokenAgeMinutes) {
      warnings.push(`Token very new: ${tokenInfo.ageMinutes} minutes old`);
    }

    // Evaluate creator
    if (creatorAnalysis.riskScore > config.maxCreatorRiskScore) {
      risks.push(`Creator wallet high risk (score: ${creatorAnalysis.riskScore}/100)`);
    }
    if (creatorAnalysis.rugCount > 0) {
      risks.push(`Creator has ${creatorAnalysis.rugCount} previous rugs`);
    }

    // Evaluate holder distribution
    if (holderAnalysis.top10Percent > config.maxTop10HoldersPercent) {
      risks.push(`Top 10 holders own ${holderAnalysis.top10Percent.toFixed(1)}% - concentration risk`);
    }
    if (holderAnalysis.holderCount < config.minHolderCount) {
      warnings.push(`Only ${holderAnalysis.holderCount} holders - low distribution`);
    }

    // Calculate safety score
    let safetyScore = 100;
    safetyScore -= risks.length * 20;
    safetyScore -= warnings.length * 5;
    safetyScore = Math.max(0, Math.min(100, safetyScore));

    const safetyGrade = this.scoreToGrade(safetyScore);
    const passesAllChecks = risks.length === 0;

    const report: TokenSafetyReport = {
      tokenAddress,
      tokenSymbol: tokenInfo.symbol,
      tokenName: tokenInfo.name,
      
      hasMintAuthority: authorityCheck.hasMintAuthority,
      hasFreezeAuthority: authorityCheck.hasFreezeAuthority,
      mintAuthorityAddress: authorityCheck.mintAuthority,
      freezeAuthorityAddress: authorityCheck.freezeAuthority,
      
      liquidityLocked: liquidityCheck.liquidityLocked,
      liquidityBurned: liquidityCheck.liquidityBurned,
      liquidityLockDuration: liquidityCheck.lockDurationDays,
      liquidityLockPlatform: liquidityCheck.lockPlatform,
      lpTokenAddress: liquidityCheck.lpTokenAddress,
      
      honeypotResult: honeypotCheck,
      
      tokenAgeMinutes: tokenInfo.ageMinutes,
      createdAt: tokenInfo.createdAt,
      
      creatorWallet: creatorAnalysis.walletAddress,
      creatorPreviousTokens: creatorAnalysis.previousTokens,
      creatorRugCount: creatorAnalysis.rugCount,
      creatorSuccessRate: creatorAnalysis.successRate,
      creatorRiskScore: creatorAnalysis.riskScore,
      
      top10HoldersPercent: holderAnalysis.top10Percent,
      holderCount: holderAnalysis.holderCount,
      
      safetyScore,
      safetyGrade,
      risks,
      warnings,
      passesAllChecks,
    };

    console.log(`[SafetyEngine] Check complete. Score: ${safetyScore}/100 (${safetyGrade}), Risks: ${risks.length}`);
    return report;
  }

  // ============================================
  // AUTHORITY CHECKS (Mint & Freeze)
  // ============================================

  async checkTokenAuthorities(tokenAddress: string): Promise<{
    hasMintAuthority: boolean;
    hasFreezeAuthority: boolean;
    mintAuthority?: string;
    freezeAuthority?: string;
  }> {
    try {
      const mintPubkey = new PublicKey(tokenAddress);
      const accountInfo = await this.connection.getAccountInfo(mintPubkey);
      
      if (!accountInfo) {
        return { hasMintAuthority: true, hasFreezeAuthority: true };
      }

      // Parse mint account data (SPL Token mint layout)
      // Bytes 0-4: mintAuthorityOption (4 bytes)
      // Bytes 4-36: mintAuthority (32 bytes) 
      // Bytes 36-44: supply (8 bytes)
      // Bytes 44-45: decimals (1 byte)
      // Bytes 45-46: isInitialized (1 byte)
      // Bytes 46-50: freezeAuthorityOption (4 bytes)
      // Bytes 50-82: freezeAuthority (32 bytes)

      const data = accountInfo.data;
      
      // Check mint authority (first 4 bytes indicate if present)
      const mintAuthorityOption = data.readUInt32LE(0);
      const hasMintAuthority = mintAuthorityOption === 1;
      let mintAuthority: string | undefined;
      
      if (hasMintAuthority) {
        const mintAuthorityBytes = data.slice(4, 36);
        mintAuthority = new PublicKey(mintAuthorityBytes).toBase58();
      }

      // Check freeze authority (bytes 46-50 indicate if present)
      const freezeAuthorityOption = data.readUInt32LE(46);
      const hasFreezeAuthority = freezeAuthorityOption === 1;
      let freezeAuthority: string | undefined;
      
      if (hasFreezeAuthority) {
        const freezeAuthorityBytes = data.slice(50, 82);
        freezeAuthority = new PublicKey(freezeAuthorityBytes).toBase58();
      }

      console.log(`[SafetyEngine] Authorities - Mint: ${hasMintAuthority}, Freeze: ${hasFreezeAuthority}`);
      
      return {
        hasMintAuthority,
        hasFreezeAuthority,
        mintAuthority,
        freezeAuthority,
      };
    } catch (error) {
      console.error('[SafetyEngine] Error checking authorities:', error);
      return { hasMintAuthority: true, hasFreezeAuthority: true };
    }
  }

  // ============================================
  // LIQUIDITY LOCK/BURN CHECK
  // ============================================

  async checkLiquiditySafety(tokenAddress: string): Promise<{
    liquidityLocked: boolean;
    liquidityBurned: boolean;
    lockDurationDays?: number;
    lockPlatform?: string;
    lpTokenAddress?: string;
    totalLiquidityUsd?: number;
  }> {
    try {
      // Check common liquidity lock services
      const [raydiumCheck, pumpfunCheck] = await Promise.all([
        this.checkRaydiumLiquidity(tokenAddress),
        this.checkPumpFunToken(tokenAddress),
      ]);

      // Pump.fun tokens have burned liquidity by design
      if (pumpfunCheck.isPumpFun) {
        return {
          liquidityLocked: false,
          liquidityBurned: true,
          lockPlatform: 'pump.fun (burned)',
          lpTokenAddress: pumpfunCheck.lpAddress,
        };
      }

      // Check Raydium pools
      if (raydiumCheck.hasPool) {
        return {
          liquidityLocked: raydiumCheck.isLocked,
          liquidityBurned: raydiumCheck.isBurned,
          lockDurationDays: raydiumCheck.lockDays,
          lockPlatform: raydiumCheck.lockPlatform,
          lpTokenAddress: raydiumCheck.lpAddress,
          totalLiquidityUsd: raydiumCheck.liquidityUsd,
        };
      }

      return {
        liquidityLocked: false,
        liquidityBurned: false,
      };
    } catch (error) {
      console.error('[SafetyEngine] Error checking liquidity:', error);
      return { liquidityLocked: false, liquidityBurned: false };
    }
  }

  private async checkRaydiumLiquidity(tokenAddress: string): Promise<{
    hasPool: boolean;
    isLocked: boolean;
    isBurned: boolean;
    lockDays?: number;
    lockPlatform?: string;
    lpAddress?: string;
    liquidityUsd?: number;
  }> {
    try {
      // Query Dexscreener for pool info
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
        { timeout: 10000 }
      );

      const pairs = response.data?.pairs;
      if (!pairs || pairs.length === 0) {
        return { hasPool: false, isLocked: false, isBurned: false };
      }

      // Find main Raydium/Orca pool
      const mainPool = pairs.find((p: any) => 
        ['raydium', 'orca', 'meteora'].includes(p.dexId?.toLowerCase())
      ) || pairs[0];

      const lpAddress = mainPool.pairAddress;
      const liquidityUsd = mainPool.liquidity?.usd || 0;

      // Check if LP tokens are burned (sent to dead address or null address)
      // Common burn addresses
      const burnAddresses = [
        '1111111111111111111111111111111111111111111',
        '11111111111111111111111111111111',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      ];

      // Check LP token holder distribution
      const lpHolders = await this.getLpTokenHolders(lpAddress);
      const burnedPercent = lpHolders
        .filter(h => burnAddresses.includes(h.address))
        .reduce((sum, h) => sum + h.percent, 0);

      const isBurned = burnedPercent > 95;

      // Check for known lock platforms (Unicrypt, Team Finance, etc)
      const lockPlatforms = [
        { name: 'Unicrypt', prefix: 'univ2' },
        { name: 'Team Finance', prefix: 'team' },
        { name: 'PinkLock', prefix: 'pink' },
      ];

      let isLocked = false;
      let lockPlatform: string | undefined;

      for (const holder of lpHolders) {
        for (const platform of lockPlatforms) {
          if (holder.address.toLowerCase().includes(platform.prefix)) {
            isLocked = true;
            lockPlatform = platform.name;
            break;
          }
        }
      }

      return {
        hasPool: true,
        isLocked,
        isBurned,
        lockPlatform,
        lpAddress,
        liquidityUsd,
      };
    } catch (error) {
      console.error('[SafetyEngine] Raydium check error:', error);
      return { hasPool: false, isLocked: false, isBurned: false };
    }
  }

  private async checkPumpFunToken(tokenAddress: string): Promise<{
    isPumpFun: boolean;
    lpAddress?: string;
    graduated: boolean;
  }> {
    try {
      // Check if token is from pump.fun by checking the token metadata
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
        { timeout: 5000 }
      );

      const pairs = response.data?.pairs;
      if (!pairs) return { isPumpFun: false, graduated: false };

      const pumpPair = pairs.find((p: any) => 
        p.dexId?.toLowerCase() === 'pumpfun' || 
        p.url?.includes('pump.fun')
      );

      if (pumpPair) {
        // Check if graduated (moved to Raydium)
        const raydiumPair = pairs.find((p: any) => p.dexId?.toLowerCase() === 'raydium');
        
        return {
          isPumpFun: true,
          lpAddress: pumpPair.pairAddress,
          graduated: !!raydiumPair,
        };
      }

      return { isPumpFun: false, graduated: false };
    } catch (error) {
      return { isPumpFun: false, graduated: false };
    }
  }

  private async getLpTokenHolders(lpAddress: string): Promise<Array<{ address: string; percent: number }>> {
    try {
      // Use Helius to get token holders
      const response = await axios.post(
        HELIUS_RPC,
        {
          jsonrpc: '2.0',
          id: 'lp-holders',
          method: 'getTokenLargestAccounts',
          params: [lpAddress],
        },
        { timeout: 10000 }
      );

      const accounts = response.data?.result?.value || [];
      const totalSupply = accounts.reduce((sum: number, a: any) => sum + parseFloat(a.amount), 0);

      return accounts.map((a: any) => ({
        address: a.address,
        percent: (parseFloat(a.amount) / totalSupply) * 100,
      }));
    } catch (error) {
      return [];
    }
  }

  // ============================================
  // RUGCHECK API INTEGRATION
  // ============================================

  async getRugCheckReport(tokenAddress: string): Promise<{
    success: boolean;
    score: number;
    risks: Array<{ level: string; name: string; description: string }>;
    isHoneypot: boolean;
    mintAuthorityActive: boolean;
    freezeAuthorityActive: boolean;
    top10HoldersPercent: number;
    liquidityLocked: boolean;
  } | null> {
    try {
      console.log(`[SafetyEngine] Fetching RugCheck report for ${tokenAddress}`);
      
      const response = await axios.get(
        `${RUGCHECK_API}/tokens/${tokenAddress}/report/summary`,
        { timeout: 15000 }
      );

      const data = response.data;
      if (!data) return null;

      // Parse risks from RugCheck response
      const risks = data.risks || [];
      
      // Check for specific honeypot indicators in risks
      const honeypotRisks = risks.filter((r: any) => 
        r.name?.toLowerCase().includes('honeypot') ||
        r.name?.toLowerCase().includes('cannot sell') ||
        r.name?.toLowerCase().includes('transfer blocked') ||
        r.description?.toLowerCase().includes('cannot sell') ||
        r.description?.toLowerCase().includes('honeypot')
      );

      // Check for mint/freeze authority
      const mintRisk = risks.find((r: any) => 
        r.name?.toLowerCase().includes('mint') && 
        r.level !== 'none'
      );
      const freezeRisk = risks.find((r: any) => 
        r.name?.toLowerCase().includes('freeze') && 
        r.level !== 'none'
      );

      // RugCheck score: lower = safer, higher = riskier
      const score = data.score || 0;

      console.log(`[SafetyEngine] RugCheck score: ${score}, risks: ${risks.length}`);

      return {
        success: true,
        score,
        risks,
        isHoneypot: honeypotRisks.length > 0,
        mintAuthorityActive: !!mintRisk,
        freezeAuthorityActive: !!freezeRisk,
        top10HoldersPercent: data.topHolders?.percentage || 0,
        liquidityLocked: data.liquidity?.locked || false,
      };
    } catch (error: any) {
      console.log(`[SafetyEngine] RugCheck API unavailable: ${error.message}`);
      return null;
    }
  }

  // ============================================
  // HONEYPOT SIMULATION (Multi-Source)
  // ============================================

  async simulateHoneypot(tokenAddress: string): Promise<{
    canSell: boolean;
    sellTax: number;
    buyTax: number;
    isHoneypot: boolean;
    simulationError?: string;
    source: string;
  }> {
    console.log(`[SafetyEngine] Running multi-source honeypot check for ${tokenAddress}`);

    // Source 1: Try RugCheck API first (most reliable)
    const rugCheckResult = await this.getRugCheckReport(tokenAddress);
    
    if (rugCheckResult?.success) {
      // RugCheck explicitly detected honeypot
      if (rugCheckResult.isHoneypot) {
        console.log(`[SafetyEngine] RugCheck confirmed honeypot`);
        return {
          canSell: false,
          sellTax: 100,
          buyTax: 0,
          isHoneypot: true,
          source: 'rugcheck',
        };
      }
      
      // RugCheck says it's safe - trust it
      // Score under 50 is generally safe (lower = safer in RugCheck)
      if (rugCheckResult.score < 50) {
        console.log(`[SafetyEngine] RugCheck score ${rugCheckResult.score} - likely safe`);
        return {
          canSell: true,
          sellTax: 0,
          buyTax: 0,
          isHoneypot: false,
          source: 'rugcheck',
        };
      }
    }

    // Source 2: Jupiter quote simulation as secondary check
    try {
      const inputMint = tokenAddress;
      const outputMint = 'So11111111111111111111111111111111111111112'; // SOL
      
      // Try multiple amounts to avoid false negatives from low liquidity
      const amounts = ['1000000000', '100000000', '10000000']; // 1B, 100M, 10M
      
      for (const amount of amounts) {
        try {
          const quoteResponse = await axios.get(
            `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=2000`,
            { timeout: 8000 }
          );

          if (quoteResponse.data && quoteResponse.data.outAmount) {
            // Successfully got a quote - can sell
            const priceImpact = Math.abs(parseFloat(quoteResponse.data.priceImpactPct || '0'));
            const sellTax = Math.min(priceImpact, 100);
            
            // Only mark as honeypot if sell tax is extremely high (>80%)
            const isHoneypot = sellTax > 80;
            
            console.log(`[SafetyEngine] Jupiter quote success - sell tax: ${sellTax}%`);
            return {
              canSell: true,
              sellTax,
              buyTax: 0,
              isHoneypot,
              source: 'jupiter',
            };
          }
        } catch (err) {
          // Try next amount
          continue;
        }
      }
      
      // No Jupiter route found - but this doesn't mean honeypot!
      // Could be low liquidity, new token, or niche DEX
      console.log(`[SafetyEngine] No Jupiter route - returning unknown (not marking as honeypot)`);
      return {
        canSell: false,
        sellTax: 0,
        buyTax: 0,
        isHoneypot: false, // Don't assume honeypot just because no route
        simulationError: 'No trading route found - may have low liquidity',
        source: 'jupiter',
      };
      
    } catch (error: any) {
      console.error('[SafetyEngine] Jupiter simulation error:', error.message);
    }

    // Fallback: Unknown - don't mark as honeypot without evidence
    console.log(`[SafetyEngine] All checks inconclusive - not marking as honeypot`);
    return {
      canSell: false,
      sellTax: 0,
      buyTax: 0,
      isHoneypot: false,
      simulationError: 'Could not verify - proceed with caution',
      source: 'unknown',
    };
  }

  // ============================================
  // TOKEN INFO
  // ============================================

  async getTokenInfo(tokenAddress: string): Promise<{
    symbol?: string;
    name?: string;
    ageMinutes: number;
    createdAt?: Date;
    supply?: string;
    decimals?: number;
  }> {
    try {
      // Get token metadata from Helius
      const response = await axios.post(
        HELIUS_RPC,
        {
          jsonrpc: '2.0',
          id: 'token-info',
          method: 'getAsset',
          params: { id: tokenAddress },
        },
        { timeout: 10000 }
      );

      const asset = response.data?.result;
      if (!asset) {
        return { ageMinutes: 0 };
      }

      // Get token creation time from first transaction
      const sigResponse = await axios.post(
        HELIUS_RPC,
        {
          jsonrpc: '2.0',
          id: 'token-sigs',
          method: 'getSignaturesForAddress',
          params: [tokenAddress, { limit: 1 }],
        },
        { timeout: 10000 }
      );

      const sigs = sigResponse.data?.result || [];
      let createdAt: Date | undefined;
      let ageMinutes = 0;

      if (sigs.length > 0 && sigs[0].blockTime) {
        createdAt = new Date(sigs[0].blockTime * 1000);
        ageMinutes = Math.floor((Date.now() - createdAt.getTime()) / 60000);
      }

      return {
        symbol: asset.content?.metadata?.symbol,
        name: asset.content?.metadata?.name,
        ageMinutes,
        createdAt,
        decimals: asset.token_info?.decimals,
      };
    } catch (error) {
      console.error('[SafetyEngine] Token info error:', error);
      return { ageMinutes: 0 };
    }
  }

  // ============================================
  // CREATOR WALLET ANALYSIS
  // ============================================

  async analyzeCreatorWallet(tokenAddress: string): Promise<{
    walletAddress: string;
    previousTokens: number;
    rugCount: number;
    successRate: number;
    riskScore: number;
  }> {
    try {
      // Get token creation transaction to find creator
      const sigResponse = await axios.post(
        HELIUS_RPC,
        {
          jsonrpc: '2.0',
          id: 'creator-search',
          method: 'getSignaturesForAddress',
          params: [tokenAddress, { limit: 1 }],
        },
        { timeout: 10000 }
      );

      const sigs = sigResponse.data?.result || [];
      if (sigs.length === 0) {
        return {
          walletAddress: 'unknown',
          previousTokens: 0,
          rugCount: 0,
          successRate: 0,
          riskScore: 50,
        };
      }

      // Get the first transaction details
      const txResponse = await axios.post(
        HELIUS_RPC,
        {
          jsonrpc: '2.0',
          id: 'creator-tx',
          method: 'getTransaction',
          params: [sigs[0].signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
        },
        { timeout: 10000 }
      );

      const tx = txResponse.data?.result;
      const creatorWallet = tx?.transaction?.message?.accountKeys?.[0]?.pubkey || 'unknown';

      // Analyze creator's history (simplified - in production would check more)
      // For now, return moderate risk as we'd need extensive history analysis
      const riskScore = 30; // Default moderate risk
      
      return {
        walletAddress: creatorWallet,
        previousTokens: 0, // Would need to scan wallet history
        rugCount: 0,
        successRate: 50,
        riskScore,
      };
    } catch (error) {
      console.error('[SafetyEngine] Creator analysis error:', error);
      return {
        walletAddress: 'unknown',
        previousTokens: 0,
        rugCount: 0,
        successRate: 0,
        riskScore: 50,
      };
    }
  }

  // ============================================
  // HOLDER DISTRIBUTION ANALYSIS
  // ============================================

  async analyzeHolderDistribution(tokenAddress: string): Promise<{
    holderCount: number;
    top10Percent: number;
    topHolders: Array<{ address: string; percent: number }>;
  }> {
    try {
      // Get largest token accounts
      const response = await axios.post(
        HELIUS_RPC,
        {
          jsonrpc: '2.0',
          id: 'holders',
          method: 'getTokenLargestAccounts',
          params: [tokenAddress],
        },
        { timeout: 10000 }
      );

      const accounts = response.data?.result?.value || [];
      
      // Get total supply
      const supplyResponse = await axios.post(
        HELIUS_RPC,
        {
          jsonrpc: '2.0',
          id: 'supply',
          method: 'getTokenSupply',
          params: [tokenAddress],
        },
        { timeout: 10000 }
      );

      const totalSupply = parseFloat(supplyResponse.data?.result?.value?.amount || '0');
      
      if (totalSupply === 0) {
        return { holderCount: 0, top10Percent: 100, topHolders: [] };
      }

      const topHolders = accounts.slice(0, 10).map((a: any) => ({
        address: a.address,
        percent: (parseFloat(a.amount) / totalSupply) * 100,
      }));

      const top10Percent = topHolders.reduce((sum: number, h: any) => sum + h.percent, 0);

      // Estimate holder count (Helius returns top 20, so this is approximate)
      const holderCount = accounts.length >= 20 ? accounts.length * 5 : accounts.length;

      return {
        holderCount,
        top10Percent,
        topHolders,
      };
    } catch (error) {
      console.error('[SafetyEngine] Holder analysis error:', error);
      return { holderCount: 0, top10Percent: 100, topHolders: [] };
    }
  }

  // ============================================
  // QUICK CHECKS (For fast filtering)
  // ============================================

  async quickAuthorityCheck(tokenAddress: string): Promise<{
    safe: boolean;
    hasMint: boolean;
    hasFreeze: boolean;
  }> {
    const result = await this.checkTokenAuthorities(tokenAddress);
    return {
      safe: !result.hasMintAuthority && !result.hasFreezeAuthority,
      hasMint: result.hasMintAuthority,
      hasFreeze: result.hasFreezeAuthority,
    };
  }

  async quickHoneypotCheck(tokenAddress: string): Promise<{
    safe: boolean;
    canSell: boolean;
    sellTax: number;
  }> {
    const result = await this.simulateHoneypot(tokenAddress);
    return {
      safe: result.canSell && !result.isHoneypot && result.sellTax < 20,
      canSell: result.canSell,
      sellTax: result.sellTax,
    };
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
}

export const safetyEngineService = new SafetyEngineService();
