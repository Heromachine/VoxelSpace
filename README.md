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
├── src/
│   ├── core/                        # Globals, config loader, polyfills
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
