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

## Maven POM parse fix (2026-11-01)

- Branch: `feature/game-settlement-wallets`
- Change: removed the blank line before the XML declaration in `pom.xml`; Maven rejects an XML declaration that is not at the start of the document.
- Files changed: `pom.xml`, `SECURITY_UPDATE_LOG.md`.
- Baseline build: `mvn -s work/maven-settings.xml -B --no-transfer-progress clean verify` **FAILED** before compilation because the POM was not parseable (`processing instruction can not have PITarget with reserved xml name`, line 2).
- Post-change results: after network access was granted, `mvn -s work/maven-settings.xml -B --no-transfer-progress -e -DskipTests compile` exited successfully but reported `Nothing to compile`; it did not confirm source compilation. `mvn -s work/maven-settings.xml -B --no-transfer-progress clean verify` and `mvn -s work/maven-settings.xml -B --no-transfer-progress -e test` **FAILED / BLOCKED** by Windows `AccessDeniedException` while javac closed a dependency JAR; clean also could not remove `target`. No backend test passed. The project build configuration defect is fixed, but full verification remains blocked by this host's filesystem/JAR access.
- Correctness review: XML declaration now starts at byte zero; no dependencies, source APIs, or database schema changed.
- Security review: no runtime or security behavior changed.
- Merge/deployment: not merged or deployed; production unchanged.

## Settlement refund, lock ordering, and verification tests (2026-11-01)

- Branch: `feature/game-settlement-wallets`
- Change: serialize platform funding idempotency checks on the locked wallet row; align bet placement locks to round-before-user; cancel and refund all stakes when a single-player round cannot fund its reward; add V7 constraints for cancellation/refund records.
- Files changed: `SystemWalletService.java`, `BetService.java`, `Bet.java`, `GameRound.java`, `V7__support_cancelled_round_refunds.sql`, `DemoApplicationTests.java`, `colorwin-frontend/src/App.jsx`, and new `SystemWalletServiceTest.java`, `BetSettlementServiceTest.java`, `GameSettlementAuthorizationTest.java`, `SettlementMigrationIntegrationTest.java`, `FundingIdempotencyConcurrencyIntegrationTest.java`.
- Business rule: if a single-player reward exceeds Platform Wallet balance, persist the already drawn round result, mark each bet `CANCELLED`, return the full stake once per user in the same database transaction, and mark settlement `CANCELLED`. No wallet debit or commission is recorded.
- Tests/build: `npm ci --cache=../work/npm-cache` **PASSED** (Node 22.12 emitted engine warnings for ESLint 10 packages requiring Node 22.13+). `npm run build` **PASSED**. `npm run lint` **FAILED** with 11 errors and 2 warnings on existing unrelated effect/unused-variable lines; no reported issue was on the new refund UI lines. `npm audit --omit=dev` **PASSED**, reporting 0 production dependency vulnerabilities; the complete dependency tree reports moderate development-tool advisories. Backend `mvn -s work/maven-settings.xml -B --no-transfer-progress "-Dmaven.compiler.fork=true" test-compile` **FAILED before tests ran**: javac 21.0.8 threw `AccessDeniedException` while closing `spring-boot-starter-json-3.4.5.jar`, then test compilation reported missing main classes. `clean verify` was also blocked by the same host filesystem access behavior. WSL execution was denied by the host. Backend unit, migration, and authorization tests have not been observed passing. `git -c core.whitespace=cr-at-eol diff --check` **PASSED**.
- Correctness review (final diff): checked arithmetic and rounding paths, atomic wallet/user ledger writes, lock ordering, row locks, replay protection, idempotency constraints, settlement/refund amounts, migration check constraints, and the polling/API/UI handling of `CANCELLED`. No unresolved critical/high correctness finding identified. PostgreSQL tests remain unexecuted, so runtime/migration behavior is not confirmed.
- Security review (final diff): checked `/api/admin/**` `ROLE_ADMIN` boundary, authentication/authorization test coverage, positive amount and bounded request ID validation, wallet row serialization, unique ledger keys, transaction rollback behavior, parameterized migration tests, and frontend dependency audit. No unresolved critical/high issue identified in changed code. Moderate development-tool dependency advisories remain; production dependency audit reports zero vulnerabilities. GitHub workflow/account settings were not accessible for live verification.
- Remaining risks: backend tests, migration application, authorization tests, full frontend lint, GitHub workflow runs, branch protection, Dependency Graph/Review, production Environment approval, and Render deploy controls remain unverified. No merge or production deployment.
- Follow-up in this change: cancellation now also sets the round lifecycle status to `CANCELLED` (with V7 allowing that status), so cancelled results are excluded from the existing public results feed. The authorization test uses Spring Boot 3.4's `@MockitoBean`; tests remain pending.
- Frontend compatibility update: bet-result polling now treats `CANCELLED` as terminal, refreshes the account balance, and displays the returned stake as a refund. Frontend build/lint and backend tests remain pending.
- Additional regression coverage: a PostgreSQL-backed concurrent duplicate-funding test asserts one success and exactly one wallet credit; migration test period numbers now fit the existing 40-character schema limit. These database tests require the ephemeral PostgreSQL service in Backend CI.
- Refund UI refinement: cancelled stake returns use the positive balance direction indicator.
- Local verification artifacts are excluded from version control using narrow `/work/...` ignore entries; no project source or dependency manifest is ignored.

## CI failure diagnosis and fixes (2026-11-01)

- Branch: `feature/game-settlement-wallets`; PR #1 remains draft.
- The GitHub API push updated the feature branch to `de1bdc4c11002761ebf59aa0c42d79b2f98113fd`; Vercel preview status was observed successful at `https://color-wins-git-feature-game-settlement-wallets-colorwin.vercel.app`. Production and `main` were not changed.
- Observed GitHub Actions failures for that commit:
  - Backend CI failed in test compilation because `ReflectionTestUtils.invokeConstructor` is not part of the Spring Test API in the resolved dependency version. The test now constructs the protected JPA no-arg constructor reflectively.
  - CodeQL build failed with `release version 21 not supported`; the job did not select Java 21. Added the same Temurin Java 21 setup used by Backend CI before invoking Maven.
  - Gitleaks failed before scanning because its Docker container's Git considered `/github/workspace` unsafe due to ownership. Added Git's per-process `safe.directory` environment configuration to the container step.
  - Dependency Review failed because GitHub reports Dependency Graph is disabled for this repository. This repository-level setting cannot be enabled by a workflow file; it remains an external prerequisite.
- Local verification before these fixes: frontend `npm run build` **PASSED**; `npm run lint` **FAILED** with 11 errors and 2 warnings in existing frontend lint findings; Maven `clean verify` was blocked by host access restrictions (`target` cleanup denied and Java could not access a dependency JAR). GitHub Linux CI supplied the actionable test compile failure above.
- The fixes in this entry still require a new GitHub Actions run. No check is claimed to pass after these changes until that run is observed.
- Correctness/security review of the proposed fixes: test-only reflective access is confined to the JPA test fixture; CodeQL runs on the configured project JDK; the Gitleaks safe-directory setting is scoped to the isolated scan container and does not weaken host or repository Git trust globally. No settlement API, authorization rule, wallet arithmetic, or database schema changed.
- Final correctness review of this diff: validated the protected JPA constructor fixture against the entity, the Java 21 compiler target against `pom.xml`, and the Gitleaks step's container path and scan command. No transaction, concurrency, idempotency, settlement, migration, or API behavior changed; no correctness issue found.
- Final security review of this diff: `setup-java` runs with the existing read-only workflow token; Git's safe-directory exception is passed only to the isolated Gitleaks container for its mounted checkout; reflective access exists only in the test fixture. No authentication, authorization, privilege, injection, secret, or double-spend boundary changed; no critical/high security issue found.
- Remaining blockers: Dependency Graph must be enabled in GitHub settings; frontend lint debt remains. No merge or production deployment.
- Local post-fix verification: `npm run build` **PASSED**. `npm run lint` **FAILED** with the same 11 errors and 2 warnings, in existing effect patterns and unused-variable findings. Backend `mvn -s work/maven-settings.xml -B --no-transfer-progress test` **FAILED / BLOCKED** before test execution because Windows javac could not access the cached `spring-boot-starter-json-3.4.5.jar`; the Java test compilation result is therefore not established locally. A new Linux CI run is required to verify the test-constructor fix and workflow updates.
