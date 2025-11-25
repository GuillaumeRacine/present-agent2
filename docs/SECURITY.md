# Security and Secrets Policy

- Keep all real API keys and credentials in local `.env.local` files only.
- Never commit real secrets to the repository (public or private).
- Use `.env.local.example` as the template to share variable names and guidance.
- Rotate keys immediately if they are ever exposed or suspected to be exposed.
- Prefer alias support in code (e.g., `NEO4J_USERNAME` or `NEO4J_USER`) over hardcoding values.
- Use `npm run env:check` to verify configuration and connectivity without printing secrets.

Local safeguards (recommended):
- Enable pre-commit hooks to block committing `.env.local` or secrets (see `scripts/precommit-sample.sh`).
- Limit shell history exposure: export secrets in files, not directly in the shell.

If you need to share configuration:
- Share only the example file contents or redacted values.
- Never paste real keys into issues, PRs, or docs.
