# Contributing

Thanks for taking the time to look at Claudeculator. Issues and pull requests are welcome.

## Before you open a PR

1. Open an issue first if you're planning a non-trivial change — it's much easier to align on direction before you spend time writing code.
2. Keep PRs focused. One change per PR makes review faster.
3. Make sure `npm run build` succeeds locally.

## Local setup

```bash
git clone https://github.com/davila7/claudeculator.git
cd claudeculator
npm install
npm run dev
```

The dev server runs at `http://localhost:4321`.

## What kind of changes are most useful

- **Calculator accuracy** — if you spot a scoring rule (security, tokens, efficiency) that doesn't match real-world Claude Code behavior, please open an issue with a concrete repro and the model/setting involved.
- **New presets** or refinements to existing ones.
- **UI/UX polish** — accessibility fixes, keyboard navigation, mobile layout issues.
- **Documentation** — clearer copy in the wizard, README improvements, examples.

## What's out of scope

- Adding a backend, user accounts, or anything that requires the `settings.json` to leave the browser. The "no server" guarantee is a feature.
- Pulling in heavy UI frameworks. The stack is intentionally small (Astro + a single React island + Tailwind).

## Reporting security issues

Please do not file public issues for security problems. See [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
