import puppeteer from 'puppeteer'
import type { AuditReport } from './report.js'

export async function generatePDF(report: AuditReport): Promise<Buffer> {
  const htmlContent = generatePDFContent(report)
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      printBackground: true,
    })
    await browser.close()
    return Buffer.from(pdfBuffer)
  } catch (error) {
    console.error('PDF generation error:', error)
    throw new Error('Failed to generate PDF')
  }
}

export function generatePDFContent(report: AuditReport): string {
  const summary = report.summary
  const strengths = report.strengths || []
  const weaknesses = report.weaknesses || []
  const projects = report.projects || []
  const resumeInsights = (report as any).resumeInsights || {}
  const ai = (report as any).ai?.response || {}

  // Generate HTML content that will be converted to PDF
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #4648d4;
      padding-bottom: 20px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #4648d4;
      margin: 0;
    }
    .subtitle {
      font-size: 14px;
      color: #666;
      margin-top: 10px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 22px;
      font-weight: bold;
      color: #4648d4;
      margin-bottom: 15px;
      border-left: 4px solid #904900;
      padding-left: 10px;
    }
    .subsection-title {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-top: 15px;
      margin-bottom: 10px;
    }
    .score-box {
      background: #f0f0f0;
      border: 2px solid #4648d4;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      text-align: center;
    }
    .score-value {
      font-size: 48px;
      font-weight: bold;
      color: #4648d4;
    }
    .score-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .strength-item, .weakness-item, .project-item {
      background: #f9f9f9;
      border-left: 4px solid #4648d4;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 4px;
    }
    .weakness-item {
      border-left-color: #904900;
    }
    .item-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    .item-content {
      font-size: 13px;
      color: #555;
      line-height: 1.5;
    }
    .bullet-list {
      margin: 10px 0 10px 20px;
      padding: 0;
    }
    .bullet-list li {
      margin-bottom: 8px;
    }
    .roadmap-item {
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .roadmap-week {
      font-weight: bold;
      color: #4648d4;
      margin-bottom: 5px;
    }
    .roadmap-title {
      font-size: 15px;
      font-weight: bold;
      color: #333;
      margin-bottom: 8px;
    }
    .roadmap-description {
      font-size: 13px;
      color: #555;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .roadmap-actions {
      margin-top: 8px;
      font-size: 13px;
      color: #333;
    }
    .priority-high {
      color: #d32f2f;
      font-weight: bold;
    }
    .priority-medium {
      color: #f57c00;
      font-weight: bold;
    }
    .priority-low {
      color: #388e3c;
      font-weight: bold;
    }
    .page-break {
      page-break-after: always;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-top: 40px;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #f0f0f0;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1 class="title">DevSkill Audit Report</h1>
    <p class="subtitle">Comprehensive Software Engineering Assessment</p>
    <p class="subtitle">Generated on ${new Date().toLocaleDateString()}</p>
  </div>

  <!-- Executive Summary Section -->
  <div class="section">
    <h2 class="section-title">📊 Executive Summary</h2>
    <div class="score-box">
      <div class="score-value">${summary.score}/10</div>
      <div class="score-label">Overall Skill Level: ${summary.level}</div>
      <div class="score-label">${summary.verdict}</div>
    </div>
  </div>

  <!-- Skill Audit Section -->
  <div class="section">
    <h2 class="section-title">🎯 Skill Audit</h2>
    
    <h3 class="subsection-title">Strengths</h3>
    ${
      strengths.length > 0
        ? strengths
            .map(
              (s) => `
      <div class="strength-item">
        <div class="item-title">✓ ${s.title}</div>
        <div class="item-content">${s.evidence}</div>
      </div>
    `,
            )
            .join('')
        : '<p>No strengths identified.</p>'
    }

    <h3 class="subsection-title">Weaknesses</h3>
    ${
      weaknesses.length > 0
        ? weaknesses
            .map(
              (w) => `
      <div class="weakness-item">
        <div class="item-title">⚠ ${w.title}</div>
        <div class="item-content"><strong>Issue:</strong> ${w.whatsWrong}</div>
        <div class="item-content"><strong>Impact:</strong> ${w.whyItMatters}</div>
        ${w.evidence ? `<div class="item-content"><strong>Evidence:</strong> ${w.evidence}</div>` : ''}
      </div>
    `,
            )
            .join('')
        : '<p>No weaknesses identified.</p>'
    }

    <h3 class="subsection-title">Project Breakdown</h3>
    ${
      projects
        .map(
          (p) => `
      <div class="project-item">
        <div class="item-title">📁 ${p.name}</div>
        <div class="item-content"><strong>Score:</strong> ${p.score}/10</div>
        <div class="item-content"><strong>URL:</strong> <a href="${p.url}">${p.url}</a></div>
        ${
          p.strengths && p.strengths.length > 0
            ? `<div class="item-content"><strong>Strengths:</strong><ul class="bullet-list">${p.strengths.map((s) => `<li>${s}</li>`).join('')}</ul></div>`
            : ''
        }
        ${
          p.weaknesses && p.weaknesses.length > 0
            ? `<div class="item-content"><strong>Weaknesses:</strong><ul class="bullet-list">${p.weaknesses.map((w) => `<li>${w}</li>`).join('')}</ul></div>`
            : ''
        }
      </div>
    `,
        )
        .join('')
    }
  </div>

  <div class="page-break"></div>

  <!-- Career Insights Section -->
  <div class="section">
    <h2 class="section-title">🚀 Career Insights & Role Readiness</h2>
    
    ${
      ai.roleReadiness?.ready?.length > 0
        ? `
      <h3 class="subsection-title">Ready For These Roles</h3>
      ${ai.roleReadiness.ready
        .map(
          (role: any) => `
        <div class="strength-item">
          <div class="item-title">✓ ${role.role}</div>
          <div class="item-content">
            ${role.why && Array.isArray(role.why) ? `<ul class="bullet-list">${role.why.map((w: string) => `<li>${w}</li>`).join('')}</ul>` : role.why || ''}
          </div>
        </div>
      `,
        )
        .join('')}
    `
        : ''
    }

    ${
      ai.roleReadiness?.notReady?.length > 0
        ? `
      <h3 class="subsection-title">Not Yet Ready For</h3>
      ${ai.roleReadiness.notReady
        .map(
          (role: any) => `
        <div class="weakness-item">
          <div class="item-title">⚠ ${role.role}</div>
          <div class="item-content">
            ${role.why && Array.isArray(role.why) ? `<ul class="bullet-list">${role.why.map((w: string) => `<li>${w}</li>`).join('')}</ul>` : role.why || ''}
          </div>
        </div>
      `,
        )
        .join('')}
    `
        : ''
    }

    <h3 class="subsection-title">Core Strengths (Skills Map)</h3>
    ${
      ai.skillMap?.coreStrengths?.length > 0
        ? `<ul class="bullet-list">${ai.skillMap.coreStrengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>`
        : '<p>No core strengths identified.</p>'
    }

    <h3 class="subsection-title">Critical Weaknesses</h3>
    ${
      ai.skillMap?.criticalWeaknesses?.length > 0
        ? `<ul class="bullet-list">${ai.skillMap.criticalWeaknesses.map((w: string) => `<li>${w}</li>`).join('')}</ul>`
        : '<p>No critical weaknesses identified.</p>'
    }

    <h3 class="subsection-title">Level Estimate</h3>
    ${
      ai.levelEstimate
        ? `
      <div class="strength-item">
        <div class="item-title">Level: ${ai.levelEstimate.level} (${ai.levelEstimate.percentile}th Percentile)</div>
        <div class="item-content">
          ${
            ai.levelEstimate.reasoning && Array.isArray(ai.levelEstimate.reasoning)
              ? ai.levelEstimate.reasoning.map((r: string) => `<p>${r}</p>`).join('')
              : ai.levelEstimate.reasoning || ''
          }
        </div>
      </div>
    `
        : ''
    }
  </div>

  <div class="page-break"></div>

  <!-- Improvement Roadmap Section -->
  <div class="section">
    <h2 class="section-title">📈 Improvement Roadmap</h2>
    
    ${
      ai.roadmapWeeks && Array.isArray(ai.roadmapWeeks)
        ? ai.roadmapWeeks
            .map(
              (week: any) => `
      <div class="roadmap-item">
        <div class="roadmap-week">${week.weekRange}</div>
        <div class="roadmap-title">Priority: <span class="priority-${week.priority}">${week.priority.toUpperCase()}</span></div>
        <div class="roadmap-actions">
          <strong>Action Steps:</strong>
          <ul class="bullet-list">
            ${week.actions?.map((a: string) => `<li>${a}</li>`).join('') || '<li>No actions specified</li>'}
          </ul>
        </div>
        ${week.evidenceExamples ? `<div class="item-content"><strong>Evidence/Examples:</strong><ul class="bullet-list">${week.evidenceExamples.map((e: string) => `<li>${e}</li>`).join('')}</ul></div>` : ''}
      </div>
    `,
            )
            .join('')
        : '<p>No roadmap data available.</p>'
    }

    ${
      ai.skillGapAnalysis && Array.isArray(ai.skillGapAnalysis)
        ? `
      <h3 class="subsection-title">Skill Gaps to Address</h3>
      ${ai.skillGapAnalysis
        .map(
          (gap: any) => `
        <div class="weakness-item">
          <div class="item-title">${gap.gap}</div>
          <div class="item-content"><strong>Why It Blocks Progression:</strong> ${gap.whyBlocksProgression}</div>
          ${
            gap.recommendedFixes && Array.isArray(gap.recommendedFixes)
              ? `<div class="item-content"><strong>Recommended Fixes:</strong><ul class="bullet-list">${gap.recommendedFixes.map((f: string) => `<li>${f}</li>`).join('')}</ul></div>`
              : ''
          }
        </div>
      `,
        )
        .join('')}
    `
        : ''
    }
  </div>

  <div class="page-break"></div>

  <!-- Resume Insights Section -->
  <div class="section">
    <h2 class="section-title">📝 Resume Insights</h2>
    
    ${
      resumeInsights.highlightTheseProjects?.length > 0
        ? `
      <h3 class="subsection-title">High-Impact Projects to Highlight</h3>
      ${resumeInsights.highlightTheseProjects
        .map(
          (p: any) => `
        <div class="strength-item">
          <div class="item-title">⭐ ${p.name}</div>
          <div class="item-content">${p.reason}</div>
        </div>
      `,
        )
        .join('')}
    `
        : ''
    }

    ${
      resumeInsights.improveOrRemove?.length > 0
        ? `
      <h3 class="subsection-title">Projects to Improve or Remove</h3>
      ${resumeInsights.improveOrRemove
        .map(
          (p: any) => `
        <div class="weakness-item">
          <div class="item-title">🔧 ${p.name}</div>
          <div class="item-content">${p.reason}</div>
        </div>
      `,
        )
        .join('')}
    `
        : ''
    }

    ${
      resumeInsights.bulletRewrite?.length > 0
        ? `
      <h3 class="subsection-title">Bullet Point Lab - Rewrites</h3>
      <table>
        <thead>
          <tr>
            <th>Current</th>
            <th>Optimized</th>
          </tr>
        </thead>
        <tbody>
          ${resumeInsights.bulletRewrite
            .map(
              (b: any) => `
            <tr>
              <td>${b.before}</td>
              <td>${b.after}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    `
        : ''
    }
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>This report was automatically generated by DevSkill Audit</p>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `
}
