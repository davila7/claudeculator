import type { ClaudeConfig } from "./types";

export const DEFAULT_CONFIG: ClaudeConfig = {
  model: "sonnet-4.6",
  usage: "standard",

  permissionMode: "default",
  allowList: ["Read", "Grep", "Glob"],
  denyList: ["Bash(rm -rf *)", "Bash(git push --force*)"],
  askList: ["Write", "Edit", "Bash"],

  dangerouslySkipPermissions: false,

  hooks: {
    preToolUse: true,
    postToolUse: false,
    userPromptSubmit: false,
    stop: false,
  },

  mcpServers: [],

  extendedThinking: false,
  thinkingBudgetTokens: 0,

  promptCaching: true,

  includeCoAuthoredBy: true,
  env: {},
};

export const AVAILABLE_MCP_SERVERS = [
  "filesystem",
  "github",
  "linear",
  "gmail",
  "calendar",
  "neon",
  "vercel",
];
