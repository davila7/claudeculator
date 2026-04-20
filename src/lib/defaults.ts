import type { ClaudeConfig } from "./types";
import { applyPreset } from "./presets";

const EMPTY_CONFIG: ClaudeConfig = {
  model: "sonnet-4.6",
  usage: "standard",
  permissions: {
    defaultMode: "default",
    allow: [],
    deny: [],
    ask: [],
  },
  disableBypassPermissionsMode: false,
  hooks: {
    preToolUse: false,
    postToolUse: false,
    userPromptSubmit: false,
    stop: false,
  },
  sandbox: {
    enabled: false,
    failIfUnavailable: false,
  },
  mcpServers: [],
  alwaysThinkingEnabled: false,
  thinkingBudgetTokens: 0,
  effortLevel: "medium",
  promptCaching: true,
  includeCoAuthoredBy: true,
  env: {},
};

/**
 * Default starting point: level 3 on every axis — Balanced across the board.
 * Presets are applied in order so each one fills in its own fields cleanly.
 */
export const DEFAULT_CONFIG: ClaudeConfig = applyPreset(
  applyPreset(applyPreset(EMPTY_CONFIG, "security", 3), "tokens", 3),
  "accuracy",
  3,
);

export const AVAILABLE_MCP_SERVERS = [
  "filesystem",
  "github",
  "linear",
  "gmail",
  "calendar",
  "neon",
  "vercel",
];

export const AITMPL_HOOKS_URL = "https://www.aitmpl.com/hooks";
export const AITMPL_MCPS_URL = "https://www.aitmpl.com/mcps";
