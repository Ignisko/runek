export const DEFAULT_OLLAMA_URL = "http://localhost:11434/v1";
export const DEFAULT_QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
export const DEFAULT_QWEN_MODEL = "qwen-plus";
export const DEFAULT_OLLAMA_MODEL = "qwen2.5";

/**
 * Resolve Qwen base URL with priority: env var → Ollama (local, free) → DashScope
 */
export function resolveBaseUrl(): string {
  if (process.env.QWEN_BASE_URL) return process.env.QWEN_BASE_URL;
  // If no cloud API key set, default to local Ollama (free)
  if (!process.env.QWEN_API_KEY && !process.env.OPENAI_API_KEY) return DEFAULT_OLLAMA_URL;
  return DEFAULT_QWEN_BASE_URL;
}

/**
 * Resolve AI model with priority: env var → Ollama (qwen2.5) → DashScope (qwen-plus)
 */
export function resolveModel(): string {
  if (process.env.QWEN_MODEL) return process.env.QWEN_MODEL;
  if (!process.env.QWEN_API_KEY && !process.env.OPENAI_API_KEY) return DEFAULT_OLLAMA_MODEL;
  return DEFAULT_QWEN_MODEL;
}

export function getApiKey(headerKey?: string | null): string | undefined {
  return headerKey || process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY;
}
