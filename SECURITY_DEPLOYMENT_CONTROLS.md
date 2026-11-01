# ColorWin CI, Security and Deployment Controls

## Automated checks added

- `.github/workflows/backend-ci.yml`: Java 21 Maven `clean verify` against an ephemeral PostgreSQL 16 service for pull requests to main and pushes to main/feature branches; test reports are retained as an artifact.
- `.github/workflows/security.yml`: CodeQL Java analysis with an explicit Maven build, Gitleaks history scan, dependency review on pull requests (fails on high/critical dependency severity), and weekly CodeQL scans.
- `.github/dependabot.yml`: weekly Maven and GitHub Actions dependency update pull requests.
- `.github/workflows/production-deploy.yml`: manual production deployment workflow. It re-runs backend verification against ephemeral PostgreSQL and then requires approval from the GitHub `production` Environment before calling Render.

## One-time GitHub settings required

These repository settings cannot be safely enabled by a source-code commit and must be configured in GitHub:

1. **Branch protection:** Settings → Branches → Add branch protection rule for `main`.
   - Require a pull request before merging.
   - Require 1 approving review (if a second reviewer is available).
   - Require status checks to pass before merging.
   - Select the exact checks after their first successful run: `Backend build and tests`, `CodeQL Java security analysis`, and `Dependency vulnerability review`.
   - Require branches to be up to date.
   - Block force pushes and deletion.
   - Do not allow bypassing the rules for normal contributors.
2. **Production approval:** Settings → Environments → create `production`; add at least one required reviewer; prevent self-review where available.
3. **Render:** disable automatic deploys from GitHub for the production service. Configure production deploys to be initiated only by the approved workflow.
4. **Deploy secret:** add `RENDER_DEPLOY_HOOK_URL` as an Environment secret under `production`, not as a repository-wide secret. Never commit the hook URL.
5. **GitHub security features:** enable secret scanning and push protection if available for this repository plan; enable Dependabot alerts and the dependency graph.

## Important limitations / current status

- Adding workflow files does not itself enable branch protection, Environment reviewers, Render settings, secret scanning, or push protection.
- The deployment workflow only triggers Render when manually dispatched from `main`, after tests pass and the `production` Environment approval is granted. Existing Render auto-deploy must be disabled separately or it can bypass this gate.
- The Maven workflow executes the tests that exist in the repository. It does not create meaningful business-logic tests by itself; settlement, wallet, authorization, and migration integration tests must be added and observed passing before this feature is approved.
- A green CodeQL/dependency check is not a penetration test and does not prove the application is unhackable.
- Do not merge or deploy this feature while required checks are missing, failing, or unreviewed.
