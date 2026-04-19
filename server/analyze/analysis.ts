// Mock data for code analysis
const codeAnalysisData = {
  insights: [
    {
      title: "Unnecessary Re-renders in Dashboard",
      description:
        "The main dashboard component is re-rendering on every state change, which could be optimized with memoization.",
      codeSnippet: `
// Dashboard.tsx
function Dashboard({ data }) {
    // ... component logic
    return (
        <div>
            {data.map(item => <Card key={item.id} item={item} />)}
        </div>
    );
}
            `,
      severity: "High",
      category: "Performance",
    },
    {
      title: "Inconsistent Naming Convention",
      description:
        "A mix of camelCase and snake_case has been found in API utility functions.",
      codeSnippet: `
// api.ts
export const fetch_user_data = async (userId) => { ... };

export const getUserSettings = async (userId) => { ... };
            `,
      severity: "Medium",
      category: "Maintainability",
    },
  ],
};

// Mock data for UI/UX audit
const uiUxAuditData = {
  issues: [
    {
      title: "Low Contrast on Buttons",
      description:
        "The primary action buttons have a low color contrast ratio, making them difficult to read for visually impaired users.",
      component: "PrimaryButton",
      severity: "High",
      screenshotUrl:
        "https://via.placeholder.com/600x400.png?text=Low+Contrast+Button",
    },
    {
      title: "Missing Loading States",
      description:
        "Data-heavy pages lack loading indicators, making the application feel unresponsive during data fetching.",
      component: "DataGrid",
      severity: "Medium",
      screenshotUrl:
        "https://via.placeholder.com/600x400.png?text=Missing+Loading+State",
    },
  ],
};

export function getCodeAnalysis(sessionId: string) {
  // In a real application, you would use the sessionId to fetch
  // the relevant analysis from a database or a cache.
  console.log(`Fetching code analysis for session: ${sessionId}`);
  return codeAnalysisData;
}

export function getUiUxAudit(sessionId: string) {
  // Similarly, use sessionId to get specific UI/UX audit data.
  console.log(`Fetching UI/UX audit for session: ${sessionId}`);
  return uiUxAuditData;
}
