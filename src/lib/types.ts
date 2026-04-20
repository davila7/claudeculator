export type ModelId = "haiku-4.5" | "sonnet-4.6" | "opus-4.7" | "opus-4.7-1m";

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
  tagline: string;
}

export const MODEL_ORDER: ModelId[] = ["haiku-4.5", "sonnet-4.6", "opus-4.7", "opus-4.7-1m"];

export const MODELS: Record<ModelId, ModelInfo> = {
  "haiku-4.5": {
    id: "haiku-4.5",
    name: "claude-haiku-4-5",
    label: "Haiku 4.5",
    tagline: "Fastest & cheapest",
    contextWindow: 200_000,
    inputPricePer1M: 1,
    outputPricePer1M: 5,
    cachedInputPricePer1M: 0.1,
    speedScore: 100,
    qualityScore: 75,
  },
  "sonnet-4.6": {
    id: "sonnet-4.6",
    name: "claude-sonnet-4-6",
    label: "Sonnet 4.6",
    tagline: "Balanced daily driver",
    contextWindow: 200_000,
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    cachedInputPricePer1M: 0.3,
    speedScore: 85,
    qualityScore: 90,
  },
  "opus-4.7": {
    id: "opus-4.7",
    name: "claude-opus-4-7",
    label: "Opus 4.7",
    tagline: "Top quality, 200K context",
    contextWindow: 200_000,
    inputPricePer1M: 15,
    outputPricePer1M: 75,
    cachedInputPricePer1M: 1.5,
    speedScore: 65,
    qualityScore: 98,
  },
  "opus-4.7-1m": {
    id: "opus-4.7-1m",
    name: "claude-opus-4-7",
    label: "Opus 4.7 · 1M",
    tagline: "Massive 1M context window",
    contextWindow: 1_000_000,
    inputPricePer1M: 15,
    outputPricePer1M: 75,
    cachedInputPricePer1M: 1.5,
    speedScore: 55,
    qualityScore: 100,
  },
};

export type UsageProfile = "light" | "standard" | "heavy";
export const USAGE_ORDER: UsageProfile[] = ["light", "standard", "heavy"];

export const USAGE_PROFILES: Record<
  UsageProfile,
  { label: string; tagline: string; sessionsPerDay: number; turnsPerSession: number; inputPerTurn: number; outputPerTurn: number }
> = {
  light: {
    label: "Light",
    tagline: "Explore & read code",
    sessionsPerDay: 2,
    turnsPerSession: 8,
    inputPerTurn: 4_000,
    outputPerTurn: 600,
  },
  standard: {
    label: "Standard",
    tagline: "Daily development",
    sessionsPerDay: 4,
    turnsPerSession: 15,
    inputPerTurn: 12_000,
    outputPerTurn: 1_200,
  },
  heavy: {
    label: "Heavy",
    tagline: "Long refactors & agents",
    sessionsPerDay: 6,
    turnsPerSession: 30,
    inputPerTurn: 35_000,
    outputPerTurn: 2_500,
  },
};

export type PermissionMode = "plan" | "default" | "acceptEdits" | "bypassPermissions";
export const PERMISSION_ORDER: PermissionMode[] = ["plan", "default", "acceptEdits", "bypassPermissions"];
export const PERMISSION_INFO: Record<PermissionMode, { label: string; tagline: string }> = {
  plan: { label: "plan", tagline: "Safest — plans only, no edits" },
  default: { label: "default", tagline: "Asks before sensitive actions" },
  acceptEdits: { label: "acceptEdits", tagline: "Auto-accepts file edits" },
  bypassPermissions: { label: "bypassPermissions", tagline: "Dangerous — skips all prompts" },
};

export type EffortLevel = "low" | "medium" | "high" | "xhigh";
export const EFFORT_ORDER: EffortLevel[] = ["low", "medium", "high", "xhigh"];

export type AxisLevel = 1 | 2 | 3 | 4 | 5;
export const AXIS_LEVELS: AxisLevel[] = [1, 2, 3, 4, 5];
export type AxisId = "security" | "tokens" | "accuracy";

export const AXIS_LABELS: Record<AxisId, Record<AxisLevel, { label: string; tagline: string }>> = {
  security: {
    1: { label: "Open", tagline: "No guardrails — local sandboxes only" },
    2: { label: "Loose", tagline: "Secrets denied, edits auto-accepted" },
    3: { label: "Balanced", tagline: "Asks before Bash & writes" },
    4: { label: "Strict", tagline: "Sandbox on, hooks validate, deny list" },
    5: { label: "Locked down", tagline: "Plan-only, sandbox hard-required" },
  },
  tokens: {
    1: { label: "Economy", tagline: "Minimum effort, no thinking" },
    2: { label: "Frugal", tagline: "Low effort, cache on" },
    3: { label: "Balanced", tagline: "Medium effort" },
    4: { label: "Generous", tagline: "High effort + thinking" },
    5: { label: "Max", tagline: "xhigh effort + 32K thinking" },
  },
  accuracy: {
    1: { label: "Fast", tagline: "Haiku · instant answers" },
    2: { label: "Quick", tagline: "Haiku or Sonnet · medium effort" },
    3: { label: "Balanced", tagline: "Sonnet · daily driver" },
    4: { label: "Careful", tagline: "Opus + thinking" },
    5: { label: "Thorough", tagline: "Opus 1M + deep thinking" },
  },
};

export interface ClaudeConfig {
  model: ModelId;
  usage: UsageProfile;

  permissions: {
    defaultMode: PermissionMode;
    allow: string[];
    deny: string[];
    ask: string[];
  };
  disableBypassPermissionsMode: boolean;

  hooks: {
    preToolUse: boolean;
    postToolUse: boolean;
    userPromptSubmit: boolean;
    stop: boolean;
  };

  sandbox: {
    enabled: boolean;
    failIfUnavailable: boolean;
  };

  mcpServers: string[];

  alwaysThinkingEnabled: boolean;
  thinkingBudgetTokens: number;
  effortLevel: EffortLevel;

  promptCaching: boolean;

  includeCoAuthoredBy: boolean;
  env: Record<string, string>;
}

export interface Scores {
  security: AxisLevel;
  tokens: AxisLevel;
  accuracy: AxisLevel;
  cost: {
    tokensPerSession: number;
    tokensPerMonth: number;
    costPerMonthUSD: number;
    cacheSavingsPercent: number;
  };
}
