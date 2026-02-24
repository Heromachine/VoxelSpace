# Server-Side Migration Plan

This document lists game logic that is currently handled client-side but should be handled server-side for fairness and security. Each issue includes what is happening now, what the risk is, and exact instructions for both the client and server changes.

---

## Priority 1 — Critical

### 1. Health Sent by Client in Every Position Update

**What happens now:**
`multiplayer.js` line 106 includes `health: player.health` in every `OP_POSITION` message. `match_handler.lua` line 149 then stores that value as the player's authoritative health on the server:
```lua
record.health = math.max(0, math.min(MAX_HEALTH, data.health or record.health))
```
A cheater sets `player.health = 100` every frame. The server continuously overwrites its damage-tracking with 100, making the player unkillable.

**Client change:**
Remove `health` from the `sendPosition` payload in `src/network/multiplayer.js`. Health should be a read-only value the client receives from the server, not something it reports.

**Server change (`match_handler.lua`):**
In the `OP_POSITION` handler, remove the line that updates `record.health` from `data.health`. Health should only change via the `OP_HIT` path. The server broadcasts the position with the health it already has on record — not what the client claims.

---

### 2. Damage Amount Decided by Client

**What happens now:**
When a player scores a hit, the client calls `reportHit(targetUserId, damage)` where `damage` comes directly from `currentWeapon.damage` — a value stored in a JavaScript object any browser console can modify. The server (`match_handler.lua` line 195) only clamps it to 0–100 and checks that the shooter is within 1000 world units of the target.

```js
// multiplayer.js — client decides the damage
NakamaClient.sendMatchData(_matchId, OP_HIT, {
    targetId: targetUserId,
    damage:   damage          // <-- client-controlled
});
```

A cheater changes `weapons.rifle.damage = 100` (from 15) and every rifle shot is a one-shot kill.

**Client change:**
Stop sending `damage` in `OP_HIT`. Instead send the weapon type:
```js
NakamaClient.sendMatchData(_matchId, OP_HIT, {
    targetId:   targetUserId,
    weaponType: playerWeapons[currentWeaponIndex].type   // "rifle", "pistol", etc.
});
```

**Server change (`match_handler.lua`):**
Define weapon damage on the server:
```lua
local WEAPON_DAMAGE = {
    testgun = 50,
    rifle   = 15,
    pistol  = 25,
    sniper  = 100,
}
```
In the `OP_HIT` handler, look up damage by weapon type and ignore any client-supplied damage value:
```lua
local weapon_type = data.weaponType or ""
local damage = WEAPON_DAMAGE[weapon_type]
if not damage then return end   -- unknown weapon type → reject
```

---

### 3. No Fire-Rate Throttle on Server

**What happens now:**
The server processes every `OP_HIT` it receives with no time check. A cheater can send hundreds of hit messages per second, draining any player's health instantly regardless of weapon fire rate.

**Client change:**
No client change needed for this fix (the throttle belongs on the server).

**Server change (`match_handler.lua`):**
Track the timestamp of the last accepted hit per player and per weapon. Reject hits that arrive faster than the weapon's minimum fire interval:
```lua
local WEAPON_FIRE_RATE_MS = {
    testgun = 100,
    rifle   = 100,
    pistol  = 200,
    sniper  = 1000,
}

-- In OP_HIT handler, after weapon lookup:
local now_ms = tick * (1000 / TICK_RATE)
local last   = record.lastShot or 0
local min_interval = WEAPON_FIRE_RATE_MS[weapon_type] or 200
if (now_ms - last) < min_interval then return end   -- too fast → reject
record.lastShot = now_ms
```

---

## Priority 2 — High

### 4. Distance Check Is Too Permissive

**What happens now:**
`match_handler.lua` line 198 rejects hits only when the shooter is more than **1000 units** from the target. The game's actual maximum bullet travel distance (`ccdMaxDistance`) is only **500 units** on the client. The server allows hits from twice the real weapon range.

**Server change (`match_handler.lua`):**
Lower the distance limit in `OP_HIT` to match the actual maximum weapon range:
```lua
-- Replace:
if dist2d(record.x, record.y, target.x, target.y) > 1000 then return end
-- With:
if dist2d(record.x, record.y, target.x, target.y) > 550 then return end
```
Once weapon types are tracked server-side (Priority 1 change #2), this can be per-weapon:
```lua
local MAX_RANGE = { testgun=550, rifle=550, pistol=400, sniper=550 }
if dist2d(...) > (MAX_RANGE[weapon_type] or 550) then return end
```

---

### 5. Player Position Is Fully Trusted by Server

**What happens now:**
`match_handler.lua` lines 145–147 store whatever `x`, `y`, and `height` the client sends with no validation. A cheater can teleport anywhere on the map by modifying `camera.x` and `camera.y`, and all other clients will see the cheater at the teleported location.

**Server change (`match_handler.lua`):**
Add a maximum movement-per-tick check. Given the player's previous position and the server tick rate (20 Hz), calculate the maximum physically possible movement:
```lua
local MAX_SPEED     = 4.5   -- world units per tick at full sprint (moveSpeed * sprintMultiplier / tickRate)
local dx = (data.x or record.x) - record.x
local dy = (data.y or record.y) - record.y
local move_dist = math.sqrt(dx*dx + dy*dy)
if move_dist > MAX_SPEED then
    -- Clamp position to max movement from last known position
    local scale = MAX_SPEED / move_dist
    record.x = record.x + dx * scale
    record.y = record.y + dy * scale
else
    record.x = data.x or record.x
    record.y = data.y or record.y
end
-- Always enforce map bounds
record.x = math.max(-512, math.min(512, record.x))
record.y = math.max(-512, math.min(512, record.y))
```

**Client change:**
No change required if the server clamps — the client will just see its position corrected on the next broadcast from other players. No client-side change is needed.

---

## Priority 3 — Medium

### 6. Admin Flag Is Set Client-Side

**What happens now:**
`src/main.js` sets `isAdmin = (NakamaClient.getUsername() === "heromachine")`. This runs in the browser. Any user can open the console and type `isAdmin = true` to unlock the developer settings menu, debug overlays, and gun mechanics panel.

**Client change:**
Remove the username comparison from `beginGame()`. Instead request admin status from the server:
```js
// After Multiplayer.init():
var adminStatus = await NakamaClient.rpc("check_admin", {});
isAdmin = adminStatus && adminStatus.isAdmin === true;
```

**Server change (new Nakama RPC `check_admin.lua`):**
Create a new RPC function that checks if the calling user is in an admin list stored in server storage or an environment variable. Return `{ isAdmin: true/false }`. Never trust the client to make this determination.

---

### 7. Ammo Is Not Tracked Server-Side

**What happens now:**
Ammo is stored in `playerWeapons[i].ammo` in the browser. The server never knows how much ammo a player has. Setting `playerWeapons[0].ammo = Infinity` bypasses all ammo checks and allows unlimited firing. Combined with the fire-rate fix (Priority 1 #3), the server can already throttle hits per second — which partially mitigates this. Full ammo tracking is a more involved change.

**Server change (`match_handler.lua`):**
Add ammo state to each player record on join. Deduct ammo when an `OP_HIT` is accepted. Add an `OP_RELOAD` opcode the client sends when reloading, which the server validates with a time check before refilling ammo:
```lua
-- On join:
state.players[uid].ammo = { testgun = math.huge, rifle = 30, pistol = 12, sniper = 5 }
state.players[uid].currentWeapon = "testgun"
state.players[uid].reloadEnd = 0

-- In OP_HIT handler, after weapon validation:
local ammo = record.ammo[weapon_type] or 0
if ammo <= 0 then return end   -- out of ammo → reject hit
if weapon_type ~= "testgun" then
    record.ammo[weapon_type] = ammo - 1
end
```

**Client change:**
Add a new `OP_WEAPON_SWAP` message when the player switches weapons, and an `OP_RELOAD` message when they reload. The client continues to manage its own visual ammo count for display, but the server holds the authoritative count.

---

### 8. Clan Is Loaded from Client Storage

**What happens now:**
On join, `multiplayer.js` reads the player's saved clan from Nakama storage and stores it in `nakamaState.myClan`. The server loads the clan from storage independently in `match_handler.lua` lines 66–67 — so the clan is actually read server-side correctly. **This one is mostly fine as-is.**

The only residual risk is if `nakamaState.myClan` is used for any client-side logic that should be server-gated. Verify no game logic branches on `nakamaState.myClan` client-side (other than display). No code change is required unless client-side clan checks are found.

---

## Summary Table

| Issue | Severity | Client Change | Server Change |
|-------|----------|---------------|---------------|
| Client sends health in position | Critical | Remove `health` from `sendPosition` | Stop reading health from OP_POSITION |
| Client decides damage value | Critical | Send `weaponType` instead of `damage` | Define weapon damage in Lua, look up by type |
| No fire-rate throttle | Critical | None | Track `lastShot` per player, reject fast hits |
| Distance check too permissive | High | None | Lower limit from 1000 to ~550 units |
| Position fully trusted | High | None | Add max-movement-per-tick clamp + map bounds |
| Admin flag is client-side | Medium | Call server RPC for admin check | Create `check_admin` RPC |
| No server-side ammo tracking | Medium | Send OP_WEAPON_SWAP and OP_RELOAD | Track ammo in player record, deduct on hit |
| Clan logic | Low | None needed | Already server-side; verify no client branches |
