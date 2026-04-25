# Claudeculator

![Astro](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-black)

> Build a `settings.json` for Claude Code with a slider-based wizard, then see how secure, expensive, and efficient your config actually is — before you ship it.

**Live:** [claudeculator.vercel.app](https://claudeculator.vercel.app)

<img width="1210" height="756" alt="Screenshot 2026-04-24 at 22 09 53" src="https://github.com/user-attachments/assets/4285dbd7-3aca-41fd-9db9-a64de022a714" />

---


## What it does

Claudeculator turns your Claude Code configuration into something you can reason about. You move a few sliders — model, usage intensity, permission mode, hooks, MCP servers, thinking & caching — and the page tells you, in real time:

- **Security score (0–100)** — how locked-down your config is
- **Monthly token usage and estimated cost**
- **Efficiency score (0–100)** — speed × quality × cost balance

When you're happy, click **Generate configuration** and the site reveals a ready-to-use `settings.json` you can copy or download into `~/.claude/settings.json` (global) or `.claude/settings.json` (per-project).

## How the scores work

### Security
Rewards explicit denylists, restrictive permission modes, and validation hooks. Penalizes broad allowlists, `bypassPermissions`, `--dangerously-skip-permissions`, and excessive MCP surface area.

### Tokens & cost
Estimates monthly token usage from the chosen model, usage profile, thinking budget, hook overhead, and MCP-server chatter. Factors in a 60% prompt-cache hit rate when caching is enabled.

### Efficiency
Blends model speed, quality, and cost with the per-turn overhead introduced by hooks and MCP servers.

## Features

- Step-by-step range sliders for every major Claude Code setting
- Quick links to curated [aitmpl.com hooks](https://www.aitmpl.com/hooks) and [MCP servers](https://www.aitmpl.com/mcps)
- Extended thinking and prompt caching toggles
- Copy or download the generated `settings.json`
- Vercel-style dark theme, fully responsive
- 100% static — your config is built entirely in the browser and never leaves your device

## Privacy

Claudeculator is a static site. The `settings.json` you build is computed in your browser and is never sent anywhere. The site loads Google Analytics for aggregate, anonymous traffic stats — any standard ad blocker will block it if you'd rather not be counted.

## Stack

[Astro 5](https://astro.build) · [React 19](https://react.dev) · [Tailwind CSS v4](https://tailwindcss.com) · [Zod](https://zod.dev) · deployed on [Vercel](https://vercel.com).

## Contributing

Issues and PRs are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the short version. For anything security-related, please follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
```

Optional: copy `.env.example` to `.env` and set `PUBLIC_GA_ID` if you want analytics in your own deployment.

## License

MIT © [Daniel Avila](https://danielavila.me)
