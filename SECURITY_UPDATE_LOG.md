# ColorWin Security & Update Log

## Mandatory change-control policy

Every future code update must follow this sequence before it is considered complete:

1. **Pre-change review:** inspect the target code, callers, database schema/migrations, API contracts, authentication/authorization, and affected flows.
2. **Implement one scoped change** on a feature branch. Do not push unverified work to `main`.
3. **Test run:** execute the relevant automated tests and backend build (and frontend build/tests when applicable). For database changes, validate migrations against a disposable test database and test rollback/upgrade compatibility where feasible.
4. **Code review #1:** correctness, edge cases, transaction boundaries, concurrency, idempotency, data integrity, and compatibility.
5. **Code review #2:** independent security-focused pass covering authentication/authorization, input validation, injection/abuse, privilege escalation, replay/double-spend, secrets, and sensitive data exposure.
6. Fix findings, rerun affected tests, and repeat both reviews for the final diff.
7. Update this log with commit, files, tests and exact results, both review outcomes, unresolved risks, and deployment status.
8. Merge/deploy only after required tests pass and both reviews have no unresolved critical/high findings. Never claim a test or review passed unless it was actually run and observed.

If automated test execution is unavailable, mark it **NOT RUN / BLOCKED** and do not merge or deploy. A review is not a substitute for tests. No process can guarantee that software is impossible to hack; the goal is to reduce risk through layered controls and verification.

## Existing work status (2026-11-01)

Branch: `feature/game-settlement-wallets`  
Pull request: #1 (draft; not merged)  
Production: unchanged by this branch.

| Change | Status |
|---|---|
| Settlement, commission, wallet entities/services/controller and V6 migration | Implemented on feature branch; not build-verified |
| Commission audit history and Java syntax corrections | Implemented; tests not run |
| Single-player per-bet payout allocation correction | Implemented; tests not run |
| No-winner pool credit separated from commission amount | Implemented; tests not run |
| Admin-only Platform Wallet manual funding endpoint | Implemented with request-id duplicate guard; tests not run |
| Platform Wallet funding UI and transaction history UI | Not implemented |
| Insufficient Platform Wallet settlement handling | Not implemented; unresolved blocker |
| Code review pass #1 on complete final diff | Not completed |
| Independent security review pass #2 on complete final diff | Not completed |
| Backend build / automated tests / migration tests | Not run / not verified |

## Verification record

No successful build, test suite, migration test, penetration test, or independent two-pass review is claimed for the changes listed above. They must be run before PR #1 can be approved or deployed.

## Per-change record template

For every subsequent change, append:
- Date/time:
- Change and reason:
- Branch / commit:
- Files changed:
- Tests run and exact results:
- Code review #1 findings:
- Security review #2 findings:
- Fixes and retest results:
- Remaining risks:
- Merge/deployment status:

## CI / security / deployment controls update (2026-11-01)

- Branch: `feature/game-settlement-wallets`
- Pull request: #1 (draft; not merged)
- Added:
  - `.github/workflows/backend-ci.yml`: Java 21 Maven `clean verify`, ephemeral PostgreSQL 16 service, test report artifact.
  - `.github/workflows/security.yml`: CodeQL Java scan using explicit Maven build, Gitleaks full-history secret scan, dependency review (high severity threshold), weekly scan schedule.
  - `.github/dependabot.yml`: weekly Maven and GitHub Actions dependency update PRs.
  - `.github/workflows/production-deploy.yml`: manual main-only Render deploy hook workflow; repeats tests against ephemeral PostgreSQL; protected `production` environment approval; bounded HTTP request timeout.
  - `SECURITY_DEPLOYMENT_CONTROLS.md`: required manual GitHub / Render settings.
- Initial observed CI run for earlier workflow revision:
  - Backend CI: **FAILED**. Existing `DemoApplicationTests.contextLoads` could not load Spring context because CI had no configured datasource / PostgreSQL. Workflow revised to supply ephemeral PostgreSQL; revised run result still pending/not observed at time of this entry.
  - CodeQL: **FAILED**. Automatic build could not complete; workflow revised to explicit Maven build; revised run result still pending/not observed at time of this entry.
  - Dependency review: **FAILED / BLOCKED** because GitHub reports Dependency Graph is disabled for this repository. Enable Dependency Graph in repository Settings → Security & analysis before expecting this check to pass.
- Code review #1 (workflow correctness): reviewed triggers, job dependencies, Java 21/Maven commands, PostgreSQL health check, artifact retention, CodeQL manual build, PR dependency review, manual main-only deployment, Environment approval dependency, and Render hook timeout. No workflow logic defect identified in the reviewed revision; CI rerun remains required.
- Code review #2 (security): reviewed workflow permissions, PR-only dependency review, no privileged `pull_request_target`, no production secret in source, production secret scoped to the `production` Environment, manual deployment, and Gitleaks scan. No critical/high workflow-level issue identified in the reviewed revision. Residual risk: third-party Actions are referenced by major-version tags rather than immutable commit SHAs; repository settings and Render auto-deploy configuration remain external prerequisites.
- Manual controls not yet confirmed enabled: main branch protection / required status checks, GitHub Dependency Graph, secret scanning and push protection (if available), production Environment reviewer and `RENDER_DEPLOY_HOOK_URL` secret, Render auto-deploy disabled.
- Tests / revised workflow outcomes: **PENDING / NOT VERIFIED**. No merge or deployment authorized.
- Production status: unchanged by this update.
