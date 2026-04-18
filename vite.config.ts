import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'src/pages/landing_page.html'),
        auditAnalysis: resolve(__dirname, 'src/pages/audit_analysis.html'),
        resultsDashboard: resolve(__dirname, 'src/pages/results_dashboard.html'),
        careerInsights: resolve(__dirname, 'src/pages/career_insights.html'),
        resumeInsights: resolve(__dirname, 'src/pages/resume_insights.html'),
        improvementRoadmap: resolve(__dirname, 'src/pages/skill_improvement_roadmap.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
