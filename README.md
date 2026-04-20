# Claudeculator

> La calculadora de configuraciones de Claude. Arma tu `settings.json` y mide **seguridad**, **tokens** y **eficiencia** en tiempo real.

![Astro](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-black)

---

## ¿Qué es?

**Claudeculator** es una SPA construida con Astro que te deja armar interactivamente la configuración de Claude Code y, mientras lo haces, te muestra tres medidores clave:

- **Rango de seguridad** — qué tan restrictiva (o peligrosa) es tu config.
- **Utilización de tokens** — cuántos tokens vas a consumir por sesión típica.
- **Eficiencia de respuesta** — el tradeoff entre velocidad, calidad y costo.

El resultado final es un `settings.json` listo para pegar en `~/.claude/` o en el `.claude/` de tu proyecto, junto con una estimación clara de su consumo de tokens.

## Features

- Constructor visual de `settings.json` (modelo, permisos, hooks, MCP servers, env vars, status line)
- Medidor de **seguridad** (0–100) basado en allow/deny/ask y hooks de validación
- Estimador de **consumo de tokens** por sesión, por mes y costo aproximado en USD
- Índice de **eficiencia de respuesta** (latencia × calidad × costo)
- Export: **copiar al portapapeles** o **descargar** el `settings.json`
- 100% client-side — sin backend, sin telemetría, sin cuentas
- Dark theme estilo Vercel, responsive, optimizado para teclado

## Stack

- [Astro 5](https://astro.build) con arquitectura de islands
- [React 19](https://react.dev) para la isla interactiva principal
- [Tailwind CSS v4](https://tailwindcss.com) + tema dark estilo Vercel (Geist Sans + Geist Mono)
- [Zod](https://zod.dev) para validar el schema de `settings.json`
- Deploy en [Vercel](https://vercel.com)

## Las 3 métricas — cómo se calculan

### Seguridad (0–100)

Suma puntos por:
- Denylists explícitas de comandos destructivos (`rm -rf`, `git push --force`, `--no-verify`)
- Hooks `PreToolUse` que validan tool calls
- Permisos restrictivos (`ask` por defecto, allowlists específicas)

Resta puntos por:
- `allow: ["*"]` o permisos demasiado amplios
- `--dangerously-skip-permissions`
- Ausencia de hooks de validación
- MCP servers de terceros sin auditar

### Tokens

Estima consumo según:
- **Modelo** — Opus 4.7 (1M context), Sonnet 4.6, Haiku 4.5
- **Thinking budget** — extended thinking activo y su tope
- **Prompt caching** — reducción del 90% en tokens cacheados
- **Context típico** — tamaño promedio de conversaciones en tu setup
- **Overhead** — hooks, status line, MCP servers que inflan cada request

Salida: `tokens/sesión`, `tokens/mes`, `costo USD estimado`.

### Eficiencia (0–100)

Combina:
- Latencia esperada del modelo
- Ratio calidad/costo
- Overhead de hooks síncronos y MCP servers
- Penalización por configs que saturan el context window

## Cómo usar la app

1. Visita la URL de Vercel (próximamente)
2. Selecciona modelo → permisos → hooks → MCPs
3. Observa los 3 medidores actualizarse en vivo
4. Copia o descarga tu `settings.json`
5. Pégalo en `~/.claude/settings.json` (global) o `.claude/settings.json` (proyecto)

## Desarrollo local

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build
pnpm preview
```

## Roadmap

- [x] Setup repo + README
- [ ] Scaffolding Astro + Tailwind + tema Vercel
- [ ] Constructor de `settings.json` (modelo, permisos, hooks, MCP, env)
- [ ] Motor de cálculo de las 3 métricas
- [ ] Export (clipboard + download)
- [ ] Deploy en Vercel

## Licencia

MIT © [Daniel Avila](https://danielavila.me) — 2026
