# Security Policy

## Reporting a vulnerability

If you believe you've found a security issue in Claudeculator, please **do not open a public GitHub issue**. Instead, email the details to:

**dan.avila7@gmail.com**

Include:
- A description of the issue and its impact
- Steps to reproduce (a minimal repro is ideal)
- Any suggested mitigation, if you have one

You can expect an acknowledgement within a few business days. Once the issue is confirmed and a fix is available, the patch will be released and credit given (unless you prefer to remain anonymous).

## Scope

Claudeculator is a static, client-side web app. It has no backend, no user accounts, and stores no user data. The `settings.json` you build never leaves your browser.

In-scope reports include:
- XSS, CSRF, or any client-side injection vector in the calculator UI
- Issues with the generated `settings.json` that could trick a user into producing an unsafe Claude Code configuration without warning
- Supply-chain concerns about the dependencies declared in `package.json`

Out of scope:
- Reports that depend on the user manually pasting an unsafe configuration into their own Claude Code setup (that's the entire point of the calculator — to surface those tradeoffs)
- Findings against third-party services the project links to (aitmpl.com, etc.)
- Lack of rate limiting, CAPTCHA, or similar — there is no server to attack

## Secrets

There are no server-side secrets in this project. The only environment variable, `PUBLIC_GA_ID`, is a Google Analytics measurement ID that is public by design (it is embedded in the page source for any visitor). If you find anything resembling a credential committed to the repository, please report it via the email above.
