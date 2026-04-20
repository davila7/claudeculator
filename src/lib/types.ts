export type ModelId = "opus-4.7-1m" | "opus-4.7" | "sonnet-4.6" | "haiku-4.5";

export interface ModelInfo {
  id: ModelId;
  name: string;
  contextWindow: number;
  inputPricePer1M: number;
  outputPricePer1M: number;
  cachedInputPricePer1M: number;
  speedScore: number;
  qualityScore: number;
  label: string;
}

export const MODELS: Record<ModelId, ModelInfo> = {
  "opus-4.7-1m": {
    id: "opus-4.7-1m",
    name: "claude-opus-4-7",
    label: "Opus 4.7 · 1M context",
    contextWindow: 1_000_000,
    inputPricePer1M: 15,
    outputPricePer1M: 75,
    cachedInputPricePer1M: 1.5,
    speedScore: 55,
    qualityScore: 100,
  },
  "opus-4.7": {
    id: "opus-4.7",
    name: "claude-opus-4-7",
    label: "Opus 4.7 · 200K",
    contextWindow: 200_000,
    inputPricePer1M: 15,
    outputPricePer1M: 75,
    cachedInputPricePer1M: 1.5,
    speedScore: 65,
    qualityScore: 98,
  },
  "sonnet-4.6": {
    id: "sonnet-4.6",
    name: "claude-sonnet-4-6",
    label: "Sonnet 4.6",
    contextWindow: 200_000,
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    cachedInputPricePer1M: 0.3,
    speedScore: 85,
    qualityScore: 90,
  },
  "haiku-4.5": {
    id: "haiku-4.5",
    name: "claude-haiku-4-5-20251001",
    label: "Haiku 4.5",
    contextWindow: 200_000,
    inputPricePer1M: 1,
    outputPricePer1M: 5,
    cachedInputPricePer1M: 0.1,
    speedScore: 100,
    qualityScore: 75,
  },
};

export type UsageProfile = "light" | "standard" | "heavy";

export const USAGE_PROFILES: Record<
  UsageProfile,
  { label: string; sessionsPerDay: number; turnsPerSession: number; inputPerTurn: number; outputPerTurn: number }
> = {
  light: {
    label: "Ligero · explorar, leer código",
    sessionsPerDay: 2,
    turnsPerSession: 8,
    inputPerTurn: 4_000,
    outputPerTurn: 600,
  },
  standard: {
    label: "Estándar · dev diario",
    sessionsPerDay: 4,
    turnsPerSession: 15,
    inputPerTurn: 12_000,
    outputPerTurn: 1_200,
  },
  heavy: {
    label: "Intenso · refactors largos",
    sessionsPerDay: 6,
    turnsPerSession: 30,
    inputPerTurn: 35_000,
    outputPerTurn: 2_500,
  },
};

export type PermissionMode = "default" | "acceptEdits" | "plan" | "bypassPermissions";

export interface ClaudeConfig {
  model: ModelId;
  usage: UsageProfile;

  permissionMode: PermissionMode;
  allowList: string[];
  denyList: string[];
  askList: string[];

  dangerouslySkipPermissions: boolean;

  hooks: {
    preToolUse: boolean;
    postToolUse: boolean;
    userPromptSubmit: boolean;
    stop: boolean;
  };

  mcpServers: string[];

  extendedThinking: boolean;
  thinkingBudgetTokens: number;

  promptCaching: boolean;

  includeCoAuthoredBy: boolean;
  env: Record<string, string>;
}

export interface Metrics {
  security: {
    score: number;
    label: string;
    reasons: string[];
  };
  tokens: {
    tokensPerSession: number;
    tokensPerMonth: number;
    costPerMonthUSD: number;
    cacheSavingsPercent: number;
  };
  efficiency: {
    score: number;
    label: string;
    reasons: string[];
  };
}
