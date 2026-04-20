import { useMemo, useRef, useState } from "react";
import type {
  AxisId,
  AxisLevel,
  ClaudeConfig,
  EffortLevel,
  ModelId,
  PermissionMode,
  UsageProfile,
} from "@/lib/types";
import {
  AXIS_LABELS,
  AXIS_LEVELS,
  EFFORT_ORDER,
  MODELS,
  MODEL_ORDER,
  PERMISSION_INFO,
  PERMISSION_ORDER,
  USAGE_PROFILES,
  USAGE_ORDER,
} from "@/lib/types";
import {
  AITMPL_HOOKS_URL,
  AITMPL_MCPS_URL,
  AVAILABLE_MCP_SERVERS,
  DEFAULT_CONFIG,
} from "@/lib/defaults";
import { applyPreset } from "@/lib/presets";
import { buildSettingsJson, computeScores } from "@/lib/calculator";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

const AXIS_ORDER: AxisId[] = ["security", "tokens", "accuracy"];
const AXIS_TITLES: Record<AxisId, string> = {
  security: "Security",
  tokens: "Token spend",
  accuracy: "Accuracy",
};

interface HeroSliderProps {
  axis: AxisId;
  value: AxisLevel;
  onChange: (level: AxisLevel) => void;
}

function HeroSlider({ axis, value, onChange }: HeroSliderProps) {
  const label = AXIS_LABELS[axis][value];
  const dec = () => onChange(Math.max(1, value - 1) as AxisLevel);
  const inc = () => onChange(Math.min(5, value + 1) as AxisLevel);

  const toneColor =
    axis === "security"
      ? value >= 4
        ? "var(--color-success)"
        : value >= 3
          ? "var(--color-warning)"
          : "var(--color-danger)"
      : axis === "tokens"
        ? value <= 2
          ? "var(--color-success)"
          : value <= 3
            ? "var(--color-warning)"
            : "var(--color-danger)"
        : value >= 4
          ? "var(--color-success)"
          : value >= 3
            ? "var(--color-warning)"
            : "var(--color-danger)";

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{AXIS_TITLES[axis]}</h3>
          <div className="mt-1 text-xs text-[var(--color-fg-muted)]">{label.tagline}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-medium leading-none" style={{ color: toneColor }}>
            {value}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">/ 5</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dec}
          aria-label={`decrease ${axis}`}
          disabled={value <= 1}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] text-lg transition hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) as AxisLevel)}
          className="claude-range flex-1"
        />
        <button
          type="button"
          onClick={inc}
          aria-label={`increase ${axis}`}
          disabled={value >= 5}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] text-lg transition hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
      </div>

      <div className="mt-2 flex justify-between px-11 font-mono text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {AXIS_LEVELS.map((lvl) => (
          <span key={lvl} className={lvl === value ? "text-[var(--color-fg)]" : ""}>
            {AXIS_LABELS[axis][lvl].label}
          </span>
        ))}
      </div>
    </div>
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

interface SegmentedProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => string;
}
function Segmented<T extends string>({ options, value, onChange, renderLabel }: SegmentedProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md border border-[var(--color-border)] p-1">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="rounded px-3 py-1 text-xs transition"
            style={{
              background: active ? "var(--color-fg)" : "transparent",
              color: active ? "var(--color-bg)" : "var(--color-fg-muted)",
            }}
          >
            {renderLabel ? renderLabel(opt) : opt}
          </button>
        );
      })}
    </div>
  );
}

interface ChipListProps {
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
  tone: "success" | "danger" | "warning";
}
function ChipList({ items, onAdd, onRemove, placeholder, tone }: ChipListProps) {
  const [input, setInput] = useState("");
  const color =
    tone === "success"
      ? "var(--color-success)"
      : tone === "warning"
        ? "var(--color-warning)"
        : "var(--color-danger)";
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {items.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs"
            style={{ borderColor: color, color }}
          >
            {v}
            <button
              type="button"
              onClick={() => onRemove(v)}
              aria-label={`remove ${v}`}
              className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (input.trim()) {
                onAdd(input.trim());
                setInput("");
              }
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded border border-[var(--color-border-strong)] bg-transparent px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-fg)]"
        />
        <button
          type="button"
          onClick={() => {
            if (input.trim()) {
              onAdd(input.trim());
              setInput("");
            }
          }}
          className="rounded border border-[var(--color-border-strong)] px-2 py-1 text-xs hover:bg-[var(--color-bg-hover)]"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function Calculator() {
  const [config, setConfig] = useState<ClaudeConfig>(DEFAULT_CONFIG);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const scores = useMemo(() => computeScores(config), [config]);
  const settingsJson = useMemo(() => buildSettingsJson(config), [config]);
  const jsonString = useMemo(() => JSON.stringify(settingsJson, null, 2), [settingsJson]);

  const updateAxis = (axis: AxisId, level: AxisLevel) => {
    setConfig((c) => applyPreset(c, axis, level));
  };

  const update = <K extends keyof ClaudeConfig>(key: K, value: ClaudeConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
  };

  const updateNested = <K extends keyof ClaudeConfig>(key: K, partial: Partial<ClaudeConfig[K]>) => {
    setConfig((c) => ({ ...c, [key]: { ...(c[key] as object), ...partial } as ClaudeConfig[K] }));
  };

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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 lg:px-6">
      {/* Hero sliders */}
      <div className="flex flex-col gap-3">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
            Step 1 · Tune the three axes
          </h2>
          <div className="text-xs text-[var(--color-fg-muted)]">
            Each level applies a preset to <code className="font-mono">settings.json</code>
          </div>
        </div>
        {AXIS_ORDER.map((axis) => (
          <HeroSlider key={axis} axis={axis} value={scores[axis]} onChange={(lvl) => updateAxis(axis, lvl)} />
        ))}

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">
                Estimated monthly spend
              </div>
              <div className="mt-1 font-mono text-2xl font-medium">{formatUSD(scores.cost.costPerMonthUSD)}</div>
            </div>
            <div className="text-right text-xs text-[var(--color-fg-muted)]">
              <div>{formatNumber(scores.cost.tokensPerMonth)} tokens/month</div>
              <div>{formatNumber(scores.cost.tokensPerSession)} tokens/session</div>
              {scores.cost.cacheSavingsPercent > 0 ? (
                <div style={{ color: "var(--color-success)" }}>−{scores.cost.cacheSavingsPercent}% cache savings</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Customize */}
      <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <summary className="flex cursor-pointer items-center justify-between p-5">
          <div>
            <div className="text-sm font-semibold tracking-tight">Step 2 · Customize (optional)</div>
            <div className="mt-1 text-xs text-[var(--color-fg-muted)]">
              Tweak individual fields. The sliders above will follow your changes.
            </div>
          </div>
          <div className="text-[var(--color-fg-muted)]">▾</div>
        </summary>

        <div className="flex flex-col gap-5 border-t border-[var(--color-border)] p-5">
          {/* Model */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">Model</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODEL_ORDER.map((id) => {
                const m = MODELS[id];
                const active = config.model === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update("model", id as ModelId)}
                    className="rounded-md border p-3 text-left transition hover:bg-[var(--color-bg-hover)]"
                    style={{
                      borderColor: active ? "var(--color-fg)" : "var(--color-border)",
                      background: active ? "var(--color-bg-hover)" : "transparent",
                    }}
                  >
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="mt-1 font-mono text-xs text-[var(--color-fg-muted)]">
                      ${m.inputPricePer1M}/M in · ${m.outputPricePer1M}/M out
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Usage profile */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
              Usage profile
            </div>
            <Segmented
              options={USAGE_ORDER}
              value={config.usage}
              onChange={(v) => update("usage", v as UsageProfile)}
              renderLabel={(v) => USAGE_PROFILES[v as UsageProfile].label}
            />
            <div className="mt-1 text-xs text-[var(--color-fg-muted)]">{USAGE_PROFILES[config.usage].tagline}</div>
          </div>

          {/* Permission mode */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
              Permission mode
            </div>
            <Segmented
              options={PERMISSION_ORDER}
              value={config.permissions.defaultMode}
              onChange={(v) => updateNested("permissions", { defaultMode: v as PermissionMode })}
            />
            <div className="mt-1 text-xs text-[var(--color-fg-muted)]">
              {PERMISSION_INFO[config.permissions.defaultMode].tagline}
            </div>
          </div>

          {/* Allow / Deny lists */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-success)" }}>
                Allow
              </div>
              <ChipList
                items={config.permissions.allow}
                onAdd={(v) => updateNested("permissions", { allow: [...config.permissions.allow, v] })}
                onRemove={(v) =>
                  updateNested("permissions", { allow: config.permissions.allow.filter((x) => x !== v) })
                }
                placeholder="e.g. Bash(npm run *)"
                tone="success"
              />
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-danger)" }}>
                Deny
              </div>
              <ChipList
                items={config.permissions.deny}
                onAdd={(v) => updateNested("permissions", { deny: [...config.permissions.deny, v] })}
                onRemove={(v) =>
                  updateNested("permissions", { deny: config.permissions.deny.filter((x) => x !== v) })
                }
                placeholder="e.g. Read(./.env)"
                tone="danger"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-warning)" }}>
              Ask (confirm before run)
            </div>
            <ChipList
              items={config.permissions.ask}
              onAdd={(v) => updateNested("permissions", { ask: [...config.permissions.ask, v] })}
              onRemove={(v) => updateNested("permissions", { ask: config.permissions.ask.filter((x) => x !== v) })}
              placeholder="e.g. Bash(git push *)"
              tone="warning"
            />
          </div>

          <div>
            <Toggle
              label="disableBypassPermissionsMode"
              description="Rejects --dangerously-skip-permissions at the org level."
              checked={config.disableBypassPermissionsMode}
              onChange={(v) => update("disableBypassPermissionsMode", v)}
            />
          </div>

          {/* Hooks */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">Hooks</div>
              <a
                href={AITMPL_HOOKS_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[var(--color-border-strong)] px-2.5 py-1 text-xs transition hover:bg-[var(--color-bg-hover)]"
              >
                View more ↗
              </a>
            </div>
            <Toggle
              label="PreToolUse"
              description="Validate tool calls before running."
              checked={config.hooks.preToolUse}
              onChange={(v) => updateNested("hooks", { preToolUse: v })}
            />
            <Toggle
              label="UserPromptSubmit"
              description="Fires on every prompt submit."
              checked={config.hooks.userPromptSubmit}
              onChange={(v) => updateNested("hooks", { userPromptSubmit: v })}
            />
            <Toggle
              label="PostToolUse"
              description="Runs after each tool call."
              checked={config.hooks.postToolUse}
              onChange={(v) => updateNested("hooks", { postToolUse: v })}
            />
            <Toggle
              label="Stop"
              description="Runs when the response ends."
              checked={config.hooks.stop}
              onChange={(v) => updateNested("hooks", { stop: v })}
            />
          </div>

          {/* Sandbox */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
              Sandbox
            </div>
            <Toggle
              label="Enable bash sandbox"
              description="Isolate bash commands from filesystem and network (macOS / Linux / WSL2)."
              checked={config.sandbox.enabled}
              onChange={(v) => updateNested("sandbox", { enabled: v })}
            />
            {config.sandbox.enabled ? (
              <Toggle
                label="failIfUnavailable"
                description="Exit at startup if the sandbox can't start."
                checked={config.sandbox.failIfUnavailable}
                onChange={(v) => updateNested("sandbox", { failIfUnavailable: v })}
              />
            ) : null}
          </div>

          {/* MCP */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                MCP servers
              </div>
              <a
                href={AITMPL_MCPS_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[var(--color-border-strong)] px-2.5 py-1 text-xs transition hover:bg-[var(--color-bg-hover)]"
              >
                View more ↗
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MCP_SERVERS.map((name) => {
                const active = config.mcpServers.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      update(
                        "mcpServers",
                        active ? config.mcpServers.filter((n) => n !== name) : [...config.mcpServers, name],
                      )
                    }
                    className="rounded-full border px-3 py-1 text-xs transition"
                    style={{
                      borderColor: active ? "var(--color-fg)" : "var(--color-border-strong)",
                      background: active ? "var(--color-fg)" : "transparent",
                      color: active ? "var(--color-bg)" : "var(--color-fg-muted)",
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thinking & effort */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
              Effort & thinking
            </div>
            <div className="mb-3">
              <div className="mb-1 text-xs text-[var(--color-fg-muted)]">effortLevel</div>
              <Segmented
                options={EFFORT_ORDER}
                value={config.effortLevel}
                onChange={(v) => update("effortLevel", v as EffortLevel)}
              />
            </div>
            <Toggle
              label="alwaysThinkingEnabled"
              description="Extended thinking for every session."
              checked={config.alwaysThinkingEnabled}
              onChange={(v) => update("alwaysThinkingEnabled", v)}
            />
            {config.alwaysThinkingEnabled ? (
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[var(--color-fg-muted)]">
                    MAX_THINKING_TOKENS (env)
                  </span>
                  <span className="font-mono">{formatNumber(config.thinkingBudgetTokens || 4000)}</span>
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
          </div>

          {/* Attribution */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
              Attribution
            </div>
            <Toggle
              label="includeCoAuthoredBy"
              description="Adds Co-Authored-By Claude to commits."
              checked={config.includeCoAuthoredBy}
              onChange={(v) => update("includeCoAuthoredBy", v)}
            />
          </div>
        </div>
      </details>

      {/* Generate */}
      <div className="mt-2 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full rounded-md bg-[var(--color-fg)] px-5 py-3 text-sm font-semibold text-[var(--color-bg)] transition hover:opacity-90 sm:w-auto sm:min-w-[280px]"
        >
          Generate configuration →
        </button>
        <p className="text-xs text-[var(--color-fg-muted)]">
          Your settings.json will appear below, ready to copy or download.
        </p>
      </div>

      {/* Result */}
      {generated ? (
        <div ref={resultRef} className="fadein flex flex-col gap-4 border-t border-[var(--color-border)] pt-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold tracking-tight">Your configuration</h3>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              Paste into <code className="font-mono text-[var(--color-fg)]">~/.claude/settings.json</code> (global) or{" "}
              <code className="font-mono text-[var(--color-fg)]">.claude/settings.json</code> (project).
            </p>
          </div>

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
            <pre className="max-h-[560px] overflow-auto p-4 font-mono text-xs leading-relaxed">
              <code>{jsonString}</code>
            </pre>
          </div>

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
