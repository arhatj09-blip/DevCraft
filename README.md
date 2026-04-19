# DevCraft: AI-Powered Code Auditor & Career Growth Platform

> **Transform your GitHub portfolio into actionable career insights with AI-powered code audits and personalized skill development roadmaps.**

## 📖 Documentation

### 🎯 **Start Here**
👉 **[Full Project Presentation](./PROJECT_PRESENTATION.md)** – Complete pitch deck with problem statement, features, tech stack, and more

### ⚡ Quick Links
- [Features](#features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Tech Stack](#tech-stack)

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- npm or yarn
- GitHub Personal Access Token (with `models` permission for AI features)

### **Installation**

```bash
# 1. Clone and navigate
cd "DevCraft - 01/DevCraft"

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Create .env file
cp .env.example .env

# 4. Add your GitHub token
# Edit .env and add your token from https://github.com/settings/tokens?type=beta
# Make sure to select the "models" scope for GitHub Models access
```

### **Running the Project**

```bash
# Terminal 1: Start backend server
npm run dev:server
# Server runs on http://localhost:8787

# Terminal 2: Start frontend (new terminal)
npm run dev
# Frontend runs on http://localhost:5173
```

### **Testing the Setup**

```bash
# Verify GitHub token works with GitHub Models
node scripts/test-github-models.mjs

# You should see GPT-4o model response
```

---

## 📊 Features

### **Core Analysis**
- 🔍 **GitHub Repository Audit** – Analyzes code quality, architecture, patterns, and best practices
- 🤖 **AI-Powered Insights** – Uses GitHub Models (GPT-4o) for expert-level feedback
- 🎓 **Career Assessment** – Maps technical findings to career progression levels
- 📋 **Skill Gap Analysis** – Identifies specific skills blocking your next level
- 🗺️ **90-Day Roadmap** – Personalized week-by-week improvement plan
- 💼 **Resume Insights** – Aligns achievements with portfolio quality
- 🌐 **Live App Audit** – Analyzes production websites for performance & UX
- 🔐 **Security Scanning** – Detects vulnerabilities and unsafe patterns

### **User Experience**
- 📱 Modern, responsive dashboard
- ⚡ Real-time audit progress tracking
- 📥 Downloadable PDF reports
- 📈 Progress tracking over time
- 💾 Save and compare audit history

---

## 🏗️ Project Structure

```
DevCraft/
├── src/                          # Frontend (React)
│   ├── pages/                    # Page components & HTML
│   │   ├── landing_page.ts       # Entry point
│   │   ├── audit_analysis.ts     # Results dashboard
│   │   ├── career_insights.ts    # Career recommendations
│   │   ├── skill_improvement_roadmap.ts
│   │   ├── resume_insights.ts
│   │   └── _shared/              # Shared utilities
│   ├── App.tsx                   # Main React app
│   └── main.tsx                  # React entry point
│
├── server/                       # Backend (Node.js + Express)
│   ├── app.ts                    # Express app setup
│   ├── index.ts                  # Server entry point
│   ├── ai/                       # AI integration layer
│   │   ├── generate.ts           # AI feedback generation
│   │   ├── githubModels.ts       # GitHub Models API client
│   │   ├── prompt.ts             # AI prompt engineering
│   │   ├── schema.ts             # Response validation schemas
│   │   └── cache.ts              # AI response caching
│   ├── audit/                    # Audit orchestration
│   │   ├── routes.ts             # API endpoints
│   │   ├── store.ts              # Job management & workflow
│   │   ├── analysis.ts           # Scoring logic
│   │   ├── collection.ts         # Data collection
│   │   ├── report.ts             # Report generation
│   │   ├── pdf-generator.ts      # PDF export
│   │   └── types.ts              # Type definitions
│   ├── core/                     # Core analysis engine
│   │   ├── engine.ts             # Main analysis engine
│   │   ├── classify.ts           # Code classification
│   │   ├── githubFetch.ts        # GitHub API client
│   │   └── types.ts              # Analysis types
│   ├── github/                   # GitHub integration
│   │   ├── client.ts             # GitHub REST client
│   │   ├── analyze.ts            # Repository analysis
│   │   ├── commits.ts            # Commit analysis
│   │   └── parse.ts              # Repository parsing
│   └── analyze/                  # Analysis routes
│       └── routes.ts             # Analysis endpoints
│
├── scripts/                      # Utility scripts
│   ├── test-github-models.mjs    # Verify AI setup
│   ├── run-audit-and-dump.mjs    # Test audit flow
│   └── smoke-stage*.mjs          # Integration tests
│
├── audit-outputs/               # Cached audit results
├── public/                       # Static assets
├── .env.example                  # Environment template
├── .env                          # Environment variables (create this)
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config
└── PROJECT_PRESENTATION.md       # Full pitch deck
```

---

## 🔌 API Documentation

### **Base URL**
```
http://localhost:8787/api
```

### **Endpoints**

#### **1. Start an Audit**
```http
POST /api/audit/start
Content-Type: application/json

{
  "inputUrl": "https://github.com/username/repo"
}
```

**Response:**
```json
{
  "jobId": "abc123xyz",
  "status": "running"
}
```

#### **2. Check Audit Status**
```http
GET /api/audit/{jobId}/status
```

**Response:**
```json
{
  "jobId": "abc123xyz",
  "status": "completed",
  "progress": 100,
  "createdAt": 1234567890,
  "startedAt": 1234567900,
  "finishedAt": 1234567950
}
```

#### **3. Get Audit Result**
```http
GET /api/audit/{jobId}/result
```

**Response:** Comprehensive audit report including:
- Overall score (0-10)
- Strengths & weaknesses
- AI-generated feedback
- Career level assessment
- Skill gaps
- 90-day roadmap
- Resume insights

#### **4. Download PDF Report**
```http
GET /api/audit/{jobId}/report/pdf
```

---

## 🛠️ Tech Stack

### **Frontend**
- **React 19** – UI framework
- **TypeScript** – Type safety
- **Vite 8** – Build tool & dev server
- **CSS** – Styling

### **Backend**
- **Node.js** – Runtime
- **Express 5** – Web framework
- **TypeScript** – Type safety

### **Analysis & AI**
- **GitHub Models (GPT-4o)** – AI analysis
- **ESLint** – Code linting
- **Babel Parser** – Code parsing
- **Puppeteer** – Web app auditing
- **Zod** – Schema validation

### **Development**
- **tsx** – TypeScript execution & watch mode
- **ESLint** – Code quality
- **dotenv** – Environment management

---

## 🔧 Configuration

### **Environment Variables (.env)**

```bash
# Backend server port (default: 8787)
PORT=8787

# GitHub Personal Access Token (REQUIRED for AI features)
# Get from: https://github.com/settings/tokens?type=beta
# Scopes needed: repo, models
GITHUB_TOKEN=github_pat_xxxxx

# Optional: Analysis limits
CORE_MAX_FILES=25              # Max files to analyze per repo
CORE_MAX_FILE_BYTES=200000     # Max file size in bytes
```

---

## 🎯 How It Works

### **The 5-Stage Pipeline**

```
Stage 1: Repository Fetching
  └─ Fetch metadata from GitHub API
  └─ Collect source code files

Stage 2: Static Analysis
  └─ Run ESLint on code
  └─ Detect architectural patterns
  └─ Identify security issues

Stage 3: Quality Scoring
  └─ Score code quality (0-10)
  └─ Classify repository type
  └─ Assess best practices

Stage 4: AI Analysis (GPT-4o)
  └─ Understand context & intent
  └─ Generate expert feedback
  └─ Map to career progression

Stage 5: Report Generation
  └─ Create comprehensive report
  └─ Generate improvement roadmap
  └─ Package as PDF
```

### **Analysis Pipeline Code**

See the flow in [server/audit/store.ts](server/audit/store.ts#L255-L265)

---

## 🧪 Testing

### **Test the GitHub Token**
```bash
node scripts/test-github-models.mjs
```

### **Run a Sample Audit**
```bash
node scripts/run-audit-and-dump.mjs
```

### **Live App Audit**
```bash
node scripts/liveapp-only-smoke-test.mjs
```

---

## 🚀 Deployment

### **Frontend Build**
```bash
npm run build
# Output: dist/ directory (ready for CDN/static hosting)
```

### **Backend Deployment**
```bash
npm run build
# Deploy the compiled backend and dist/ folder to Node.js host
```

### **Environment Variables (Production)**
Set these on your hosting platform:
- `PORT` – Server port
- `GITHUB_TOKEN` – Your GitHub PAT with models permission
- `NODE_ENV` – Set to "production"

---

## 📊 Data Privacy

✅ **Your code is safe:**
- We only **analyze** your code, we don't **store** it
- Analysis results are cached temporarily (2 hours)
- No sharing unless you explicitly download reports
- GitHub token is read-only (repo access only)

---

## 🐛 Troubleshooting

### **"tsx is not recognized"**
```bash
npm install --legacy-peer-deps
```

### **"GITHUB_TOKEN is required"**
1. Generate token: https://github.com/settings/tokens?type=beta
2. Select scopes: `repo` and `models`
3. Add to `.env` file
4. Restart dev server

### **"Models permission is required"**
Your GitHub token doesn't have the `models` scope. Regenerate with the correct permissions.

### **"Rate limit exceeded"**
GitHub API has limits. Wait an hour or use a different token. DevCraft caches results to minimize requests.

### **Analysis seems stuck**
Large repos (1000+ files) can take 2-5 minutes. Check progress endpoint:
```bash
curl http://localhost:8787/api/audit/{jobId}/status
```

---

## 📈 Performance

- **Small repos (< 100 files)**: 30-60 seconds
- **Medium repos (100-500 files)**: 60-120 seconds  
- **Large repos (500+ files)**: 2-5 minutes
- **Results are cached** for 2 hours to speed up re-audits

---

## 🤝 Contributing

We welcome contributions! Areas of interest:
- UI/UX improvements
- Additional analysis metrics
- New AI-powered insights
- Performance optimizations
- Documentation & examples

See [CONTRIBUTING.md](./CONTRIBUTING.md) (coming soon)

---

## 📝 License

MIT License – See [LICENSE](./LICENSE) file

---

## 📞 Support & Contact

- 🐛 **Issues**: GitHub Issues
- 💬 **Questions**: GitHub Discussions
- 📧 **Email**: team@devcraft.dev
- 🌐 **Website**: devcraft.dev

---

## 🙏 Acknowledgments

- **GitHub Models** – For providing access to GPT-4o
- **ESLint** – For code quality analysis
- **Puppeteer** – For web app auditing
- **React & Vite** – For modern development experience

---

## 📋 Project Status

- ✅ Core analysis engine
- ✅ GitHub integration
- ✅ AI-powered feedback (GPT-4o)
- ✅ Career assessment
- ✅ 90-day roadmaps
- ✅ API & Dashboard
- 🚧 Enhanced UI/UX
- 🚧 Database persistence
- 🚧 User accounts & history
- 🚧 Premium features

---

## 🎯 Vision

**Make world-class code feedback and career guidance accessible to everyone.**

Whether you're:
- 🎓 Learning to code
- 📈 Advancing your career
- 🏢 Building a team
- 🚀 Scaling your platform

DevCraft helps you understand, improve, and grow.

---

**Happy Auditing! 🚀**

For the full project presentation, see [PROJECT_PRESENTATION.md](./PROJECT_PRESENTATION.md)
```
