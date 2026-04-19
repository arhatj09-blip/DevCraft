import puppeteer from "puppeteer";
import lighthouse from "lighthouse";
import { URL } from "url";

export async function runLighthouseAudit(url: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  const report = await lighthouse(url, {
    port: Number(new URL(browser.wsEndpoint()).port),
    output: "json",
    logLevel: "info",
  });

  if (!report?.lhr) {
    throw new Error("Lighthouse did not return an LHR result");
  }

  const { lhr } = report;

  await browser.close();

  return {
    performance: lhr.categories.performance.score,
    accessibility: lhr.categories.accessibility.score,
    bestPractices: lhr.categories["best-practices"].score,
    seo: lhr.categories.seo.score,
    pwa: lhr.categories.pwa.score,
  };
}
