# Claudeculator

> The `settings.json` calculator for Claude Code. Build your config with range sliders, score **security**, **token usage** and **efficiency**, then export a ready-to-use file.

![Astro](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-black)

---

## What is it?

**Claudeculator** is an Astro SPA that walks you through a short, slider-based wizard to assemble a Claude Code configuration. When you're done, hit **Generate configuration** and it reveals:

- Your `settings.json`, ready to copy or download
- A **security** score (0–100)
- A **monthly token + cost** estimate
- An **efficiency** score (speed × quality × cost balance)

## Features

- Step-by-step range sliders for model, usage intensity, permission mode, hooks and MCP servers
- Quick links to curated [aitmpl.com hooks](https://www.aitmpl.com/hooks) and [MCP servers](https://www.aitmpl.com/mcps)
- Extended thinking and prompt caching toggles
- Copy or download the generated `settings.json`
- 100% client-side — no backend, no telemetry, no accounts
- Vercel-style dark theme (Geist Sans + Geist Mono), fully responsive

## Stack

- [Astro 5](https://astro.build) with islands architecture
- [React 19](https://react.dev) for the interactive island
- [Tailwind CSS v4](https://tailwindcss.com)
- [@fontsource/geist-sans](https://fontsource.org) + `@fontsource/geist-mono`
- [Zod](https://zod.dev) for schema validation
- Deployable to [Vercel](https://vercel.com)

## How the three scores work

### Security (0–100)
Rewards denylists, restrictive permission modes, validation hooks. Penalizes broad allowlists, `bypassPermissions`, `--dangerously-skip-permissions`, and excessive MCP surface.

### Tokens & cost
Estimates monthly token usage from the selected model, usage profile, thinking budget, hooks overhead, and MCP server chatter. Factors in a 60% prompt-cache hit rate when caching is enabled.

### Efficiency (0–100)
Blends speed, quality and cost of the chosen model with per-turn overhead from hooks and MCP servers.

## How to use

1. Open the site
2. Slide through the six steps: model → usage → permission mode → hooks → MCP → thinking & caching
3. Click **Generate configuration**
4. Copy or download your `settings.json`
5. Paste into `~/.claude/settings.json` (global) or `.claude/settings.json` (project)

## Local development

```bash
npm install
npm run dev       # http://localhost:4321
npm run build
npm run preview
```

## Roadmap

- [x] Repo + README
- [x] Astro + Tailwind + Vercel-style theme scaffolding
- [x] Range-slider calculator UI
- [x] Generate step with metrics + copy/download
- [ ] Custom MCP server input
- [ ] Share-by-URL (encoded config)
- [ ] Deploy to Vercel

## License

MIT © [Daniel Avila](https://danielavila.me) — 2026
