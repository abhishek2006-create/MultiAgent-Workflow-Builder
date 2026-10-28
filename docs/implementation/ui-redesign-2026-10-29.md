# FlowForge visual redesign — 29 October 2026

## Design direction

The landing composition is inspired by [Longwave by Elux Space](https://dribbble.com/shots/27760098-Longwave-Creative-Agency-Immersive-Hero-Experience): cinematic depth, industrial architecture, oversized metallic type and a warm start interaction.

The application system is inspired by [Hangar by Barly Design / Uxerflow](https://dribbble.com/shots/27721298-Hangar-AI-Agent-Website-Integration): charcoal surfaces, fine borders, editorial headings, warm yellow accents and isometric connection graphics. These references were inspected in the browser. No Dribbble artwork or video is shipped in the application.

## Implementation

- `LandingPage.tsx` replaces the introductory page with a functional product landing: builder links, system overview, feature cards, template entry point, native FAQ disclosure and footer links.
- `ForgeScene.tsx` lazily loads Three.js for an original procedural city and orbital signal. GSAP handles entrance/reveal motion. The scene supports pause/resume, reduced motion, visibility-based rendering suspension, capped pixel ratio, resource disposal and a CSS fallback when WebGL is unavailable.
- `studio.css` supplies the shared visual system for navigation, dashboard, workflow lists, templates, approvals, history, provider/workspace settings, login/signup, dialogs and the workflow canvas.
- The editor retains its existing actions. Palette and inspector remain available on mobile instead of disappearing. The canvas refits when layout dimensions or the node count change, including when the execution console appears.
- Edge colors and node handles follow the new palette; routing, statuses, approval decisions and persisted data retain their existing meaning.
- Three.js is loaded only by the landing component; workflow execution does not depend on WebGL. No wallet/Web3 connection is required.
- Reference-inspired isometric graphics are authored in SVG/CSS. Fonts use system/Georgia fallbacks if Google Fonts cannot load.

## Verification

- Full deterministic suite: 57 API, 13 frontend and 27 Python tests passed.
- Isolated PostgreSQL/API integration passed: workflow versions, parallel branches, approval, retry, cancellation, worker recovery, real dashboard data and tenant isolation. AI is mocked in that integration test.
- Browser: temporary-account sign-in; template JSON import; rename and Save to version 2; validation; real calculator run returning 1048; approval and completed history; actual dashboard count/success-rate updates; JSON export download; provider/workspace settings.
- Responsive checks used a 390 px viewport: no document overflow, and both palette and inspector remain available. Normal desktop viewport was restored afterward.
- Production build, frontend lint and TypeScript checks were performed. No provider generation was needed for the calculator browser test.

## Local preview note

An unrelated application occupied local port 3001 during verification. FlowForge was run with process-only overrides `API_PORT=3101` and `API_INTERNAL_URL=http://127.0.0.1:3101`; environment files were not changed. The ordinary setup instructions still use API port 3001. No deployment was performed.

## Finishing pass

The landing scene now pauses without recreating its WebGL renderer. Shared GSAP animations clean up on navigation and respond to changed reduced-motion preferences. A keyboard skip link and themed loading, 404 and recoverable-error pages complete the navigation states.

Local browser use was disabled in Work settings before final screenshots could be saved. Earlier browser checks are recorded above; final visual capture remains unverified. No screenshot paths were added to the README.

The finishing-pass frontend tests, lint and TypeScript checks passed. Final screenshots could not be captured after browser access was disabled. The final production HTTP checks passed for the landing page and its JS/CSS assets, themed 404, unauthenticated route protection, authenticated dashboard/workflows/templates/approvals/settings/history, persisted metrics and logout. The temporary test account and its workflow were removed afterward.


## Hydration and OAuth follow-up

The persistent layout no longer animates `#app > *`, because streamed route children may not have hydrated when the layout effect runs. Route transitions now animate a ref-owned decorative overlay only. Auth pages also no longer change GSAP's global timeline speed for reduced-motion users.

Local OAuth callbacks previously used port 3001 and an incomplete callback path. Local API environment files now use frontend-proxy callbacks on port 3002. Provider strategies derive their default callback from `WEB_ORIGIN` instead of a hardcoded API port; explicit production callbacks remain supported. GitHub/Google provider account registrations must match these public URLs. The authorization redirect headers and denied-callback return route were verified locally without authorizing a provider account. Browser console verification remains unavailable while local browser use is disabled.

Regression verification: 59 API tests and 14 frontend tests passed, plus lint and TypeScript checks.

The production build passed after the hydration/OAuth fixes. The operator confirmed saving the GitHub OAuth app callback as `http://localhost:3002/api/auth/github/callback`. Full interactive provider sign-in has not been retested by the agent.

## Landing-first sign-in

Successful email login/registration automatically opens `/`, and Google/GitHub success callbacks return to the same landing page. Previous protected-route `next` parameters no longer override that destination. A Home navigation link is shown for signed-in and signed-out visitors, with a separate Home control on standalone login/signup screens. Verification: 60 API tests, 14 frontend tests, lint, TypeScript and HTTP checks for Home controls on `/`, `/login` and `/signup` passed.
