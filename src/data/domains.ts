export const DOMAIN_IDS = [
  "data-engineering",
  "backend-api",
  "devops-cloud",
  "ai-llm",
  "system-design",
  "developer-tools",
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];
export type Domain = {
  id: DomainId;
  name: string;
  label: string;
  english: string;
  description: string;
  topics: readonly string[];
};

export const DOMAINS: readonly Domain[] = [
  {
    id: "data-engineering",
    name: "資料工程",
    label: "資料工程",
    english: "Data Engineering",
    description: "從資料進來，到可靠地被使用。記錄資料管線、儲存與處理的實作。",
    topics: ["ETL / ELT", "Spark", "Iceberg", "資料品質"],
  },
  {
    id: "backend-api",
    name: "後端與 API",
    label: "後端與 API",
    english: "Backend & API",
    description: "把需求變成可以運作的服務，理解 API、資料庫與非同步程式。",
    topics: ["Python", "FastAPI", "資料庫", "身份驗證"],
  },
  {
    id: "devops-cloud",
    name: "DevOps 與雲端",
    label: "DevOps 與雲端",
    english: "DevOps & Cloud",
    description: "讓程式從本機走到線上。整理部署、自動化與維運過程中的經驗。",
    topics: ["GitHub Actions", "Docker", "Kubernetes", "部署"],
  },
  {
    id: "ai-llm",
    name: "AI 與 LLM",
    label: "AI 與 LLM",
    english: "AI & Language Models",
    description: "從模型到實際應用，透過實驗理解 AI 工具的能力與限制。",
    topics: ["LLM", "AI Agent", "RAG", "模型部署"],
  },
  {
    id: "system-design",
    name: "系統設計",
    label: "系統設計",
    english: "System Design",
    description: "記錄架構選擇背後的理由，逐步理解規模、可靠性與設計取捨。",
    topics: ["架構", "分散式系統", "效能", "可靠性"],
  },
  {
    id: "developer-tools",
    name: "開發工具",
    label: "開發工具",
    english: "Developer Tools",
    description: "讓每天的開發順手一點。收集工具使用、工作流程與解題技巧。",
    topics: ["Git", "CLI", "編輯器", "工作流程"],
  },
];

export function getDomain(id: string | undefined): Domain {
  return DOMAINS.find(domain => domain.id === id) ?? DOMAINS[5];
}

export const CONTENT_TYPE_LABELS = {
  tutorial: "步驟教學",
  note: "學習筆記",
  troubleshooting: "實作與排錯",
  reading: "閱讀紀錄",
} as const;

export const LEVEL_LABELS = {
  beginner: "初學者友善",
  intermediate: "進階理解",
  advanced: "深入實作",
} as const;

export const STATUS_LABELS = {
  verified: "已實作驗證",
  learning: "持續學習中",
} as const;
