# Backgammon TS Game (with Optional Gemini AI)

A browser-based backgammon game built with TypeScript, HTML5 Canvas, and CSS.

Play human vs computer with multiple difficulty levels, animated dice, match scoring, move-revert support, and optional Gemini-assisted computer move selection.

## Features

- Full backgammon board logic:
  - entering from the bar
  - hits and bar handling
  - bearing off
  - forced move usage (uses as many dice as possible)
  - gammon and backgammon scoring
- Opening roll flow to determine who starts as White
- Human vs computer play on one board
- Difficulty levels:
  - Easy
  - Medium
  - Hard
  - Extra Hard
  - World Champ
- Optional move advice on Easy mode
- Match scoring across games (Continue Series)
- Revert current turn moves
- Animated dice and win/loss overlay messages
- Optional Gemini integration for computer move decisions

## Project Structure

- `backgammon.html` - main page and UI controls
- `style.css` - game styling and board theme variables
- `src/app.ts` - full game logic and rendering
- `dist/app.js` - compiled JavaScript used by the browser
- `tsconfig.json` - TypeScript compiler configuration

## How to Play (UI)

- **New Game**: starts a new match and asks for player names.
- **Roll Dice / Roll Overlay button**: rolls for opening or for your turn.
- **Revert Moves**: restores board state to the start of your current move phase.
- **Continue Series**: starts the next game while keeping match points.
- **Difficulty**: changes computer strategy level.
- **Gemini: ON/OFF**: enables or disables Gemini move selection.
- **API Key** field: optional Gemini API key input (saved in browser localStorage).

## Gemini Integration (Optional)

If an API key is provided, the computer can query Gemini for move sequences (depending on difficulty and position complexity). If Gemini is unavailable or returns invalid output, the game falls back to local AI logic automatically.

### Setup

1. Get a Gemini API key.
2. Paste it into the **API Key** field in the game UI.
3. Keep **Gemini: ON** enabled.

Notes:

- API key is stored locally in your browser (`localStorage`).
- The game calls:
  - `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`

## AI Difficulty Notes

- **Easy**: random legal move sequence.
- **Medium/Hard**: heuristic search (`evaluateEnhanced`).
- **Extra Hard**: one-ply plus opponent rollout sampling.
- **World Champ**: deeper rollout with sampled counter-response.
