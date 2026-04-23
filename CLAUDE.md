# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Play Cacheta** is a **Truco** card game (trick-taking, not Gin Rummy) built with Defold engine and Lua. 1280x720 landscape, player vs CPU AI. First to 12 points wins the match.

## Build & Run

Standard Defold project — no Makefile or custom scripts.

- **Run**: Open in Defold Editor → `Cmd+B` / `Ctrl+B`.
- **CLI**: `bob build` / `bob run` (requires Defold bob.jar).
- **Entry point**: `/main/main.collection`.
- **No automated tests** — manual testing via Defold Editor.

## Game Rules (Truco)

- 40-card Portuguese deck: values `4,5,6,7,Q,J,K,A,2,3` (strength order, weakest→strongest)
- 3 cards per player per hand
- **Vira**: revealed card determines the **manilha** (next value in order = wild card/trump)
- **Manilha suits rank**: paus > copas > espadas > ouros (strength 104→101)
- Best-of-3 tricks per hand; first to win 2 tricks wins the hand
- **Truco betting**: Truco(3pts) → Retruco(6) → Vale Nove(9) → Vale Doze(12)
- **Match**: first to 12 points wins

## Architecture

### Layer separation

| Layer | Location | Role |
|-------|----------|------|
| Game objects | `game/*.go`, `game/*.script` | Defold scene nodes, rendering, input |
| Business logic | `modules/*.lua` | Pure Lua, no Defold dependencies |
| UI | `gui/hud.gui_script` | HUD: scores, truco buttons, vira info |
| Entry | `main/main.collection` | Scene graph root |

### Key scripts

- **`game/controller.script`** — Orchestrates everything: spawns cards, drives turn/trick flow, triggers CPU AI with `timer.delay`, routes HUD messages.
- **`game/card.script`** — Per-card: position animation, face-up/down toggle (`reveal_card` message), selection scale.
- **`gui/hud.gui_script`** — All UI nodes created dynamically at runtime; shows Truco buttons contextually.

### Modules (`modules/`)

| Module | Role |
|--------|------|
| `card_strength.lua` | Card strength calculation, manilha value derivation, card comparison |
| `deck.lua` | 40-card deck (4–3 order), shuffle, `next_value()` for manilha |
| `game_state.lua` | State: deck, hands, current trick, tricks history, truco state |
| `turn_manager.lua` | `play_card`, `resolve_trick`, `check_hand_over`, `is_player_turn` |
| `round_rules.lua` | Trick winner, hand winner (with tiebreaker logic) |
| `truco_manager.lua` | Truco state machine: `can_call`, `call`, `accept`, `run` |
| `cpu.lua` | AI: card selection strategy + truco decision logic |
| `scoring.lua` | `award_hand_points`, `check_match_winner` (≥12 pts) |
| `match_state.lua` | Round number, `init_match` (resets scores) |
| `layout.lua` | Screen positions: player hand (bottom), CPU hand (top), vira, trick area |
| `round_reset.lua` | Resets hand-level state (hands, tricks, truco) between hands |
| `selection.lua` | Click hit-test for cards |

### Card identity

Format: `"{value}_{suit}"` — e.g., `"4_ouros"`, `"Q_paus"`, `"A_copas"`.  
Suits (lowercase): `ouros`, `espadas`, `copas`, `paus`.  
Values (strength order): `4 5 6 7 Q J K A 2 3`.

### CPU AI (`cpu.lua`)

- **Winning** (more tricks): play weakest card to conserve
- **Losing**: play strongest card
- **Tied, player already played**: play weakest card that beats player's; else weakest
- **Tied, CPU leads**: play middle-strength card
- **Truco call threshold**: avg strength ≥ 8 OR max ≥ 103 (Copas manilha)
- **Truco response**: accept if avg ≥ 7 or max ≥ 102; raise if max ≥ 104; else run

### Timer delays (controller.script)

- CPU play: 0.8–1.0s after player plays
- Trick resolution pause: 1.5s (both cards visible before clearing)
- CPU truco response: 0.7s

## Editor Setup Checklist

After opening in Defold Editor, verify:

- `main/main.collection`: objects `controller`, `table`, `hud` present (deck_pile/discard_pile not used in Truco but can remain).
- `controller.go`: factory `card_factory` → `/game/card.go`; sound components `music`, `sfx_shuffle`, `sfx_cut`.
- `card.go`: script `/game/card.script`, sprite `/game/card.sprite`.
- `assets/atlases/cards.atlas`: must include all 40 card images + `card_back`.
- `gui/hud.gui`: all nodes created dynamically at runtime — no manual nodes needed.
- `assets/fonts/roboto.font`: must reference `Roboto-Regular.ttf`.

## Assets

- **Cards**: `assets/images/cards/{value}_{suit}.png` (40 files, values: 4–7,Q,J,K,A,2,3)
- **Card back**: `assets/card_back.png` — used for CPU's face-down cards
- **Atlas**: `assets/atlases/cards.atlas` (must include `card_back`)
- **Music**: `assets/midnight_deal.ogg` (converted from MP3 for Defold compatibility)
- **SFX**: `assets/shuffle.wav`, `assets/cut.wav`
- **Fonts**: `assets/fonts/roboto.font` → `Roboto-Regular.ttf`
