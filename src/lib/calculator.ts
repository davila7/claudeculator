import type { AxisLevel, ClaudeConfig, Scores } from "./types";
import { MODELS, USAGE_PROFILES } from "./types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function toAxisLevel(score: number): AxisLevel {
  const rounded = Math.round(score);
  return clamp(rounded, 1, 5) as AxisLevel;
}

/**
 * Security axis — higher is more restrictive.
 * The raw score is scaled to 1..5 where:
 *   1 = bypassPermissions, no guardrails
 *   5 = plan mode, sandbox, full hooks, locked down
 */
export function securityLevel(config: ClaudeConfig): AxisLevel {
  let score = 3;

  switch (config.permissions.defaultMode) {
    case "bypassPermissions":
      score -= 2.5;
      break;
    case "acceptEdits":
      score -= 1;
      break;
    case "default":
      score += 0;
      break;
    case "plan":
      score += 1.5;
      break;
  }

  const hasWildcardAllow = config.permissions.allow.includes("*");
  if (hasWildcardAllow) score -= 0.5;

  const denyCount = config.permissions.deny.length;
  score += clamp(denyCount * 0.2, 0, 1.2);

  const hookCount = Object.values(config.hooks).filter(Boolean).length;
  score += clamp(hookCount * 0.3, 0, 1);

  if (config.sandbox.enabled) score += 0.6;
  if (config.sandbox.failIfUnavailable) score += 0.2;
  if (config.disableBypassPermissionsMode) score += 0.3;

  return toAxisLevel(score);
}

/**
 * Token spend axis — higher means heavier spend per session.
 *   1 = cheap (haiku, low effort, no thinking)
 *   5 = max (opus 1m, xhigh effort, 32K thinking)
 */
export function tokensLevel(config: ClaudeConfig): AxisLevel {
  let score = 3;

  const model = config.model;
  if (model === "haiku-4.5") score -= 1.2;
  else if (model === "sonnet-4.6") score -= 0.2;
  else if (model === "opus-4.7") score += 0.8;
  else if (model === "opus-4.7-1m") score += 1;

  switch (config.effortLevel) {
    case "low":
      score -= 1;
      break;
    case "medium":
      score += 0;
      break;
    case "high":
      score += 0.8;
      break;
    case "xhigh":
      score += 1.2;
      break;
  }

  if (config.alwaysThinkingEnabled) {
    score += 0.4;
    const budget = config.thinkingBudgetTokens || 4000;
    score += clamp((budget - 4000) / 14000, 0, 0.8);
  }

  if (!config.promptCaching) score += 0.3;

  score += clamp(config.mcpServers.length * 0.08, 0, 0.4);
  const hookCount = Object.values(config.hooks).filter(Boolean).length;
  score += clamp(hookCount * 0.05, 0, 0.2);

  return toAxisLevel(score);
}

/**
 * Accuracy axis — higher means better answer quality.
 *   1 = fast (haiku, low effort)
 *   5 = thorough (opus 1m, deep thinking, xhigh)
 */
export function accuracyLevel(config: ClaudeConfig): AxisLevel {
  let score = 3;

  const model = config.model;
  if (model === "haiku-4.5") score -= 1.5;
  else if (model === "sonnet-4.6") score += 0;
  else if (model === "opus-4.7") score += 1;
  else if (model === "opus-4.7-1m") score += 1.3;

  switch (config.effortLevel) {
    case "low":
      score -= 0.6;
      break;
    case "medium":
      score += 0;
      break;
    case "high":
      score += 0.5;
      break;
    case "xhigh":
      score += 0.9;
      break;
  }

  if (config.alwaysThinkingEnabled) {
    score += 0.5;
    if (config.thinkingBudgetTokens >= 8000) score += 0.3;
  }

  if (config.hooks.preToolUse) score += 0.1;

  return toAxisLevel(score);
}

export function estimateCost(config: ClaudeConfig): Scores["cost"] {
  const model = MODELS[config.model];
  const usage = USAGE_PROFILES[config.usage];

  const inputPerSession = usage.inputPerTurn * usage.turnsPerSession;
  const outputPerSession = usage.outputPerTurn * usage.turnsPerSession;

  const thinkingPerSession = config.alwaysThinkingEnabled
    ? (config.thinkingBudgetTokens || 4000) * usage.turnsPerSession
    : 0;

  const hooksOverheadPerTurn =
    (config.hooks.preToolUse ? 150 : 0) +
    (config.hooks.postToolUse ? 120 : 0) +
    (config.hooks.userPromptSubmit ? 80 : 0) +
    (config.hooks.stop ? 60 : 0);
  const hooksOverheadPerSession = hooksOverheadPerTurn * usage.turnsPerSession;

  const mcpOverheadPerSession = config.mcpServers.length * 800;

  const effortMultiplier =
    config.effortLevel === "low"
      ? 0.7
      : config.effortLevel === "medium"
        ? 1
        : config.effortLevel === "high"
          ? 1.4
          : 1.8;

  const outputPerSessionScaled = Math.round(outputPerSession * effortMultiplier);

  const tokensPerSession =
    inputPerSession + outputPerSessionScaled + thinkingPerSession + hooksOverheadPerSession + mcpOverheadPerSession;

  const sessionsPerMonth = usage.sessionsPerDay * 22;
  const tokensPerMonth = tokensPerSession * sessionsPerMonth;

  const inputPerMonth = (inputPerSession + hooksOverheadPerSession + mcpOverheadPerSession) * sessionsPerMonth;
  const outputPerMonth = (outputPerSessionScaled + thinkingPerSession) * sessionsPerMonth;

  const cacheHitRatio = config.promptCaching ? 0.6 : 0;
  const cachedInput = inputPerMonth * cacheHitRatio;
  const freshInput = inputPerMonth - cachedInput;

  const inputCost =
    (freshInput / 1_000_000) * model.inputPricePer1M +
    (cachedInput / 1_000_000) * model.cachedInputPricePer1M;
  const outputCost = (outputPerMonth / 1_000_000) * model.outputPricePer1M;
  const costPerMonthUSD = inputCost + outputCost;

  const uncachedInputCost = (inputPerMonth / 1_000_000) * model.inputPricePer1M;
  const cacheSavings = uncachedInputCost - inputCost;
  const cacheSavingsPercent = uncachedInputCost > 0 ? (cacheSavings / uncachedInputCost) * 100 : 0;

  return {
    tokensPerSession: Math.round(tokensPerSession),
    tokensPerMonth: Math.round(tokensPerMonth),
    costPerMonthUSD: Math.round(costPerMonthUSD * 100) / 100,
    cacheSavingsPercent: Math.round(cacheSavingsPercent),
  };
}

export function computeScores(config: ClaudeConfig): Scores {
  return {
    security: securityLevel(config),
    tokens: tokensLevel(config),
    accuracy: accuracyLevel(config),
    cost: estimateCost(config),
  };
}

export function buildSettingsJson(config: ClaudeConfig): Record<string, unknown> {
  const model = MODELS[config.model];

  const settings: Record<string, unknown> = {
    $schema: "https://json.schemastore.org/claude-code-settings.json",
    model: model.name,
    includeCoAuthoredBy: config.includeCoAuthoredBy,
  };

  const permissions: Record<string, unknown> = {
    defaultMode: config.permissions.defaultMode,
  };
  if (config.permissions.allow.length) permissions.allow = config.permissions.allow;
  if (config.permissions.deny.length) permissions.deny = config.permissions.deny;
  if (config.permissions.ask.length) permissions.ask = config.permissions.ask;
  settings.permissions = permissions;

  if (config.disableBypassPermissionsMode) {
    settings.disableBypassPermissionsMode = "disable";
  }

  const hooks: Record<string, unknown> = {};
  if (config.hooks.preToolUse) {
    hooks.PreToolUse = [
      {
        matcher: "Bash",
        hooks: [{ type: "command", command: "~/.claude/hooks/validate-bash.sh" }],
      },
    ];
  }
  if (config.hooks.postToolUse) {
    hooks.PostToolUse = [
      { matcher: "Write|Edit", hooks: [{ type: "command", command: "~/.claude/hooks/format-file.sh" }] },
    ];
  }
  if (config.hooks.userPromptSubmit) {
    hooks.UserPromptSubmit = [
      { hooks: [{ type: "command", command: "~/.claude/hooks/log-prompt.sh" }] },
    ];
  }
  if (config.hooks.stop) {
    hooks.Stop = [{ hooks: [{ type: "command", command: "~/.claude/hooks/notify-done.sh" }] }];
  }
  if (Object.keys(hooks).length) settings.hooks = hooks;

  if (config.sandbox.enabled) {
    const sandbox: Record<string, unknown> = {
      enabled: true,
      autoAllowBashIfSandboxed: true,
    };
    if (config.sandbox.failIfUnavailable) sandbox.failIfUnavailable = true;
    settings.sandbox = sandbox;
  }

  if (config.mcpServers.length) {
    const mcpServers: Record<string, unknown> = {};
    for (const name of config.mcpServers) {
      mcpServers[name] = {
        command: "npx",
        args: ["-y", `@modelcontextprotocol/server-${name}`],
      };
    }
    settings.mcpServers = mcpServers;
  }

  settings.effortLevel = config.effortLevel;
  if (config.alwaysThinkingEnabled) settings.alwaysThinkingEnabled = true;

  const env: Record<string, string> = { ...config.env };
  if (config.alwaysThinkingEnabled && config.thinkingBudgetTokens > 0) {
    env.MAX_THINKING_TOKENS = String(config.thinkingBudgetTokens);
  }
  if (!config.promptCaching) {
    env.DISABLE_PROMPT_CACHING = "1";
  }
  if (Object.keys(env).length) settings.env = env;

  return settings;
}
