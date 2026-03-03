# Multiplayer — Server Integration Guide

This document is for the Claude (or developer) working on the Nakama server side.
It covers the quest persistence contract, the storage adapter pattern, and everything
needed to migrate from `localStorage` (single player) to Nakama Storage Engine (multiplayer).

---

## Quick Context

This is a browser-based open-world FPS built on the VoxelSpace terrain engine.
It has two modes:

| Mode | Auth | Quest persistence |
|---|---|---|
| Single Player | None — local only | `localStorage` (implemented) |
| Multiplayer — Guest | Anonymous Nakama session | None — wiped on disconnect |
| Multiplayer — Authenticated | Username + password | **Nakama Storage Engine** (swap `QuestStore` bodies) |

Single player and multiplayer share the same client-side quest code (`src/systems/questManager.js`).
The only difference is where state is saved and loaded — handled by the `QuestStore` adapter inside
`questManager.js`. **The adapter is already implemented for localStorage.** To enable multiplayer
persistence, swap the `QuestStore.save` and `QuestStore.load` bodies (see below).

---

## Quest System Overview

Quest data lives in `quests/*.js`. Each file calls `QuestManager.register()` once at startup.
There is one quest per file. The runtime state machine is inside `src/systems/questManager.js`.

### Quest definition (read-only, never persisted)

```js
QuestManager.register({
    id:          "TestQuest",      // unique string, used as storage key
    npcId:       "greenCube",      // matches QuestManager.setNpcPosition() call in NPC entity file
    npcName:     "GreenBox",       // display name shown in dialog box and quest log
    description: "Short summary of the quest shown in the in-game menu quest log.",
    canReject:   true,             // whether player can decline
    keyItems: [
        { id: "green_fragment", name: "Green Fragment" }
    ],
    dialog: {
        greeting:        [...],    // shown when phase === "not_started"
        accept:          [...],    // shown after player accepts
        reject:          [...],    // shown after player rejects
        active:          [...],    // shown while quest is in progress
        readyToComplete: [...],    // shown when all key items are held
        complete:        [...]     // shown after quest is turned in
    }
});
```

### Registered quests

| Quest file | NPC entity file | npcId | npcName | World pos |
|---|---|---|---|---|
| `quests/TestQuest.js` | `src/entities/greenCube.js` | `greenCube` | GreenBox | (0, -80) |
| `quests/VoidQuest.js` | `src/entities/shadowCube.js` | `shadowCube` | VoidKeeper | (-90, -120) |

---

## What Must Be Persisted

Only the **runtime state** per quest per player. The quest definition itself is static JS — never stored.

### Runtime state shape (per quest)

```json
{
    "phase": "active",
    "receivedItems": {
        "green_fragment": true
    }
}
```

| Field | Type | Values |
|---|---|---|
| `phase` | string | `"not_started"` `"active"` `"ready_to_complete"` `"complete"` `"rejected"` |
| `receivedItems` | object | `{ itemId: true }` — only items received so far are present |

### State machine

```
not_started → (accept) → active → (all key items received) → ready_to_complete → (return item) → complete
not_started → (reject) → rejected → (talk again) → not_started
```

`rejected` resets to `not_started` on next conversation — it is not a terminal state.
`complete` is terminal.

---

## Storage Layout

### localStorage (single player — current implementation)

```
Key:   "quest_<questId>"          e.g.  "quest_TestQuest"
Value: JSON string of state object
```

### Nakama Storage Engine (multiplayer — authenticated users only)

```
Collection:  "quests"
Key:         <questId>            e.g.  "TestQuest"
Value:       state object (JSON)
UserId:      the authenticated player's Nakama userId
```

The schema is **identical** between localStorage and Nakama — only the I/O call changes.

---

## QuestStore Adapter (implemented — swap bodies for Nakama)

The adapter lives inside the `QuestManager` IIFE in `src/systems/questManager.js`.

```js
var QuestStore = {

    // Called whenever quest state changes (phase transition or item received)
    save: function(questId, state) {
        // ── Current (single player) ──────────────────────────
        localStorage.setItem('quest_' + questId, JSON.stringify(state));

        // ── Swap for multiplayer (authenticated) ─────────────
        // NakamaClient.writeStorageObject("quests", questId, state);

        // ── Multiplayer (guest): no-op ────────────────────────
    },

    // Called in QuestManager.init() to rehydrate state for all registered quests
    load: function(questId, callback) {
        // ── Current (single player) ──────────────────────────
        var raw = localStorage.getItem('quest_' + questId);
        callback(raw ? JSON.parse(raw) : null);

        // ── Swap for multiplayer (authenticated) ─────────────
        // NakamaClient.readStorageObject("quests", questId, function(obj) {
        //     callback(obj ? obj.value : null);
        // });

        // ── Multiplayer (guest): always start fresh ───────────
        // callback(null);
    }
};
```

When `load` returns `null` for a quest, `QuestManager` initializes it as `{ phase: "not_started", receivedItems: {} }`.

---

## Save Triggers

State is saved at every phase transition:

| Function | Trigger |
|---|---|
| `_onAccept()` | Player accepts quest (`not_started → active`) |
| `_onAccept()` | Player returns item (`ready_to_complete → complete`) |
| `_onReject()` | Player rejects quest (`not_started → rejected`) |
| `giveKeyItem()` | Item received; also when promoted to `ready_to_complete` |

---

## QuestManager Public API

```js
QuestManager.register(def)                  // Register a quest definition at startup
QuestManager.setNpcPosition(npcId, x, y)    // Called from NPC entity init function
QuestManager.giveKeyItem(npcId, itemId)     // Programmatically deliver a key item
QuestManager.getState(questId)              // { phase, receivedItems } for one quest
QuestManager.getAll()                       // Array of { id, npcName, description, state }
QuestManager.getNpcMarkers()               // Array of { npcId, npcName, x, y, phase }
                                            //   — only quests the player has spoken to
                                            //   — used by the in-game map tab for NPC markers
QuestManager.init()                         // Bind DOM, load saved state — called once in Init()
QuestManager.update()                       // Proximity check + dialog logic — called every frame
```

---

## In-Game UI

### In-game menu (Tab key)

Three tabs:

| Tab | Content |
|---|---|
| **Menu** | Resume button + Quest Log (all quests with name, description, color-coded status) |
| **Leaderboard** | Player list with kills and ping |
| **Map** | Full 1024×1024 world color map with player arrow, remote player dots, NPC markers |

The map only shows NPC markers for NPCs the player has already spoken to (`phase !== 'not_started'`).
Marker color indicates quest status: blue = active, gold = ready to turn in, dim = complete/rejected.

### Dialog box (F key / proximity)

- Player walks near an NPC → interact prompt appears
- F key opens dialog, advances lines, and accepts/returns quest on final line
- Tab toggles focus between Accept / Reject buttons (default: Reject)
- Dialog auto-closes if player walks too far away

---

## Nakama Server Module Notes

The client uses `NakamaClient` (defined in `src/network/nakamaClient.js`) as the Nakama JS SDK wrapper.

- Server address configured in `nakamaClient.js` (`SERVER_HOST` / `SERVER_PORT`)
- Auth: anonymous session = Guest (no persistence), username+password = full persistence
- Match: one persistent open-world match — all players share one map
- Existing opcodes: see `README.md` → Message Opcodes table

No server-side Lua module is needed for quest storage — Nakama's built-in Storage Engine handles it
client-side via the SDK. No RPC required unless you want server-authoritative quest validation
(e.g. verify the player actually holds the item before allowing `ready_to_complete`).

---

## Adding More Quests

Full recipe for a new NPC + quest:

### 1. Create the NPC entity file

Copy `src/entities/shadowCube.js` as a template. Change:
- `SHADOW_NPC_X`, `SHADOW_NPC_Y` → new world coordinates
- `shadowCubeObj`, `_shadowCubeTime` → unique variable names
- `initShadowCube`, `updateShadowCubeFloat`, `RenderShadowCube`, `_scVertices` → unique function names
- Color math inside `RenderShadowCube` → your NPC's color palette
- `QuestManager.setNpcPosition('shadowCube', ...)` → new npcId string

### 2. Create the quest file

Copy `quests/VoidQuest.js` as a template. Fill in:
- `id` — unique quest ID (used as the localStorage/Nakama key)
- `npcId` — must match `setNpcPosition()` call in your entity file
- `npcName`, `description`
- `keyItems` — one or more `{ id, name }` objects
- All dialog phases

### 3. Hook into main.js

In `src/main.js`:
```js
// In Init():
initYourNpc();       // after initShadowCube()

// In the Draw loop:
updateYourNpcFloat(timestamp);   // after updateShadowCubeFloat()
RenderYourNpc();                 // after RenderShadowCube()
```

### 4. Add to scope render passes

In `src/scope/scopeManager.js`, add to `renderFuncs`:
```js
RenderYourNpc: RenderYourNpc,
```

In both `modules/scopeFocalLength.js` and `modules/scopeForwardPosition.js`, add:
```js
if (renderFuncs.RenderYourNpc) renderFuncs.RenderYourNpc();
```

### 5. Add script tags to index.html

After the existing NPC and quest scripts:
```html
<script src="src/entities/yourNpc.js"></script>
<script src="quests/YourQuest.js"></script>
```

Quest state is automatically initialized to `not_started` on first run and rehydrated from storage
on return visits. The NPC marker appears on the map only after the player speaks to the NPC.

---

---

## Node War — Server vs. Client Responsibilities

**Full rules:** see `GAMEMODE_NODE_WAR.md`

Node War is fundamentally different from the quest system. Quests are per-player and
stored client-side via the Nakama SDK. Node War is **shared match state** — every player
sees the same node statuses, the same Key position, and the same countdown. This requires
a **server-side Nakama Lua match module**, not just client-side SDK calls.

### Why the Server Must Be Authoritative

If clients self-report their own node activations, Key possession, or damage reduction,
players can cheat. The server must validate all state transitions and broadcast ground truth
to all clients.

---

### Server Owns (Nakama Lua match state)

| State | Description |
|---|---|
| `nodes` | Array of facilities — for each: position, which team activated it, current status (`neutral` / `active` / `deactivating`) |
| `npcPositions` | Which facilities currently have an NPC (changes on full reset) |
| `key` | `{ exists, teamOwner, holderUserId, groundPos: {x,y} }` |
| `mainframe` | `{ active, activatingUserId, countdownSeconds }` |
| `opBuffHolder` | userId of the player with the OP buff (Key holder after Mainframe activation) |
| `factionPlayers` | Map of userId → faction (`clan1`, `clan2`, `guest`) |
| `nodeCounts` | `{ clan1: N, clan2: N }` — tracks each team's active node total |

---

### Server Responsibilities

| Responsibility | Notes |
|---|---|
| **Validate node activation** | Player must be near the facility, must be Clan (not Guest), node must be neutral or own-team-deactivated |
| **Issue the Key** | When a team reaches 3 nodes — server generates Key, sets `teamOwner`, broadcasts to all |
| **Neutral opponent nodes** | When Key is issued, server immediately marks all opposing team's nodes as neutral, broadcasts |
| **Track Key possession** | On death, server moves Key to ground at death coords. On pickup, validates proximity and transfers. |
| **Validate Mainframe activation** | Player must hold Key, be near Mainframe, Key must belong to their team |
| **Run countdown timer** | Server-side 5-minute countdown after Mainframe activation. Broadcasts remaining time. |
| **Grant OP buff** | After Mainframe activation completes, server marks holder as OP. Validates 50% damage reduction on server damage calculations. |
| **Validate deactivation** | Player must hold Key, must be enemy Clan or Guest (3rd faction), must be near the node/Mainframe |
| **Full reset** | Server clears all node states, destroys Key, picks new NPC positions, broadcasts everything |
| **Enforce 3rd faction spawn** | Guest players may only spawn if at least one node is active anywhere. Server picks spawn point from active node list. |
| **Enforce permadeath** | On 3rd faction player death, server kicks them from the match session. |
| **Enforce Key team-lock** | Server rejects any Mainframe activation attempt where the player's team does not match `key.teamOwner`. |
| **Win condition** | Server detects countdown reaching zero, broadcasts win to all clients, ends match. |

---

### Client Responsibilities

| Responsibility | Notes |
|---|---|
| **Rendering** | NPCs at facilities, pyramid (Mainframe), active node markers on map, Key gold marker (ground or held), player sprites, OP buff visual effects |
| **Progress bar UI** | Shows 0→100% fill during node activation, deactivation, and Mainframe activation. Client sends start/complete messages; server validates completion. |
| **Map markers** | Active nodes, Key ground marker, Key holder marker (gold), NPC positions received from server on reset |
| **Proximity detection** | Client detects when player is near a node NPC or the Key on the ground, shows interact prompt |
| **Input & movement** | All player movement, aiming, shooting handled client-side |
| **Countdown display** | Renders server-broadcast remaining time |
| **Faction enforcement (UI only)** | Guest players see no node activation prompt (NPC dialog blocked client-side). Server also validates. |
| **OP buff visuals** | Health bar, damage reduction indicator — driven by server `opBuffHolder` broadcasts |

---

### New Opcodes Required

These message types need to be added to `nakamaClient.js` and handled in the Lua match module.
Add them alongside the existing opcodes in `README.md`.

**Client → Server**

| Opcode | Payload | Description |
|---|---|---|
| `NODE_ACTIVATE_START` | `{ facilityId }` | Player began activation progress bar |
| `NODE_ACTIVATE_COMPLETE` | `{ facilityId }` | Client reports 100% — server validates and confirms |
| `NODE_DEACTIVATE_START` | `{ facilityId }` | Enemy/3rd faction began deactivation progress bar |
| `NODE_DEACTIVATE_COMPLETE` | `{ facilityId }` | Client reports 100% — server validates and confirms |
| `MAINFRAME_ACTIVATE_START` | `{}` | Key holder began Mainframe activation |
| `MAINFRAME_ACTIVATE_COMPLETE` | `{}` | Client reports 100% — server starts countdown |
| `MAINFRAME_DEACTIVATE_START` | `{}` | Enemy/3rd faction began Mainframe deactivation |
| `MAINFRAME_DEACTIVATE_COMPLETE` | `{}` | Client reports 100% — server triggers full reset |
| `KEY_PICKUP_REQUEST` | `{ groundPos }` | Player walked over dropped Key and pressed interact |

**Server → All Clients**

| Opcode | Payload | Description |
|---|---|---|
| `NODE_STATE_UPDATE` | `{ facilityId, status, team }` | A node changed state |
| `KEY_ISSUED` | `{ teamOwner, holderUserId }` | Key generated for a team |
| `KEY_HOLDER_UPDATE` | `{ holderUserId, team, groundPos }` | Key changed hands or was dropped |
| `KEY_DESTROYED` | `{ cause }` | Key trashed (`all_nodes_deactivated` or `mainframe_deactivated`) |
| `MAINFRAME_ACTIVATED` | `{ countdownSeconds, opBuffUserId }` | Mainframe on, countdown started, OP buff granted |
| `MAINFRAME_DEACTIVATED` | `{}` | Mainframe cancelled — triggers FULL_RESET |
| `COUNTDOWN_UPDATE` | `{ secondsRemaining }` | Periodic countdown tick |
| `FULL_RESET` | `{ npcPositions: [{facilityId, hasNpc}] }` | All state cleared, new NPC layout |
| `OP_BUFF_UPDATE` | `{ userId, active }` | OP buff granted or removed |
| `FACTION_KICK` | `{}` | Sent to the dying Guest — they are removed from match |
| `MATCH_WIN` | `{ winningTeam }` | Countdown reached zero |

---

### Nakama Lua Module Notes

- Node War needs a **match handler** (`nw_match.lua` or similar) implementing Nakama's
  `match_init`, `match_join`, `match_loop`, `match_leave`, `match_signal` hooks.
- The countdown runs in `match_loop` (called every tick by Nakama).
- NPC relocation on full reset can be deterministic (seeded random per reset count) so all
  clients and the server agree without needing a broadcast for every NPC individually.
- Damage calculations (including 50% reduction for OP buff and 3rd faction) must be
  resolved server-side. Client sends "I shot userId X" messages; server applies damage.
- The existing open-world match (`nakamaClient.js`) may need to be forked into a
  "Node War match" mode vs. the existing open-world mode. The mode menu (`src/ui/modeMenu.js`)
  can route players to the appropriate match type on join.

---

## Files Relevant to This Work

| File | Purpose |
|---|---|
| `src/systems/questManager.js` | Quest state machine, dialog logic, NPC proximity, `QuestStore` adapter |
| `src/ui/inGameMenu.js` | Tab menu overlay — quest log, leaderboard, map with NPC markers |
| `src/entities/greenCube.js` | GreenBox NPC entity (template for new NPCs) |
| `src/entities/shadowCube.js` | VoidKeeper NPC entity (second example) |
| `quests/TestQuest.js` | GreenBox quest definition |
| `quests/VoidQuest.js` | VoidKeeper quest definition |
| `src/network/nakamaClient.js` | Nakama SDK wrapper — add `writeStorageObject`/`readStorageObject` here |
| `src/ui/modeMenu.js` | Single Player vs Multiplayer entry point |
| `src/main.js` | `Init()` calls NPC inits and `QuestManager.init()` |
