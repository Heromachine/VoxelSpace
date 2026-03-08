# VoxelSpace — Open World FPS Survival

A browser-based open-world first-person survival shooter built on the [VoxelSpace](https://github.com/s-macke/VoxelSpace) terrain rendering engine — the same technique used in NovaLogic's *Comanche* (1992). No NPCs. Pure player-vs-player survival.

Built with vanilla JavaScript, HTML5 Canvas, and [Nakama](https://heroiclabs.com/) for real-time multiplayer.

---

## Gameplay

- **Survival FPS** — Think DayZ or Ark, but players only. No AI enemies.
- **Open World** — Everyone shares the same voxel terrain map simultaneously.
- **Clan System** — Choose one of three clans on first login. Your clan is secret — no one can tell which clan you belong to. Shoot a friendly and you're kicked.
- **Weapons** — Rifle, Pistol, Sniper, and Test Gun. Loot weapons from the ground.
- **Proximity Chat** — Emoji/icon only, no text. Send signals to nearby players. Switch to **Shout** to broadcast further, but it reveals your position on everyone's radar.
- **No anonymous persistence** — Anonymous (Guest) players exist only while connected. On disconnect, stats and loot are wiped.

---

## Controls

| Action | Keyboard / Mouse | Gamepad |
|---|---|---|
| Move | WASD | Left Stick |
| Look | Mouse | Right Stick |
| Shoot | LMB | RT |
| ADS Toggle | RMB | LT |
| Jump (charge) | Hold Space, release | Hold LB, release |
| Sprint | Shift | L3 or A |
| Crouch | C | B |
| Reload | R | X |
| Swap Weapon | Q | Y |
| Pickup Weapon | E | X (context) |
| Talk to NPC   | F | — |
| Settings | ESC | — |

---

## Clans

Three clans are available on first login. Membership is **permanently secret** — no name tag, no colour, nothing reveals which clan another player belongs to.

| Clan | Theme |
|---|---|
| Iron Ravens | Steel blue — disciplined, long range |
| Ember Tide | Deep orange — aggressive, close quarters |
| Silent Root | Dark green — patient, snipers and survivors |

Friendly fire results in an immediate kick. This behaviour may change in future versions.

---

## Quest System

Quests are data-driven. Each quest is a `.js` file in the `quests/` folder that calls `QuestManager.register()`. No build step or server is required.

### Quest structure

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique quest identifier |
| `npcId` | string | Matches the ID used in `QuestManager.setNpcPosition()` |
| `npcName` | string | Display name shown in the dialog box |
| `canReject` | boolean | Whether the player can decline this quest |
| `keyItems` | array | Items that must be returned to complete the quest |
| `dialog` | object | Keyed dialog phases: `greeting`, `accept`, `reject`, `active`, `readyToComplete`, `complete` |

### Quest states

`not_started` → `active` → `ready_to_complete` → `complete`

The player can also `reject` a quest (if `canReject: true`), which resets to `not_started` on next conversation.

### Key items

Key items can be delivered by the player, another player, an NPC, or a game system:

```js
QuestManager.giveKeyItem("TestQuest", "green_fragment");
```

When all key items are received, the quest advances to `ready_to_complete` automatically and a HUD notification is shown.

### Interaction

Walk within **80 units** of an NPC and face it within **15°** — a prompt appears. Press **F** to open the dialog.

### Adding a new quest

1. Create `quests/YourQuest.js` calling `QuestManager.register({ ... })`
2. Add the script tag to `index.html` after `greenCube.js`
3. Call `QuestManager.setNpcPosition('yourNpcId', x, y)` when spawning the NPC

### Future: Quest Editor

A visual quest editor is planned that will:
- Create and edit quest definitions through a UI
- Generate `quests/*.js` files automatically
- Support branching dialog trees, multiple NPCs per quest, timed quests, and repeatable quests
- Integrate with a quest giver/delivery chain (player → NPC → player, system events, etc.)

---

## Multiplayer Architecture

- **Server**: [Nakama](https://heroiclabs.com/) game server running on a self-hosted Ubuntu VM via Docker
- **Transport**: WebSocket (real-time)
- **Authority**: Server-authoritative — position updates are validated server-side before broadcasting
- **Match structure**: One persistent open-world match — all players, one map

### Message Opcodes

| Opcode | Direction | Purpose |
|---|---|---|
| 1 | Client → Server → Others | Position update (x, y, height, angle, health) |
| 2 | Client → Server → Nearby | Chat emoji (vicinity or shout) |
| 3 | Client → Server | Hit report (target + damage) |
| 4 | Server → Joining client | Player list snapshot |
| 5 | Server → All | Player joined |
| 6 | Server → All | Player left |
| 7 | Server → Client | You have been kicked |
| 8 | Server → Client | You took damage |
| 9 | Server → Nearby | Radar reveal (shout used) |

### Proximity Chat

- **Vicinity** (≤ 150 world units): only nearby players receive your emoji
- **Shout** (≤ 500 world units): wider range, but your position is revealed on all in-range players' radar for 5 seconds

---

## Authentication

| Method | Persistence |
|---|---|
| Anonymous (Guest) | Session only — all data wiped on disconnect |
| Username + Password | Full persistence (stats, loot, clan) |
| Steam | Planned |

---

## Running Locally

No build step required. Serve the project with any static HTTP server:

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .
```

Open `http://localhost:8080` in your browser.

> The game requires a running Nakama server. Configure the server address in `src/network/nakamaClient.js` (`SERVER_HOST` / `SERVER_PORT`).

---

## Nakama Server Setup

### 1. Start the Server Stack

```bash
cd ~/nakama
docker compose up -d
```

### 2. Deploy Server Modules

```bash
# Copy Lua modules to the Nakama data directory
cp /path/to/VoxelSpace/nakama-modules/*.lua ~/nakama/data/modules/

# Restart Nakama to load the new modules
docker compose restart nakama
```

### 3. Access Nakama Console

```
http://YOUR_SERVER_IP:7351
```

---

## GitHub Pages / Public Hosting

The client (HTML + JS) can be hosted on GitHub Pages. However:

> **Important:** GitHub Pages enforces HTTPS. Browsers block WebSocket (`ws://`) connections from HTTPS pages — you need **secure WebSocket (`wss://`)**, which requires TLS on your Nakama server.

**Options for enabling public play:**

| Option | Notes |
|---|---|
| **Cloudflare Tunnel** | Free, no port forwarding needed, provides SSL automatically |
| **Port forward + DDNS** | Forward ports 7349–7351 to your VM, use a free DDNS domain |
| **VPS** | Run Nakama on a public VPS with Let's Encrypt for SSL |

For **LAN play** (same network), HTTP/WS works fine without SSL — just open the page from `http://SERVER_IP:PORT`.

---

## Project Structure

```
VoxelSpace/
├── README.md
├── index.html                       # Main game entry point
├── nakama-modules/                  # Server-side Lua (deploy to Nakama)
│   ├── match_handler.lua            # Open world match logic
│   └── find_or_create_match.lua     # RPC to join/create the world match
├── data/                            # JSON config files
│   ├── settings.json
│   ├── gunModel.json
│   ├── weapons.json
│   └── display.json
├── quests/                          # Quest data files (one per quest)
│   └── TestQuest.js                 # Demo quest — GreenBox NPC
├── src/
│   ├── core/                        # Globals, config loader, polyfills
│   ├── systems/
│   │   └── questManager.js          # Quest state machine + NPC dialog
│   ├── network/
│   │   ├── nakamaClient.js          # Auth + socket wrapper
│   │   └── multiplayer.js           # Position sync, chat, hit reporting
│   ├── rendering/
│   │   ├── remotePlayerRenderer.js  # Render other players as rectangles
│   │   └── ...
│   ├── entities/                    # Camera physics, items
│   ├── weapons/                     # Gun mechanics and renderer
│   ├── ui/
│   │   ├── loginScreen.js           # Auth overlay
│   │   ├── clanScreen.js            # Clan selection overlay
│   │   └── ...
│   ├── input/                       # Keyboard, mouse, gamepad, touch
│   ├── map/                         # Terrain map loader
│   └── main.js                      # Game loop + multiplayer startup
├── maps/                            # Terrain colour + altitude PNG maps
├── images/                          # Sprites and textures
└── modules/                         # Display, weapon, scope config modules
```

---

## World Scale & Player Height

**1 world unit (WU) ≈ 1 foot ≈ 30 cm**

The player eye height is **7 WU** (≈ 7 feet, eye level of a ~6'3" person). All distances in the codebase use this scale — weapon ranges, proximity chat, NPC interaction radius, etc.

### How player height is applied at startup

`globals.js` sets the **fallback default**. At startup, `loadSettings()` in `settingsManager.js` reads `data/settings.json` and calls `_applyPlayerHeightFromJson()`, which forces the canonical values onto all globals. This runs for **all users** — including admin — after any saved settings are applied, so localStorage/Nakama-cached values can never restore a stale player height.

Values loaded from `data/settings.json → player`:
| Key | Value | Meaning |
|---|---|---|
| `playerHeight` | 7 | Eye height above terrain (WU) |
| `normalHeight` | 56 | Camera height when standing |
| `crouchHeight` | 24 | Camera height when crouching |
| `jumpMin` | 2 | Tap jump strength |
| `jumpMax` | 7 | Full charge jump strength |

All systems that depend on player size reference `playerHeightOffset` proportionally:

| System | File | Formula |
|---|---|---|
| Remote player hit sphere radius | `camera.js` | `playerHeightOffset * (25/70)` |
| Remote player hit sphere center | `camera.js` | `rp.height - playerHeightOffset * (10/70)` |
| Remote player body rect (height/width) | `remotePlayerRenderer.js` | `playerHeightOffset * (78/70)` / `(20/70)` |
| Player sprite scale | `itemRenderer.js` | `playerHeightOffset * (2/70)` / `(6.5/70)` |

> **History:** A previous session scaled `playerHeightOffset` from 7 → 70 to fix a gun-shooting-from-the-knee issue. This caused the player to be effectively 70 feet tall. The fix restored 7 WU as the canonical value and made all dependent systems proportional. Admin users were initially missed because their saved settings in localStorage/Nakama stored the old 70-unit value — fixed by always running `_applyPlayerHeightFromJson()` after `applySettings()`.

> **Gun world offsets** (barrel position sliders in the admin settings panel) were calibrated for the 70-unit scale and will need to be re-tuned against the 7-unit player. The correct values will be saved to `data/settings.json` once tested.

---

## Menu Navigation

All multiplayer screens support back-button navigation:

- **Login screen** → back button (←) returns to the Mode Menu
- **Clan screen** → back button (←) returns to the Login screen

Back buttons are positioned top-left and use a `_bound` guard to prevent duplicate event listeners on repeated `show()` calls.

---

## Known Behaviours & Debug Flags

| Flag | Default (non-admin) | Meaning |
|---|---|---|
| `isAdmin` | `false` | Set to `true` for the `heromachine` account only |
| `showGMD` | `false` | Gun mechanics debug overlay |
| `showHitRanges` | `false` | Hit sphere circles on remote players (3D + minimap) |
| `showMinimaps` | `false` | Admin debug minimap (overhead + side view) |
| `testTarget.enabled` | `false` | Floating test target |

When `showHitRanges` is on:
- A red circle is drawn over each remote player in the 3D viewport, matching the actual bullet hit sphere radius and center height
- Red circles are drawn around remote player dots in the overhead debug minimap

---

## Credits

- Voxel Space rendering technique reverse-engineered from NovaLogic's *Comanche* (1992)
- Original VoxelSpace implementation by [Sebastian Macke (s-macke)](https://github.com/s-macke/VoxelSpace) — MIT License
- Game features and multiplayer by Heromachine
- Multiplayer powered by [Nakama](https://heroiclabs.com/) (Heroic Labs) — Apache 2.0

---

## License

Original VoxelSpace code: MIT License (see LICENSE)
Terrain maps: Reverse-engineered from Comanche — excluded from license
Game additions: All rights reserved — Heromachine
