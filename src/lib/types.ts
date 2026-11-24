export type ProviderId = "lovable" | "openrouter" | "groq" | "gemini";
export type ModelCategory = "free" | "coding" | "reasoning" | "fast";
export type ExecutionMode = "build" | "plan";
export type RuntimeEnvironment = "webcontainer" | "daytona";

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
  description: string;
  contextLength?: number;
  pricing?: string;
  isFree?: boolean;
  categories: ModelCategory[];
  capabilities: string[];
}

export interface ProviderCatalog {
  id: ProviderId;
  name: string;
  configured: boolean;
  defaultModel: string;
  models: ModelInfo[];
  source: "live" | "fallback";
}

export interface ModelsApiResponse {
  providers: ProviderCatalog[];
  fetchedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ChatSession {
  id: string;
  url_id: string;
  description: string;
  provider: ProviderId;
  model: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFile {
  path: string;
  content: string;
  language: string;
}

export interface ParsedArtifact {
  id: string;
  title: string;
  files: WorkspaceFile[];
  commands: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  username: string;
  bio: string;
  photo_url: string;
  created_at: string;
  updated_at: string;
}