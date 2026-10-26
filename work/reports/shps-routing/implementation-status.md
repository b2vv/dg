# Router v2 implementation status

## Зроблено
Read the implementation brief, referenced plan/spec, standards and renderer seams.
Added initial validation tests in `packages/sdk/src/layout/staff/routing/validateRouteInput.test.ts` before implementation. Production implementation has not started.

## Перевірені сценарії
No tests executed. The rstest invocation failed before compilation, so this is not RED evidence.

## Гейти
`npm run test -w @org-hierarchy/sdk -- validateRouteInput.test.ts`: exit 1, `listen EPERM: operation not permitted ::1:3000`.
Full SDK tests, typecheck, lint and docs gate have not passed. The new test intentionally references the not-yet-created validation module.

## Обмеження
The installed rstest/Rsbuild requires a local port probe even in middleware mode. The session sandbox forbids it; approval policy is `never`.
A clarification is pending: the constructive layout guarantee needs coordinates shared by cards/contours/routes, but the brief restricts integration to a paint seam after contours have been painted.

## Залишилось
Resume RED-first in an environment permitting the rstest port probe. Resolve the layout seam, then implement validation, obstacle routing, corridor allocation, constructive router, render handoff and fallback; verify all acceptance fixtures and required gates.
See `scratchpad/codex-router-v2.md` for the durable progress log.

## Ризики
This is an incomplete test-first worktree, not a deliverable. No production code, legacy router, or probe files changed. No commits made.

## Post-deploy
Not applicable: nothing deployed.
