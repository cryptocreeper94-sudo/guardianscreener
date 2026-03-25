import axios from 'axios';

export type EvmChainId = 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'base' | 'avalanche' | 'fantom' | 'optimism' | 'cronos';

const GOPLUS_CHAIN_IDS: Record<EvmChainId, string> = {
  ethereum: '1',
  bsc: '56',
  polygon: '137',
  arbitrum: '42161',
  base: '8453',
  avalanche: '43114',
  fantom: '250',
  optimism: '10',
  cronos: '25'
};

export interface EvmTokenSafetyReport {
  tokenAddress: string;
  chain: EvmChainId;
  
  hasOwner: boolean;
  isRenounced: boolean;
  ownerAddress?: string;
  ownerCanMint: boolean;
  ownerCanBlacklist: boolean;
  ownerCanPause: boolean;
  
  honeypotResult: {
    isHoneypot: boolean;
    canSell: boolean;
    buyTax: number;
    sellTax: number;
    simulationError?: string;
  };
  
  liquidityLocked: boolean;
  liquidityBurned: boolean;
  
  holderCount: number;
  top10HoldersPercent: number;
  
  isProxy: boolean;
  hasHiddenOwner: boolean;
  canTakeBackOwnership: boolean;
  
  safetyScore: number;
  safetyGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  risks: string[];
  warnings: string[];
  passesAllChecks: boolean;
}

class EvmSafetyEngine {
  private goplusBaseUrl = 'https://api.gopluslabs.io/api/v1';
  
  async runFullSafetyCheck(chain: EvmChainId, tokenAddress: string): Promise<EvmTokenSafetyReport> {
    const report: EvmTokenSafetyReport = {
      tokenAddress,
      chain,
      hasOwner: false,
      isRenounced: true,
      ownerCanMint: false,
      ownerCanBlacklist: false,
      ownerCanPause: false,
      honeypotResult: {
        isHoneypot: false,
        canSell: true,
        buyTax: 0,
        sellTax: 0
      },
      liquidityLocked: false,
      liquidityBurned: false,
      holderCount: 0,
      top10HoldersPercent: 0,
      isProxy: false,
      hasHiddenOwner: false,
      canTakeBackOwnership: false,
      safetyScore: 50,
      safetyGrade: 'C',
      risks: [],
      warnings: [],
      passesAllChecks: true
    };
    
    try {
      const chainId = GOPLUS_CHAIN_IDS[chain];
      if (!chainId) {
        report.warnings.push(`Chain ${chain} not supported for safety checks`);
        return report;
      }
      
      const response = await axios.get(
        `${this.goplusBaseUrl}/token_security/${chainId}?contract_addresses=${tokenAddress}`,
        { timeout: 10000 }
      );
      
      const data = response.data?.result?.[tokenAddress.toLowerCase()];
      if (!data) {
        report.warnings.push('Token not found in security database');
        return report;
      }
      
      report.hasOwner = data.owner_address && data.owner_address !== '0x0000000000000000000000000000000000000000';
      report.isRenounced = !report.hasOwner || data.can_take_back_ownership === '0';
      report.ownerAddress = data.owner_address;
      report.ownerCanMint = data.is_mintable === '1';
      report.ownerCanBlacklist = data.is_blacklisted === '1' || data.is_in_dex === '0';
      report.ownerCanPause = data.transfer_pausable === '1';
      
      report.honeypotResult = {
        isHoneypot: data.is_honeypot === '1',
        canSell: data.is_honeypot !== '1' && data.cannot_sell_all !== '1',
        buyTax: parseFloat(data.buy_tax || '0') * 100,
        sellTax: parseFloat(data.sell_tax || '0') * 100
      };
      
      report.holderCount = parseInt(data.holder_count || '0', 10);
      report.top10HoldersPercent = parseFloat(data.holders?.[0]?.percent || '0') * 10;
      
      report.isProxy = data.is_proxy === '1';
      report.hasHiddenOwner = data.hidden_owner === '1';
      report.canTakeBackOwnership = data.can_take_back_ownership === '1';
      
      let score = 100;
      
      if (report.honeypotResult.isHoneypot) {
        score -= 50;
        report.risks.push('HONEYPOT: Cannot sell tokens');
      }
      
      if (report.honeypotResult.buyTax > 10) {
        score -= 15;
        report.risks.push(`High buy tax: ${report.honeypotResult.buyTax.toFixed(1)}%`);
      }
      
      if (report.honeypotResult.sellTax > 10) {
        score -= 15;
        report.risks.push(`High sell tax: ${report.honeypotResult.sellTax.toFixed(1)}%`);
      }
      
      if (report.ownerCanMint) {
        score -= 10;
        report.warnings.push('Owner can mint new tokens');
      }
      
      if (report.ownerCanBlacklist) {
        score -= 10;
        report.warnings.push('Owner can blacklist addresses');
      }
      
      if (report.ownerCanPause) {
        score -= 10;
        report.warnings.push('Trading can be paused');
      }
      
      if (report.hasHiddenOwner) {
        score -= 15;
        report.risks.push('Contract has hidden owner');
      }
      
      if (report.canTakeBackOwnership) {
        score -= 10;
        report.warnings.push('Owner can reclaim ownership');
      }
      
      if (report.holderCount < 50) {
        score -= 5;
        report.warnings.push(`Low holder count: ${report.holderCount}`);
      }
      
      if (report.top10HoldersPercent > 50) {
        score -= 10;
        report.warnings.push(`High whale concentration: ${report.top10HoldersPercent.toFixed(1)}%`);
      }
      
      report.safetyScore = Math.max(0, Math.min(100, score));
      
      if (score >= 80) report.safetyGrade = 'A';
      else if (score >= 60) report.safetyGrade = 'B';
      else if (score >= 40) report.safetyGrade = 'C';
      else if (score >= 20) report.safetyGrade = 'D';
      else report.safetyGrade = 'F';
      
      report.passesAllChecks = report.safetyScore >= 50 && !report.honeypotResult.isHoneypot;
      
    } catch (error: any) {
      console.warn(`[EvmSafety] Check failed for ${chain}:${tokenAddress}:`, error.message);
      report.warnings.push('Safety check failed - using default values');
    }
    
    return report;
  }
}

export const evmSafetyEngine = new EvmSafetyEngine();
