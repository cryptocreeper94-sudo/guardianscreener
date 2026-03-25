import { type User, type UpsertUser, type Document, type InsertDocument, type InsertPageView, type PageView, type AnalyticsOverview, type ApiKey, type InsertApiKey, type TransactionHash, type InsertTransactionHash, type DualChainStamp, type InsertDualChainStamp, type Hallmark, type InsertHallmark, type Waitlist, type InsertWaitlist, type StudioProject, type InsertStudioProject, type StudioFile, type InsertStudioFile, type StudioSecret, type InsertStudioSecret, type StudioConfig, type InsertStudioConfig, type StudioCommit, type InsertStudioCommit, type StudioBranch, type InsertStudioBranch, type StudioRun, type InsertStudioRun, type StudioPreview, type InsertStudioPreview, type StudioDeployment, type InsertStudioDeployment, type StudioCollaborator, type InsertStudioCollaborator, type FaucetClaim, type SwapTransaction, type NftCollection, type Nft, type NftListing, type LiquidityPool, type InsertLiquidityPool, type LiquidityPosition, type InsertLiquidityPosition, type Webhook, type InsertWebhook, type PriceHistory, type InsertPriceHistory, type ChainAccount, type UserStake, type LiquidStakingState, type LiquidStakingPosition, type LiquidStakingEvent, type InsertLiquidStakingPosition, type InsertLiquidStakingEvent, type BetaTesterTier, type InsertBetaTesterTier, type BetaTester, type InsertBetaTester, type AirdropAllocation, type InsertAirdropAllocation, type AirdropClaim, type InsertAirdropClaim, type TokenGift, type InsertTokenGift, type HallmarkProfile, type InsertHallmarkProfile, type HallmarkMint, type InsertHallmarkMint, type PlayerGameHistory, type InsertPlayerGameHistory, type PlayerStats, type InsertPlayerStats, type PlayerDailyProfit, type SweepsBalance, type InsertSweepsBalance, type SweepsPurchase, type InsertSweepsPurchase, type SweepsBonus, type InsertSweepsBonus, type SweepsDailyLogin, type SweepsRedemption, type InsertSweepsRedemption, type SweepsGameHistory, type InsertSweepsGameHistory, type RoadmapFeature, type InsertRoadmapFeature, type RoadmapVote, type ReferralCode, type InsertReferralCode, type Referral, type InsertReferral, type ReferralEvent, type InsertReferralEvent, type AffiliateTierRecord, type InsertAffiliateTier, type CommissionPayout, type InsertCommissionPayout, type AffiliateProfile, type InsertAffiliateProfile, type FraudFlag, type InsertFraudFlag, type MarketingPost, type InsertMarketingPost, type MarketingDeployLog, type InsertMarketingDeployLog, type MarketingScheduleConfig, type InsertRoadmapVote, type CrowdfundCampaign, type InsertCrowdfundCampaign, type CrowdfundFeature, type InsertCrowdfundFeature, type CrowdfundContribution, type InsertCrowdfundContribution, type BlockchainDomain, type InsertBlockchainDomain, type DomainRecord, type InsertDomainRecord, type DomainTransfer, type InsertDomainTransfer, type ChronicleSponsorshipSlot, type InsertChronicleSponsorshipSlot, type DomainSponsorshipClaim, type InsertDomainSponsorshipClaim, type EarlyAdopterProgram, type TreasuryAllocation, type TreasuryLedgerEntry, type SeoConfig, type InsertSeoConfig, HALLMARK_SERIAL_RANGES, users, documents, pageViews, apiKeys, roadmapFeatures, roadmapVotes, crowdfundCampaigns, crowdfundFeatures, crowdfundContributions, transactionHashes, dualChainStamps, hallmarks, hallmarkCounter, waitlist, studioProjects, studioFiles, studioSecrets, studioConfigs, studioCommits, studioBranches, studioRuns, studioPreviews, studioDeployments, studioCollaborators, faucetClaims, swapTransactions, nftCollections, nfts, nftListings, liquidityPools, liquidityPositions, webhooks, webhookLogs, priceHistory, chainAccounts, userStakes, playerGameHistory, playerStats, playerDailyProfit, liquidStakingState, liquidStakingPositions, liquidStakingEvents, betaTesterTiers, betaTesters, airdropAllocations, airdropClaims, tokenGifts, hallmarkProfiles, hallmarkMints, hallmarkGlobalCounter, sweepsBalances, sweepsPurchases, sweepsBonuses, sweepsDailyLogin, sweepsRedemptions, sweepsGameHistory, blockchainDomains, domainRecords, domainTransfers, chronicleSponsorshipSlots, domainSponsorshipClaims, earlyAdopterProgram, marketingPosts, marketingDeployLogs, marketingScheduleConfig, treasuryAllocations, treasuryLedger, seoConfigs, referralCodes, referrals, referralEvents, affiliateTiers, commissionPayouts, affiliateProfiles, fraudFlags, signupCounter, arcadeLeaderboard, type ArcadeLeaderboardEntry, type InsertArcadeLeaderboardEntry, cityZones, landPlots, type CityZone, type InsertCityZone, type LandPlot, type InsertLandPlot, chronicleLoginStreaks, chronicleDailyRewards, type ChronicleLoginStreak, type ChronicleDailyReward, aiAgentCertifications, ebookPurchases, type EbookPurchase, type InsertEbookPurchase, publishedBooks, type PublishedBook, type InsertPublishedBook, userLibrary, type UserLibraryItem, type InsertUserLibraryItem, aiWritingSessions, type AiWritingSession, type InsertAiWritingSession, type InvestorInvitePin, investorInvitePins } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, asc, count, and, lt } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  getApiKeyByKey(rawKey: string): Promise<ApiKey | undefined>;
  
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  getDocumentsByAppId(appId: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, doc: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;

  recordPageView(view: InsertPageView): Promise<PageView>;
  getAnalyticsOverview(): Promise<AnalyticsOverview>;

  createApiKey(data: Omit<InsertApiKey, "keyHash">, rawKey: string): Promise<{ apiKey: ApiKey; rawKey: string }>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  validateApiKey(rawKey: string): Promise<ApiKey | undefined>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  getApiKeysByEmail(email: string): Promise<ApiKey[]>;
  revokeApiKey(id: string): Promise<boolean>;

  recordTransactionHash(data: InsertTransactionHash): Promise<TransactionHash>;
  getTransactionHashByTxHash(txHash: string): Promise<TransactionHash | undefined>;
  getTransactionHashesByApiKey(apiKeyId: string): Promise<TransactionHash[]>;
  getRecentTransactions(limit: number): Promise<TransactionHash[]>;
  updateTransactionStatus(txHash: string, status: string, blockHeight?: string): Promise<TransactionHash | undefined>;

  recordDualChainStamp(data: InsertDualChainStamp): Promise<DualChainStamp>;
  getDualChainStamp(id: string): Promise<DualChainStamp | undefined>;
  getDualChainStampsByApp(appId: string): Promise<DualChainStamp[]>;
  updateDualChainStamp(id: string, data: Partial<InsertDualChainStamp>): Promise<DualChainStamp | undefined>;

  createHallmark(data: InsertHallmark): Promise<Hallmark>;
  getHallmark(hallmarkId: string): Promise<Hallmark | undefined>;
  getHallmarksByApp(appId: string): Promise<Hallmark[]>;
  getAllHallmarks(limit?: number): Promise<Hallmark[]>;
  updateHallmark(hallmarkId: string, data: Partial<InsertHallmark>): Promise<Hallmark | undefined>;
  verifyHallmark(hallmarkId: string): Promise<{ valid: boolean; hallmark?: Hallmark }>;
  getNextMasterSequence(): Promise<string>;

  addToWaitlist(data: InsertWaitlist): Promise<Waitlist>;
  getWaitlistByEmail(email: string): Promise<Waitlist | undefined>;
  
  upsertFirebaseUser(data: { id: string; email: string | null; username?: string | null; displayName?: string | null; firstName: string | null; lastName: string | null; profileImageUrl: string | null; signupPosition?: string | null }): Promise<User>;
  getFirebaseUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  setUserPin(userId: string, pinHash: string): Promise<void>;
  getNextSignupPosition(): Promise<string>;
  
  // Faucet
  getFaucetClaims(): Promise<FaucetClaim[]>;
  getRecentFaucetClaim(walletAddress: string): Promise<FaucetClaim | undefined>;
  createFaucetClaim(data: { walletAddress: string; amount: string; status: string; ipAddress: string | null }): Promise<FaucetClaim>;
  updateFaucetClaim(id: string, data: Partial<{ status: string; txHash: string }>): Promise<FaucetClaim | undefined>;
  
  // DEX Swaps
  getRecentSwaps(): Promise<SwapTransaction[]>;
  createSwap(data: { pairId?: string; userId?: string | null; tokenIn: string; tokenOut: string; amountIn: string; amountOut: string; priceImpact?: string; status: string; txHash: string; walletAddress?: string }): Promise<SwapTransaction>;
  
  // Crowdfund
  getCrowdfundContribution(id: string): Promise<CrowdfundContribution | undefined>;
  
  // NFT Marketplace
  getNftCollections(): Promise<NftCollection[]>;
  getNftListings(): Promise<any[]>;
  getNftStats(): Promise<{ totalVolume: string; totalNfts: number; totalCollections: number }>;
  createNft(data: { tokenId: string; collectionId: string; name: string; description: string; imageUrl: string; ownerAddress?: string }): Promise<Nft>;
  createNftCollection(data: { name: string; description?: string; imageUrl?: string; creatorAddress?: string }): Promise<NftCollection>;
  getNftsByOwner(ownerAddress: string): Promise<Nft[]>;
  
  // Transaction History
  getTransactionHistory(): Promise<any[]>;
  
  // Liquidity Pools
  getLiquidityPools(): Promise<LiquidityPool[]>;
  getLiquidityPool(id: string): Promise<LiquidityPool | undefined>;
  createLiquidityPool(data: InsertLiquidityPool): Promise<LiquidityPool>;
  updateLiquidityPool(id: string, data: Partial<InsertLiquidityPool>): Promise<LiquidityPool | undefined>;
  getLiquidityPositions(userId: string): Promise<LiquidityPosition[]>;
  createLiquidityPosition(data: InsertLiquidityPosition): Promise<LiquidityPosition>;
  
  // Webhooks
  getWebhooks(userId: string): Promise<Webhook[]>;
  createWebhook(data: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: string, data: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: string): Promise<boolean>;
  getWebhookLogs(webhookId: string): Promise<{ id: string; event: string; success: boolean; responseStatus?: number; createdAt: string }[]>;
  
  // Price History
  getPriceHistory(token: string, limit?: number): Promise<PriceHistory[]>;
  recordPrice(data: InsertPriceHistory): Promise<PriceHistory>;
  
  // Chain Accounts & Staking
  getChainAccount(address: string): Promise<ChainAccount | undefined>;
  getStakingPositions(userId: string): Promise<UserStake[]>;
  
  // Liquid Staking
  getLiquidStakingState(): Promise<LiquidStakingState | undefined>;
  updateLiquidStakingState(data: Partial<LiquidStakingState>): Promise<LiquidStakingState>;
  getLiquidStakingPosition(userId: string): Promise<LiquidStakingPosition | undefined>;
  upsertLiquidStakingPosition(userId: string, data: Partial<InsertLiquidStakingPosition>): Promise<LiquidStakingPosition>;
  recordLiquidStakingEvent(data: InsertLiquidStakingEvent): Promise<LiquidStakingEvent>;
  getLiquidStakingEvents(userId: string): Promise<LiquidStakingEvent[]>;
  
  // Beta Testers & Airdrop
  getBetaTesterTiers(): Promise<BetaTesterTier[]>;
  createBetaTesterTier(data: InsertBetaTesterTier): Promise<BetaTesterTier>;
  updateBetaTesterTier(id: string, data: Partial<InsertBetaTesterTier>): Promise<BetaTesterTier | undefined>;
  deleteBetaTesterTier(id: string): Promise<boolean>;
  
  getBetaTesters(): Promise<BetaTester[]>;
  getBetaTester(id: string): Promise<BetaTester | undefined>;
  getBetaTesterByEmail(email: string): Promise<BetaTester | undefined>;
  getBetaTesterByWallet(wallet: string): Promise<BetaTester | undefined>;
  createBetaTester(data: InsertBetaTester): Promise<BetaTester>;
  updateBetaTester(id: string, data: Partial<InsertBetaTester>): Promise<BetaTester | undefined>;
  deleteBetaTester(id: string): Promise<boolean>;
  
  getAirdropAllocations(): Promise<AirdropAllocation[]>;
  createAirdropAllocation(data: InsertAirdropAllocation): Promise<AirdropAllocation>;
  updateAirdropAllocation(id: string, data: Partial<InsertAirdropAllocation>): Promise<AirdropAllocation | undefined>;
  
  getAirdropClaims(userId?: string): Promise<AirdropClaim[]>;
  getAirdropClaimByUser(allocationId: string, userId: string): Promise<AirdropClaim | undefined>;
  createAirdropClaim(data: InsertAirdropClaim): Promise<AirdropClaim>;
  updateAirdropClaim(id: string, data: Partial<InsertAirdropClaim>): Promise<AirdropClaim | undefined>;
  
  getTokenGifts(): Promise<TokenGift[]>;
  getTokenGiftsByRecipient(email?: string, wallet?: string): Promise<TokenGift[]>;
  createTokenGift(data: InsertTokenGift): Promise<TokenGift>;
  updateTokenGift(id: string, data: Partial<InsertTokenGift>): Promise<TokenGift | undefined>;
  deleteTokenGift(id: string): Promise<boolean>;
  
  // Hallmark Profiles & Mints (12-digit system)
  getHallmarkProfile(userId: string): Promise<HallmarkProfile | undefined>;
  upsertHallmarkProfile(userId: string, data: Partial<InsertHallmarkProfile>): Promise<HallmarkProfile>;
  getHallmarkMint(id: string): Promise<HallmarkMint | undefined>;
  getHallmarkMintBySerial(serialNumber: string): Promise<HallmarkMint | undefined>;
  getHallmarkMintsByUser(userId: string): Promise<HallmarkMint[]>;
  createHallmarkMint(data: InsertHallmarkMint): Promise<HallmarkMint>;
  updateHallmarkMint(id: string, data: Partial<InsertHallmarkMint>): Promise<HallmarkMint | undefined>;
  getNextGlobalSerial(tier?: string): Promise<string>;
  getGenesisHallmark(): Promise<HallmarkMint | undefined>;
  
  // Player Gaming Stats
  getPlayerStats(userId: string): Promise<PlayerStats | undefined>;
  upsertPlayerStats(userId: string, data: Partial<InsertPlayerStats>): Promise<PlayerStats>;
  recordGameHistory(data: InsertPlayerGameHistory): Promise<PlayerGameHistory>;
  getPlayerGameHistory(userId: string, limit?: number): Promise<PlayerGameHistory[]>;
  getPlayerDailyProfit(userId: string, days?: number): Promise<PlayerDailyProfit[]>;
  recordDailyProfit(userId: string, date: string, gamesPlayed: number, wagered: string, profit: string): Promise<PlayerDailyProfit>;
  
  // Sweepstakes System (GC/SC)
  getSweepsBalance(userId: string): Promise<SweepsBalance | undefined>;
  createSweepsBalance(userId: string): Promise<SweepsBalance>;
  updateSweepsBalance(userId: string, gcDelta: string, scDelta: string): Promise<SweepsBalance>;
  recordSweepsPurchase(data: InsertSweepsPurchase): Promise<SweepsPurchase>;
  getSweepsPurchases(userId: string): Promise<SweepsPurchase[]>;
  recordSweepsBonus(data: InsertSweepsBonus): Promise<SweepsBonus>;
  getSweepsBonuses(userId: string): Promise<SweepsBonus[]>;
  getDailyLoginStatus(userId: string): Promise<SweepsDailyLogin | undefined>;
  recordDailyLogin(userId: string, streakDay: number): Promise<SweepsDailyLogin>;
  claimDailyBonus(userId: string): Promise<boolean>;
  requestSweepsRedemption(data: InsertSweepsRedemption): Promise<SweepsRedemption>;
  getSweepsRedemptions(userId: string): Promise<SweepsRedemption[]>;
  recordSweepsGame(data: InsertSweepsGameHistory): Promise<SweepsGameHistory>;
  getSweepsGameHistory(userId: string, limit?: number): Promise<SweepsGameHistory[]>;
  
  // Community Roadmap
  getRoadmapFeatures(): Promise<(RoadmapFeature & { voteCount: number })[]>;
  getRoadmapFeature(id: string): Promise<RoadmapFeature | undefined>;
  createRoadmapFeature(data: InsertRoadmapFeature): Promise<RoadmapFeature>;
  updateRoadmapFeature(id: string, data: Partial<InsertRoadmapFeature>): Promise<RoadmapFeature | undefined>;
  deleteRoadmapFeature(id: string): Promise<boolean>;
  voteForFeature(featureId: string, oderId: string): Promise<boolean>;
  removeVote(featureId: string, oderId: string): Promise<boolean>;
  getUserVotes(oderId: string): Promise<string[]>;
  hasUserVoted(featureId: string, oderId: string): Promise<boolean>;
  
  // Crowdfunding
  getCrowdfundCampaign(id: string): Promise<CrowdfundCampaign | undefined>;
  getActiveCampaign(): Promise<CrowdfundCampaign | undefined>;
  getCrowdfundFeatures(campaignId?: string): Promise<CrowdfundFeature[]>;
  getCrowdfundFeature(id: string): Promise<CrowdfundFeature | undefined>;
  createCrowdfundContribution(data: InsertCrowdfundContribution): Promise<CrowdfundContribution>;
  updateCrowdfundContribution(id: string, data: Partial<InsertCrowdfundContribution>): Promise<CrowdfundContribution | undefined>;
  getRecentContributions(limit?: number): Promise<CrowdfundContribution[]>;
  getCrowdfundStats(): Promise<{ totalRaised: number; goalAmount: number; contributorCount: number }>;
  
  // Blockchain Domain Service
  searchDomain(name: string): Promise<{ available: boolean; domain?: BlockchainDomain }>;
  getDomain(name: string): Promise<BlockchainDomain | undefined>;
  getDomainById(id: string): Promise<BlockchainDomain | undefined>;
  getDomainsByOwner(ownerAddress: string): Promise<BlockchainDomain[]>;
  registerDomain(data: InsertBlockchainDomain): Promise<BlockchainDomain>;
  updateDomain(id: string, data: Partial<InsertBlockchainDomain>): Promise<BlockchainDomain | undefined>;
  transferDomain(domainId: string, fromAddress: string, toAddress: string, txHash?: string): Promise<boolean>;
  getDomainRecords(domainId: string): Promise<DomainRecord[]>;
  setDomainRecord(data: InsertDomainRecord): Promise<DomainRecord>;
  updateDomainRecord(id: string, updates: { value?: string; ttl?: number; priority?: number }): Promise<DomainRecord | undefined>;
  deleteDomainRecord(id: string): Promise<boolean>;
  getDomainTransferHistory(domainId: string): Promise<DomainTransfer[]>;
  getRecentDomains(limit?: number): Promise<BlockchainDomain[]>;
  getDomainStats(): Promise<{ totalDomains: number; totalOwners: number; premiumCount: number }>;
  
  // Sponsorship System
  getSponsorshipSlots(eraId?: string, districtTier?: string, availableOnly?: boolean): Promise<ChronicleSponsorshipSlot[]>;
  getSponsorshipSlot(id: string): Promise<ChronicleSponsorshipSlot | undefined>;
  createSponsorshipSlot(data: InsertChronicleSponsorshipSlot): Promise<ChronicleSponsorshipSlot>;
  getAvailableSlotsForDomainTier(domainTier: string): Promise<ChronicleSponsorshipSlot[]>;
  claimSponsorshipSlot(data: InsertDomainSponsorshipClaim): Promise<DomainSponsorshipClaim>;
  getDomainSponsorshipClaims(domainId: string): Promise<DomainSponsorshipClaim[]>;
  getSponsorshipClaimsBySlot(slotId: string): Promise<DomainSponsorshipClaim[]>;
  updateSponsorshipClaimStatus(id: string, status: string): Promise<DomainSponsorshipClaim | undefined>;
  getEarlyAdopterProgram(): Promise<EarlyAdopterProgram | undefined>;
  incrementEarlyAdopterRegistrations(): Promise<void>;
  calculateSponsorshipExpiry(domainExpiresAt: Date | null): Date;
  
  // Treasury Transparency
  getTreasuryAllocations(): Promise<TreasuryAllocation[]>;
  getTreasuryLedger(limit?: number): Promise<TreasuryLedgerEntry[]>;
  
  // Owner Portal Analytics
  getPageViewsByHost(host: string, days: number): Promise<number>;
  getUniqueVisitorsByHost(host: string, days: number): Promise<number>;
  getTopPagesByHost(host: string, days: number, limit: number): Promise<{ path: string; views: number }[]>;
  getTopReferrersByHost(host: string, days: number, limit: number): Promise<{ source: string; visits: number }[]>;
  getDeviceBreakdownByHost(host: string, days: number): Promise<{ name: string; value: number }[]>;
  getGeoDataByHost(host: string, days: number, limit: number): Promise<{ country: string; visitors: number }[]>;
  getPageViewsOverTimeByHost(host: string, days: number): Promise<{ date: string; views: number }[]>;
  
  // SEO Configuration
  getSeoConfigsByHost(host: string): Promise<SeoConfig[]>;
  createSeoConfig(data: InsertSeoConfig): Promise<SeoConfig>;
  updateSeoConfig(id: string, data: Partial<InsertSeoConfig>): Promise<SeoConfig | undefined>;
  deleteSeoConfig(id: string): Promise<boolean>;
  
  // Referral & Affiliate System
  getReferralCode(userId: string, host?: string): Promise<ReferralCode | undefined>;
  createReferralCode(data: InsertReferralCode): Promise<ReferralCode>;
  getReferralCodeByCode(code: string): Promise<ReferralCode | undefined>;
  incrementReferralCodeClicks(code: string): Promise<void>;
  incrementReferralCodeSignups(code: string): Promise<void>;
  incrementReferralCodeConversions(code: string): Promise<void>;
  
  getReferralsByReferrer(referrerId: string): Promise<Referral[]>;
  getReferralByReferee(refereeId: string): Promise<Referral | undefined>;
  createReferral(data: InsertReferral): Promise<Referral>;
  updateReferralStatus(id: string, status: string, rewards?: { referrerReward?: number; refereeReward?: number; conversionValue?: number; commissionAmount?: number }): Promise<Referral | undefined>;
  
  createReferralEvent(data: InsertReferralEvent): Promise<ReferralEvent>;
  getReferralEvents(referralId: string): Promise<ReferralEvent[]>;
  
  getAffiliateTiers(host?: string): Promise<AffiliateTierRecord[]>;
  getAffiliateTier(slug: string): Promise<AffiliateTierRecord | undefined>;
  
  getAffiliateProfile(userId: string): Promise<AffiliateProfile | undefined>;
  createAffiliateProfile(data: InsertAffiliateProfile): Promise<AffiliateProfile>;
  updateAffiliateProfile(userId: string, data: Partial<InsertAffiliateProfile & { totalReferrals?: number; qualifiedReferrals?: number; lifetimeConversions?: number; lifetimeCreditsEarned?: number; lifetimeCommissionEarned?: number; pendingCommission?: number; paidCommission?: number; }>): Promise<AffiliateProfile | undefined>;
  
  createCommissionPayout(data: InsertCommissionPayout): Promise<CommissionPayout>;
  getCommissionPayouts(userId: string): Promise<CommissionPayout[]>;
  updateCommissionPayoutStatus(id: string, status: string, processedAt?: Date): Promise<CommissionPayout | undefined>;
  
  createFraudFlag(data: InsertFraudFlag): Promise<FraudFlag>;
  getFraudFlags(referralId?: string, userId?: string): Promise<FraudFlag[]>;
  resolveFraudFlag(id: string, resolvedBy: string, notes?: string): Promise<FraudFlag | undefined>;
  
  // Admin Referral Dashboard
  getAllReferralCodes(host?: string, limit?: number): Promise<ReferralCode[]>;
  getAllReferrals(host?: string, status?: string, limit?: number): Promise<Referral[]>;
  getAllAffiliateProfiles(limit?: number): Promise<AffiliateProfile[]>;
  getReferralStats(host?: string): Promise<{ totalReferrals: number; totalConversions: number; totalCreditsRewarded: number; totalCommissionPaid: number }>;
  
  // Arcade Leaderboards
  getArcadeLeaderboard(game: string, limit?: number): Promise<ArcadeLeaderboardEntry[]>;
  submitArcadeScore(entry: InsertArcadeLeaderboardEntry): Promise<ArcadeLeaderboardEntry>;
  getUserHighScore(game: string, userId: string): Promise<ArcadeLeaderboardEntry | undefined>;
  
  // Support Tickets
  createSupportTicket(data: { userId: string; userEmail: string; userName?: string; category: string; subject: string; message: string; priority?: string }): Promise<any>;
  getSupportTickets(status?: string): Promise<any[]>;
  getSupportTicketsByUser(userId: string): Promise<any[]>;
  getSupportTicket(id: string): Promise<any | undefined>;
  updateSupportTicketStatus(id: string, status: string, adminNotes?: string): Promise<any | undefined>;
  
  // Influencer/KOL Applications
  createInfluencerApplication(data: { name: string; email: string; platform: string; handle: string; followers?: string; contentType?: string; message?: string }): Promise<any>;
  getInfluencerApplications(status?: string): Promise<any[]>;
  getInfluencerApplication(id: string): Promise<any | undefined>;
  updateInfluencerApplicationStatus(id: string, status: string, adminNotes?: string): Promise<any | undefined>;
  
  // City Zones & Land Plots
  getCityZones(era?: string): Promise<CityZone[]>;
  getCityZone(id: string): Promise<CityZone | undefined>;
  createCityZone(data: InsertCityZone): Promise<CityZone>;
  updateCityZone(id: string, data: Partial<InsertCityZone>): Promise<CityZone | undefined>;
  
  getLandPlots(zoneId?: string): Promise<LandPlot[]>;
  getLandPlot(id: string): Promise<LandPlot | undefined>;
  getLandPlotsByOwner(ownerId: string): Promise<LandPlot[]>;
  getAvailablePlots(zoneId?: string): Promise<LandPlot[]>;
  createLandPlot(data: InsertLandPlot): Promise<LandPlot>;
  updateLandPlot(id: string, data: Partial<InsertLandPlot>): Promise<LandPlot | undefined>;
  purchasePlot(plotId: string, buyerId: string, price: number): Promise<LandPlot | undefined>;
  
  // Daily Login Streaks (24-hour real-time rule)
  getLoginStreak(userId: string): Promise<ChronicleLoginStreak | undefined>;
  checkInDaily(userId: string): Promise<{ streak: ChronicleLoginStreak; reward: ChronicleDailyReward | null; message: string }>;
  getRewardHistory(userId: string, limit?: number): Promise<ChronicleDailyReward[]>;
  
  // Guardian AI - AI Agent Certifications
  createAiAgentCertification(data: any): Promise<any>;
  getAiAgentCertifications(filters: { status?: string }): Promise<any[]>;
  getAiAgentCertification(id: string): Promise<any | undefined>;
  updateAiAgentCertification(id: string, data: any): Promise<any | undefined>;

  // Shells/Orbs Balance - stub methods for Chronicles game
  updateShellsBalance(userId: string, amount: number, reason: string): Promise<void>;
  updateOrbsBalance(userId: string, amount: number, reason: string): Promise<void>;

  getEbookPurchase(userId: string, bookId: string): Promise<EbookPurchase | undefined>;
  createEbookPurchase(data: InsertEbookPurchase): Promise<EbookPurchase>;
  getUserPurchases(userId: string): Promise<EbookPurchase[]>;
  createPublishedBook(data: InsertPublishedBook): Promise<PublishedBook>;
  getPublishedBook(slug: string): Promise<PublishedBook | undefined>;
  getPublishedBooks(status?: string): Promise<PublishedBook[]>;
  getPublishedBooksByCategory(category: string, subcategory?: string): Promise<PublishedBook[]>;
  updatePublishedBook(id: number, data: Partial<InsertPublishedBook>): Promise<PublishedBook | undefined>;
  getAuthorBooks(authorId: string): Promise<PublishedBook[]>;
  getUserLibrary(userId: string): Promise<UserLibraryItem[]>;
  addToUserLibrary(data: InsertUserLibraryItem): Promise<UserLibraryItem>;
  updateLibraryProgress(userId: string, bookId: string, progress: number): Promise<void>;
  getAiWritingSession(id: number): Promise<AiWritingSession | undefined>;
  getUserWritingSessions(userId: string): Promise<AiWritingSession[]>;
  createAiWritingSession(data: InsertAiWritingSession): Promise<AiWritingSession>;
  updateAiWritingSession(id: number, data: Partial<InsertAiWritingSession>): Promise<AiWritingSession | undefined>;

  createInvestorPin(label?: string, expiresAt?: Date): Promise<InvestorInvitePin>;
  verifyInvestorPin(pin: string): Promise<{ valid: boolean; label?: string | null }>;
  listInvestorPins(): Promise<InvestorInvitePin[]>;
  revokeInvestorPin(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getApiKeyByKey(rawKey: string): Promise<ApiKey | undefined> {
    return this.validateApiKey(rawKey);
  }

  async getDocuments(): Promise<Document[]> {
    return db.select().from(documents).orderBy(documents.updatedAt);
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.category, category));
  }

  async getDocumentsByAppId(appId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.appId, appId));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(doc).returning();
    return document;
  }

  async updateDocument(id: string, doc: Partial<InsertDocument>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set({ ...doc, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return true;
  }

  async recordPageView(view: InsertPageView): Promise<PageView> {
    const [pageView] = await db.insert(pageViews).values(view).returning();
    return pageView;
  }

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const allViews = await db.select().from(pageViews);
    const today = new Date().toISOString().split('T')[0];
    
    const totalViews = allViews.length;
    const uniqueVisitors = new Set(allViews.map(v => v.visitorId)).size;
    const todayViews = allViews.filter(v => 
      v.timestamp.toISOString().split('T')[0] === today
    ).length;

    const pageCountMap = new Map<string, number>();
    allViews.forEach(v => {
      pageCountMap.set(v.pageSlug, (pageCountMap.get(v.pageSlug) || 0) + 1);
    });
    const topPages = Array.from(pageCountMap.entries())
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const referrerCountMap = new Map<string, number>();
    allViews.forEach(v => {
      if (v.referrer) {
        referrerCountMap.set(v.referrer, (referrerCountMap.get(v.referrer) || 0) + 1);
      }
    });
    const topReferrers = Array.from(referrerCountMap.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    const dailyTrend = last7Days.map(date => {
      const dayViews = allViews.filter(v => 
        v.timestamp.toISOString().split('T')[0] === date
      );
      return {
        date,
        views: dayViews.length,
        unique: new Set(dayViews.map(v => v.visitorId)).size,
      };
    });

    return {
      totalViews,
      uniqueVisitors,
      todayViews,
      topPages,
      topReferrers,
      dailyTrend,
    };
  }

  private hashApiKey(rawKey: string): string {
    return crypto.createHash("sha256").update(rawKey).digest("hex");
  }

  async createApiKey(data: Omit<InsertApiKey, "keyHash">, rawKey: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const keyHash = this.hashApiKey(rawKey);
    const [apiKey] = await db.insert(apiKeys).values({ ...data, keyHash }).returning();
    return { apiKey, rawKey };
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    return key;
  }

  async validateApiKey(rawKey: string): Promise<ApiKey | undefined> {
    const keyHash = this.hashApiKey(rawKey);
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    if (key && key.isActive) {
      await this.updateApiKeyLastUsed(key.id);
      return key;
    }
    return undefined;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  async getApiKeysByEmail(email: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.email, email));
  }

  async revokeApiKey(id: string): Promise<boolean> {
    await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, id));
    return true;
  }

  async recordTransactionHash(data: InsertTransactionHash): Promise<TransactionHash> {
    const [txHash] = await db.insert(transactionHashes).values(data).returning();
    return txHash;
  }

  async getTransactionHashByTxHash(txHash: string): Promise<TransactionHash | undefined> {
    const [tx] = await db.select().from(transactionHashes).where(eq(transactionHashes.txHash, txHash));
    return tx;
  }

  async getTransactionHashesByApiKey(apiKeyId: string): Promise<TransactionHash[]> {
    return db.select().from(transactionHashes).where(eq(transactionHashes.apiKeyId, apiKeyId)).orderBy(desc(transactionHashes.createdAt));
  }

  async getRecentTransactions(limit: number): Promise<TransactionHash[]> {
    return db.select().from(transactionHashes).orderBy(desc(transactionHashes.createdAt)).limit(limit);
  }

  async updateTransactionStatus(txHash: string, status: string, blockHeight?: string): Promise<TransactionHash | undefined> {
    const updates: Partial<TransactionHash> = { status };
    if (blockHeight) updates.blockHeight = blockHeight;
    if (status === "confirmed") updates.confirmedAt = new Date();
    
    const [tx] = await db.update(transactionHashes).set(updates).where(eq(transactionHashes.txHash, txHash)).returning();
    return tx;
  }

  async recordDualChainStamp(data: InsertDualChainStamp): Promise<DualChainStamp> {
    const [stamp] = await db.insert(dualChainStamps).values(data).returning();
    return stamp;
  }

  async getDualChainStamp(id: string): Promise<DualChainStamp | undefined> {
    const [stamp] = await db.select().from(dualChainStamps).where(eq(dualChainStamps.id, id));
    return stamp;
  }

  async getDualChainStampsByApp(appId: string): Promise<DualChainStamp[]> {
    return db.select().from(dualChainStamps).where(eq(dualChainStamps.appId, appId)).orderBy(desc(dualChainStamps.createdAt));
  }

  async updateDualChainStamp(id: string, data: Partial<InsertDualChainStamp>): Promise<DualChainStamp | undefined> {
    const [stamp] = await db.update(dualChainStamps).set(data).where(eq(dualChainStamps.id, id)).returning();
    return stamp;
  }

  async createHallmark(data: InsertHallmark): Promise<Hallmark> {
    const [hallmark] = await db.insert(hallmarks).values(data).returning();
    return hallmark;
  }

  async getHallmark(hallmarkId: string): Promise<Hallmark | undefined> {
    const [hallmark] = await db.select().from(hallmarks).where(eq(hallmarks.hallmarkId, hallmarkId));
    return hallmark;
  }

  async getHallmarksByApp(appId: string): Promise<Hallmark[]> {
    return db.select().from(hallmarks).where(eq(hallmarks.appId, appId)).orderBy(desc(hallmarks.createdAt));
  }

  async getAllHallmarks(limit: number = 100): Promise<Hallmark[]> {
    return db.select().from(hallmarks).orderBy(desc(hallmarks.createdAt)).limit(limit);
  }

  async updateHallmark(hallmarkId: string, data: Partial<InsertHallmark>): Promise<Hallmark | undefined> {
    const [hallmark] = await db.update(hallmarks).set(data).where(eq(hallmarks.hallmarkId, hallmarkId)).returning();
    return hallmark;
  }

  async verifyHallmark(hallmarkId: string): Promise<{ valid: boolean; hallmark?: Hallmark }> {
    const hallmark = await this.getHallmark(hallmarkId);
    if (!hallmark) {
      return { valid: false };
    }
    return {
      valid: hallmark.status === "confirmed" && !!hallmark.darkwaveTxHash,
      hallmark,
    };
  }

  async getNextMasterSequence(): Promise<string> {
    const [existing] = await db.select().from(hallmarkCounter).where(eq(hallmarkCounter.id, "tl-master"));
    
    if (!existing) {
      await db.insert(hallmarkCounter).values({ id: "tl-master", currentSequence: "0" });
      return "00000000";
    }

    const nextSeq = parseInt(existing.currentSequence) + 1;
    await db.update(hallmarkCounter).set({ currentSequence: nextSeq.toString() }).where(eq(hallmarkCounter.id, "tl-master"));
    return nextSeq.toString().padStart(8, "0");
  }

  async addToWaitlist(data: InsertWaitlist): Promise<Waitlist> {
    const [entry] = await db.insert(waitlist).values(data).returning();
    return entry;
  }

  async getWaitlistByEmail(email: string): Promise<Waitlist | undefined> {
    const [entry] = await db.select().from(waitlist).where(eq(waitlist.email, email));
    return entry;
  }

  async createStudioProject(data: InsertStudioProject): Promise<StudioProject> {
    const [project] = await db.insert(studioProjects).values(data).returning();
    return project;
  }

  async getStudioProject(id: string): Promise<StudioProject | undefined> {
    const [project] = await db.select().from(studioProjects).where(eq(studioProjects.id, id));
    return project;
  }

  async getStudioProjectsByUser(userId: string): Promise<StudioProject[]> {
    return db.select().from(studioProjects).where(eq(studioProjects.userId, userId)).orderBy(desc(studioProjects.updatedAt));
  }

  async updateStudioProject(id: string, data: Partial<InsertStudioProject>): Promise<StudioProject | undefined> {
    const [project] = await db.update(studioProjects).set({ ...data, updatedAt: new Date() }).where(eq(studioProjects.id, id)).returning();
    return project;
  }

  async deleteStudioProject(id: string): Promise<boolean> {
    await db.delete(studioFiles).where(eq(studioFiles.projectId, id));
    await db.delete(studioSecrets).where(eq(studioSecrets.projectId, id));
    await db.delete(studioConfigs).where(eq(studioConfigs.projectId, id));
    await db.delete(studioProjects).where(eq(studioProjects.id, id));
    return true;
  }

  async createStudioFile(data: InsertStudioFile): Promise<StudioFile> {
    const [file] = await db.insert(studioFiles).values(data).returning();
    return file;
  }

  async getStudioFiles(projectId: string): Promise<StudioFile[]> {
    return db.select().from(studioFiles).where(eq(studioFiles.projectId, projectId)).orderBy(studioFiles.path);
  }

  async updateStudioFile(id: string, data: Partial<InsertStudioFile>): Promise<StudioFile | undefined> {
    const [file] = await db.update(studioFiles).set({ ...data, updatedAt: new Date() }).where(eq(studioFiles.id, id)).returning();
    return file;
  }

  async deleteStudioFile(id: string): Promise<boolean> {
    await db.delete(studioFiles).where(eq(studioFiles.id, id));
    return true;
  }

  async createStudioSecret(data: InsertStudioSecret): Promise<StudioSecret> {
    const [secret] = await db.insert(studioSecrets).values(data).returning();
    return secret;
  }

  async getStudioSecrets(projectId: string): Promise<StudioSecret[]> {
    return db.select().from(studioSecrets).where(eq(studioSecrets.projectId, projectId));
  }

  async deleteStudioSecret(id: string): Promise<boolean> {
    await db.delete(studioSecrets).where(eq(studioSecrets.id, id));
    return true;
  }

  async createStudioConfig(data: InsertStudioConfig): Promise<StudioConfig> {
    const [config] = await db.insert(studioConfigs).values(data).returning();
    return config;
  }

  async getStudioConfigs(projectId: string): Promise<StudioConfig[]> {
    return db.select().from(studioConfigs).where(eq(studioConfigs.projectId, projectId));
  }

  async deleteStudioConfig(id: string): Promise<boolean> {
    await db.delete(studioConfigs).where(eq(studioConfigs.id, id));
    return true;
  }

  async createStudioCommit(data: InsertStudioCommit): Promise<StudioCommit> {
    const [commit] = await db.insert(studioCommits).values(data).returning();
    return commit;
  }

  async getStudioCommits(projectId: string, branch?: string): Promise<StudioCommit[]> {
    if (branch) {
      return db.select().from(studioCommits)
        .where(eq(studioCommits.projectId, projectId))
        .orderBy(desc(studioCommits.createdAt));
    }
    return db.select().from(studioCommits)
      .where(eq(studioCommits.projectId, projectId))
      .orderBy(desc(studioCommits.createdAt));
  }

  async getStudioCommit(id: string): Promise<StudioCommit | undefined> {
    const [commit] = await db.select().from(studioCommits).where(eq(studioCommits.id, id));
    return commit;
  }

  async createStudioBranch(data: InsertStudioBranch): Promise<StudioBranch> {
    const [branch] = await db.insert(studioBranches).values(data).returning();
    return branch;
  }

  async getStudioBranches(projectId: string): Promise<StudioBranch[]> {
    return db.select().from(studioBranches).where(eq(studioBranches.projectId, projectId));
  }

  async updateStudioBranch(id: string, data: Partial<InsertStudioBranch>): Promise<StudioBranch | undefined> {
    const [branch] = await db.update(studioBranches).set(data).where(eq(studioBranches.id, id)).returning();
    return branch;
  }

  async deleteStudioBranch(id: string): Promise<boolean> {
    await db.delete(studioBranches).where(eq(studioBranches.id, id));
    return true;
  }

  async createStudioRun(data: InsertStudioRun): Promise<StudioRun> {
    const [run] = await db.insert(studioRuns).values(data).returning();
    return run;
  }

  async getStudioRuns(projectId: string): Promise<StudioRun[]> {
    return db.select().from(studioRuns)
      .where(eq(studioRuns.projectId, projectId))
      .orderBy(desc(studioRuns.startedAt));
  }

  async getStudioRun(id: string): Promise<StudioRun | undefined> {
    const [run] = await db.select().from(studioRuns).where(eq(studioRuns.id, id));
    return run;
  }

  async updateStudioRun(id: string, data: Partial<InsertStudioRun>): Promise<StudioRun | undefined> {
    const [run] = await db.update(studioRuns).set(data).where(eq(studioRuns.id, id)).returning();
    return run;
  }

  async createStudioPreview(data: InsertStudioPreview): Promise<StudioPreview> {
    const [preview] = await db.insert(studioPreviews).values(data).returning();
    return preview;
  }

  async getStudioPreview(projectId: string): Promise<StudioPreview | undefined> {
    const [preview] = await db.select().from(studioPreviews)
      .where(eq(studioPreviews.projectId, projectId))
      .orderBy(desc(studioPreviews.createdAt));
    return preview;
  }

  async updateStudioPreview(id: string, data: Partial<InsertStudioPreview>): Promise<StudioPreview | undefined> {
    const [preview] = await db.update(studioPreviews).set(data).where(eq(studioPreviews.id, id)).returning();
    return preview;
  }

  async createStudioDeployment(data: InsertStudioDeployment): Promise<StudioDeployment> {
    const [deployment] = await db.insert(studioDeployments).values(data).returning();
    return deployment;
  }

  async getStudioDeployments(projectId: string): Promise<StudioDeployment[]> {
    return db.select().from(studioDeployments)
      .where(eq(studioDeployments.projectId, projectId))
      .orderBy(desc(studioDeployments.createdAt));
  }

  async getStudioDeployment(id: string): Promise<StudioDeployment | undefined> {
    const [deployment] = await db.select().from(studioDeployments).where(eq(studioDeployments.id, id));
    return deployment;
  }

  async updateStudioDeployment(id: string, data: Partial<InsertStudioDeployment>): Promise<StudioDeployment | undefined> {
    const [deployment] = await db.update(studioDeployments).set({ ...data, updatedAt: new Date() }).where(eq(studioDeployments.id, id)).returning();
    return deployment;
  }

  async createStudioCollaborator(data: InsertStudioCollaborator): Promise<StudioCollaborator> {
    const [collab] = await db.insert(studioCollaborators).values(data).returning();
    return collab;
  }

  async getStudioCollaborators(projectId: string): Promise<StudioCollaborator[]> {
    return db.select().from(studioCollaborators).where(eq(studioCollaborators.projectId, projectId));
  }

  async updateStudioCollaborator(id: string, data: Partial<InsertStudioCollaborator>): Promise<StudioCollaborator | undefined> {
    const [collab] = await db.update(studioCollaborators).set({ ...data, lastActiveAt: new Date() }).where(eq(studioCollaborators.id, id)).returning();
    return collab;
  }

  async deleteStudioCollaborator(id: string): Promise<boolean> {
    await db.delete(studioCollaborators).where(eq(studioCollaborators.id, id));
    return true;
  }

  async upsertFirebaseUser(data: { id: string; email: string | null; username?: string | null; displayName?: string | null; firstName: string | null; lastName: string | null; profileImageUrl: string | null; signupPosition?: string | null }): Promise<User> {
    const existing = await this.getUser(data.id);
    if (existing) {
      const [updated] = await db.update(users)
        .set({
          email: data.email,
          username: data.username || existing.username,
          displayName: data.displayName || existing.displayName,
          firstName: data.firstName,
          lastName: data.lastName,
          profileImageUrl: data.profileImageUrl,
          signupPosition: existing.signupPosition || data.signupPosition,
        })
        .where(eq(users.id, data.id))
        .returning();
      return updated;
    } else {
      const [user] = await db.insert(users).values({
        id: data.id,
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        firstName: data.firstName,
        lastName: data.lastName,
        profileImageUrl: data.profileImageUrl,
        signupPosition: data.signupPosition,
      }).returning();
      return user;
    }
  }

  async getFirebaseUser(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async setUserPin(userId: string, pinHash: string): Promise<void> {
    await db.update(users)
      .set({ pinHash })
      .where(eq(users.id, userId));
  }

  async getNextSignupPosition(): Promise<string> {
    const [result] = await db
      .update(signupCounter)
      .set({ 
        currentPosition: sql`(CAST(current_position AS INTEGER) + 1)::VARCHAR` 
      })
      .where(eq(signupCounter.id, 'global'))
      .returning();
    return result?.currentPosition || '1';
  }

  // Faucet methods
  async getFaucetClaims(): Promise<FaucetClaim[]> {
    return db.select().from(faucetClaims).orderBy(desc(faucetClaims.claimedAt));
  }

  async getRecentFaucetClaim(walletAddress: string): Promise<FaucetClaim | undefined> {
    const [claim] = await db.select()
      .from(faucetClaims)
      .where(eq(faucetClaims.walletAddress, walletAddress))
      .orderBy(desc(faucetClaims.claimedAt))
      .limit(1);
    return claim;
  }

  async createFaucetClaim(data: { walletAddress: string; amount: string; status: string; ipAddress: string | null }): Promise<FaucetClaim> {
    const [claim] = await db.insert(faucetClaims).values(data).returning();
    return claim;
  }

  async updateFaucetClaim(id: string, data: Partial<{ status: string; txHash: string }>): Promise<FaucetClaim | undefined> {
    const [claim] = await db.update(faucetClaims).set(data).where(eq(faucetClaims.id, id)).returning();
    return claim;
  }

  // DEX Swap methods
  async getRecentSwaps(): Promise<SwapTransaction[]> {
    return db.select().from(swapTransactions).orderBy(desc(swapTransactions.createdAt)).limit(50);
  }

  async createSwap(data: { pairId?: string; userId?: string | null; tokenIn: string; tokenOut: string; amountIn: string; amountOut: string; priceImpact?: string; status: string; txHash: string; walletAddress?: string }): Promise<SwapTransaction> {
    const [swap] = await db.insert(swapTransactions).values({
      pairId: data.pairId || `${data.tokenIn}-${data.tokenOut}`,
      tokenIn: data.tokenIn,
      tokenOut: data.tokenOut,
      amountIn: data.amountIn,
      amountOut: data.amountOut,
      priceImpact: data.priceImpact || "0",
      status: data.status,
      txHash: data.txHash,
    }).returning();
    return swap;
  }
  
  async getCrowdfundContribution(id: string): Promise<CrowdfundContribution | undefined> {
    const [contribution] = await db.select().from(crowdfundContributions).where(eq(crowdfundContributions.id, id));
    return contribution;
  }

  // NFT Marketplace methods
  async getNftCollections(): Promise<NftCollection[]> {
    return db.select().from(nftCollections).orderBy(desc(nftCollections.createdAt)).limit(50);
  }

  async getNftListings(): Promise<any[]> {
    const allNfts = await db.select().from(nfts).orderBy(desc(nfts.createdAt)).limit(100);
    return allNfts.map(nft => ({
      ...nft,
      price: "50000000000000000000",
      likes: Math.floor(Math.random() * 100),
    }));
  }

  async getNftStats(): Promise<{ totalVolume: string; totalNfts: number; totalCollections: number }> {
    const [nftResult] = await db.select({ count: count() }).from(nfts);
    const [collectionResult] = await db.select({ count: count() }).from(nftCollections);
    return {
      totalVolume: "0",
      totalNfts: nftResult?.count || 0,
      totalCollections: collectionResult?.count || 0,
    };
  }

  async createNft(data: { tokenId: string; collectionId: string; name: string; description: string; imageUrl: string; ownerId?: string }): Promise<Nft> {
    const [nft] = await db.insert(nfts).values(data).returning();
    return nft;
  }

  async createNftCollection(data: { name: string; symbol?: string; description?: string; imageUrl?: string; creatorId?: string }): Promise<NftCollection> {
    const [collection] = await db.insert(nftCollections).values({
      name: data.name,
      symbol: data.symbol || data.name.substring(0, 4).toUpperCase(),
      description: data.description || "",
      imageUrl: data.imageUrl || "",
      creatorId: data.creatorId || null,
    }).returning();
    return collection;
  }

  async getNftsByOwner(ownerId: string): Promise<Nft[]> {
    return db.select().from(nfts).where(eq(nfts.ownerId, ownerId)).orderBy(desc(nfts.createdAt));
  }

  // Transaction History - aggregate from various sources
  async getTransactionHistory(): Promise<any[]> {
    const transactions: any[] = [];

    // Get recent swaps
    const recentSwaps = await db.select().from(swapTransactions).orderBy(desc(swapTransactions.createdAt)).limit(20);
    for (const swap of recentSwaps) {
      transactions.push({
        id: swap.id,
        type: "swap",
        token: `${swap.tokenIn} → ${swap.tokenOut}`,
        amount: swap.amountIn,
        hash: swap.txHash,
        status: swap.status,
        timestamp: swap.createdAt,
      });
    }

    // Get recent faucet claims
    const recentClaims = await db.select().from(faucetClaims).orderBy(desc(faucetClaims.claimedAt)).limit(20);
    for (const claim of recentClaims) {
      transactions.push({
        id: claim.id,
        type: "claim",
        token: "SIG",
        amount: claim.amount,
        hash: claim.txHash || "",
        status: claim.status,
        timestamp: claim.claimedAt,
        to: claim.walletAddress,
      });
    }

    // Sort by timestamp desc
    transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return transactions.slice(0, 50);
  }

  // Liquidity Pools
  async getLiquidityPools(): Promise<LiquidityPool[]> {
    return db.select().from(liquidityPools).where(eq(liquidityPools.isActive, true)).orderBy(desc(liquidityPools.tvl));
  }

  async getLiquidityPool(id: string): Promise<LiquidityPool | undefined> {
    const [pool] = await db.select().from(liquidityPools).where(eq(liquidityPools.id, id));
    return pool;
  }

  async createLiquidityPool(data: InsertLiquidityPool): Promise<LiquidityPool> {
    const [pool] = await db.insert(liquidityPools).values(data).returning();
    return pool;
  }

  async updateLiquidityPool(id: string, data: Partial<InsertLiquidityPool>): Promise<LiquidityPool | undefined> {
    const [pool] = await db.update(liquidityPools).set(data).where(eq(liquidityPools.id, id)).returning();
    return pool;
  }

  async getLiquidityPositions(userId: string): Promise<LiquidityPosition[]> {
    return db.select().from(liquidityPositions).where(eq(liquidityPositions.userId, userId));
  }

  async createLiquidityPosition(data: InsertLiquidityPosition): Promise<LiquidityPosition> {
    const [position] = await db.insert(liquidityPositions).values(data).returning();
    return position;
  }

  // Webhooks
  async getWebhooks(userId: string): Promise<Webhook[]> {
    return db.select().from(webhooks).where(eq(webhooks.userId, userId)).orderBy(desc(webhooks.createdAt));
  }

  async createWebhook(data: InsertWebhook): Promise<Webhook> {
    const [webhook] = await db.insert(webhooks).values(data).returning();
    return webhook;
  }

  async updateWebhook(id: string, data: Partial<InsertWebhook>): Promise<Webhook | undefined> {
    const [webhook] = await db.update(webhooks).set(data).where(eq(webhooks.id, id)).returning();
    return webhook;
  }

  async deleteWebhook(id: string): Promise<boolean> {
    const result = await db.delete(webhooks).where(eq(webhooks.id, id));
    return true;
  }

  async getWebhookLogs(webhookId: string): Promise<{ id: string; event: string; success: boolean; responseStatus?: number; createdAt: string }[]> {
    const logs = await db.select().from(webhookLogs).where(eq(webhookLogs.webhookId, webhookId)).orderBy(desc(webhookLogs.createdAt)).limit(50);
    return logs.map(log => ({
      id: log.id,
      event: log.event,
      success: log.success,
      responseStatus: log.responseStatus ?? undefined,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  // Price History
  async getPriceHistory(token: string, limit: number = 100): Promise<PriceHistory[]> {
    return db.select().from(priceHistory).where(eq(priceHistory.token, token)).orderBy(desc(priceHistory.timestamp)).limit(limit);
  }

  async recordPrice(data: InsertPriceHistory): Promise<PriceHistory> {
    const [record] = await db.insert(priceHistory).values(data).returning();
    return record;
  }

  async getChainAccount(address: string): Promise<ChainAccount | undefined> {
    const [account] = await db.select().from(chainAccounts).where(eq(chainAccounts.address, address));
    return account;
  }

  async getStakingPositions(userId: string): Promise<UserStake[]> {
    return db.select().from(userStakes).where(eq(userStakes.userId, userId));
  }

  async getLiquidStakingState(): Promise<LiquidStakingState | undefined> {
    const [state] = await db.select().from(liquidStakingState).where(eq(liquidStakingState.id, "main"));
    if (!state) {
      const [newState] = await db.insert(liquidStakingState).values({
        id: "main",
        totalDwtStaked: "0",
        totalStDwtSupply: "0",
        exchangeRate: "1000000000000000000",
        targetApy: "12",
      }).returning();
      return newState;
    }
    return state;
  }

  async updateLiquidStakingState(data: Partial<LiquidStakingState>): Promise<LiquidStakingState> {
    const [state] = await db.update(liquidStakingState)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(liquidStakingState.id, "main"))
      .returning();
    return state;
  }

  async getLiquidStakingPosition(userId: string): Promise<LiquidStakingPosition | undefined> {
    const [position] = await db.select().from(liquidStakingPositions).where(eq(liquidStakingPositions.userId, userId));
    return position;
  }

  async upsertLiquidStakingPosition(userId: string, data: Partial<InsertLiquidStakingPosition>): Promise<LiquidStakingPosition> {
    const existing = await this.getLiquidStakingPosition(userId);
    if (existing) {
      const [updated] = await db.update(liquidStakingPositions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(liquidStakingPositions.userId, userId))
        .returning();
      return updated;
    }
    const [position] = await db.insert(liquidStakingPositions)
      .values({ userId, stakedDwt: "0", stDwtBalance: "0", ...data })
      .returning();
    return position;
  }

  async recordLiquidStakingEvent(data: InsertLiquidStakingEvent): Promise<LiquidStakingEvent> {
    const [event] = await db.insert(liquidStakingEvents).values(data).returning();
    return event;
  }

  async getLiquidStakingEvents(userId: string): Promise<LiquidStakingEvent[]> {
    return db.select().from(liquidStakingEvents)
      .where(eq(liquidStakingEvents.userId, userId))
      .orderBy(desc(liquidStakingEvents.createdAt))
      .limit(50);
  }

  // Beta Tester Tiers
  async getBetaTesterTiers(): Promise<BetaTesterTier[]> {
    return db.select().from(betaTesterTiers).orderBy(desc(betaTesterTiers.createdAt));
  }

  async createBetaTesterTier(data: InsertBetaTesterTier): Promise<BetaTesterTier> {
    const [tier] = await db.insert(betaTesterTiers).values(data).returning();
    return tier;
  }

  async updateBetaTesterTier(id: string, data: Partial<InsertBetaTesterTier>): Promise<BetaTesterTier | undefined> {
    const [tier] = await db.update(betaTesterTiers).set(data).where(eq(betaTesterTiers.id, id)).returning();
    return tier;
  }

  async deleteBetaTesterTier(id: string): Promise<boolean> {
    await db.delete(betaTesterTiers).where(eq(betaTesterTiers.id, id));
    return true;
  }

  // Beta Testers
  async getBetaTesters(): Promise<BetaTester[]> {
    return db.select().from(betaTesters).orderBy(desc(betaTesters.createdAt));
  }

  async getBetaTester(id: string): Promise<BetaTester | undefined> {
    const [entry] = await db.select().from(betaTesters).where(eq(betaTesters.id, id));
    return entry;
  }

  async getBetaTesterByEmail(email: string): Promise<BetaTester | undefined> {
    const [entry] = await db.select().from(betaTesters).where(eq(betaTesters.email, email));
    return entry;
  }

  async getBetaTesterByWallet(wallet: string): Promise<BetaTester | undefined> {
    const [entry] = await db.select().from(betaTesters).where(eq(betaTesters.walletAddress, wallet));
    return entry;
  }

  async createBetaTester(data: InsertBetaTester): Promise<BetaTester> {
    const [entry] = await db.insert(betaTesters).values(data).returning();
    return entry;
  }

  async updateBetaTester(id: string, data: Partial<InsertBetaTester>): Promise<BetaTester | undefined> {
    const [entry] = await db.update(betaTesters)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(betaTesters.id, id))
      .returning();
    return entry;
  }

  async deleteBetaTester(id: string): Promise<boolean> {
    await db.delete(betaTesters).where(eq(betaTesters.id, id));
    return true;
  }

  // Airdrop Allocations
  async getAirdropAllocations(): Promise<AirdropAllocation[]> {
    return db.select().from(airdropAllocations).orderBy(desc(airdropAllocations.createdAt));
  }

  async createAirdropAllocation(data: InsertAirdropAllocation): Promise<AirdropAllocation> {
    const [allocation] = await db.insert(airdropAllocations).values(data).returning();
    return allocation;
  }

  async updateAirdropAllocation(id: string, data: Partial<InsertAirdropAllocation>): Promise<AirdropAllocation | undefined> {
    const [allocation] = await db.update(airdropAllocations).set(data).where(eq(airdropAllocations.id, id)).returning();
    return allocation;
  }

  // Airdrop Claims
  async getAirdropClaims(userId?: string): Promise<AirdropClaim[]> {
    if (userId) {
      return db.select().from(airdropClaims).where(eq(airdropClaims.userId, userId)).orderBy(desc(airdropClaims.createdAt));
    }
    return db.select().from(airdropClaims).orderBy(desc(airdropClaims.createdAt));
  }

  async getAirdropClaimByUser(allocationId: string, userId: string): Promise<AirdropClaim | undefined> {
    const claims = await db.select().from(airdropClaims)
      .where(eq(airdropClaims.allocationId, allocationId));
    return claims.find(c => c.userId === userId);
  }

  async createAirdropClaim(data: InsertAirdropClaim): Promise<AirdropClaim> {
    const [claim] = await db.insert(airdropClaims).values(data).returning();
    return claim;
  }

  async updateAirdropClaim(id: string, data: Partial<InsertAirdropClaim>): Promise<AirdropClaim | undefined> {
    const [claim] = await db.update(airdropClaims).set(data).where(eq(airdropClaims.id, id)).returning();
    return claim;
  }

  // Token Gifts
  async getTokenGifts(): Promise<TokenGift[]> {
    return db.select().from(tokenGifts).orderBy(desc(tokenGifts.createdAt));
  }

  async getTokenGiftsByRecipient(email?: string, wallet?: string): Promise<TokenGift[]> {
    if (email) {
      return db.select().from(tokenGifts).where(eq(tokenGifts.recipientEmail, email)).orderBy(desc(tokenGifts.createdAt));
    }
    if (wallet) {
      return db.select().from(tokenGifts).where(eq(tokenGifts.recipientWallet, wallet)).orderBy(desc(tokenGifts.createdAt));
    }
    return [];
  }

  async createTokenGift(data: InsertTokenGift): Promise<TokenGift> {
    const [gift] = await db.insert(tokenGifts).values(data).returning();
    return gift;
  }

  async updateTokenGift(id: string, data: Partial<InsertTokenGift>): Promise<TokenGift | undefined> {
    const [gift] = await db.update(tokenGifts).set(data).where(eq(tokenGifts.id, id)).returning();
    return gift;
  }

  async deleteTokenGift(id: string): Promise<boolean> {
    await db.delete(tokenGifts).where(eq(tokenGifts.id, id));
    return true;
  }

  // Hallmark Profiles & Mints (12-digit system)
  async getHallmarkProfile(userId: string): Promise<HallmarkProfile | undefined> {
    const [profile] = await db.select().from(hallmarkProfiles).where(eq(hallmarkProfiles.userId, userId));
    return profile;
  }

  async upsertHallmarkProfile(userId: string, data: Partial<InsertHallmarkProfile>): Promise<HallmarkProfile> {
    const existing = await this.getHallmarkProfile(userId);
    if (existing) {
      const [updated] = await db.update(hallmarkProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(hallmarkProfiles.userId, userId))
        .returning();
      return updated;
    }
    const [profile] = await db.insert(hallmarkProfiles)
      .values({ userId, ...data })
      .returning();
    return profile;
  }

  async getHallmarkMint(id: string): Promise<HallmarkMint | undefined> {
    const [mint] = await db.select().from(hallmarkMints).where(eq(hallmarkMints.id, id));
    return mint;
  }

  async getHallmarkMintBySerial(serialNumber: string): Promise<HallmarkMint | undefined> {
    const [mint] = await db.select().from(hallmarkMints).where(eq(hallmarkMints.serialNumber, serialNumber));
    return mint;
  }

  async getHallmarkMintsByUser(userId: string): Promise<HallmarkMint[]> {
    return db.select().from(hallmarkMints)
      .where(eq(hallmarkMints.userId, userId))
      .orderBy(desc(hallmarkMints.createdAt));
  }

  async createHallmarkMint(data: InsertHallmarkMint): Promise<HallmarkMint> {
    const [mint] = await db.insert(hallmarkMints).values(data).returning();
    return mint;
  }

  async updateHallmarkMint(id: string, data: Partial<InsertHallmarkMint>): Promise<HallmarkMint | undefined> {
    const [mint] = await db.update(hallmarkMints)
      .set(data)
      .where(eq(hallmarkMints.id, id))
      .returning();
    return mint;
  }

  async getNextGlobalSerial(tier: string = 'GENERAL_PUBLIC'): Promise<string> {
    const range = HALLMARK_SERIAL_RANGES[tier as keyof typeof HALLMARK_SERIAL_RANGES] || HALLMARK_SERIAL_RANGES.GENERAL_PUBLIC;
    
    // Get the current global counter
    const [counter] = await db.select().from(hallmarkGlobalCounter).where(eq(hallmarkGlobalCounter.id, 'global'));
    
    if (!counter) {
      await db.insert(hallmarkGlobalCounter).values({ id: 'global', currentGlobalSerial: '0' });
    }
    
    const currentSerial = parseInt(counter?.currentGlobalSerial || '0', 10);
    let nextSerial = currentSerial + 1;
    
    // Ensure we're in the correct range for the tier
    if (nextSerial < range.start) {
      nextSerial = range.start;
    }
    
    // Update counter
    await db.update(hallmarkGlobalCounter)
      .set({ currentGlobalSerial: nextSerial.toString(), lastUpdated: new Date() })
      .where(eq(hallmarkGlobalCounter.id, 'global'));
    
    // Format as 12-digit string: DWH-000000000001
    return `DWH-${nextSerial.toString().padStart(12, '0')}`;
  }

  async getGenesisHallmark(): Promise<HallmarkMint | undefined> {
    // Get the first ever hallmark (global serial 1)
    const [genesis] = await db.select().from(hallmarkMints)
      .where(eq(hallmarkMints.globalSerial, 'DWH-000000000001'));
    return genesis;
  }

  // Player Gaming Stats
  async getPlayerStats(userId: string): Promise<PlayerStats | undefined> {
    const [stats] = await db.select().from(playerStats).where(eq(playerStats.userId, userId));
    return stats;
  }

  async upsertPlayerStats(userId: string, data: Partial<InsertPlayerStats>): Promise<PlayerStats> {
    const existing = await this.getPlayerStats(userId);
    if (existing) {
      const [updated] = await db.update(playerStats)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(playerStats.userId, userId))
        .returning();
      return updated;
    }
    const [stats] = await db.insert(playerStats)
      .values({ userId, username: data.username || 'Player', ...data })
      .returning();
    return stats;
  }

  async recordGameHistory(data: InsertPlayerGameHistory): Promise<PlayerGameHistory> {
    const [history] = await db.insert(playerGameHistory).values(data).returning();
    return history;
  }

  async getPlayerGameHistory(userId: string, limit: number = 50): Promise<PlayerGameHistory[]> {
    return db.select().from(playerGameHistory)
      .where(eq(playerGameHistory.userId, userId))
      .orderBy(desc(playerGameHistory.createdAt))
      .limit(limit);
  }

  async getPlayerDailyProfit(userId: string, days: number = 14): Promise<PlayerDailyProfit[]> {
    return db.select().from(playerDailyProfit)
      .where(eq(playerDailyProfit.userId, userId))
      .orderBy(desc(playerDailyProfit.date))
      .limit(days);
  }

  async recordDailyProfit(userId: string, date: string, gamesPlayed: number, wagered: string, profit: string): Promise<PlayerDailyProfit> {
    const existing = await db.select().from(playerDailyProfit)
      .where(sql`${playerDailyProfit.userId} = ${userId} AND ${playerDailyProfit.date} = ${date}`);
    
    if (existing.length > 0) {
      const [updated] = await db.update(playerDailyProfit)
        .set({
          gamesPlayed: existing[0].gamesPlayed + gamesPlayed,
          wagered: (parseFloat(existing[0].wagered) + parseFloat(wagered)).toString(),
          profit: (parseFloat(existing[0].profit) + parseFloat(profit)).toString(),
        })
        .where(eq(playerDailyProfit.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [daily] = await db.insert(playerDailyProfit)
      .values({ userId, date, gamesPlayed, wagered, profit })
      .returning();
    return daily;
  }

  // ============================================
  // SWEEPSTAKES SYSTEM (GC/SC)
  // ============================================

  async getSweepsBalance(userId: string): Promise<SweepsBalance | undefined> {
    const [balance] = await db.select().from(sweepsBalances).where(eq(sweepsBalances.userId, userId));
    return balance;
  }

  async createSweepsBalance(userId: string): Promise<SweepsBalance> {
    const existing = await this.getSweepsBalance(userId);
    if (existing) return existing;
    
    const [balance] = await db.insert(sweepsBalances)
      .values({ userId, goldCoins: "0", sweepsCoins: "0" })
      .returning();
    return balance;
  }

  async updateSweepsBalance(userId: string, gcDelta: string, scDelta: string): Promise<SweepsBalance> {
    let balance = await this.getSweepsBalance(userId);
    if (!balance) {
      balance = await this.createSweepsBalance(userId);
    }
    
    const newGc = (parseFloat(balance.goldCoins) + parseFloat(gcDelta)).toString();
    const newSc = (parseFloat(balance.sweepsCoins) + parseFloat(scDelta)).toString();
    
    const [updated] = await db.update(sweepsBalances)
      .set({
        goldCoins: newGc,
        sweepsCoins: newSc,
        totalGcPurchased: parseFloat(gcDelta) > 0 
          ? (parseFloat(balance.totalGcPurchased) + parseFloat(gcDelta)).toString()
          : balance.totalGcPurchased,
        totalScEarned: parseFloat(scDelta) > 0 
          ? (parseFloat(balance.totalScEarned) + parseFloat(scDelta)).toString()
          : balance.totalScEarned,
        updatedAt: new Date(),
      })
      .where(eq(sweepsBalances.userId, userId))
      .returning();
    return updated;
  }

  async recordSweepsPurchase(data: InsertSweepsPurchase): Promise<SweepsPurchase> {
    const [purchase] = await db.insert(sweepsPurchases).values(data).returning();
    return purchase;
  }

  async getSweepsPurchases(userId: string): Promise<SweepsPurchase[]> {
    return db.select().from(sweepsPurchases)
      .where(eq(sweepsPurchases.userId, userId))
      .orderBy(desc(sweepsPurchases.createdAt));
  }

  async recordSweepsBonus(data: InsertSweepsBonus): Promise<SweepsBonus> {
    const [bonus] = await db.insert(sweepsBonuses).values(data).returning();
    return bonus;
  }

  async getSweepsBonuses(userId: string): Promise<SweepsBonus[]> {
    return db.select().from(sweepsBonuses)
      .where(eq(sweepsBonuses.userId, userId))
      .orderBy(desc(sweepsBonuses.createdAt));
  }

  async getDailyLoginStatus(userId: string): Promise<SweepsDailyLogin | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [login] = await db.select().from(sweepsDailyLogin)
      .where(sql`${sweepsDailyLogin.userId} = ${userId} AND ${sweepsDailyLogin.loginDate} = ${today}`);
    return login;
  }

  async recordDailyLogin(userId: string, streakDay: number): Promise<SweepsDailyLogin> {
    const today = new Date().toISOString().split('T')[0];
    const [login] = await db.insert(sweepsDailyLogin)
      .values({ userId, loginDate: today, streakDay, bonusClaimed: false })
      .returning();
    return login;
  }

  async claimDailyBonus(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const [login] = await db.select().from(sweepsDailyLogin)
      .where(sql`${sweepsDailyLogin.userId} = ${userId} AND ${sweepsDailyLogin.loginDate} = ${today}`);
    
    if (!login || login.bonusClaimed) return false;
    
    await db.update(sweepsDailyLogin)
      .set({ bonusClaimed: true })
      .where(eq(sweepsDailyLogin.id, login.id));
    return true;
  }

  async requestSweepsRedemption(data: InsertSweepsRedemption): Promise<SweepsRedemption> {
    const [redemption] = await db.insert(sweepsRedemptions).values(data).returning();
    
    await db.update(sweepsBalances)
      .set({
        sweepsCoins: sql`${sweepsBalances.sweepsCoins}::numeric - ${data.sweepsCoinsAmount}::numeric`,
        totalScRedeemed: sql`${sweepsBalances.totalScRedeemed}::numeric + ${data.sweepsCoinsAmount}::numeric`,
        updatedAt: new Date(),
      })
      .where(eq(sweepsBalances.userId, data.userId));
    
    return redemption;
  }

  async getSweepsRedemptions(userId: string): Promise<SweepsRedemption[]> {
    return db.select().from(sweepsRedemptions)
      .where(eq(sweepsRedemptions.userId, userId))
      .orderBy(desc(sweepsRedemptions.createdAt));
  }

  async recordSweepsGame(data: InsertSweepsGameHistory): Promise<SweepsGameHistory> {
    const [game] = await db.insert(sweepsGameHistory).values(data).returning();
    return game;
  }

  async getSweepsGameHistory(userId: string, limit: number = 50): Promise<SweepsGameHistory[]> {
    return db.select().from(sweepsGameHistory)
      .where(eq(sweepsGameHistory.userId, userId))
      .orderBy(desc(sweepsGameHistory.createdAt))
      .limit(limit);
  }

  // Community Roadmap methods
  async getRoadmapFeatures(): Promise<(RoadmapFeature & { voteCount: number })[]> {
    const features = await db.select().from(roadmapFeatures).orderBy(desc(roadmapFeatures.priority), desc(roadmapFeatures.createdAt));
    const featuresWithVotes = await Promise.all(features.map(async (feature) => {
      const [voteResult] = await db.select({ count: count() }).from(roadmapVotes).where(eq(roadmapVotes.featureId, feature.id));
      return { ...feature, voteCount: voteResult?.count || 0 };
    }));
    return featuresWithVotes.sort((a, b) => b.voteCount - a.voteCount);
  }

  async getRoadmapFeature(id: string): Promise<RoadmapFeature | undefined> {
    const [feature] = await db.select().from(roadmapFeatures).where(eq(roadmapFeatures.id, id));
    return feature;
  }

  async createRoadmapFeature(data: InsertRoadmapFeature): Promise<RoadmapFeature> {
    const [feature] = await db.insert(roadmapFeatures).values(data).returning();
    return feature;
  }

  async updateRoadmapFeature(id: string, data: Partial<InsertRoadmapFeature>): Promise<RoadmapFeature | undefined> {
    const [feature] = await db.update(roadmapFeatures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roadmapFeatures.id, id))
      .returning();
    return feature;
  }

  async deleteRoadmapFeature(id: string): Promise<boolean> {
    await db.delete(roadmapFeatures).where(eq(roadmapFeatures.id, id));
    return true;
  }

  async voteForFeature(featureId: string, oderId: string): Promise<boolean> {
    try {
      await db.insert(roadmapVotes).values({ featureId, oderId });
      return true;
    } catch (e) {
      return false;
    }
  }

  async removeVote(featureId: string, oderId: string): Promise<boolean> {
    await db.delete(roadmapVotes)
      .where(sql`${roadmapVotes.featureId} = ${featureId} AND ${roadmapVotes.oderId} = ${oderId}`);
    return true;
  }

  async getUserVotes(oderId: string): Promise<string[]> {
    const votes = await db.select({ featureId: roadmapVotes.featureId })
      .from(roadmapVotes)
      .where(eq(roadmapVotes.oderId, oderId));
    return votes.map(v => v.featureId);
  }

  async hasUserVoted(featureId: string, oderId: string): Promise<boolean> {
    const [vote] = await db.select()
      .from(roadmapVotes)
      .where(sql`${roadmapVotes.featureId} = ${featureId} AND ${roadmapVotes.oderId} = ${oderId}`);
    return !!vote;
  }

  // Crowdfunding methods
  async getCrowdfundCampaign(id: string): Promise<CrowdfundCampaign | undefined> {
    const [campaign] = await db.select().from(crowdfundCampaigns).where(eq(crowdfundCampaigns.id, id));
    return campaign;
  }

  async getActiveCampaign(): Promise<CrowdfundCampaign | undefined> {
    const [campaign] = await db.select().from(crowdfundCampaigns).where(eq(crowdfundCampaigns.isActive, true));
    return campaign;
  }

  async getCrowdfundFeatures(campaignId?: string): Promise<CrowdfundFeature[]> {
    if (campaignId) {
      return db.select().from(crowdfundFeatures)
        .where(eq(crowdfundFeatures.campaignId, campaignId))
        .orderBy(desc(crowdfundFeatures.priority));
    }
    return db.select().from(crowdfundFeatures).orderBy(desc(crowdfundFeatures.priority));
  }

  async getCrowdfundFeature(id: string): Promise<CrowdfundFeature | undefined> {
    const [feature] = await db.select().from(crowdfundFeatures).where(eq(crowdfundFeatures.id, id));
    return feature;
  }

  async createCrowdfundContribution(data: InsertCrowdfundContribution): Promise<CrowdfundContribution> {
    const transparencyHash = crypto.createHash('sha256')
      .update(`${data.amountCents}-${data.userId || 'anon'}-${Date.now()}`)
      .digest('hex').substring(0, 16).toUpperCase();
    
    const [contribution] = await db.insert(crowdfundContributions)
      .values({ ...data, transparencyHash })
      .returning();
    return contribution;
  }

  async updateCrowdfundContribution(id: string, data: Partial<InsertCrowdfundContribution>): Promise<CrowdfundContribution | undefined> {
    const [contribution] = await db.update(crowdfundContributions)
      .set(data)
      .where(eq(crowdfundContributions.id, id))
      .returning();
    
    if (contribution && data.status === 'confirmed') {
      if (contribution.campaignId) {
        await db.update(crowdfundCampaigns)
          .set({ raisedAmountCents: sql`${crowdfundCampaigns.raisedAmountCents} + ${contribution.amountCents}` })
          .where(eq(crowdfundCampaigns.id, contribution.campaignId));
      }
      if (contribution.featureId) {
        await db.update(crowdfundFeatures)
          .set({ raisedAmountCents: sql`${crowdfundFeatures.raisedAmountCents} + ${contribution.amountCents}` })
          .where(eq(crowdfundFeatures.id, contribution.featureId));
      }
    }
    
    return contribution;
  }

  async getRecentContributions(limit: number = 20): Promise<CrowdfundContribution[]> {
    return db.select().from(crowdfundContributions)
      .where(eq(crowdfundContributions.status, 'confirmed'))
      .orderBy(desc(crowdfundContributions.createdAt))
      .limit(limit);
  }

  async getCrowdfundStats(): Promise<{ totalRaised: number; goalAmount: number; contributorCount: number }> {
    const campaign = await this.getActiveCampaign();
    const [contributorResult] = await db.select({ count: count() })
      .from(crowdfundContributions)
      .where(eq(crowdfundContributions.status, 'confirmed'));
    
    return {
      totalRaised: campaign?.raisedAmountCents || 0,
      goalAmount: campaign?.goalAmountCents || 0,
      contributorCount: contributorResult?.count || 0,
    };
  }

  // Blockchain Domain Service methods
  async searchDomain(name: string): Promise<{ available: boolean; domain?: BlockchainDomain }> {
    const normalizedName = name.toLowerCase().replace(/\.tlid$/, '').trim();
    const domain = await this.getDomain(normalizedName);
    const isExpired = domain?.expiresAt ? new Date(domain.expiresAt) < new Date() : false;
    return {
      available: !domain || isExpired,
      domain: domain || undefined
    };
  }

  async getDomain(name: string): Promise<BlockchainDomain | undefined> {
    const normalizedName = name.toLowerCase().replace(/\.tlid$/, '').trim();
    const [domain] = await db.select().from(blockchainDomains)
      .where(eq(blockchainDomains.name, normalizedName));
    return domain;
  }

  async getDomainById(id: string): Promise<BlockchainDomain | undefined> {
    const [domain] = await db.select().from(blockchainDomains)
      .where(eq(blockchainDomains.id, id));
    return domain;
  }

  async getDomainsByOwner(ownerAddress: string): Promise<BlockchainDomain[]> {
    return db.select().from(blockchainDomains)
      .where(eq(blockchainDomains.ownerAddress, ownerAddress))
      .orderBy(desc(blockchainDomains.registeredAt));
  }

  async registerDomain(data: InsertBlockchainDomain): Promise<BlockchainDomain> {
    const normalizedName = data.name.toLowerCase().replace(/\.tlid$/, '').trim();
    const [domain] = await db.insert(blockchainDomains)
      .values({ ...data, name: normalizedName })
      .returning();
    return domain;
  }

  async updateDomain(id: string, data: Partial<InsertBlockchainDomain>): Promise<BlockchainDomain | undefined> {
    const [domain] = await db.update(blockchainDomains)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blockchainDomains.id, id))
      .returning();
    return domain;
  }

  async transferDomain(domainId: string, fromAddress: string, toAddress: string, txHash?: string): Promise<boolean> {
    const domain = await this.getDomainById(domainId);
    if (!domain || domain.ownerAddress !== fromAddress) return false;
    
    await db.insert(domainTransfers).values({
      domainId,
      fromAddress,
      toAddress,
      txHash
    });
    
    await db.update(blockchainDomains)
      .set({ ownerAddress: toAddress, updatedAt: new Date() })
      .where(eq(blockchainDomains.id, domainId));
    
    return true;
  }

  async getDomainRecords(domainId: string): Promise<DomainRecord[]> {
    return db.select().from(domainRecords)
      .where(eq(domainRecords.domainId, domainId));
  }

  async setDomainRecord(data: InsertDomainRecord): Promise<DomainRecord> {
    const existing = await db.select().from(domainRecords)
      .where(sql`${domainRecords.domainId} = ${data.domainId} AND ${domainRecords.key} = ${data.key}`);
    
    if (existing.length > 0) {
      const [record] = await db.update(domainRecords)
        .set({ value: data.value, recordType: data.recordType, updatedAt: new Date() })
        .where(eq(domainRecords.id, existing[0].id))
        .returning();
      return record;
    }
    
    const [record] = await db.insert(domainRecords).values(data).returning();
    return record;
  }

  async updateDomainRecord(id: string, updates: { value?: string; ttl?: number; priority?: number }): Promise<DomainRecord | undefined> {
    const [record] = await db.update(domainRecords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(domainRecords.id, id))
      .returning();
    return record;
  }

  async deleteDomainRecord(id: string): Promise<boolean> {
    const result = await db.delete(domainRecords).where(eq(domainRecords.id, id));
    return true;
  }

  async getDomainTransferHistory(domainId: string): Promise<DomainTransfer[]> {
    return db.select().from(domainTransfers)
      .where(eq(domainTransfers.domainId, domainId))
      .orderBy(desc(domainTransfers.transferredAt));
  }

  async getRecentDomains(limit: number = 20): Promise<BlockchainDomain[]> {
    return db.select().from(blockchainDomains)
      .orderBy(desc(blockchainDomains.registeredAt))
      .limit(limit);
  }

  async getDomainStats(): Promise<{ totalDomains: number; totalOwners: number; premiumCount: number }> {
    const [totalResult] = await db.select({ count: count() }).from(blockchainDomains);
    const [premiumResult] = await db.select({ count: count() }).from(blockchainDomains)
      .where(eq(blockchainDomains.isPremium, true));
    const ownersResult = await db.selectDistinct({ owner: blockchainDomains.ownerAddress }).from(blockchainDomains);
    
    return {
      totalDomains: totalResult?.count || 0,
      totalOwners: ownersResult.length,
      premiumCount: premiumResult?.count || 0,
    };
  }

  async getSponsorshipSlots(eraId?: string, districtTier?: string, availableOnly: boolean = true): Promise<ChronicleSponsorshipSlot[]> {
    const conditions = [];
    if (eraId) {
      conditions.push(eq(chronicleSponsorshipSlots.eraId, eraId));
    }
    if (districtTier) {
      conditions.push(eq(chronicleSponsorshipSlots.districtTier, districtTier));
    }
    if (availableOnly) {
      conditions.push(eq(chronicleSponsorshipSlots.status, 'available'));
      conditions.push(lt(chronicleSponsorshipSlots.currentOccupancy, chronicleSponsorshipSlots.capacity));
    }
    if (conditions.length > 0) {
      return db.select().from(chronicleSponsorshipSlots).where(and(...conditions));
    }
    return db.select().from(chronicleSponsorshipSlots);
  }

  async getSponsorshipSlot(id: string): Promise<ChronicleSponsorshipSlot | undefined> {
    const [slot] = await db.select().from(chronicleSponsorshipSlots)
      .where(eq(chronicleSponsorshipSlots.id, id));
    return slot;
  }

  async createSponsorshipSlot(data: InsertChronicleSponsorshipSlot): Promise<ChronicleSponsorshipSlot> {
    const [slot] = await db.insert(chronicleSponsorshipSlots).values(data).returning();
    return slot;
  }

  async getAvailableSlotsForDomainTier(domainTier: string): Promise<ChronicleSponsorshipSlot[]> {
    const tierMapping: Record<string, string[]> = {
      'Ultra Premium': ['prime', 'signature', 'emerging'],
      'Premium': ['signature', 'emerging'],
      'Standard+': ['emerging'],
      'Standard': ['emerging'],
      'Economy': ['emerging'],
    };
    const allowedDistricts = tierMapping[domainTier] || ['emerging'];
    return db.select().from(chronicleSponsorshipSlots)
      .where(and(
        eq(chronicleSponsorshipSlots.status, 'available'),
        lt(chronicleSponsorshipSlots.currentOccupancy, chronicleSponsorshipSlots.capacity),
        sql`${chronicleSponsorshipSlots.districtTier} = ANY(${allowedDistricts})`
      ));
  }

  async claimSponsorshipSlot(data: InsertDomainSponsorshipClaim): Promise<DomainSponsorshipClaim> {
    return await db.transaction(async (tx) => {
      const [updatedSlot] = await tx.update(chronicleSponsorshipSlots)
        .set({ 
          currentOccupancy: sql`${chronicleSponsorshipSlots.currentOccupancy} + 1`,
          updatedAt: new Date() 
        })
        .where(and(
          eq(chronicleSponsorshipSlots.id, data.slotId),
          eq(chronicleSponsorshipSlots.status, 'available'),
          lt(chronicleSponsorshipSlots.currentOccupancy, chronicleSponsorshipSlots.capacity)
        ))
        .returning();
      
      if (!updatedSlot) {
        throw new Error("Slot is full, not available, or does not exist");
      }

      const [claim] = await tx.insert(domainSponsorshipClaims).values(data).returning();
      return claim;
    });
  }

  calculateSponsorshipExpiry(domainExpiresAt: Date | null): Date {
    const SPONSORSHIP_DURATION_MONTHS = 36;
    const baseDate = domainExpiresAt ? new Date(domainExpiresAt) : new Date();
    const expiryDate = new Date(baseDate);
    expiryDate.setMonth(expiryDate.getMonth() + SPONSORSHIP_DURATION_MONTHS);
    return expiryDate;
  }

  async getDomainSponsorshipClaims(domainId: string): Promise<DomainSponsorshipClaim[]> {
    return db.select().from(domainSponsorshipClaims)
      .where(eq(domainSponsorshipClaims.domainId, domainId));
  }

  async getSponsorshipClaimsBySlot(slotId: string): Promise<DomainSponsorshipClaim[]> {
    return db.select().from(domainSponsorshipClaims)
      .where(eq(domainSponsorshipClaims.slotId, slotId));
  }

  async updateSponsorshipClaimStatus(id: string, status: string): Promise<DomainSponsorshipClaim | undefined> {
    const [claim] = await db.update(domainSponsorshipClaims)
      .set({ verificationStatus: status, updatedAt: new Date() })
      .where(eq(domainSponsorshipClaims.id, id))
      .returning();
    return claim;
  }

  async getEarlyAdopterProgram(): Promise<EarlyAdopterProgram | undefined> {
    const [program] = await db.select().from(earlyAdopterProgram)
      .where(eq(earlyAdopterProgram.isActive, true))
      .limit(1);
    return program;
  }

  async incrementEarlyAdopterRegistrations(): Promise<void> {
    await db.update(earlyAdopterProgram)
      .set({ currentRegistrations: sql`${earlyAdopterProgram.currentRegistrations} + 1` })
      .where(eq(earlyAdopterProgram.isActive, true));
  }

  // Marketing Posts
  async getMarketingPosts(platform?: string, status?: string): Promise<MarketingPost[]> {
    const conditions = [];
    if (platform) conditions.push(eq(marketingPosts.platform, platform));
    if (status) conditions.push(eq(marketingPosts.status, status));
    if (conditions.length > 0) {
      return db.select().from(marketingPosts).where(and(...conditions)).orderBy(desc(marketingPosts.createdAt));
    }
    return db.select().from(marketingPosts).orderBy(desc(marketingPosts.createdAt));
  }

  async getMarketingPost(id: string): Promise<MarketingPost | undefined> {
    const [post] = await db.select().from(marketingPosts).where(eq(marketingPosts.id, id));
    return post;
  }

  async getRandomActivePost(platform: string): Promise<MarketingPost | undefined> {
    const posts = await db.select().from(marketingPosts)
      .where(and(eq(marketingPosts.platform, platform), eq(marketingPosts.status, 'active')))
      .orderBy(asc(marketingPosts.usedCount), asc(marketingPosts.lastUsedAt));
    if (posts.length === 0) return undefined;
    
    // Get the minimum usage count to prioritize least-used posts
    const minUsed = posts[0].usedCount;
    // Filter to only posts with the minimum usage (rotates through entire library)
    const leastUsedPosts = posts.filter(p => p.usedCount === minUsed);
    // Pick randomly from the least used posts
    return leastUsedPosts[Math.floor(Math.random() * leastUsedPosts.length)];
  }

  async createMarketingPost(data: InsertMarketingPost): Promise<MarketingPost> {
    const [post] = await db.insert(marketingPosts).values(data).returning();
    return post;
  }

  async updateMarketingPost(id: string, data: Partial<InsertMarketingPost>): Promise<MarketingPost | undefined> {
    const [post] = await db.update(marketingPosts).set(data).where(eq(marketingPosts.id, id)).returning();
    return post;
  }

  async markPostUsed(id: string): Promise<void> {
    await db.update(marketingPosts)
      .set({ usedCount: sql`${marketingPosts.usedCount} + 1`, lastUsedAt: new Date() })
      .where(eq(marketingPosts.id, id));
  }

  async deleteMarketingPost(id: string): Promise<boolean> {
    await db.delete(marketingPosts).where(eq(marketingPosts.id, id));
    return true;
  }

  // Marketing Deploy Logs
  async recordMarketingDeploy(data: InsertMarketingDeployLog): Promise<MarketingDeployLog> {
    const [log] = await db.insert(marketingDeployLogs).values(data).returning();
    return log;
  }

  async getMarketingDeployLogs(limit: number = 50): Promise<MarketingDeployLog[]> {
    return db.select().from(marketingDeployLogs).orderBy(desc(marketingDeployLogs.deployedAt)).limit(limit);
  }

  // Marketing Schedule Config
  async getMarketingScheduleConfigs(): Promise<MarketingScheduleConfig[]> {
    return db.select().from(marketingScheduleConfig);
  }

  async getMarketingScheduleConfig(platform: string): Promise<MarketingScheduleConfig | undefined> {
    const [config] = await db.select().from(marketingScheduleConfig).where(eq(marketingScheduleConfig.platform, platform));
    return config;
  }

  async upsertMarketingScheduleConfig(platform: string, data: Partial<MarketingScheduleConfig>): Promise<MarketingScheduleConfig> {
    const existing = await this.getMarketingScheduleConfig(platform);
    if (existing) {
      const [updated] = await db.update(marketingScheduleConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(marketingScheduleConfig.platform, platform))
        .returning();
      return updated;
    }
    const [created] = await db.insert(marketingScheduleConfig)
      .values({ platform, ...data })
      .returning();
    return created;
  }

  async updateLastDeployed(platform: string): Promise<void> {
    await db.update(marketingScheduleConfig)
      .set({ lastDeployedAt: new Date(), updatedAt: new Date() })
      .where(eq(marketingScheduleConfig.platform, platform));
  }

  // Treasury Transparency
  async getTreasuryAllocations(): Promise<TreasuryAllocation[]> {
    return db.select().from(treasuryAllocations).orderBy(asc(treasuryAllocations.sortOrder));
  }

  async getTreasuryLedger(limit: number = 100): Promise<TreasuryLedgerEntry[]> {
    return db.select().from(treasuryLedger).orderBy(desc(treasuryLedger.createdAt)).limit(limit);
  }

  // Owner Portal Analytics
  async getPageViewsByHost(host: string, days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const result = await db.select({ count: count() })
      .from(pageViews)
      .where(and(
        eq(pageViews.host, host),
        sql`${pageViews.timestamp} >= ${cutoff}`
      ));
    return result[0]?.count || 0;
  }

  async getUniqueVisitorsByHost(host: string, days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const result = await db.selectDistinct({ visitorId: pageViews.visitorId })
      .from(pageViews)
      .where(and(
        eq(pageViews.host, host),
        sql`${pageViews.timestamp} >= ${cutoff}`
      ));
    return result.length;
  }

  async getTopPagesByHost(host: string, days: number, limit: number): Promise<{ path: string; views: number }[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const views = await db.select()
      .from(pageViews)
      .where(and(
        eq(pageViews.host, host),
        sql`${pageViews.timestamp} >= ${cutoff}`
      ));
    
    const pageMap = new Map<string, number>();
    views.forEach(v => {
      pageMap.set(v.pageSlug, (pageMap.get(v.pageSlug) || 0) + 1);
    });
    
    return Array.from(pageMap.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  async getTopReferrersByHost(host: string, days: number, limit: number): Promise<{ source: string; visits: number }[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const views = await db.select()
      .from(pageViews)
      .where(and(
        eq(pageViews.host, host),
        sql`${pageViews.timestamp} >= ${cutoff}`
      ));
    
    const refMap = new Map<string, number>();
    views.forEach(v => {
      let source = "Direct";
      if (v.referrer) {
        try {
          source = new URL(v.referrer).hostname;
        } catch {
          source = v.referrer.slice(0, 50);
        }
      }
      refMap.set(source, (refMap.get(source) || 0) + 1);
    });
    
    return Array.from(refMap.entries())
      .map(([source, visits]) => ({ source, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, limit);
  }

  async getDeviceBreakdownByHost(host: string, days: number): Promise<{ name: string; value: number }[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const views = await db.select()
      .from(pageViews)
      .where(and(
        eq(pageViews.host, host),
        sql`${pageViews.timestamp} >= ${cutoff}`
      ));
    
    const deviceMap = new Map<string, number>();
    views.forEach(v => {
      const device = v.deviceType || "Unknown";
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
    });
    
    return Array.from(deviceMap.entries())
      .map(([name, value]) => ({ name, value }));
  }

  async getGeoDataByHost(host: string, days: number, limit: number): Promise<{ country: string; visitors: number }[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const views = await db.select()
      .from(pageViews)
      .where(and(
        eq(pageViews.host, host),
        sql`${pageViews.timestamp} >= ${cutoff}`
      ));
    
    const geoMap = new Map<string, number>();
    views.forEach(v => {
      const country = v.country || "Unknown";
      geoMap.set(country, (geoMap.get(country) || 0) + 1);
    });
    
    return Array.from(geoMap.entries())
      .map(([country, visitors]) => ({ country, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, limit);
  }

  async getPageViewsOverTimeByHost(host: string, days: number): Promise<{ date: string; views: number }[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const views = await db.select()
      .from(pageViews)
      .where(and(
        eq(pageViews.host, host),
        sql`${pageViews.timestamp} >= ${cutoff}`
      ));
    
    const dateMap = new Map<string, number>();
    views.forEach(v => {
      const date = v.timestamp.toISOString().split('T')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });
    
    const result: { date: string; views: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({ date: dateStr, views: dateMap.get(dateStr) || 0 });
    }
    
    return result;
  }

  // SEO Configuration
  async getSeoConfigsByHost(host: string): Promise<SeoConfig[]> {
    return db.select().from(seoConfigs).where(eq(seoConfigs.host, host)).orderBy(asc(seoConfigs.route));
  }

  async createSeoConfig(data: InsertSeoConfig): Promise<SeoConfig> {
    const [config] = await db.insert(seoConfigs).values(data).returning();
    return config;
  }

  async updateSeoConfig(id: string, data: Partial<InsertSeoConfig>): Promise<SeoConfig | undefined> {
    const [config] = await db.update(seoConfigs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(seoConfigs.id, id))
      .returning();
    return config;
  }

  async deleteSeoConfig(id: string): Promise<boolean> {
    await db.delete(seoConfigs).where(eq(seoConfigs.id, id));
    return true;
  }

  // =====================================================
  // REFERRAL & AFFILIATE SYSTEM
  // =====================================================

  async getReferralCode(userId: string, host: string = "dwsc.io"): Promise<ReferralCode | undefined> {
    const [code] = await db.select().from(referralCodes).where(and(eq(referralCodes.userId, userId), eq(referralCodes.host, host)));
    return code;
  }

  async createReferralCode(data: InsertReferralCode): Promise<ReferralCode> {
    const [code] = await db.insert(referralCodes).values(data).returning();
    return code;
  }

  async getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
    const [refCode] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
    return refCode;
  }

  async incrementReferralCodeClicks(code: string): Promise<void> {
    await db.update(referralCodes)
      .set({ clickCount: sql`${referralCodes.clickCount} + 1`, updatedAt: new Date() })
      .where(eq(referralCodes.code, code));
  }

  async incrementReferralCodeSignups(code: string): Promise<void> {
    await db.update(referralCodes)
      .set({ signupCount: sql`${referralCodes.signupCount} + 1`, updatedAt: new Date() })
      .where(eq(referralCodes.code, code));
  }

  async incrementReferralCodeConversions(code: string): Promise<void> {
    await db.update(referralCodes)
      .set({ conversionCount: sql`${referralCodes.conversionCount} + 1`, updatedAt: new Date() })
      .where(eq(referralCodes.code, code));
  }

  async getReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.referrerId, referrerId)).orderBy(desc(referrals.createdAt));
  }

  async getReferralByReferee(refereeId: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.refereeId, refereeId));
    return referral;
  }

  async createReferral(data: InsertReferral): Promise<Referral> {
    const [referral] = await db.insert(referrals).values(data).returning();
    return referral;
  }

  async updateReferralStatus(id: string, status: string, rewards?: { referrerReward?: number; refereeReward?: number; conversionValue?: number; commissionAmount?: number }): Promise<Referral | undefined> {
    const updateData: any = { status };
    if (status === "qualified") updateData.qualifiedAt = new Date();
    if (status === "converted") updateData.convertedAt = new Date();
    if (rewards?.referrerReward !== undefined) updateData.referrerReward = rewards.referrerReward;
    if (rewards?.refereeReward !== undefined) updateData.refereeReward = rewards.refereeReward;
    if (rewards?.conversionValue !== undefined) updateData.conversionValue = rewards.conversionValue;
    if (rewards?.commissionAmount !== undefined) updateData.commissionAmount = rewards.commissionAmount;
    
    const [referral] = await db.update(referrals).set(updateData).where(eq(referrals.id, id)).returning();
    return referral;
  }

  async createReferralEvent(data: InsertReferralEvent): Promise<ReferralEvent> {
    const [event] = await db.insert(referralEvents).values(data).returning();
    return event;
  }

  async getReferralEvents(referralId: string): Promise<ReferralEvent[]> {
    return db.select().from(referralEvents).where(eq(referralEvents.referralId, referralId)).orderBy(desc(referralEvents.createdAt));
  }

  async getAffiliateTiers(host: string = "dwsc.io"): Promise<AffiliateTierRecord[]> {
    return db.select().from(affiliateTiers).where(eq(affiliateTiers.host, host)).orderBy(asc(affiliateTiers.sortOrder));
  }

  async getAffiliateTier(slug: string): Promise<AffiliateTierRecord | undefined> {
    const [tier] = await db.select().from(affiliateTiers).where(eq(affiliateTiers.slug, slug));
    return tier;
  }

  async getAffiliateProfile(userId: string): Promise<AffiliateProfile | undefined> {
    const [profile] = await db.select().from(affiliateProfiles).where(eq(affiliateProfiles.userId, userId));
    return profile;
  }

  async createAffiliateProfile(data: InsertAffiliateProfile): Promise<AffiliateProfile> {
    const [profile] = await db.insert(affiliateProfiles).values(data).returning();
    return profile;
  }

  async updateAffiliateProfile(userId: string, data: Partial<InsertAffiliateProfile & { totalReferrals?: number; qualifiedReferrals?: number; lifetimeConversions?: number; lifetimeCreditsEarned?: number; lifetimeCommissionEarned?: number; pendingCommission?: number; paidCommission?: number; }>): Promise<AffiliateProfile | undefined> {
    const [profile] = await db.update(affiliateProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(affiliateProfiles.userId, userId))
      .returning();
    return profile;
  }

  async createCommissionPayout(data: InsertCommissionPayout): Promise<CommissionPayout> {
    const [payout] = await db.insert(commissionPayouts).values(data).returning();
    return payout;
  }

  async getCommissionPayouts(userId: string): Promise<CommissionPayout[]> {
    return db.select().from(commissionPayouts).where(eq(commissionPayouts.userId, userId)).orderBy(desc(commissionPayouts.createdAt));
  }

  async updateCommissionPayoutStatus(id: string, status: string, processedAt?: Date): Promise<CommissionPayout | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (processedAt) updateData.processedAt = processedAt;
    
    const [payout] = await db.update(commissionPayouts).set(updateData).where(eq(commissionPayouts.id, id)).returning();
    return payout;
  }

  async createFraudFlag(data: InsertFraudFlag): Promise<FraudFlag> {
    const [flag] = await db.insert(fraudFlags).values(data).returning();
    return flag;
  }

  async getFraudFlags(referralId?: string, userId?: string): Promise<FraudFlag[]> {
    if (referralId) {
      return db.select().from(fraudFlags).where(eq(fraudFlags.referralId, referralId)).orderBy(desc(fraudFlags.createdAt));
    }
    if (userId) {
      return db.select().from(fraudFlags).where(eq(fraudFlags.userId, userId)).orderBy(desc(fraudFlags.createdAt));
    }
    return db.select().from(fraudFlags).orderBy(desc(fraudFlags.createdAt));
  }

  async resolveFraudFlag(id: string, resolvedBy: string, notes?: string): Promise<FraudFlag | undefined> {
    const [flag] = await db.update(fraudFlags)
      .set({ isResolved: true, resolvedBy, resolvedAt: new Date(), notes })
      .where(eq(fraudFlags.id, id))
      .returning();
    return flag;
  }

  // Admin Referral Dashboard
  async getAllReferralCodes(host?: string, limit: number = 100): Promise<ReferralCode[]> {
    if (host) {
      return db.select().from(referralCodes).where(eq(referralCodes.host, host)).orderBy(desc(referralCodes.createdAt)).limit(limit);
    }
    return db.select().from(referralCodes).orderBy(desc(referralCodes.createdAt)).limit(limit);
  }

  async getAllReferrals(host?: string, status?: string, limit: number = 100): Promise<Referral[]> {
    let query = db.select().from(referrals);
    const conditions: any[] = [];
    if (host) conditions.push(eq(referrals.host, host));
    if (status) conditions.push(eq(referrals.status, status));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    return query.orderBy(desc(referrals.createdAt)).limit(limit);
  }

  async getAllAffiliateProfiles(limit: number = 100): Promise<AffiliateProfile[]> {
    return db.select().from(affiliateProfiles).orderBy(desc(affiliateProfiles.lifetimeConversions)).limit(limit);
  }

  async getReferralStats(host?: string): Promise<{ totalReferrals: number; totalConversions: number; totalCreditsRewarded: number; totalCommissionPaid: number }> {
    let allReferrals: Referral[];
    if (host) {
      allReferrals = await db.select().from(referrals).where(eq(referrals.host, host));
    } else {
      allReferrals = await db.select().from(referrals);
    }
    
    const totalReferrals = allReferrals.length;
    const totalConversions = allReferrals.filter(r => r.status === "converted").length;
    const totalCreditsRewarded = allReferrals.reduce((sum, r) => sum + (r.referrerReward || 0) + (r.refereeReward || 0), 0);
    const totalCommissionPaid = allReferrals.reduce((sum, r) => sum + (r.commissionAmount || 0), 0);
    
    return { totalReferrals, totalConversions, totalCreditsRewarded, totalCommissionPaid };
  }

  // Arcade Leaderboards
  async getArcadeLeaderboard(game: string, limit: number = 20): Promise<ArcadeLeaderboardEntry[]> {
    return db.select().from(arcadeLeaderboard).where(eq(arcadeLeaderboard.game, game)).orderBy(desc(arcadeLeaderboard.score)).limit(limit);
  }

  async submitArcadeScore(entry: InsertArcadeLeaderboardEntry): Promise<ArcadeLeaderboardEntry> {
    const [result] = await db.insert(arcadeLeaderboard).values(entry).returning();
    return result;
  }

  async getUserHighScore(game: string, userId: string): Promise<ArcadeLeaderboardEntry | undefined> {
    const [entry] = await db.select().from(arcadeLeaderboard)
      .where(and(eq(arcadeLeaderboard.game, game), eq(arcadeLeaderboard.userId, userId)))
      .orderBy(desc(arcadeLeaderboard.score))
      .limit(1);
    return entry;
  }

  // Support Tickets
  async createSupportTicket(data: { userId: string; userEmail: string; userName?: string; category: string; subject: string; message: string; priority?: string }): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO support_tickets (user_id, user_email, user_name, category, subject, message, priority)
      VALUES (${data.userId}, ${data.userEmail}, ${data.userName || null}, ${data.category}, ${data.subject}, ${data.message}, ${data.priority || 'normal'})
      RETURNING *
    `);
    return result.rows[0];
  }

  async getSupportTickets(status?: string): Promise<any[]> {
    if (status) {
      const result = await db.execute(sql`SELECT * FROM support_tickets WHERE status = ${status} ORDER BY created_at DESC`);
      return result.rows;
    }
    const result = await db.execute(sql`SELECT * FROM support_tickets ORDER BY created_at DESC`);
    return result.rows;
  }

  async getSupportTicketsByUser(userId: string): Promise<any[]> {
    const result = await db.execute(sql`SELECT * FROM support_tickets WHERE user_id = ${userId} ORDER BY created_at DESC`);
    return result.rows;
  }

  async getSupportTicket(id: string): Promise<any | undefined> {
    const result = await db.execute(sql`SELECT * FROM support_tickets WHERE id = ${id}`);
    return result.rows[0];
  }

  async updateSupportTicketStatus(id: string, status: string, adminNotes?: string): Promise<any | undefined> {
    const resolvedAt = status === 'resolved' ? sql`CURRENT_TIMESTAMP` : sql`NULL`;
    const result = await db.execute(sql`
      UPDATE support_tickets 
      SET status = ${status}, admin_notes = ${adminNotes || null}, resolved_at = ${resolvedAt}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `);
    return result.rows[0];
  }

  async createInfluencerApplication(data: { name: string; email: string; platform: string; handle: string; followers?: string; contentType?: string; message?: string }): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO influencer_applications (name, email, platform, handle, followers, content_type, message)
      VALUES (${data.name}, ${data.email}, ${data.platform}, ${data.handle}, ${data.followers || null}, ${data.contentType || null}, ${data.message || null})
      RETURNING *
    `);
    return result.rows[0];
  }

  async getInfluencerApplications(status?: string): Promise<any[]> {
    if (status) {
      const result = await db.execute(sql`SELECT * FROM influencer_applications WHERE status = ${status} ORDER BY created_at DESC`);
      return result.rows;
    }
    const result = await db.execute(sql`SELECT * FROM influencer_applications ORDER BY created_at DESC`);
    return result.rows;
  }

  async getInfluencerApplication(id: string): Promise<any | undefined> {
    const result = await db.execute(sql`SELECT * FROM influencer_applications WHERE id = ${id}`);
    return result.rows[0];
  }

  async updateInfluencerApplicationStatus(id: string, status: string, adminNotes?: string): Promise<any | undefined> {
    const reviewedAt = ['approved', 'rejected'].includes(status) ? sql`CURRENT_TIMESTAMP` : sql`NULL`;
    const result = await db.execute(sql`
      UPDATE influencer_applications 
      SET status = ${status}, admin_notes = ${adminNotes || null}, reviewed_at = ${reviewedAt}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `);
    return result.rows[0];
  }

  // City Zones
  async getCityZones(era?: string): Promise<CityZone[]> {
    if (era) {
      return db.select().from(cityZones).where(eq(cityZones.era, era)).orderBy(cityZones.name);
    }
    return db.select().from(cityZones).orderBy(cityZones.era, cityZones.name);
  }

  async getCityZone(id: string): Promise<CityZone | undefined> {
    const [zone] = await db.select().from(cityZones).where(eq(cityZones.id, id));
    return zone;
  }

  async createCityZone(data: InsertCityZone): Promise<CityZone> {
    const [zone] = await db.insert(cityZones).values(data).returning();
    return zone;
  }

  async updateCityZone(id: string, data: Partial<InsertCityZone>): Promise<CityZone | undefined> {
    const [zone] = await db.update(cityZones).set(data).where(eq(cityZones.id, id)).returning();
    return zone;
  }

  // Land Plots
  async getLandPlots(zoneId?: string): Promise<LandPlot[]> {
    if (zoneId) {
      return db.select().from(landPlots).where(eq(landPlots.zoneId, zoneId)).orderBy(landPlots.plotX, landPlots.plotY);
    }
    return db.select().from(landPlots).orderBy(landPlots.zoneId, landPlots.plotX, landPlots.plotY);
  }

  async getLandPlot(id: string): Promise<LandPlot | undefined> {
    const [plot] = await db.select().from(landPlots).where(eq(landPlots.id, id));
    return plot;
  }

  async getLandPlotsByOwner(ownerId: string): Promise<LandPlot[]> {
    return db.select().from(landPlots).where(eq(landPlots.ownerId, ownerId));
  }

  async getAvailablePlots(zoneId?: string): Promise<LandPlot[]> {
    if (zoneId) {
      return db.select().from(landPlots).where(and(eq(landPlots.zoneId, zoneId), eq(landPlots.isForSale, true)));
    }
    return db.select().from(landPlots).where(eq(landPlots.isForSale, true));
  }

  async createLandPlot(data: InsertLandPlot): Promise<LandPlot> {
    const [plot] = await db.insert(landPlots).values(data).returning();
    return plot;
  }

  async updateLandPlot(id: string, data: Partial<InsertLandPlot>): Promise<LandPlot | undefined> {
    const [plot] = await db.update(landPlots).set(data).where(eq(landPlots.id, id)).returning();
    return plot;
  }

  async purchasePlot(plotId: string, buyerId: string, price: number): Promise<LandPlot | undefined> {
    const [plot] = await db.update(landPlots).set({
      ownerId: buyerId,
      ownerType: "player",
      isForSale: false,
      purchasedAt: new Date(),
    }).where(eq(landPlots.id, plotId)).returning();
    
    if (plot) {
      await db.update(cityZones)
        .set({ occupiedPlots: sql`occupied_plots + 1` })
        .where(eq(cityZones.id, plot.zoneId));
    }
    
    return plot;
  }

  async getLoginStreak(userId: string): Promise<ChronicleLoginStreak | undefined> {
    const [streak] = await db.select().from(chronicleLoginStreaks).where(eq(chronicleLoginStreaks.userId, userId));
    return streak;
  }

  async checkInDaily(userId: string): Promise<{ streak: ChronicleLoginStreak; reward: ChronicleDailyReward | null; message: string }> {
    const now = new Date();
    let streak = await this.getLoginStreak(userId);
    
    const DAILY_REWARDS = [25, 35, 50, 65, 85, 110, 150];
    const MILESTONE_BONUSES: Record<number, number> = { 7: 100, 14: 250, 30: 500, 60: 1000, 90: 2000 };
    
    if (!streak) {
      const [newStreak] = await db.insert(chronicleLoginStreaks).values({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        totalLogins: 1,
        lastLoginAt: now,
        lastRewardClaimedAt: now,
        totalShellsEarned: DAILY_REWARDS[0],
      }).returning();
      
      const [reward] = await db.insert(chronicleDailyRewards).values({
        userId,
        day: 1,
        shellsAwarded: DAILY_REWARDS[0],
      }).returning();
      
      return { streak: newStreak, reward, message: "Welcome! Day 1 streak started. +25 Shells" };
    }
    
    const lastLogin = streak.lastLoginAt ? new Date(streak.lastLoginAt) : null;
    const hoursSinceLastLogin = lastLogin ? (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60) : Infinity;
    
    if (hoursSinceLastLogin < 24) {
      return { streak, reward: null, message: "Already checked in today. Come back in " + Math.ceil(24 - hoursSinceLastLogin) + " hours!" };
    }
    
    let newStreakCount = streak.currentStreak;
    let streakMessage = "";
    
    if (hoursSinceLastLogin >= 24 && hoursSinceLastLogin < 48) {
      newStreakCount = streak.currentStreak + 1;
      streakMessage = `Day ${newStreakCount} streak!`;
    } else {
      newStreakCount = 1;
      streakMessage = "Streak reset. Day 1 begins!";
    }
    
    const dayIndex = Math.min(newStreakCount - 1, 6);
    let shellsToAward = DAILY_REWARDS[dayIndex];
    let bonusType: string | null = null;
    let bonusAmount = 0;
    
    if (MILESTONE_BONUSES[newStreakCount]) {
      bonusAmount = MILESTONE_BONUSES[newStreakCount];
      bonusType = "milestone";
      streakMessage += ` MILESTONE BONUS: +${bonusAmount} Shells!`;
    }
    
    if (newStreakCount % 7 === 0 && !bonusType) {
      bonusAmount = 50;
      bonusType = "weekly_jackpot";
      streakMessage += " Weekly jackpot! +50 bonus Shells!";
    }
    
    const totalShells = shellsToAward + bonusAmount;
    
    const [updatedStreak] = await db.update(chronicleLoginStreaks).set({
      currentStreak: newStreakCount,
      longestStreak: Math.max(newStreakCount, streak.longestStreak),
      totalLogins: streak.totalLogins + 1,
      lastLoginAt: now,
      lastRewardClaimedAt: now,
      totalShellsEarned: streak.totalShellsEarned + totalShells,
      updatedAt: now,
    }).where(eq(chronicleLoginStreaks.userId, userId)).returning();
    
    const [reward] = await db.insert(chronicleDailyRewards).values({
      userId,
      day: ((newStreakCount - 1) % 7) + 1,
      shellsAwarded: shellsToAward,
      bonusType,
      bonusAmount,
    }).returning();
    
    return { streak: updatedStreak, reward, message: `${streakMessage} +${totalShells} Shells` };
  }

  async getRewardHistory(userId: string, limit: number = 30): Promise<ChronicleDailyReward[]> {
    return db.select().from(chronicleDailyRewards)
      .where(eq(chronicleDailyRewards.userId, userId))
      .orderBy(desc(chronicleDailyRewards.claimedAt))
      .limit(limit);
  }

  // Guardian AI - AI Agent Certifications
  async createAiAgentCertification(data: any): Promise<any> {
    const [cert] = await db.insert(aiAgentCertifications).values(data).returning();
    return cert;
  }

  async getAiAgentCertifications(filters: { status?: string }): Promise<any[]> {
    if (filters.status) {
      return db.select().from(aiAgentCertifications)
        .where(eq(aiAgentCertifications.status, filters.status))
        .orderBy(desc(aiAgentCertifications.createdAt));
    }
    return db.select().from(aiAgentCertifications)
      .orderBy(desc(aiAgentCertifications.createdAt));
  }

  async getAiAgentCertification(id: string): Promise<any | undefined> {
    const [cert] = await db.select().from(aiAgentCertifications).where(eq(aiAgentCertifications.id, id));
    return cert;
  }

  async updateAiAgentCertification(id: string, data: any): Promise<any | undefined> {
    const [cert] = await db.update(aiAgentCertifications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiAgentCertifications.id, id))
      .returning();
    return cert;
  }

  // Shells Balance - stub implementation for Chronicles game features
  // TODO: Integrate with treasury ledger system for proper shells tracking
  async updateShellsBalance(userId: string, amount: number, reason: string): Promise<void> {
    console.log(`[Shells] Balance update requested: user=${userId}, amount=${amount}, reason=${reason}`);
    // This is a stub - shells are tracked via treasury ledger, not user balance
    // The actual shells system uses treasuryLedger table for transactions
  }

  // Orbs Balance - legacy fallback for game rewards
  // TODO: Remove once fully migrated to shells system
  async updateOrbsBalance(userId: string, amount: number, reason: string): Promise<void> {
    console.log(`[Orbs] Legacy balance update: user=${userId}, amount=${amount}, reason=${reason}`);
    // Orbs are deprecated in favor of shells - this is a no-op fallback
  }

  async getEbookPurchase(userId: string, bookId: string): Promise<EbookPurchase | undefined> {
    const [purchase] = await db.select().from(ebookPurchases).where(and(eq(ebookPurchases.userId, userId), eq(ebookPurchases.bookId, bookId)));
    return purchase;
  }

  async createEbookPurchase(data: InsertEbookPurchase): Promise<EbookPurchase> {
    const [purchase] = await db.insert(ebookPurchases).values(data).returning();
    return purchase;
  }

  async getUserPurchases(userId: string): Promise<EbookPurchase[]> {
    return db.select().from(ebookPurchases).where(eq(ebookPurchases.userId, userId)).orderBy(desc(ebookPurchases.purchasedAt));
  }

  async createPublishedBook(data: InsertPublishedBook): Promise<PublishedBook> {
    const [book] = await db.insert(publishedBooks).values(data).returning();
    return book;
  }

  async getPublishedBook(slug: string): Promise<PublishedBook | undefined> {
    const [book] = await db.select().from(publishedBooks).where(eq(publishedBooks.slug, slug));
    return book;
  }

  async getPublishedBooks(status?: string): Promise<PublishedBook[]> {
    if (status) {
      return db.select().from(publishedBooks).where(eq(publishedBooks.status, status)).orderBy(desc(publishedBooks.publishedAt));
    }
    return db.select().from(publishedBooks).orderBy(desc(publishedBooks.createdAt));
  }

  async updatePublishedBook(id: number, data: Partial<InsertPublishedBook>): Promise<PublishedBook | undefined> {
    const [book] = await db.update(publishedBooks).set(data).where(eq(publishedBooks.id, id)).returning();
    return book;
  }

  async getAuthorBooks(authorId: string): Promise<PublishedBook[]> {
    return db.select().from(publishedBooks).where(eq(publishedBooks.authorId, authorId)).orderBy(desc(publishedBooks.createdAt));
  }

  async getPublishedBooksByCategory(category: string, subcategory?: string): Promise<PublishedBook[]> {
    if (subcategory) {
      return db.select().from(publishedBooks).where(and(eq(publishedBooks.category, category), eq(publishedBooks.subcategory, subcategory), eq(publishedBooks.status, "published"))).orderBy(desc(publishedBooks.publishedAt));
    }
    return db.select().from(publishedBooks).where(and(eq(publishedBooks.category, category), eq(publishedBooks.status, "published"))).orderBy(desc(publishedBooks.publishedAt));
  }

  async getUserLibrary(userId: string): Promise<UserLibraryItem[]> {
    return db.select().from(userLibrary).where(eq(userLibrary.userId, userId)).orderBy(desc(userLibrary.addedAt));
  }

  async addToUserLibrary(data: InsertUserLibraryItem): Promise<UserLibraryItem> {
    const [item] = await db.insert(userLibrary).values(data).returning();
    return item;
  }

  async updateLibraryProgress(userId: string, bookId: string, progress: number): Promise<void> {
    await db.update(userLibrary).set({ progress, lastReadAt: new Date() }).where(and(eq(userLibrary.userId, userId), eq(userLibrary.bookId, bookId)));
  }

  async getAiWritingSession(id: number): Promise<AiWritingSession | undefined> {
    const [session] = await db.select().from(aiWritingSessions).where(eq(aiWritingSessions.id, id));
    return session;
  }

  async getUserWritingSessions(userId: string): Promise<AiWritingSession[]> {
    return db.select().from(aiWritingSessions).where(eq(aiWritingSessions.userId, userId)).orderBy(desc(aiWritingSessions.updatedAt));
  }

  async createAiWritingSession(data: InsertAiWritingSession): Promise<AiWritingSession> {
    const [session] = await db.insert(aiWritingSessions).values(data).returning();
    return session;
  }

  async updateAiWritingSession(id: number, data: Partial<InsertAiWritingSession>): Promise<AiWritingSession | undefined> {
    const [session] = await db.update(aiWritingSessions).set({ ...data, updatedAt: new Date() }).where(eq(aiWritingSessions.id, id)).returning();
    return session;
  }

  async createInvestorPin(label?: string, expiresAt?: Date): Promise<InvestorInvitePin> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const pin = `INV-${code}`;
    const [result] = await db.insert(investorInvitePins).values({
      pin,
      label: label || null,
      expiresAt: expiresAt || null,
      active: true,
    }).returning();
    return result;
  }

  async verifyInvestorPin(pin: string): Promise<{ valid: boolean; label?: string | null }> {
    const [record] = await db.select().from(investorInvitePins).where(eq(investorInvitePins.pin, pin.toUpperCase()));
    if (!record) return { valid: false };
    if (!record.active) return { valid: false };
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) return { valid: false };
    await db.update(investorInvitePins).set({ usedAt: new Date(), usedBy: "investor" }).where(eq(investorInvitePins.id, record.id));
    return { valid: true, label: record.label };
  }

  async listInvestorPins(): Promise<InvestorInvitePin[]> {
    return db.select().from(investorInvitePins).orderBy(desc(investorInvitePins.createdAt));
  }

  async revokeInvestorPin(id: number): Promise<boolean> {
    const [result] = await db.update(investorInvitePins).set({ active: false }).where(eq(investorInvitePins.id, id)).returning();
    return !!result;
  }
}

export const storage = new DatabaseStorage();

// Core documents to seed on startup
const SEED_DOCUMENTS = [
  {
    title: "Welcome to Trust Layer",
    content: `# Welcome to Trust Layer

Trust Layer is a next-generation Layer 1 blockchain designed for speed, security, and scalability. Our Proof-of-Authority consensus mechanism delivers 200,000+ transactions per second with sub-second finality.

## Key Features

- **Ultra-Fast Transactions**: 200K+ TPS with 400ms finality
- **Low Cost**: Average transaction cost of $0.0001
- **Developer Friendly**: Comprehensive SDKs and APIs
- **Enterprise Ready**: Built for real-world applications

## Getting Started

1. Create a wallet at our portal
2. Get testnet tokens from the faucet
3. Start building with our SDK

Visit our developer documentation to learn more.`,
    category: "general",
    isPublic: true,
  },
  {
    title: "Trust Layer - Technical Whitepaper",
    content: `# Trust Layer Technical Whitepaper

## Abstract

Trust Layer (DWSC) is a purpose-built Layer 1 blockchain optimized for high-performance gaming, digital asset ownership, and decentralized applications.

## Key Specifications

- **Consensus**: Proof-of-Authority (PoA) with Founders Validator
- **Block Time**: 400ms
- **TPS**: 200,000+
- **Finality**: Instant upon block inclusion

## Token Economics

- **Native Token**: SIG
- **Total Supply**: 1,000,000,000 (fixed)
- **Decimals**: 18

## Roadmap

- Q1 2025: Testnet Launch
- Apr 11, 2026: Token Generation Event
- Beta LIVE now: Chronicles Public Beta`,
    category: "general",
    isPublic: true,
  },
  {
    title: "API Reference - Getting Started",
    content: `# Trust Layer API Reference

## Base URL

\`\`\`
Production: https://api.dwsc.io/v1
Testnet: https://testnet-api.dwsc.io/v1
\`\`\`

## Authentication

All API requests require an API key:

\`\`\`
X-API-Key: your_api_key_here
\`\`\`

## Core Endpoints

### Blocks
- GET /blocks/latest
- GET /blocks/:height

### Transactions
- GET /transactions/:hash
- POST /transactions/submit

### Accounts
- GET /accounts/:address
- GET /accounts/:address/balance`,
    category: "api-specs",
    isPublic: true,
  },
  {
    title: "JavaScript SDK",
    content: `# JavaScript SDK

Official JavaScript/TypeScript SDK for Trust Layer.

## Installation

\`\`\`bash
npm install @darkwave/sdk
\`\`\`

## Quick Start

\`\`\`typescript
import { DarkWaveSDK } from '@darkwave/sdk';

const sdk = new DarkWaveSDK({
  network: 'mainnet',
  apiKey: 'your-api-key'
});

// Create wallet
const wallet = await sdk.createWallet();

// Check balance
const balance = await sdk.getBalance(wallet.address);
\`\`\``,
    category: "integration",
    isPublic: true,
  },
  {
    title: "Wallet Integration Guide",
    content: `# Wallet Integration Guide

Integrate Trust Layer wallets into your application.

## Web Applications

### Using Trust Layer Connect

\`\`\`javascript
const connect = new DarkWaveConnect();

// Connect wallet
const wallet = await connect.connect();
console.log('Connected:', wallet.address);

// Sign message
const signature = await connect.signMessage('Hello Trust Layer!');

// Send transaction
const tx = await connect.sendTransaction({
  to: '0xrecipient...',
  amount: '1.0'
});
\`\`\``,
    category: "integration",
    isPublic: true,
  },
  {
    title: "Ecosystem Apps Overview",
    content: `# Ecosystem Apps Overview

Trust Layer powers a growing ecosystem of applications.

## Verified Apps

### Trust Layer Pulse
AI-powered predictive market intelligence and auto-trading platform.

### Orbit Staffing
Enterprise workforce management with blockchain-verified credentials.

### VedaSolus
Holistic health platform blending Ayurveda & TCM with modern science.

### GarageBot
IoT-powered garage and vehicle management.

### Brew & Board
Community platform for coffee shops with rewards.

## Becoming a Verified App

1. Submit your application for review
2. Complete security audit
3. Integrate with DarkWave APIs
4. Receive verification badge`,
    category: "app-metadata",
    isPublic: true,
  },
  {
    title: "Changelog - December 2024",
    content: `# Changelog - December 2024

## Version 2.0.0 - Portal Launch

### New Features

- **Trust Layer Portal**: Complete ecosystem interface
- **Block Explorer**: Real-time blockchain data
- **DEX & Token Swaps**: AMM-style trading
- **NFT Marketplace**: Digital asset trading
- **Staking**: Earn rewards with liquid staking

### Improvements

- 20% faster transaction processing
- Reduced API latency
- Improved mobile experience`,
    category: "changelog",
    isPublic: true,
  },
];

export async function seedDocuments(): Promise<void> {
  try {
    const existingDocs = await storage.getDocuments();
    if (existingDocs.length > 0) {
      console.log(`[seed] ${existingDocs.length} documents already exist, skipping seed`);
      return;
    }
    
    console.log("[seed] Seeding core documents...");
    for (const doc of SEED_DOCUMENTS) {
      await storage.createDocument(doc as InsertDocument);
    }
    console.log(`[seed] Successfully seeded ${SEED_DOCUMENTS.length} documents`);
  } catch (error) {
    console.error("[seed] Failed to seed documents:", error);
  }
}

const SEED_ZONES: InsertCityZone[] = [
  // Modern Era
  { era: "modern", name: "Downtown Core", description: "The gleaming corporate district of glass towers and power", zoneType: "commercial", gridX: 0, gridY: 0, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "modern" },
  { era: "modern", name: "Tech Campus", description: "Innovation hub where startups and labs push the boundaries", zoneType: "civic", gridX: 4, gridY: 0, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "modern" },
  { era: "modern", name: "Midtown Residential", description: "Apartments and condos where the city sleeps", zoneType: "residential", gridX: 0, gridY: 4, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "modern" },
  { era: "modern", name: "Central Park", description: "A green oasis in the concrete jungle", zoneType: "nature", gridX: 4, gridY: 4, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "modern" },
  { era: "modern", name: "The Underground", description: "A hidden network of clubs, markets, and meeting places", zoneType: "mixed", gridX: 8, gridY: 0, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "modern" },

  // Medieval Era
  { era: "medieval", name: "Castle Ward", description: "The fortified heart of the kingdom, home to nobles and the royal court", zoneType: "civic", gridX: 0, gridY: 0, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "medieval" },
  { era: "medieval", name: "Market Square", description: "A bustling bazaar where merchants hawk their wares", zoneType: "commercial", gridX: 4, gridY: 0, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "medieval" },
  { era: "medieval", name: "Peasant Quarter", description: "Simple homes and workshops of the common folk", zoneType: "residential", gridX: 0, gridY: 4, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "medieval" },
  { era: "medieval", name: "Temple Grove", description: "Sacred grounds where the Old Faith tends ancient groves", zoneType: "nature", gridX: 4, gridY: 4, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "medieval" },
  { era: "medieval", name: "Artisan's Row", description: "Workshops and craft halls lining a busy street", zoneType: "mixed", gridX: 8, gridY: 0, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "medieval" },

  // Wild West Era
  { era: "wildwest", name: "Main Street", description: "The dusty heart of town — saloon, general store, and the marshal's office", zoneType: "commercial", gridX: 0, gridY: 0, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "wildwest" },
  { era: "wildwest", name: "Railroad Depot", description: "Where the iron horse meets the frontier", zoneType: "civic", gridX: 4, gridY: 0, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "wildwest" },
  { era: "wildwest", name: "Settler's Row", description: "Homesteads and cabins for families carving a life from the land", zoneType: "residential", gridX: 0, gridY: 4, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "wildwest" },
  { era: "wildwest", name: "Sacred Valley", description: "Ancestral lands of the First Nations, rich with history and spirit", zoneType: "nature", gridX: 4, gridY: 4, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "wildwest" },
  { era: "wildwest", name: "Mining Camp", description: "Tents, pickaxes, and dreams of gold in the foothills", zoneType: "mixed", gridX: 8, gridY: 0, width: 4, height: 4, totalPlots: 16, occupiedPlots: 0, architectureStyle: "wildwest" },
];

export async function seedCityZones(): Promise<void> {
  try {
    const existingZones = await storage.getCityZones();
    if (existingZones.length > 0) {
      console.log(`[seed] ${existingZones.length} city zones already exist, skipping seed`);
      return;
    }
    
    console.log("[seed] Seeding city zones...");
    for (const zone of SEED_ZONES) {
      const createdZone = await storage.createCityZone(zone);
      
      const width = zone.width || 4;
      const height = zone.height || 4;
      
      // Create plots for each zone
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const plotSize = (x === 0 && y === 0) ? "premium" : 
                          (x < 2 && y < 2) ? "large" : 
                          (x < width - 1 && y < height - 1) ? "standard" : "small";
          
          const basePrices: Record<string, number> = {
            "premium": 500,
            "large": 250,
            "standard": 100,
            "small": 50
          };
          
          const basePrice = basePrices[plotSize];
          
          await storage.createLandPlot({
            zoneId: createdZone.id,
            plotX: x,
            plotY: y,
            plotSize,
            basePrice,
            currentPrice: basePrice,
            isForSale: true,
          });
        }
      }
    }
    console.log(`[seed] Successfully seeded ${SEED_ZONES.length} city zones with plots`);
  } catch (error) {
    console.error("[seed] Failed to seed city zones:", error);
  }
}

export async function seedEraBuildingTemplates(): Promise<void> {
  try {
    const { eraBuildingTemplates } = await import("@shared/schema");
    const existing = await db.select().from(eraBuildingTemplates).limit(1);
    if (existing.length > 0) {
      console.log("[seed] Era building templates already exist, skipping seed");
      return;
    }

    const { ERA_BUILDING_TEMPLATES } = await import("./chronicles-service");
    console.log("[seed] Seeding era building templates...");
    for (const tmpl of ERA_BUILDING_TEMPLATES) {
      await db.insert(eraBuildingTemplates).values({
        era: tmpl.era,
        buildingType: tmpl.buildingType,
        displayName: tmpl.displayName,
        iconEmoji: tmpl.iconEmoji,
        colorClass: tmpl.colorClass,
        description: tmpl.description,
        baseCost: tmpl.baseCost,
        unlockLevel: tmpl.unlockLevel,
      });
    }
    console.log(`[seed] Successfully seeded ${ERA_BUILDING_TEMPLATES.length} era building templates`);
  } catch (error) {
    console.error("[seed] Failed to seed era building templates:", error);
  }
}
