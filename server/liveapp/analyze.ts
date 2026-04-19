import { runLighthouseAudit } from "./lighthouse.js";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

export type LiveAppAnalysis = {
  url: string;
  loadTimeMs?: number;
  performanceScore?: number;
  accessibilityScore?: number;
  bestPracticesScore?: number;
  seoScore?: number;
  pwaScore?: number;
  screenshots?: { viewport: string; path: string }[];
  notes: string[];
};

async function takeScreenshots(
  url: string,
  sessionId: string,
): Promise<{ viewport: string; path: string }[]> {
  const viewports = [
    { width: 1920, height: 1080, name: "desktop" },
    { width: 1024, height: 768, name: "tablet" },
    { width: 375, height: 667, name: "mobile" },
  ];

  const screenshots = [];
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage();
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto(url, { waitUntil: "networkidle2" });

      const screenshotDir = path.resolve(
        process.cwd(),
        "public",
        "screenshots",
        sessionId,
      );
      await fs.mkdir(screenshotDir, { recursive: true });
      const screenshotPath = path.join(screenshotDir, `${viewport.name}.png`);
      await page.screenshot({ path: screenshotPath });
      screenshots.push({
        viewport: viewport.name,
        path: `/screenshots/${sessionId}/${viewport.name}.png`,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  return screenshots;
}

function scoreFromLoadTime(loadTimeMs: number): number {
  if (loadTimeMs <= 800) return 95;
  if (loadTimeMs <= 2000) {
    const t = (loadTimeMs - 800) / (2000 - 800);
    return Math.round(95 - t * 30);
  }
  if (loadTimeMs <= 5000) {
    const t = (loadTimeMs - 2000) / (5000 - 2000);
    return Math.round(65 - t * 45);
  }
  return 10;
}

export async function analyzeLiveApp(
  url: string,
  sessionId: string,
): Promise<LiveAppAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  const notes: string[] = [];
  const started = Date.now();

  try {
    const lighthouseResult = await runLighthouseAudit(url);
    const screenshots = await takeScreenshots(url, sessionId);
    const res = await fetch(url, {
      signal: controller.signal,
    });
    const toOptionalScore = (value: number | null | undefined) =>
      typeof value === "number" ? value : undefined;

    const loadTimeMs = Date.now() - started;

    if (!res.ok) {
      notes.push(`HTTP ${res.status} when fetching live app`);
      return {
        url,
        loadTimeMs,
        performanceScore: scoreFromLoadTime(loadTimeMs),
        accessibilityScore: undefined,
        notes,
      };
    }

    // Read up to ~400KB to avoid huge downloads.
    const reader = res.body?.getReader();
    let totalBytes = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (totalBytes < 400_000) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        totalBytes += value.byteLength;
        chunks.push(value);
      }
      try {
        reader.releaseLock();
      } catch {
        // ignore
      }
    }

    let html = "";
    try {
      html = Buffer.concat(chunks).toString("utf8");
    } catch {
      html = "";
    }

    const lower = html.toLowerCase();
    const hasLang = /<html[^>]*\slang=/.test(lower);
    const hasViewport = /<meta[^>]*name=["']viewport["']/.test(lower);
    const imgTags = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map(
      (m) => m[0],
    );
    const imgCount = imgTags.length;
    const imgWithAlt = imgTags.filter((t) =>
      /\salt=/.test(t.toLowerCase()),
    ).length;
    const ariaLabelCount = (html.match(/aria-label=/gi) ?? []).length;

    let accessibilityScore = 40;
    if (hasLang) accessibilityScore += 20;
    else notes.push("Accessibility: missing <html lang=...> signal.");

    if (hasViewport) accessibilityScore += 15;
    else notes.push("Accessibility/UX: missing meta viewport signal (mobile).");

    if (imgCount > 0) {
      const ratio = imgWithAlt / imgCount;
      accessibilityScore += Math.round(ratio * 25);
      if (ratio < 0.7)
        notes.push(
          "Accessibility: many <img> tags lack alt text (rough heuristic).",
        );
    } else {
      accessibilityScore += 10;
    }

    if (ariaLabelCount > 0) accessibilityScore += 10;
    accessibilityScore = Math.max(0, Math.min(100, accessibilityScore));

    notes.push("Performance score is from Lighthouse.");
    notes.push(
      "Accessibility score is a combination of Lighthouse and HTML heuristics.",
    );
    notes.push(
      "UI/UX and interaction smoothness require browser-based auditing (not run on server).",
    );

    return {
      url,
      loadTimeMs,
      performanceScore: toOptionalScore(lighthouseResult.performance),
      accessibilityScore:
        ((toOptionalScore(lighthouseResult.accessibility) ?? 0) * 100 +
          accessibilityScore) /
        2,
      bestPracticesScore: toOptionalScore(lighthouseResult.bestPractices),
      seoScore: toOptionalScore(lighthouseResult.seo),
      pwaScore: toOptionalScore(lighthouseResult.pwa),
      screenshots,
      notes,
    };
  } catch (e) {
    const loadTimeMs = Date.now() - started;
    notes.push("Failed to fetch live app URL.");
    if (e instanceof Error) {
      notes.push(e.message);
    }

    return {
      url,
      loadTimeMs,
      performanceScore: undefined,
      accessibilityScore: undefined,
      notes,
    };
  } finally {
    clearTimeout(timeout);
  }
}
