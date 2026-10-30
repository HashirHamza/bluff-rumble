# Bluff Rumble

### Trust your gut. Fool your friends.

A multiplayer party game where believable lies win points. Write convincing fake answers, uncover the truth, and outsmart your friends.

🎮 **[Play Bluff Rumble](https://YOUR-NETLIFY-URL.netlify.app)**

## About the Game

Bluff Rumble supports 2–8 players joining from their own devices using a room code. Each round presents a question, players submit fake answers, and everyone tries to identify the truth among the bluffs.

Play with friends or practise against bots.

## Features

- Multiplayer rooms with easy room-code joining.
- Responsive interface for phones, tablets, and laptops.
- 500 questions covering funny facts, tricky questions, general knowledge, and riddles.
- Customizable matches with 3, 5, 7, or 10 rounds.
- Adjustable bluff and voting timers.
- Up to seven bots, with eight total players per room.
- Solo practice with bots.
- Round results, scoreboards, and final winners.
- No repeated questions within a room until the question bank is explicitly reset.

## How to Play

1. **Create a room:** Enter your name and choose the rounds, timers, and number of bots.
2. **Invite your friends:** Share the room code so they can join from their devices.
3. **Write your bluff:** Submit a believable fake answer to the question.
4. **Find the truth:** Choose the answer you think is correct.
5. **See the reveal:** Discover who fooled whom and check the scores.
6. **Take the crown:** Finish with the highest score to win.

For two-player games, additional game-written decoys keep the voting challenging.

## Scoring

| Action | Points |
| --- | ---: |
| Choose the correct answer | 1,000 |
| Submit a recognized correct answer | 1,000 |
| Fool an opponent with your bluff | 500 per opponent |

Recognized correct submissions skip voting. Identical bluffs are merged, and each author earns points when an opponent selects that bluff. Players cannot vote for their own bluff. Tied leaders share the victory.

## Technology

- **Frontend:** HTML, CSS, and JavaScript.
- **Backend:** TypeScript Netlify Function.
- **Storage:** Netlify Blobs with strong consistency.
- **Concurrency:** Conditional writes using ETags, with conflict retries.
- **Hosting:** Netlify.

The frontend communicates directly with `/.netlify/functions/game`. Timers and bots advance through player polling without a continuously running server.

Bots use curated bluffs and random eligible votes; they do not use a generative AI service.

## Project Structure

    public/                     Frontend source
    dist/                       Production frontend
    netlify/functions/game.ts   Netlify Function entry point
    lib/                        Backend and storage helpers
    content/                    Editable question sources
    engine.mjs                  Game rules and scoring
    questions.json              500-question bank
    tests/                      Function and integration tests
    netlify.toml                Netlify configuration
    VERIFICATION.md             Test results and scope

## Deployment

The game is hosted on Netlify:

**[Open the live game](https://YOUR-NETLIFY-URL.netlify.app)**

For a separate deployment, import this repository into Netlify. The included `netlify.toml` configures the build command, frontend output, and function directory.

No project-specific API keys or manual database setup are required. Netlify supplies access to Blobs through its runtime.

## Verification

All 32 automated checks passed, including:

- Game rules, scoring, settings, and bot behavior.
- Retry handling and concurrent room updates.
- Production build and packaged Netlify Function.
- A complete three-round, two-player match with verified scores and a final winner.

See [VERIFICATION.md](./VERIFICATION.md) for details and testing limitations.

## Source Code

[View the GitHub repository](https://github.com/YOUR-GITHUB-USERNAME/bluff-rumble)
