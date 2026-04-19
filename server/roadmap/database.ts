export type Skill = {
  id: string;
  name: string;
  level: "junior" | "mid" | "senior";
  category: "frontend" | "backend" | "devops" | "database" | "general";
  roi: number; // A score from 1-100 representing the return on investment for learning this skill
};

export const skillsDatabase: Skill[] = [
  // Frontend
  { id: "html", name: "HTML", level: "junior", category: "frontend", roi: 80 },
  { id: "css", name: "CSS", level: "junior", category: "frontend", roi: 85 },
  {
    id: "javascript",
    name: "JavaScript",
    level: "junior",
    category: "frontend",
    roi: 95,
  },
  {
    id: "typescript",
    name: "TypeScript",
    level: "mid",
    category: "frontend",
    roi: 90,
  },
  { id: "react", name: "React", level: "mid", category: "frontend", roi: 92 },
  { id: "vue", name: "Vue.js", level: "mid", category: "frontend", roi: 88 },
  {
    id: "angular",
    name: "Angular",
    level: "mid",
    category: "frontend",
    roi: 85,
  },
  {
    id: "webpack",
    name: "Webpack",
    level: "mid",
    category: "frontend",
    roi: 70,
  },
  { id: "vite", name: "Vite", level: "mid", category: "frontend", roi: 75 },

  // Backend
  { id: "nodejs", name: "Node.js", level: "mid", category: "backend", roi: 90 },
  {
    id: "express",
    name: "Express.js",
    level: "mid",
    category: "backend",
    roi: 85,
  },
  {
    id: "python",
    name: "Python",
    level: "junior",
    category: "backend",
    roi: 93,
  },
  { id: "django", name: "Django", level: "mid", category: "backend", roi: 88 },
  { id: "flask", name: "Flask", level: "mid", category: "backend", roi: 85 },
  { id: "java", name: "Java", level: "mid", category: "backend", roi: 89 },
  {
    id: "spring",
    name: "Spring Boot",
    level: "senior",
    category: "backend",
    roi: 87,
  },
  { id: "go", name: "Go", level: "mid", category: "backend", roi: 82 },
  { id: "rust", name: "Rust", level: "senior", category: "backend", roi: 80 },

  // Database
  { id: "sql", name: "SQL", level: "junior", category: "database", roi: 95 },
  {
    id: "postgresql",
    name: "PostgreSQL",
    level: "mid",
    category: "database",
    roi: 90,
  },
  { id: "mysql", name: "MySQL", level: "mid", category: "database", roi: 88 },
  {
    id: "mongodb",
    name: "MongoDB",
    level: "mid",
    category: "database",
    roi: 86,
  },
  { id: "redis", name: "Redis", level: "mid", category: "database", roi: 80 },

  // DevOps
  { id: "docker", name: "Docker", level: "mid", category: "devops", roi: 94 },
  {
    id: "kubernetes",
    name: "Kubernetes",
    level: "senior",
    category: "devops",
    roi: 92,
  },
  { id: "aws", name: "AWS", level: "mid", category: "devops", roi: 96 },
  { id: "azure", name: "Azure", level: "mid", category: "devops", roi: 91 },
  {
    id: "gcp",
    name: "Google Cloud Platform",
    level: "mid",
    category: "devops",
    roi: 89,
  },
  { id: "ci-cd", name: "CI/CD", level: "mid", category: "devops", roi: 93 },

  // General
  { id: "git", name: "Git", level: "junior", category: "general", roi: 98 },
  {
    id: "rest-api",
    name: "REST API Design",
    level: "mid",
    category: "general",
    roi: 90,
  },
  {
    id: "graphql",
    name: "GraphQL",
    level: "mid",
    category: "general",
    roi: 85,
  },
  {
    id: "testing",
    name: "Software Testing",
    level: "mid",
    category: "general",
    roi: 88,
  },
  {
    id: "data-structures",
    name: "Data Structures & Algorithms",
    level: "mid",
    category: "general",
    roi: 97,
  },
];
