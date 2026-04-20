import type { ClaudeConfig, Metrics } from "./types";
import { MODELS, USAGE_PROFILES } from "./types";

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function calculateSecurity(config: ClaudeConfig): Metrics["security"] {
  let score = 60;
  const reasons: string[] = [];

  if (config.dangerouslySkipPermissions) {
    score -= 55;
    reasons.push("--dangerously-skip-permissions is enabled");
  }

  switch (config.permissionMode) {
    case "plan":
      score += 15;
      reasons.push("Plan mode prevents accidental executions");
      break;
    case "default":
      score += 10;
      reasons.push("Default mode asks before sensitive actions");
      break;
    case "acceptEdits":
      score += 0;
      reasons.push("acceptEdits auto-accepts file edits");
      break;
    case "bypassPermissions":
      score -= 40;
      reasons.push("bypassPermissions runs without prompts");
      break;
  }

  if (config.allowList.includes("*") || config.allowList.includes("Bash")) {
    score -= 15;
    reasons.push("Broad allowlist (includes Bash or *)");
  } else if (config.allowList.length > 0) {
    score += 8;
    reasons.push(`Specific allowlist (${config.allowList.length} tools)`);
  }

  if (config.denyList.length > 0) {
    score += Math.min(12, config.denyList.length * 3);
    reasons.push(`Denylist blocks ${config.denyList.length} destructive patterns`);
  } else {
    score -= 8;
    reasons.push("No denylist for destructive commands");
  }

  if (config.hooks.preToolUse) {
    score += 10;
    reasons.push("PreToolUse hook validates tool calls");
  }
  if (config.hooks.userPromptSubmit) {
    score += 4;
  }

  if (config.mcpServers.length > 3) {
    score -= (config.mcpServers.length - 3) * 3;
    reasons.push(`${config.mcpServers.length} MCP servers expand attack surface`);
  }

  const final = Math.round(clamp(score));
  return {
    score: final,
    label: final >= 80 ? "Secure" : final >= 55 ? "Moderate" : final >= 30 ? "Risky" : "Dangerous",
    reasons,
  };
}

export function estimateTokens(config: ClaudeConfig): Metrics["tokens"] {
  const model = MODELS[config.model];
  const usage = USAGE_PROFILES[config.usage];

  const inputPerSession = usage.inputPerTurn * usage.turnsPerSession;
  const outputPerSession = usage.outputPerTurn * usage.turnsPerSession;

  const thinkingPerSession = config.extendedThinking
    ? config.thinkingBudgetTokens * usage.turnsPerSession
    : 0;

  const hooksOverheadPerTurn =
    (config.hooks.preToolUse ? 150 : 0) +
    (config.hooks.postToolUse ? 120 : 0) +
    (config.hooks.userPromptSubmit ? 80 : 0) +
    (config.hooks.stop ? 60 : 0);
  const hooksOverheadPerSession = hooksOverheadPerTurn * usage.turnsPerSession;

  const mcpOverheadPerSession = config.mcpServers.length * 800;

  const tokensPerSession =
    inputPerSession +
    outputPerSession +
    thinkingPerSession +
    hooksOverheadPerSession +
    mcpOverheadPerSession;

  const sessionsPerMonth = usage.sessionsPerDay * 22;
  const tokensPerMonth = tokensPerSession * sessionsPerMonth;

  const inputPerMonth = (inputPerSession + hooksOverheadPerSession + mcpOverheadPerSession) * sessionsPerMonth;
  const outputPerMonth = (outputPerSession + thinkingPerSession) * sessionsPerMonth;

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

export function calculateEfficiency(config: ClaudeConfig): Metrics["efficiency"] {
  const model = MODELS[config.model];
  const reasons: string[] = [];

  let score = model.speedScore * 0.4 + model.qualityScore * 0.4;
  reasons.push(`${model.label}: speed ${model.speedScore}, quality ${model.qualityScore}`);

  const priceIndex = model.inputPricePer1M + model.outputPricePer1M / 5;
  const costScore = clamp(100 - priceIndex * 2);
  score += costScore * 0.2;
  reasons.push(`Relative cost: ${priceIndex.toFixed(1)}$/M weighted`);

  if (config.promptCaching) {
    score += 6;
    reasons.push("Prompt caching reduces latency and input tokens");
  } else {
    score -= 4;
    reasons.push("Prompt caching off: full input cost every turn");
  }

  if (config.extendedThinking) {
    const budgetK = config.thinkingBudgetTokens / 1000;
    if (budgetK > 0 && budgetK <= 8) {
      score += 2;
      reasons.push(`Thinking budget ${budgetK}K: good balance`);
    } else if (budgetK > 8) {
      score -= Math.min(10, budgetK - 8);
      reasons.push(`Thinking budget ${budgetK}K: adds a lot of latency`);
    }
  }

  const hookCount = Object.values(config.hooks).filter(Boolean).length;
  if (hookCount > 2) {
    score -= (hookCount - 2) * 3;
    reasons.push(`${hookCount} active hooks: per-turn overhead`);
  }

  if (config.mcpServers.length > 4) {
    score -= (config.mcpServers.length - 4) * 2;
    reasons.push(`${config.mcpServers.length} MCP servers: context overhead`);
  }

  if (config.model === "opus-4.7-1m" && config.usage === "light") {
    score -= 10;
    reasons.push("Opus 1M is overkill for light usage");
  }
  if (config.model === "haiku-4.5" && config.usage === "heavy") {
    score -= 8;
    reasons.push("Haiku may fall short on complex refactors");
  }

  const final = Math.round(clamp(score));
  return {
    score: final,
    label: final >= 80 ? "Optimal" : final >= 60 ? "Good" : final >= 40 ? "Fair" : "Poor",
    reasons,
  };
}

export function calculateAll(config: ClaudeConfig): Metrics {
  return {
    security: calculateSecurity(config),
    tokens: estimateTokens(config),
    efficiency: calculateEfficiency(config),
  };
}

export function buildSettingsJson(config: ClaudeConfig): Record<string, unknown> {
  const model = MODELS[config.model];

  const permissions: Record<string, unknown> = {
    defaultMode: config.permissionMode,
  };
  if (config.allowList.length) permissions.allow = config.allowList;
  if (config.denyList.length) permissions.deny = config.denyList;
  if (config.askList.length) permissions.ask = config.askList;

  const hooks: Record<string, unknown> = {};
  if (config.hooks.preToolUse) {
    hooks.PreToolUse = [
      {
        matcher: "Bash",
        hooks: [{ type: "command", command: "echo 'validate bash call' >&2" }],
      },
    ];
  }
  if (config.hooks.postToolUse) {
    hooks.PostToolUse = [
      { matcher: "*", hooks: [{ type: "command", command: "echo 'post tool' >&2" }] },
    ];
  }
  if (config.hooks.userPromptSubmit) {
    hooks.UserPromptSubmit = [
      { hooks: [{ type: "command", command: "echo 'prompt received' >&2" }] },
    ];
  }
  if (config.hooks.stop) {
    hooks.Stop = [{ hooks: [{ type: "command", command: "echo 'done' >&2" }] }];
  }

  const mcpServers: Record<string, unknown> = {};
  for (const name of config.mcpServers) {
    mcpServers[name] = {
      command: "npx",
      args: [`-y`, `@modelcontextprotocol/server-${name}`],
    };
  }

  const settings: Record<string, unknown> = {
    model: model.name,
    includeCoAuthoredBy: config.includeCoAuthoredBy,
    permissions,
  };

  if (Object.keys(hooks).length) settings.hooks = hooks;
  if (Object.keys(mcpServers).length) settings.mcpServers = mcpServers;
  if (Object.keys(config.env).length) settings.env = config.env;
  if (config.extendedThinking) {
    settings.thinking = {
      enabled: true,
      budgetTokens: config.thinkingBudgetTokens,
    };
  }

  return settings;
}
