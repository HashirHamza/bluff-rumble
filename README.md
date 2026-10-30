# Bluff Rumble — Netlify-ready game

The current design, 500 questions, room codes, scoring, configurable rounds/timers, bots, and solo practice are preserved. The continuously running backend has been replaced by a standard Netlify Function and durable Netlify Blobs storage.

## Publish without GitHub or a terminal

1. Download `netlify-ready-game.zip` and extract it. The extracted project folder must contain `netlify.toml` and `package.json` directly.
2. Sign in to Netlify and use the **new-project drag-and-drop upload**. Drop the whole extracted project folder, not just `dist`, `public`, or the inner function ZIP.
3. Let Netlify complete its install, build, function packaging, and deployment. Open the resulting site, create a room, and join its code on another device.

Netlify's signed-in new-project upload supports projects that need a build step. This flow is required for the TypeScript function. Anonymous static uploads and an existing site's static output dropzone do not provide the same build flow. Netlify's current instructions say to extract ZIPs before dragging the project folder; a raw ZIP upload is not guaranteed by those instructions. No GitHub repository, terminal commands, user-entered environment variables, API keys, or manual database creation are required. Normal Netlify sign-in is required.

Official deployment instructions: https://docs.netlify.com/deploy/create-deploys/#drag-and-drop

## Included

- Root `netlify.toml`, `package.json`, `package-lock.json`, `.nvmrc`, and `tsconfig.json`.
- Frontend source in `public/` and prebuilt frontend in `dist/`.
- Exactly one function source entry: `netlify/functions/game.ts`.
- Helpers outside the functions directory, in `lib/`.
- The unchanged game engine, 500-question bank, and editable question sources.
- The prepackaged Netlify function ZIP and function manifest in `artifacts/functions/`.
- An inspectable self-contained production module in `artifacts/game.mjs`.
- Automated engine, function, concurrency, SDK, and packaged-function tests.
- Verification results in `VERIFICATION.md`.

The frontend calls `/.netlify/functions/game` directly. There is no `config.path`, API redirect, custom endpoint alias, or continuously running backend in this deployment project. Only `dist/` is published, so the answer bank, source code, tests, and function internals are not exposed as static assets.

## Storage and concurrency

A site-wide Netlify Blobs store is opened automatically using Netlify's runtime context. Reads use strong consistency. Creation uses `onlyIfNew`; every room update uses the ETag from the preceding read as `onlyIfMatch`. A losing write re-reads and re-applies the action instead of overwriting a newer room. Busy conflicts return an error rather than acknowledging an uncommitted action.

Mutation request IDs provide retry receipts so duplicate submissions, joins, starts, and votes do not execute twice. New-room creation is also idempotent. Private session tokens, correct answers, and bot scheduling remain server-side. The public state contains only the current player's eligible ballot and permitted information.

Timers and bots advance during player polling. When a function wakes after a quiet period, it replays overdue timer and bot events in deadline order, preserving rounds, scores, pauses, and disconnect handling without background processes or scheduled jobs. Rooms expire logically after 24 hours of inactivity; old blobs are not automatically deleted. No project-specific credentials are embedded in this ZIP.

## Play

Create game comes first. The host chooses 3/5/7/10 rounds, 20/40/60/90 seconds for bluffs, 10/20/30/45 seconds for votes, and 0–7 bots, with eight total seats maximum. One human can practise against bots. Settings can be changed while idle, and lock during a match.

Find the truth for 1,000 points. Earn 500 for each opponent fooled. Correct written answers get the truth bonus and skip voting. Duplicate bluffs merge and their authors cannot select them. Ties share victory. Bots use curated bluffs and random eligible votes, rather than a generative AI service. No repeat questions occur within a room until an explicit reset near bank exhaustion. New rooms have independent histories.

## Verification scope

The production build and actual packaged function ZIP have been tested locally with Netlify's SDK and local Blobs implementation. A complete three-round, two-player game verified a 4,500–0 result and the final winner. Conflict/idempotency tests use an atomic compare-and-swap test store, and the SDK adapter's strong-consistency and conditional-write options are checked separately. The SDK's local filesystem emulator is used sequentially for SDK-backed full-match tests; it is not treated as proof of production concurrency behaviour.

No deployment to your Netlify account has been performed. The first live Netlify deployment still needs its normal cross-device smoke test. The existing responsive design checks are retained; the HTML, CSS, engine, and question-bank files match the prior version exactly. Only the frontend transport changed.
