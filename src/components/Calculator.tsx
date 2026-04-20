import { useMemo, useRef, useState } from "react";
import type { ClaudeConfig, ModelId, PermissionMode, UsageProfile } from "@/lib/types";
import {
  MODELS,
  MODEL_ORDER,
  PERMISSION_INFO,
  PERMISSION_ORDER,
  USAGE_PROFILES,
  USAGE_ORDER,
} from "@/lib/types";
import { AITMPL_HOOKS_URL, AITMPL_MCPS_URL, AVAILABLE_MCP_SERVERS, DEFAULT_CONFIG } from "@/lib/defaults";
import { buildSettingsJson, calculateAll } from "@/lib/calculator";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

interface StepRangeProps {
  title: string;
  description?: string;
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  currentLabel: string;
  currentTagline?: string;
  tickLabels?: string[];
}

function StepRange({
  title,
  description,
  value,
  min = 0,
  max,
  onChange,
  currentLabel,
  currentTagline,
  tickLabels,
}: StepRangeProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{description}</p> : null}
        </div>
        <div className="text-right">
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
            {value + 1}/{max - min + 1}
          </div>
          <div className="text-sm font-medium">{currentLabel}</div>
          {currentTagline ? (
            <div className="text-xs text-[var(--color-fg-muted)]">{currentTagline}</div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dec}
          aria-label="decrease"
          disabled={value <= min}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] text-lg transition hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="claude-range flex-1"
        />
        <button
          type="button"
          onClick={inc}
          aria-label="increase"
          disabled={value >= max}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] text-lg transition hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
      </div>

      {tickLabels ? (
        <div className="mt-2 flex justify-between px-11 font-mono text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
          {tickLabels.map((label, i) => (
            <span key={i} className={i === value ? "text-[var(--color-fg)]" : ""}>
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}
function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-2">
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        {description ? <div className="mt-0.5 text-xs text-[var(--color-fg-muted)]">{description}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition"
        style={{
          background: checked ? "var(--color-fg)" : "var(--color-bg-hover)",
          borderColor: checked ? "var(--color-fg)" : "var(--color-border-strong)",
        }}
      >
        <span
          className="absolute top-0.5 h-3.5 w-3.5 rounded-full transition"
          style={{
            left: checked ? "calc(100% - 16px)" : "2px",
            background: checked ? "var(--color-bg)" : "var(--color-fg-muted)",
          }}
        />
      </button>
    </label>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  tone: "success" | "warning" | "danger";
}
function MetricCard({ label, value, sub, tone }: MetricCardProps) {
  const color =
    tone === "success"
      ? "var(--color-success)"
      : tone === "warning"
        ? "var(--color-warning)"
        : "var(--color-danger)";
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">{label}</div>
      <div className="mt-1 font-mono text-2xl font-medium" style={{ color }}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-[var(--color-fg-muted)]">{sub}</div>
    </div>
  );
}

export default function Calculator() {
  const [config, setConfig] = useState<ClaudeConfig>(DEFAULT_CONFIG);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const metrics = useMemo(() => calculateAll(config), [config]);
  const settingsJson = useMemo(() => buildSettingsJson(config), [config]);
  const jsonString = useMemo(() => JSON.stringify(settingsJson, null, 2), [settingsJson]);

  const update = <K extends keyof ClaudeConfig>(key: K, value: ClaudeConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
  };

  const modelIdx = MODEL_ORDER.indexOf(config.model);
  const usageIdx = USAGE_ORDER.indexOf(config.usage);
  const permIdx = PERMISSION_ORDER.indexOf(config.permissionMode);

  const activeHookCount = Object.values(config.hooks).filter(Boolean).length;
  const mcpCount = config.mcpServers.length;

  const currentModel = MODELS[config.model];

  const handleGenerate = () => {
    setGenerated(true);
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setGenerated(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setHookByCount = (n: number) => {
    // Turn hooks on in a priority order as the slider grows
    const order: Array<keyof ClaudeConfig["hooks"]> = ["preToolUse", "userPromptSubmit", "postToolUse", "stop"];
    const next: ClaudeConfig["hooks"] = {
      preToolUse: false,
      postToolUse: false,
      userPromptSubmit: false,
      stop: false,
    };
    for (let i = 0; i < n; i++) next[order[i]] = true;
    update("hooks", next);
  };

  const setMcpByCount = (n: number) => {
    update("mcpServers", AVAILABLE_MCP_SERVERS.slice(0, n));
  };

  const securityTone: MetricCardProps["tone"] =
    metrics.security.score >= 70 ? "success" : metrics.security.score >= 45 ? "warning" : "danger";
  const efficiencyTone: MetricCardProps["tone"] =
    metrics.efficiency.score >= 70 ? "success" : metrics.efficiency.score >= 50 ? "warning" : "danger";
  const tokenLoad = Math.min(100, Math.round((metrics.tokens.tokensPerMonth / 50_000_000) * 100));
  const tokensTone: MetricCardProps["tone"] = tokenLoad < 40 ? "success" : tokenLoad < 75 ? "warning" : "danger";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 lg:px-6">
      <StepRange
        title="1. Model"
        description="From fastest & cheapest to the smartest."
        value={modelIdx}
        max={MODEL_ORDER.length - 1}
        onChange={(i) => update("model", MODEL_ORDER[i] as ModelId)}
        currentLabel={currentModel.label}
        currentTagline={`${currentModel.tagline} · $${currentModel.inputPricePer1M}/M in · $${currentModel.outputPricePer1M}/M out`}
        tickLabels={MODEL_ORDER.map((id) => MODELS[id].label.split(" ")[0])}
      />

      <StepRange
        title="2. Usage intensity"
        description="How much you lean on Claude each day."
        value={usageIdx}
        max={USAGE_ORDER.length - 1}
        onChange={(i) => update("usage", USAGE_ORDER[i] as UsageProfile)}
        currentLabel={USAGE_PROFILES[config.usage].label}
        currentTagline={USAGE_PROFILES[config.usage].tagline}
        tickLabels={USAGE_ORDER.map((k) => USAGE_PROFILES[k].label)}
      />

      <StepRange
        title="3. Permission mode"
        description="Safer on the left, looser on the right."
        value={permIdx}
        max={PERMISSION_ORDER.length - 1}
        onChange={(i) => update("permissionMode", PERMISSION_ORDER[i] as PermissionMode)}
        currentLabel={PERMISSION_INFO[config.permissionMode].label}
        currentTagline={PERMISSION_INFO[config.permissionMode].tagline}
        tickLabels={PERMISSION_ORDER.map((m) => PERMISSION_INFO[m].label)}
      />

      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">4. Hooks</h2>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              Scripts that run on tool calls and prompts.
            </p>
          </div>
          <a
            href={AITMPL_HOOKS_URL}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md border border-[var(--color-border-strong)] px-2.5 py-1 text-xs transition hover:bg-[var(--color-bg-hover)]"
          >
            View more ↗
          </a>
        </div>
        <StepRangeBare
          value={activeHookCount}
          max={4}
          onChange={setHookByCount}
          unit="hook"
          summary={activeHookCount === 0 ? "No hooks — lighter but unchecked" : `${activeHookCount} active hook${activeHookCount > 1 ? "s" : ""}`}
        />
        <div className="mt-3 border-t border-[var(--color-border)] pt-1">
          <Toggle
            label="PreToolUse"
            description="Validate tool calls before running."
            checked={config.hooks.preToolUse}
            onChange={(v) => update("hooks", { ...config.hooks, preToolUse: v })}
          />
          <Toggle
            label="UserPromptSubmit"
            description="Fires on every prompt submit."
            checked={config.hooks.userPromptSubmit}
            onChange={(v) => update("hooks", { ...config.hooks, userPromptSubmit: v })}
          />
          <Toggle
            label="PostToolUse"
            description="Runs after each tool call."
            checked={config.hooks.postToolUse}
            onChange={(v) => update("hooks", { ...config.hooks, postToolUse: v })}
          />
          <Toggle
            label="Stop"
            description="Runs when the response ends."
            checked={config.hooks.stop}
            onChange={(v) => update("hooks", { ...config.hooks, stop: v })}
          />
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">5. MCP servers</h2>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              More servers, more capabilities — but more tokens and attack surface.
            </p>
          </div>
          <a
            href={AITMPL_MCPS_URL}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md border border-[var(--color-border-strong)] px-2.5 py-1 text-xs transition hover:bg-[var(--color-bg-hover)]"
          >
            View more ↗
          </a>
        </div>
        <StepRangeBare
          value={mcpCount}
          max={AVAILABLE_MCP_SERVERS.length}
          onChange={setMcpByCount}
          unit="server"
          summary={mcpCount === 0 ? "No MCP servers" : `${mcpCount} server${mcpCount > 1 ? "s" : ""} connected`}
        />
        {mcpCount > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {config.mcpServers.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-hover)] px-2 py-0.5 font-mono text-xs"
              >
                {name}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <div className="mb-2">
          <h2 className="text-sm font-semibold tracking-tight">6. Thinking & caching</h2>
        </div>
        <Toggle
          label="Extended thinking"
          description="Claude thinks before answering. Higher quality, more tokens."
          checked={config.extendedThinking}
          onChange={(v) => update("extendedThinking", v)}
        />
        {config.extendedThinking ? (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-[var(--color-fg-muted)]">Thinking budget</span>
              <span className="font-mono">{formatNumber(config.thinkingBudgetTokens || 4000)} tokens</span>
            </div>
            <input
              type="range"
              min={1000}
              max={32000}
              step={1000}
              value={config.thinkingBudgetTokens || 4000}
              onChange={(e) => update("thinkingBudgetTokens", Number(e.target.value))}
              className="claude-range w-full"
            />
          </div>
        ) : null}
        <div className="mt-2 border-t border-[var(--color-border)] pt-2">
          <Toggle
            label="Prompt caching"
            description="Caches stable context. Cuts input tokens up to 90%."
            checked={config.promptCaching}
            onChange={(v) => update("promptCaching", v)}
          />
        </div>
      </section>

      {/* Generate */}
      <div className="mt-4 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full rounded-md bg-[var(--color-fg)] px-5 py-3 text-sm font-semibold text-[var(--color-bg)] transition hover:opacity-90 sm:w-auto sm:min-w-[280px]"
        >
          Generate configuration →
        </button>
        <p className="text-xs text-[var(--color-fg-muted)]">
          Your settings.json, security score and token estimate will appear below.
        </p>
      </div>

      {/* Result */}
      {generated ? (
        <div ref={resultRef} className="fadein mt-4 flex flex-col gap-4 border-t border-[var(--color-border)] pt-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold tracking-tight">Your configuration</h3>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              Paste into{" "}
              <code className="font-mono text-[var(--color-fg)]">~/.claude/settings.json</code>
              {" "}(global) or{" "}
              <code className="font-mono text-[var(--color-fg)]">.claude/settings.json</code> (project).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard
              label="Security"
              value={`${metrics.security.score}`}
              sub={metrics.security.label}
              tone={securityTone}
            />
            <MetricCard
              label="Monthly cost"
              value={formatUSD(metrics.tokens.costPerMonthUSD)}
              sub={`${formatNumber(metrics.tokens.tokensPerMonth)} tokens/mo`}
              tone={tokensTone}
            />
            <MetricCard
              label="Efficiency"
              value={`${metrics.efficiency.score}`}
              sub={metrics.efficiency.label}
              tone={efficiencyTone}
            />
          </div>

          {metrics.tokens.cacheSavingsPercent > 0 ? (
            <div
              className="rounded-md border px-3 py-2 text-xs"
              style={{ borderColor: "color-mix(in srgb, var(--color-success) 30%, transparent)", color: "var(--color-success)" }}
            >
              Prompt caching saves ≈ {metrics.tokens.cacheSavingsPercent}% on input costs.
            </div>
          ) : null}

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
              <span className="font-mono text-xs text-[var(--color-fg-muted)]">settings.json</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-md border border-[var(--color-border-strong)] px-3 py-1 text-xs transition hover:bg-[var(--color-bg-hover)]"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-md bg-[var(--color-fg)] px-3 py-1 text-xs font-medium text-[var(--color-bg)] transition hover:opacity-90"
                >
                  Download
                </button>
              </div>
            </div>
            <pre className="max-h-[520px] overflow-auto p-4 font-mono text-xs leading-relaxed">
              <code>{jsonString}</code>
            </pre>
          </div>

          <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-xs">
            <summary className="cursor-pointer font-medium">Why these scores</summary>
            <div className="mt-3 space-y-3">
              <Reasons title="Security" items={metrics.security.reasons} />
              <Reasons title="Efficiency" items={metrics.efficiency.reasons} />
            </div>
          </details>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-[var(--color-border-strong)] px-4 py-2 text-xs text-[var(--color-fg-muted)] transition hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg)]"
            >
              Start over
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface StepRangeBareProps {
  value: number;
  max: number;
  onChange: (v: number) => void;
  unit: string;
  summary: string;
}
function StepRangeBare({ value, max, onChange, summary }: StepRangeBareProps) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dec}
          aria-label="decrease"
          disabled={value <= 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] text-lg transition hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="claude-range flex-1"
        />
        <button
          type="button"
          onClick={inc}
          aria-label="increase"
          disabled={value >= max}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] text-lg transition hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
      </div>
      <div className="mt-2 text-xs text-[var(--color-fg-muted)]">{summary}</div>
    </>
  );
}

function Reasons({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[var(--color-fg-muted)]">{title}</div>
      <ul className="space-y-1">
        {items.map((r, i) => (
          <li key={i} className="pl-3 -indent-3">
            · {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
