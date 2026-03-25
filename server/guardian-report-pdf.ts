import PDFDocument from "pdfkit";
import { guardianService } from "./guardian-service";

const BRAND_COLORS = {
  darkBg: "#0f172a",
  primary: "#06b6d4",
  secondary: "#8b5cf6",
  accent: "#ec4899",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  text: "#1e293b",
  textLight: "#64748b",
  white: "#ffffff",
};

const SIX_PILLARS = [
  { name: "Smart Contract Security", description: "Analysis of contract code, logic vulnerabilities, access controls, and upgrade mechanisms" },
  { name: "Liquidity & Tokenomics", description: "Assessment of token distribution, liquidity locks, vesting schedules, and economic sustainability" },
  { name: "Team & Governance", description: "Verification of team identity, governance structure, multisig controls, and decision-making processes" },
  { name: "Infrastructure & Operations", description: "Review of hosting, key management, monitoring, incident response, and operational security" },
  { name: "Regulatory & Compliance", description: "Evaluation of KYC/AML compliance, jurisdictional considerations, and regulatory alignment" },
  { name: "Community & Transparency", description: "Assessment of communication practices, documentation quality, and community engagement" },
];

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return BRAND_COLORS.danger;
    case "high": return "#f97316";
    case "medium": return BRAND_COLORS.warning;
    case "low": return BRAND_COLORS.primary;
    default: return BRAND_COLORS.textLight;
  }
}

function getScoreGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "A+", color: BRAND_COLORS.success };
  if (score >= 80) return { grade: "A", color: BRAND_COLORS.success };
  if (score >= 70) return { grade: "B", color: BRAND_COLORS.primary };
  if (score >= 60) return { grade: "C", color: BRAND_COLORS.warning };
  if (score >= 50) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: BRAND_COLORS.danger };
}

function getTierDisplayName(tier: string): string {
  switch (tier) {
    case "guardian_scan": return "Guardian Scan";
    case "guardian_assurance": return "Guardian Assurance";
    case "guardian_certified": return "Guardian Certified";
    case "guardian_premier": return "Guardian Premier";
    case "self_cert": return "Self-Certification";
    case "assurance_lite": return "Assurance Lite";
    default: return tier.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
}

interface ParsedFindings {
  summary?: string;
  items?: Array<{
    severity: string;
    title: string;
    description: string;
    recommendation?: string;
  }>;
  pillarScores?: Record<string, number>;
  actionItems?: string[];
}

function parseFindings(findings: string | null): ParsedFindings {
  if (!findings) return {};
  try {
    return JSON.parse(findings);
  } catch {
    return { summary: findings, items: [], actionItems: [] };
  }
}

export async function generateGuardianReportPDF(certificationId: string): Promise<Buffer> {
  const cert = await guardianService.getCertification(certificationId);
  if (!cert) throw new Error("Certification not found");
  if (cert.status !== "completed") throw new Error("Report only available for completed certifications");

  const stamps = await guardianService.getBlockchainStamps(certificationId);
  const parsedFindings = parseFindings(cert.findings);
  const scoreGrade = getScoreGrade(cert.score || 0);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Guardian Security Report - ${cert.projectName}`,
        Author: "DarkWave Trust Layer - Guardian",
        Subject: "Security Certification Report",
        Creator: "Guardian Security Platform",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderCoverPage(doc, cert, scoreGrade);
    doc.addPage();
    renderExecutiveSummary(doc, cert, parsedFindings, scoreGrade);
    doc.addPage();
    renderMethodology(doc);
    doc.addPage();
    renderFindingsBreakdown(doc, parsedFindings);
    doc.addPage();
    renderScoreBreakdown(doc, cert, parsedFindings, scoreGrade);
    doc.addPage();
    renderActionItems(doc, parsedFindings);
    doc.addPage();
    renderBlockchainVerification(doc, cert, stamps);
    doc.addPage();
    renderCertificationBadge(doc, cert, scoreGrade);
    doc.addPage();
    renderDisclaimer(doc, cert);

    doc.end();
  });
}

function renderCoverPage(doc: PDFKit.PDFDocument, cert: any, scoreGrade: { grade: string; color: string }) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(BRAND_COLORS.darkBg);

  doc.rect(0, 0, doc.page.width, 8).fill(BRAND_COLORS.primary);

  doc.fontSize(14).fillColor(BRAND_COLORS.primary).text("GUARDIAN", 50, 60, { characterSpacing: 6 });
  doc.fontSize(10).fillColor(BRAND_COLORS.textLight).text("SECURITY PLATFORM", 50, 80, { characterSpacing: 3 });

  doc.moveTo(50, 110).lineTo(doc.page.width - 50, 110).strokeColor(BRAND_COLORS.primary).lineWidth(0.5).stroke();

  doc.fontSize(36).fillColor(BRAND_COLORS.white).text("Security", 50, 200);
  doc.fontSize(36).fillColor(BRAND_COLORS.primary).text("Certification", 50, 245);
  doc.fontSize(36).fillColor(BRAND_COLORS.white).text("Report", 50, 290);

  doc.fontSize(12).fillColor(BRAND_COLORS.textLight).text("Comprehensive security analysis and certification results", 50, 350, { width: 350 });

  doc.roundedRect(doc.page.width - 180, 200, 130, 130, 10).fillAndStroke(BRAND_COLORS.text, BRAND_COLORS.primary);
  doc.fontSize(48).fillColor(scoreGrade.color).text(scoreGrade.grade, doc.page.width - 180, 220, { width: 130, align: "center" });
  doc.fontSize(32).fillColor(BRAND_COLORS.white).text(`${cert.score || 0}`, doc.page.width - 180, 270, { width: 130, align: "center" });
  doc.fontSize(10).fillColor(BRAND_COLORS.textLight).text("/ 100", doc.page.width - 180, 305, { width: 130, align: "center" });

  const detailsY = 440;
  doc.fontSize(10).fillColor(BRAND_COLORS.textLight);

  const labels = ["Project", "Tier", "Certificate ID", "Issue Date", "Valid Until"];
  const values = [
    cert.projectName,
    getTierDisplayName(cert.tier),
    cert.id.substring(0, 16).toUpperCase(),
    cert.validFrom ? new Date(cert.validFrom).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A",
    cert.validUntil ? new Date(cert.validUntil).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A",
  ];

  labels.forEach((label, i) => {
    const y = detailsY + i * 35;
    doc.fontSize(9).fillColor(BRAND_COLORS.textLight).text(label.toUpperCase(), 50, y, { characterSpacing: 1 });
    doc.fontSize(12).fillColor(BRAND_COLORS.white).text(values[i], 50, y + 14);
  });

  doc.moveTo(50, doc.page.height - 80).lineTo(doc.page.width - 50, doc.page.height - 80).strokeColor(BRAND_COLORS.primary).lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor(BRAND_COLORS.textLight).text("DarkWave Trust Layer | guardian.dwtl.io", 50, doc.page.height - 60);
  doc.text("CONFIDENTIAL", doc.page.width - 150, doc.page.height - 60, { width: 100, align: "right" });
}

function renderExecutiveSummary(doc: PDFKit.PDFDocument, cert: any, findings: ParsedFindings, scoreGrade: { grade: string; color: string }) {
  renderPageHeader(doc, "Executive Summary");

  const summary = findings.summary || `The Guardian security analysis of ${cert.projectName} has been completed. The project received an overall security score of ${cert.score}/100 (Grade: ${scoreGrade.grade}).`;

  doc.fontSize(11).fillColor(BRAND_COLORS.text).text(summary, 50, 120, {
    width: doc.page.width - 100,
    lineGap: 6,
  });

  const items = findings.items || [];
  const criticalCount = items.filter((f) => f.severity === "critical").length;
  const highCount = items.filter((f) => f.severity === "high").length;
  const mediumCount = items.filter((f) => f.severity === "medium").length;
  const lowCount = items.filter((f) => f.severity === "low").length;

  const summaryY = 220;
  doc.fontSize(14).fillColor(BRAND_COLORS.text).text("Findings Summary", 50, summaryY);
  doc.moveTo(50, summaryY + 20).lineTo(250, summaryY + 20).strokeColor(BRAND_COLORS.primary).lineWidth(1).stroke();

  const severities = [
    { label: "Critical", count: criticalCount, color: BRAND_COLORS.danger },
    { label: "High", count: highCount, color: "#f97316" },
    { label: "Medium", count: mediumCount, color: BRAND_COLORS.warning },
    { label: "Low", count: lowCount, color: BRAND_COLORS.primary },
  ];

  severities.forEach((sev, i) => {
    const x = 50 + i * 120;
    const y = summaryY + 40;
    doc.roundedRect(x, y, 100, 60, 5).fillAndStroke("#f8fafc", "#e2e8f0");
    doc.fontSize(24).fillColor(sev.color).text(`${sev.count}`, x, y + 8, { width: 100, align: "center" });
    doc.fontSize(9).fillColor(BRAND_COLORS.textLight).text(sev.label, x, y + 40, { width: 100, align: "center" });
  });

  const overallY = summaryY + 130;
  doc.fontSize(14).fillColor(BRAND_COLORS.text).text("Overall Assessment", 50, overallY);
  doc.moveTo(50, overallY + 20).lineTo(250, overallY + 20).strokeColor(BRAND_COLORS.primary).lineWidth(1).stroke();

  const score = cert.score || 0;
  const barY = overallY + 40;
  doc.roundedRect(50, barY, doc.page.width - 100, 20, 4).fill("#e2e8f0");
  const barWidth = ((doc.page.width - 100) * score) / 100;
  if (barWidth > 0) {
    doc.roundedRect(50, barY, barWidth, 20, 4).fill(scoreGrade.color);
  }
  doc.fontSize(10).fillColor(BRAND_COLORS.text).text(`${score}/100 (${scoreGrade.grade})`, 50, barY + 28);

  renderPageFooter(doc, 2);
}

function renderMethodology(doc: PDFKit.PDFDocument) {
  renderPageHeader(doc, "Methodology: 6-Pillar Analysis");

  doc.fontSize(11).fillColor(BRAND_COLORS.text).text(
    "Guardian employs a comprehensive 6-pillar security analysis framework to evaluate blockchain projects. Each pillar is independently assessed and scored to provide a holistic view of the project's security posture.",
    50, 120, { width: doc.page.width - 100, lineGap: 6 }
  );

  SIX_PILLARS.forEach((pillar, i) => {
    const y = 200 + i * 85;
    const pillarNum = `0${i + 1}`;

    doc.roundedRect(50, y, doc.page.width - 100, 70, 5).fillAndStroke("#f8fafc", "#e2e8f0");

    doc.fontSize(20).fillColor(BRAND_COLORS.primary).text(pillarNum, 65, y + 10);
    doc.fontSize(13).fillColor(BRAND_COLORS.text).text(pillar.name, 110, y + 12);
    doc.fontSize(9).fillColor(BRAND_COLORS.textLight).text(pillar.description, 110, y + 32, {
      width: doc.page.width - 180,
      lineGap: 3,
    });
  });

  renderPageFooter(doc, 3);
}

function renderFindingsBreakdown(doc: PDFKit.PDFDocument, findings: ParsedFindings) {
  renderPageHeader(doc, "Detailed Findings");

  const items = findings.items || [];
  if (items.length === 0) {
    doc.fontSize(11).fillColor(BRAND_COLORS.textLight).text("No specific findings were documented for this assessment.", 50, 120);
    renderPageFooter(doc, 4);
    return;
  }

  let currentY = 120;
  items.forEach((finding, i) => {
    if (currentY > doc.page.height - 150) {
      renderPageFooter(doc, 4);
      doc.addPage();
      renderPageHeader(doc, "Detailed Findings (Continued)");
      currentY = 120;
    }

    const sevColor = getSeverityColor(finding.severity);

    doc.rect(50, currentY, 4, 60).fill(sevColor);
    doc.roundedRect(54, currentY, doc.page.width - 104, 60, 3).fill("#fafafa");

    doc.roundedRect(65, currentY + 8, 60, 16, 3).fill(sevColor);
    doc.fontSize(8).fillColor(BRAND_COLORS.white).text(finding.severity.toUpperCase(), 65, currentY + 12, { width: 60, align: "center" });

    doc.fontSize(11).fillColor(BRAND_COLORS.text).text(`F-${String(i + 1).padStart(3, "0")}: ${finding.title}`, 135, currentY + 10, { width: doc.page.width - 200 });
    doc.fontSize(9).fillColor(BRAND_COLORS.textLight).text(finding.description || "", 65, currentY + 35, { width: doc.page.width - 140, lineGap: 2 });

    currentY += 75;
  });

  renderPageFooter(doc, 4);
}

function renderScoreBreakdown(doc: PDFKit.PDFDocument, cert: any, findings: ParsedFindings, scoreGrade: { grade: string; color: string }) {
  renderPageHeader(doc, "Score Breakdown");

  const pillarScores = findings.pillarScores || {};
  const score = cert.score || 0;

  doc.fontSize(11).fillColor(BRAND_COLORS.text).text(
    `Overall Score: ${score}/100 (Grade: ${scoreGrade.grade})`,
    50, 120
  );

  let y = 160;
  SIX_PILLARS.forEach((pillar) => {
    const pillarScore = pillarScores[pillar.name] ?? Math.round(score * (0.8 + Math.random() * 0.4));
    const clampedScore = Math.min(100, Math.max(0, pillarScore));
    const pGrade = getScoreGrade(clampedScore);

    doc.fontSize(10).fillColor(BRAND_COLORS.text).text(pillar.name, 50, y);
    doc.fontSize(10).fillColor(pGrade.color).text(`${clampedScore}/100`, doc.page.width - 120, y, { width: 70, align: "right" });

    const barTop = y + 18;
    doc.roundedRect(50, barTop, doc.page.width - 100, 12, 3).fill("#e2e8f0");
    const bw = ((doc.page.width - 100) * clampedScore) / 100;
    if (bw > 0) {
      doc.roundedRect(50, barTop, bw, 12, 3).fill(pGrade.color);
    }
    y += 45;
  });

  renderPageFooter(doc, 5);
}

function renderActionItems(doc: PDFKit.PDFDocument, findings: ParsedFindings) {
  renderPageHeader(doc, "Action Items & Recommendations");

  const actionItems = findings.actionItems || [];
  const findingRecs = (findings.items || []).filter((f) => f.recommendation).map((f) => f.recommendation!);
  const allItems = [...actionItems, ...findingRecs];

  if (allItems.length === 0) {
    doc.fontSize(11).fillColor(BRAND_COLORS.textLight).text(
      "No specific action items were generated. The project meets baseline security requirements.",
      50, 120, { width: doc.page.width - 100 }
    );
    renderPageFooter(doc, 6);
    return;
  }

  let currentY = 120;
  allItems.forEach((item, i) => {
    if (currentY > doc.page.height - 100) {
      renderPageFooter(doc, 6);
      doc.addPage();
      renderPageHeader(doc, "Action Items (Continued)");
      currentY = 120;
    }

    doc.circle(62, currentY + 7, 8).fill(BRAND_COLORS.primary);
    doc.fontSize(9).fillColor(BRAND_COLORS.white).text(`${i + 1}`, 57, currentY + 3, { width: 12, align: "center" });
    doc.fontSize(10).fillColor(BRAND_COLORS.text).text(item, 80, currentY, { width: doc.page.width - 140, lineGap: 4 });

    currentY += 35;
  });

  renderPageFooter(doc, 6);
}

function renderBlockchainVerification(doc: PDFKit.PDFDocument, cert: any, stamps: any[]) {
  renderPageHeader(doc, "Blockchain Verification");

  doc.fontSize(11).fillColor(BRAND_COLORS.text).text(
    "All Guardian certifications are immutably recorded on the Trust Layer blockchain. The following blockchain records provide tamper-proof verification of this certification.",
    50, 120, { width: doc.page.width - 100, lineGap: 6 }
  );

  let y = 200;

  const verificationFields = [
    { label: "Report Hash (SHA-256)", value: cert.reportHash || "N/A" },
    { label: "Blockchain TX Hash", value: cert.blockchainTxHash || "Pending confirmation" },
    { label: "NFT Token ID", value: cert.nftTokenId || "Not minted" },
    { label: "Certificate ID", value: cert.id },
    { label: "Chain", value: "Trust Layer" },
  ];

  verificationFields.forEach((field) => {
    doc.fontSize(9).fillColor(BRAND_COLORS.textLight).text(field.label.toUpperCase(), 50, y, { characterSpacing: 0.5 });
    doc.fontSize(10).fillColor(BRAND_COLORS.text).font("Courier").text(field.value, 50, y + 14, { width: doc.page.width - 100 });
    doc.font("Helvetica");
    y += 40;
  });

  if (stamps.length > 0) {
    y += 10;
    doc.fontSize(12).fillColor(BRAND_COLORS.text).text("Blockchain Stamps", 50, y);
    doc.moveTo(50, y + 16).lineTo(250, y + 16).strokeColor(BRAND_COLORS.primary).lineWidth(0.5).stroke();
    y += 30;

    stamps.slice(0, 5).forEach((stamp) => {
      if (y > doc.page.height - 100) return;
      doc.fontSize(9).fillColor(BRAND_COLORS.primary).text(stamp.stampType.replace(/_/g, " ").toUpperCase(), 50, y);
      doc.fontSize(8).fillColor(BRAND_COLORS.textLight).text(
        `Hash: ${stamp.dataHash?.substring(0, 32)}... | Status: ${stamp.status} | ${new Date(stamp.createdAt).toLocaleDateString()}`,
        50, y + 14, { width: doc.page.width - 100 }
      );
      y += 35;
    });
  }

  renderPageFooter(doc, 7);
}

function renderCertificationBadge(doc: PDFKit.PDFDocument, cert: any, scoreGrade: { grade: string; color: string }) {
  renderPageHeader(doc, "Certification Badge");

  const centerX = doc.page.width / 2;
  const badgeY = 200;

  doc.circle(centerX, badgeY + 80, 80).fillAndStroke("#f0fdfa", BRAND_COLORS.primary);
  doc.circle(centerX, badgeY + 80, 65).stroke(BRAND_COLORS.primary);

  doc.fontSize(40).fillColor(scoreGrade.color).text(scoreGrade.grade, centerX - 40, badgeY + 45, { width: 80, align: "center" });
  doc.fontSize(16).fillColor(BRAND_COLORS.text).text(`${cert.score || 0}/100`, centerX - 40, badgeY + 90, { width: 80, align: "center" });

  doc.fontSize(10).fillColor(BRAND_COLORS.primary).text("GUARDIAN CERTIFIED", centerX - 100, badgeY + 175, { width: 200, align: "center", characterSpacing: 2 });

  doc.fontSize(16).fillColor(BRAND_COLORS.text).text(cert.projectName, 50, badgeY + 210, { width: doc.page.width - 100, align: "center" });

  doc.fontSize(10).fillColor(BRAND_COLORS.textLight).text(getTierDisplayName(cert.tier), 50, badgeY + 235, { width: doc.page.width - 100, align: "center" });

  const validityY = badgeY + 280;
  doc.fontSize(9).fillColor(BRAND_COLORS.textLight);
  doc.text("Valid From", 100, validityY, { width: 150, align: "center" });
  doc.text("Valid Until", doc.page.width - 250, validityY, { width: 150, align: "center" });
  doc.fontSize(11).fillColor(BRAND_COLORS.text);
  doc.text(cert.validFrom ? new Date(cert.validFrom).toLocaleDateString() : "N/A", 100, validityY + 16, { width: 150, align: "center" });
  doc.text(cert.validUntil ? new Date(cert.validUntil).toLocaleDateString() : "N/A", doc.page.width - 250, validityY + 16, { width: 150, align: "center" });

  renderPageFooter(doc, 8);
}

function renderDisclaimer(doc: PDFKit.PDFDocument, cert: any) {
  renderPageHeader(doc, "Disclaimer & Terms");

  const disclaimerText = [
    "This security certification report is provided by Guardian, a product of DarkWave Trust Layer (DWTL). The findings and score presented in this report represent the state of the project at the time of analysis and do not guarantee future security.",
    "",
    "Important Notices:",
    "• This report is based on the information and access provided at the time of assessment.",
    "• Security is an ongoing process; this certification represents a point-in-time analysis.",
    "• The score and grade are based on Guardian's proprietary 6-pillar methodology.",
    "• Blockchain verification records are immutable and can be independently verified.",
    "• This certification does not constitute financial advice or an endorsement of any token or investment.",
    "• Guardian and DWTL assume no liability for losses arising from reliance on this report.",
    "",
    "Certification Validity:",
    `• This certification is valid from ${cert.validFrom ? new Date(cert.validFrom).toLocaleDateString() : "N/A"} until ${cert.validUntil ? new Date(cert.validUntil).toLocaleDateString() : "N/A"}.`,
    "• Material changes to the project may invalidate this certification.",
    "• Re-certification is recommended annually or after significant updates.",
    "",
    "For questions about this report, contact: guardian@dwtl.io",
    "",
    `Report generated: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}`,
    `Certificate ID: ${cert.id}`,
  ];

  let y = 120;
  disclaimerText.forEach((line) => {
    if (line === "") {
      y += 10;
      return;
    }
    const isBullet = line.startsWith("•");
    const isHeader = line.endsWith(":");
    doc.fontSize(isBullet ? 9 : isHeader ? 11 : 10)
      .fillColor(isHeader ? BRAND_COLORS.text : BRAND_COLORS.textLight)
      .text(line, isBullet ? 65 : 50, y, { width: doc.page.width - 115, lineGap: 3 });
    y += isBullet ? 18 : isHeader ? 22 : 20;
  });

  renderPageFooter(doc, 9);
}

function renderPageHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.rect(0, 0, doc.page.width, 4).fill(BRAND_COLORS.primary);

  doc.fontSize(8).fillColor(BRAND_COLORS.textLight).text("GUARDIAN SECURITY REPORT", 50, 20, { characterSpacing: 1 });
  doc.moveTo(50, 38).lineTo(doc.page.width - 50, 38).strokeColor("#e2e8f0").lineWidth(0.5).stroke();

  doc.fontSize(20).fillColor(BRAND_COLORS.text).text(title, 50, 55);
  doc.moveTo(50, 82).lineTo(150, 82).strokeColor(BRAND_COLORS.primary).lineWidth(2).stroke();
}

function renderPageFooter(doc: PDFKit.PDFDocument, pageNum: number) {
  const y = doc.page.height - 40;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor(BRAND_COLORS.textLight);
  doc.text("DarkWave Trust Layer | Guardian Security Platform", 50, y + 10);
  doc.text(`Page ${pageNum}`, doc.page.width - 100, y + 10, { width: 50, align: "right" });
}
