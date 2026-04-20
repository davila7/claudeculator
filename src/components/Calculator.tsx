import { useMemo, useState } from "react";
import type { ClaudeConfig, ModelId, PermissionMode, UsageProfile } from "@/lib/types";
import { MODELS, USAGE_PROFILES } from "@/lib/types";
import { DEFAULT_CONFIG, AVAILABLE_MCP_SERVERS } from "@/lib/defaults";
import { buildSettingsJson, calculateAll } from "@/lib/calculator";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

interface GaugeProps {
  label: string;
  value: number;
  sublabel: string;
  tone: "success" | "warning" | "danger";
}

function Gauge({ label, value, sublabel, tone }: GaugeProps) {
  const toneColor =
    tone === "success" ? "var(--color-success)" : tone === "warning" ? "var(--color-warning)" : "var(--color-danger)";
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" strokeWidth="5" stroke="var(--color-border-strong)" fill="none" />
          <circle
            cx="32"
            cy="32"
            r="28"
            strokeWidth="5"
            stroke={toneColor}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xl font-medium">{value}</div>
      </div>
      <div className="text-center">
        <div className="text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">{label}</div>
        <div className="text-sm font-medium" style={{ color: toneColor }}>
          {sublabel}
        </div>
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--color-fg)]">{title}</h2>
        {description ? <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{description}</p> : null}
      </div>
      {children}
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

export default function Calculator() {
  const [config, setConfig] = useState<ClaudeConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState(false);
  const [newAllow, setNewAllow] = useState("");
  const [newDeny, setNewDeny] = useState("");

  const metrics = useMemo(() => calculateAll(config), [config]);
  const settingsJson = useMemo(() => buildSettingsJson(config), [config]);
  const jsonString = useMemo(() => JSON.stringify(settingsJson, null, 2), [settingsJson]);

  const update = <K extends keyof ClaudeConfig>(key: K, value: ClaudeConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
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

  const securityTone = metrics.security.score >= 70 ? "success" : metrics.security.score >= 45 ? "warning" : "danger";
  const efficiencyTone =
    metrics.efficiency.score >= 70 ? "success" : metrics.efficiency.score >= 50 ? "warning" : "danger";

  const tokenLoad = Math.min(100, Math.round((metrics.tokens.tokensPerMonth / 50_000_000) * 100));
  const tokensTone = tokenLoad < 40 ? "success" : tokenLoad < 75 ? "warning" : "danger";

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[1fr_420px] lg:px-8">
      {/* LEFT — form */}
      <div className="flex flex-col gap-4">
        <Section title="Modelo" description="La elección del modelo domina costo y latencia.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(MODELS) as ModelId[]).map((id) => {
              const m = MODELS[id];
              const active = config.model === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => update("model", id)}
                  className="rounded-md border p-3 text-left transition hover:bg-[var(--color-bg-hover)]"
                  style={{
                    borderColor: active ? "var(--color-fg)" : "var(--color-border)",
                    background: active ? "var(--color-bg-hover)" : "transparent",
                  }}
                >
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="mt-1 font-mono text-xs text-[var(--color-fg-muted)]">
                    {formatNumber(m.contextWindow)} · ${m.inputPricePer1M}/M in · ${m.outputPricePer1M}/M out
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Perfil de uso" description="¿Cuánto vas a usar Claude cada día?">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.keys(USAGE_PROFILES) as UsageProfile[]).map((k) => {
              const p = USAGE_PROFILES[k];
              const active = config.usage === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => update("usage", k)}
                  className="rounded-md border p-3 text-left transition hover:bg-[var(--color-bg-hover)]"
                  style={{
                    borderColor: active ? "var(--color-fg)" : "var(--color-border)",
                    background: active ? "var(--color-bg-hover)" : "transparent",
                  }}
                >
                  <div className="text-sm font-medium capitalize">{k}</div>
                  <div className="mt-1 text-xs text-[var(--color-fg-muted)]">{p.label}</div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Permisos" description="Controla cómo Claude ejecuta tools.">
          <div className="mb-3">
            <div className="flex flex-wrap gap-1 rounded-md border border-[var(--color-border)] p-1">
              {(["default", "acceptEdits", "plan", "bypassPermissions"] as PermissionMode[]).map((mode) => {
                const active = config.permissionMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => update("permissionMode", mode)}
                    className="rounded px-3 py-1.5 text-xs transition"
                    style={{
                      background: active ? "var(--color-fg)" : "transparent",
                      color: active ? "var(--color-bg)" : "var(--color-fg-muted)",
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ChipList
              label="Allow"
              tone="success"
              items={config.allowList}
              onRemove={(v) => update("allowList", config.allowList.filter((x) => x !== v))}
              input={newAllow}
              setInput={setNewAllow}
              onAdd={() => {
                if (!newAllow.trim()) return;
                update("allowList", [...config.allowList, newAllow.trim()]);
                setNewAllow("");
              }}
              placeholder="ej. Read, Grep"
            />
            <ChipList
              label="Deny"
              tone="danger"
              items={config.denyList}
              onRemove={(v) => update("denyList", config.denyList.filter((x) => x !== v))}
              input={newDeny}
              setInput={setNewDeny}
              onAdd={() => {
                if (!newDeny.trim()) return;
                update("denyList", [...config.denyList, newDeny.trim()]);
                setNewDeny("");
              }}
              placeholder="ej. Bash(rm -rf *)"
            />
          </div>

          <div className="mt-3 border-t border-[var(--color-border)] pt-2">
            <Toggle
              label="--dangerously-skip-permissions"
              description="Salta todos los permisos. Útil para sandboxes. Penaliza seguridad."
              checked={config.dangerouslySkipPermissions}
              onChange={(v) => update("dangerouslySkipPermissions", v)}
            />
          </div>
        </Section>

        <Section title="Hooks" description="Scripts que corren antes/después de ciertos eventos.">
          <Toggle
            label="PreToolUse"
            description="Valida tool calls antes de ejecutarlos."
            checked={config.hooks.preToolUse}
            onChange={(v) => update("hooks", { ...config.hooks, preToolUse: v })}
          />
          <Toggle
            label="PostToolUse"
            description="Ejecuta después de cada tool call."
            checked={config.hooks.postToolUse}
            onChange={(v) => update("hooks", { ...config.hooks, postToolUse: v })}
          />
          <Toggle
            label="UserPromptSubmit"
            description="Se activa al enviar un prompt."
            checked={config.hooks.userPromptSubmit}
            onChange={(v) => update("hooks", { ...config.hooks, userPromptSubmit: v })}
          />
          <Toggle
            label="Stop"
            description="Al terminar la respuesta."
            checked={config.hooks.stop}
            onChange={(v) => update("hooks", { ...config.hooks, stop: v })}
          />
        </Section>

        <Section title="MCP servers" description="Más servers = más capacidades, pero más tokens y superficie de ataque.">
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_MCP_SERVERS.map((name) => {
              const active = config.mcpServers.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    update(
                      "mcpServers",
                      active ? config.mcpServers.filter((n) => n !== name) : [...config.mcpServers, name],
                    );
                  }}
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
        </Section>

        <Section title="Thinking & caching" description="Balance fino entre calidad y costo.">
          <Toggle
            label="Extended thinking"
            description="Claude piensa antes de responder. Más calidad, más tokens, más latencia."
            checked={config.extendedThinking}
            onChange={(v) => update("extendedThinking", v)}
          />
          {config.extendedThinking ? (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-[var(--color-fg-muted)]">Budget de thinking</span>
                <span className="font-mono">{formatNumber(config.thinkingBudgetTokens)} tokens</span>
              </div>
              <input
                type="range"
                min={1000}
                max={32000}
                step={1000}
                value={config.thinkingBudgetTokens || 4000}
                onChange={(e) => update("thinkingBudgetTokens", Number(e.target.value))}
                className="w-full accent-white"
              />
            </div>
          ) : null}
          <div className="mt-2 border-t border-[var(--color-border)] pt-2">
            <Toggle
              label="Prompt caching"
              description="Cachea el contexto estable. Reduce input tokens hasta 90%."
              checked={config.promptCaching}
              onChange={(v) => update("promptCaching", v)}
            />
          </div>
        </Section>
      </div>

      {/* RIGHT — preview + metrics */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:h-fit">
        <div className="grid grid-cols-3 gap-3">
          <Gauge label="Seguridad" value={metrics.security.score} sublabel={metrics.security.label} tone={securityTone} />
          <Gauge label="Tokens" value={tokenLoad} sublabel={`${formatNumber(metrics.tokens.tokensPerMonth)}/mes`} tone={tokensTone} />
          <Gauge
            label="Eficiencia"
            value={metrics.efficiency.score}
            sublabel={metrics.efficiency.label}
            tone={efficiencyTone}
          />
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <div className="mb-3 text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">Estimación mensual</div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-mono text-3xl font-medium">{formatUSD(metrics.tokens.costPerMonthUSD)}</div>
              <div className="mt-1 text-xs text-[var(--color-fg-muted)]">
                {formatNumber(metrics.tokens.tokensPerMonth)} tokens · {formatNumber(metrics.tokens.tokensPerSession)}/sesión
              </div>
            </div>
            {metrics.tokens.cacheSavingsPercent > 0 ? (
              <div className="rounded border border-[var(--color-success)]/30 px-2 py-1 text-xs" style={{ color: "var(--color-success)" }}>
                -{metrics.tokens.cacheSavingsPercent}% por cache
              </div>
            ) : null}
          </div>
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
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-md bg-[var(--color-fg)] px-3 py-1 text-xs font-medium text-[var(--color-bg)] transition hover:opacity-90"
              >
                Descargar
              </button>
            </div>
          </div>
          <pre className="max-h-[420px] overflow-auto p-4 font-mono text-xs leading-relaxed">
            <code>{jsonString}</code>
          </pre>
        </div>

        <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-xs">
          <summary className="cursor-pointer font-medium">Por qué este puntaje</summary>
          <div className="mt-3 space-y-3">
            <Reasons title="Seguridad" items={metrics.security.reasons} />
            <Reasons title="Eficiencia" items={metrics.efficiency.reasons} />
          </div>
        </details>
      </aside>
    </div>
  );
}

function ChipList({
  label,
  tone,
  items,
  onRemove,
  input,
  setInput,
  onAdd,
  placeholder,
}: {
  label: string;
  tone: "success" | "danger";
  items: string[];
  onRemove: (v: string) => void;
  input: string;
  setInput: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  const color = tone === "success" ? "var(--color-success)" : "var(--color-danger)";
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wider" style={{ color }}>
        {label}
      </div>
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
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded border border-[var(--color-border-strong)] bg-transparent px-2 py-1 text-xs font-mono outline-none focus:border-[var(--color-fg)]"
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded border border-[var(--color-border-strong)] px-2 py-1 text-xs hover:bg-[var(--color-bg-hover)]"
        >
          +
        </button>
      </div>
    </div>
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
