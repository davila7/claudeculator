import type { AxisId, AxisLevel, ClaudeConfig } from "./types";

export type ConfigPatch = Partial<{
  model: ClaudeConfig["model"];
  permissions: ClaudeConfig["permissions"];
  disableBypassPermissionsMode: ClaudeConfig["disableBypassPermissionsMode"];
  hooks: ClaudeConfig["hooks"];
  sandbox: ClaudeConfig["sandbox"];
  alwaysThinkingEnabled: ClaudeConfig["alwaysThinkingEnabled"];
  thinkingBudgetTokens: ClaudeConfig["thinkingBudgetTokens"];
  effortLevel: ClaudeConfig["effortLevel"];
  promptCaching: ClaudeConfig["promptCaching"];
}>;

const BASE_DENY_SAFE = ["Read(./.env)", "Read(./.env.*)", "Read(./secrets/**)"];
const STRICT_DENY = [...BASE_DENY_SAFE, "Bash(curl *)", "Bash(rm -rf *)", "Bash(git push --force*)"];
const LOCKED_DENY = [...STRICT_DENY, "WebFetch", "Bash(sudo *)", "Read(~/.ssh/**)", "Read(~/.aws/**)"];

const SECURITY_PRESETS: Record<AxisLevel, ConfigPatch> = {
  1: {
    permissions: {
      defaultMode: "bypassPermissions",
      allow: ["*"],
      deny: [],
      ask: [],
    },
    disableBypassPermissionsMode: false,
    hooks: { preToolUse: false, postToolUse: false, userPromptSubmit: false, stop: false },
    sandbox: { enabled: false, failIfUnavailable: false },
  },
  2: {
    permissions: {
      defaultMode: "acceptEdits",
      allow: ["Read", "Grep", "Glob", "Edit", "Write"],
      deny: BASE_DENY_SAFE,
      ask: [],
    },
    disableBypassPermissionsMode: false,
    hooks: { preToolUse: false, postToolUse: false, userPromptSubmit: false, stop: false },
    sandbox: { enabled: false, failIfUnavailable: false },
  },
  3: {
    permissions: {
      defaultMode: "default",
      allow: ["Read", "Grep", "Glob"],
      deny: BASE_DENY_SAFE,
      ask: ["Write", "Edit", "Bash"],
    },
    disableBypassPermissionsMode: false,
    hooks: { preToolUse: true, postToolUse: false, userPromptSubmit: false, stop: false },
    sandbox: { enabled: false, failIfUnavailable: false },
  },
  4: {
    permissions: {
      defaultMode: "default",
      allow: ["Read", "Grep", "Glob"],
      deny: STRICT_DENY,
      ask: ["Write", "Edit", "Bash"],
    },
    disableBypassPermissionsMode: true,
    hooks: { preToolUse: true, postToolUse: false, userPromptSubmit: true, stop: false },
    sandbox: { enabled: true, failIfUnavailable: false },
  },
  5: {
    permissions: {
      defaultMode: "plan",
      allow: ["Read", "Grep", "Glob"],
      deny: LOCKED_DENY,
      ask: ["Write", "Edit", "Bash"],
    },
    disableBypassPermissionsMode: true,
    hooks: { preToolUse: true, postToolUse: true, userPromptSubmit: true, stop: false },
    sandbox: { enabled: true, failIfUnavailable: true },
  },
};

const TOKENS_PRESETS: Record<AxisLevel, ConfigPatch> = {
  1: {
    effortLevel: "low",
    alwaysThinkingEnabled: false,
    thinkingBudgetTokens: 0,
    promptCaching: true,
  },
  2: {
    effortLevel: "low",
    alwaysThinkingEnabled: false,
    thinkingBudgetTokens: 0,
    promptCaching: true,
  },
  3: {
    effortLevel: "medium",
    alwaysThinkingEnabled: false,
    thinkingBudgetTokens: 0,
    promptCaching: true,
  },
  4: {
    effortLevel: "high",
    alwaysThinkingEnabled: true,
    thinkingBudgetTokens: 8000,
    promptCaching: true,
  },
  5: {
    effortLevel: "xhigh",
    alwaysThinkingEnabled: true,
    thinkingBudgetTokens: 32000,
    promptCaching: true,
  },
};

const ACCURACY_PRESETS: Record<AxisLevel, ConfigPatch> = {
  1: {
    model: "haiku-4.5",
    alwaysThinkingEnabled: false,
    thinkingBudgetTokens: 0,
    effortLevel: "low",
  },
  2: {
    model: "haiku-4.5",
    alwaysThinkingEnabled: false,
    thinkingBudgetTokens: 0,
    effortLevel: "medium",
  },
  3: {
    model: "sonnet-4.6",
    alwaysThinkingEnabled: false,
    thinkingBudgetTokens: 0,
    effortLevel: "medium",
  },
  4: {
    model: "opus-4.7",
    alwaysThinkingEnabled: true,
    thinkingBudgetTokens: 4000,
    effortLevel: "high",
  },
  5: {
    model: "opus-4.7-1m",
    alwaysThinkingEnabled: true,
    thinkingBudgetTokens: 16000,
    effortLevel: "xhigh",
  },
};

export const PRESETS: Record<AxisId, Record<AxisLevel, ConfigPatch>> = {
  security: SECURITY_PRESETS,
  tokens: TOKENS_PRESETS,
  accuracy: ACCURACY_PRESETS,
};

export function applyPreset(config: ClaudeConfig, axis: AxisId, level: AxisLevel): ClaudeConfig {
  const patch = PRESETS[axis][level];
  return { ...config, ...patch };
}
