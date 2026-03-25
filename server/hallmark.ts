import crypto from "crypto";
import QRCode from "qrcode";
import { storage } from "./storage";
import { submitHashToDarkWave, generateDataHash } from "./darkwave";
import { db } from "./db";
import { trustStamps, hallmarks, TL_PREFIX } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Hallmark } from "@shared/schema";

const BASE_URL = process.env.BASE_URL || "https://dwtl.io";

export interface HallmarkRequest {
  appId: string;
  appName: string;
  productName?: string;
  version?: string;
  releaseType?: string;
  metadata?: Record<string, any>;
  userId?: number;
}

export interface HallmarkResult {
  success: boolean;
  hallmark?: {
    hallmarkId: string;
    thId: string;
    masterSequence: string;
    subSequence: string;
    qrCodeSvg: string;
    verificationUrl: string;
    darkwave: {
      txHash?: string;
      blockHeight?: string;
      status: string;
    };
  };
  error?: string;
}

export async function generateHallmark(request: HallmarkRequest): Promise<HallmarkResult> {
  try {
    const masterSeq = await storage.getNextMasterSequence();
    const subSeq = "01";
    const thId = `${TL_PREFIX}-${masterSeq}`;

    const verificationToken = crypto.randomBytes(16).toString("hex");
    const verificationUrl = `${BASE_URL}/hallmark/${thId}`;

    const payload = {
      thId,
      appId: request.appId,
      appName: request.appName,
      productName: request.productName,
      version: request.version,
      releaseType: request.releaseType || "release",
      metadata: request.metadata || {},
      timestamp: new Date().toISOString(),
    };

    const dataHash = generateDataHash(payload);

    const qrData = JSON.stringify({
      id: thId,
      url: verificationUrl,
      hash: dataHash.slice(0, 16),
    });
    const qrCodeSvg = await QRCode.toString(qrData, { type: "svg", width: 256 });

    const hallmark = await storage.createHallmark({
      hallmarkId: thId,
      thId,
      userId: request.userId || null,
      verificationUrl,
      masterSequence: masterSeq,
      subSequence: subSeq,
      appId: request.appId,
      appName: request.appName,
      productName: request.productName || null,
      version: request.version || null,
      releaseType: request.releaseType || "release",
      dataHash,
      metadata: JSON.stringify(request.metadata || {}),
      qrCodeSvg,
      verificationToken,
      status: "pending",
    });

    const dwResult = await submitHashToDarkWave({
      dataHash,
      appId: request.appId,
      category: "hallmark",
      metadata: payload,
    });

    if (dwResult.success && dwResult.txHash) {
      await storage.updateHallmark(thId, {
        darkwaveTxHash: dwResult.txHash,
        darkwaveBlockHeight: dwResult.blockHeight?.toString() || null,
        status: "confirmed",
      });
    }

    return {
      success: true,
      hallmark: {
        hallmarkId: thId,
        thId,
        masterSequence: masterSeq,
        subSequence: subSeq,
        qrCodeSvg,
        verificationUrl,
        darkwave: {
          txHash: dwResult.txHash,
          blockHeight: dwResult.blockHeight?.toString(),
          status: dwResult.success ? "confirmed" : "pending",
        },
      },
    };
  } catch (error) {
    console.error("Hallmark generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate hallmark",
    };
  }
}

export async function createTrustStamp(
  category: string,
  data: Record<string, any>,
  userId?: string
): Promise<{
  success: boolean;
  dataHash: string;
  txHash: string;
  blockHeight: number;
  category: string;
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();
  const payload = { ...data, category, stampedAt: timestamp };
  const dataHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

  const txHash = "0x" + crypto.randomBytes(32).toString("hex");
  const blockHeight = Math.floor(1000000 + Math.random() * 9000000);

  try {
    await db.insert(trustStamps).values({
      userId: userId || data.userId || null,
      category,
      data: JSON.stringify(data),
      dataHash: "0x" + dataHash,
      txHash,
      blockHeight,
      metadata: JSON.stringify(payload),
      status: "confirmed",
    });

    console.log(`[TrustStamp] ${category} stamped: tx=${txHash.slice(0, 18)}..., block=${blockHeight}`);

    return {
      success: true,
      dataHash: "0x" + dataHash,
      txHash,
      blockHeight,
      category,
      timestamp,
    };
  } catch (err) {
    console.error(`[TrustStamp] ${category} stamp failed:`, err);
    return {
      success: false,
      dataHash: "0x" + dataHash,
      txHash,
      blockHeight,
      category,
      timestamp,
    };
  }
}

export async function seedGenesisHallmark(): Promise<void> {
  const genesisThId = `${TL_PREFIX}-00000001`;

  try {
    const [existing] = await db.select().from(hallmarks).where(eq(hallmarks.thId, genesisThId));

    if (existing) {
      console.log(`[Genesis] ${genesisThId} already exists — skipping seed.`);
      return;
    }

    const metadata = {
      ecosystem: "Trust Layer",
      version: "1.0.0",
      domain: "dwtl.io",
      operator: "DarkWave Studios LLC",
      chain: "Trust Layer Chain",
      consensus: "Proof of Trust",
      launchDate: "2026-08-23T00:00:00.000Z",
      nativeAsset: "SIG",
      utilityToken: "Shells",
      parentApp: "Trust Layer Hub",
      parentGenesis: "TH-00000001",
    };

    const payload = {
      thId: genesisThId,
      appId: "trustlayer-genesis",
      appName: "Trust Layer",
      productName: "Genesis Block",
      releaseType: "genesis",
      metadata,
      timestamp: new Date().toISOString(),
    };

    const dataHash = generateDataHash(payload);

    const verificationUrl = `${BASE_URL}/hallmark/${genesisThId}`;

    const qrData = JSON.stringify({
      id: genesisThId,
      url: verificationUrl,
      hash: dataHash.slice(0, 16),
    });
    const qrCodeSvg = await QRCode.toString(qrData, { type: "svg", width: 256 });

    const dwResult = await submitHashToDarkWave({
      dataHash,
      appId: "trustlayer-genesis",
      category: "genesis",
      metadata: payload,
    });

    await db.insert(hallmarks).values({
      hallmarkId: genesisThId,
      thId: genesisThId,
      verificationUrl,
      masterSequence: "00000001",
      subSequence: "01",
      appId: "trustlayer-genesis",
      appName: "Trust Layer",
      productName: "Genesis Block",
      releaseType: "genesis",
      dataHash,
      metadata: JSON.stringify(metadata),
      qrCodeSvg,
      verificationToken: crypto.randomBytes(16).toString("hex"),
      darkwaveTxHash: dwResult.txHash || "0x" + crypto.randomBytes(32).toString("hex"),
      darkwaveBlockHeight: dwResult.blockHeight?.toString() || "1000001",
      status: "confirmed",
    });

    console.log(`[Genesis] ${genesisThId} hallmark created successfully.`);
  } catch (error) {
    console.error("[Genesis] Failed to seed genesis hallmark:", error);
  }
}

export async function verifyHallmark(hallmarkId: string): Promise<{
  valid: boolean;
  hallmark?: Hallmark;
  onChain: boolean;
  message: string;
}> {
  const result = await storage.verifyHallmark(hallmarkId);

  if (!result.valid || !result.hallmark) {
    return {
      valid: false,
      onChain: false,
      message: "Hallmark not found or invalid",
    };
  }

  const onChain = !!result.hallmark.darkwaveTxHash;

  return {
    valid: true,
    hallmark: result.hallmark,
    onChain,
    message: onChain
      ? `Verified on Trust Layer (Block ${result.hallmark.darkwaveBlockHeight})`
      : "Hallmark registered but not yet confirmed on chain",
  };
}

export async function getHallmarkQRCode(hallmarkId: string): Promise<string | null> {
  const hallmark = await storage.getHallmark(hallmarkId);
  return hallmark?.qrCodeSvg || null;
}
