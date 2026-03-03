// ===============================
// Quest Manager
//
// Handles quest registration, state tracking, NPC proximity detection,
// dialog flow, and key item management.
//
// Quest data lives in /quests/*.js — each file calls QuestManager.register().
// Runtime state is held in memory (persisted to localStorage in a future update).
//
// Future: Quest Editor will generate quest data files and register new NPCs.
// ===============================
"use strict";

var QuestManager = (function () {

    // ── Quest registry ────────────────────────────────────────
    var _quests   = {};   // questId  → quest definition
    var _npcIndex = {};   // npcId    → questId
    var _npcPos   = {};   // npcId    → { x, y }

    // ── Runtime state per quest ───────────────────────────────
    // state: "not_started" | "active" | "ready_to_complete" | "complete" | "rejected"
    var _state = {};

    // ── Dialog state ──────────────────────────────────────────
    var _dlgOpen      = false;
    var _dlgQuestId   = null;
    var _dlgNpcId     = null;   // npcId of the NPC currently being spoken to
    var _dlgPhase     = null;   // which dialog array key is being shown
    var _dlgLine      = 0;
    var _dlgFocusBtn  = null;   // 'accept' | 'reject' | null — which choice button has keyboard focus

    // ── Interact prompt state ─────────────────────────────────
    var _promptNpcId  = null;   // npcId currently in range, or null

    // ── Constants ─────────────────────────────────────────────
    var PROXIMITY_SQ      = 80 * 80;                      // squared, avoids sqrt until needed
    var FACE_COS_THRESH   = Math.cos(15 * Math.PI / 180); // cos(15°)
    var DIALOG_LEASH_SQ   = 120 * 120;                    // dialog auto-closes beyond this distance

    // ── Quest storage adapter ─────────────────────────────────
    // Single player: localStorage.  Swap bodies for Nakama in multiplayer.
    // Schema: { phase: string, receivedItems: { itemId: true } }
    var QuestStore = {
        save: function (questId, state) {
            try {
                localStorage.setItem('quest_' + questId, JSON.stringify({
                    phase:         state.phase,
                    receivedItems: state.receivedItems
                }));
            } catch (e) {}
        },
        load: function (questId, callback) {
            try {
                var raw = localStorage.getItem('quest_' + questId);
                callback(raw ? JSON.parse(raw) : null);
            } catch (e) {
                callback(null);
            }
        }
    };

    // ─────────────────────────────────────────────────────────
    // Public: register a quest definition
    // ─────────────────────────────────────────────────────────
    function register(def) {
        _quests[def.id]         = def;
        _npcIndex[def.npcId]    = def.id;
        _state[def.id]          = { phase: "not_started", receivedItems: {} };
    }

    // Public: tell the manager where an NPC physically is in the world
    function setNpcPosition(npcId, x, y) {
        _npcPos[npcId] = { x: x, y: y };
    }

    // Public: award a key item to a quest (can be called by any system)
    function giveKeyItem(questId, itemId) {
        var qs = _state[questId];
        var def = _quests[questId];
        if (!qs || !def) return;
        qs.receivedItems[itemId] = true;
        // Promote to ready_to_complete if all items are in
        if (qs.phase === "active") {
            var allIn = def.keyItems.every(function (ki) {
                return qs.receivedItems[ki.id];
            });
            if (allIn) {
                qs.phase = "ready_to_complete";
                _showNotification("Return to " + def.npcName + " with " + def.keyItems.map(function(k){return k.name;}).join(", "));
            }
        }
        QuestStore.save(questId, qs);
    }

    // Public: query quest state
    function getState(questId) { return _state[questId]; }

    // Public: return NPC world positions for quests the player has interacted with
    // (phase !== 'not_started'). Used by the map to place markers.
    function getNpcMarkers() {
        var markers = [];
        Object.keys(_quests).forEach(function (questId) {
            var def   = _quests[questId];
            var state = _state[questId];
            var pos   = _npcPos[def.npcId];
            if (!pos || !state || state.phase === 'not_started') return;
            markers.push({
                npcId:   def.npcId,
                npcName: def.npcName,
                x:       pos.x,
                y:       pos.y,
                phase:   state.phase
            });
        });
        return markers;
    }

    // Public: return all quests as array of { id, npcName, description, state } for UI display
    function getAll() {
        return Object.keys(_quests).map(function (questId) {
            return {
                id:          questId,
                npcName:     _quests[questId].npcName,
                description: _quests[questId].description || '',
                state:       _state[questId]
            };
        });
    }

    // ─────────────────────────────────────────────────────────
    // Proximity + facing check — call once per frame
    // ─────────────────────────────────────────────────────────
    function _checkProximity() {
        if (_dlgOpen) return; // prompt is suppressed while dialog is open

        var found = null;
        for (var npcId in _npcPos) {
            var pos  = _npcPos[npcId];
            var dx   = pos.x - camera.x;
            var dy   = pos.y - camera.y;
            var distSq = dx * dx + dy * dy;
            if (distSq > PROXIMITY_SQ) continue;

            // Facing check: forward vec is (-sinA, -cosA) in this engine's convention
            var dist   = Math.sqrt(distSq);
            var fwdX   = -Math.sin(camera.angle);
            var fwdY   = -Math.cos(camera.angle);
            var dot    = (dx / dist) * fwdX + (dy / dist) * fwdY;
            if (dot < FACE_COS_THRESH) continue;

            found = npcId;
            break;
        }

        if (found !== _promptNpcId) {
            _promptNpcId = found;
            _refreshPrompt();
        }
    }

    function _refreshPrompt() {
        var el = document.getElementById('interact-prompt');
        if (!el) return;
        if (_promptNpcId) {
            var def = _quests[_npcIndex[_promptNpcId]];
            el.textContent = '[F]  Talk to ' + (def ? def.npcName : _promptNpcId);
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    }

    // ─────────────────────────────────────────────────────────
    // Dialog logic
    // ─────────────────────────────────────────────────────────
    function _openDialog(npcId) {
        var questId = _npcIndex[npcId];
        if (!questId) return;

        var qs  = _state[questId];
        var phase;
        switch (qs.phase) {
            case "not_started":       phase = "greeting";          break;
            case "rejected":
                qs.phase = "not_started";                          // offer again
                phase = "greeting";                                break;
            case "active":            phase = "active";            break;
            case "ready_to_complete": phase = "readyToComplete";   break;
            case "complete":          phase = "complete";          break;
            default:                  phase = "greeting";
        }

        _dlgQuestId = questId;
        _dlgNpcId   = npcId;
        _dlgPhase   = phase;
        _dlgLine    = 0;
        _dlgOpen    = true;

        // Release pointer lock so the player can click buttons
        if (document.pointerLockElement) document.exitPointerLock();

        _renderDialog();

        var promptEl = document.getElementById('interact-prompt');
        if (promptEl) promptEl.style.display = 'none';
    }

    // Apply keyboard-focus glow to whichever choice button is selected
    function _applyChoiceFocus(acceptBtn, rejectBtn) {
        var focusAccept = _dlgFocusBtn === 'accept';
        acceptBtn.style.boxShadow   = focusAccept ? '0 0 10px rgba(40,160,80,0.75)' : 'none';
        acceptBtn.style.borderColor = focusAccept ? 'rgba(40,160,80,0.9)'           : '';
        acceptBtn.style.background  = focusAccept ? 'rgba(40,120,80,0.38)'          : '';
        rejectBtn.style.boxShadow   = !focusAccept ? '0 0 10px rgba(160,60,60,0.75)' : 'none';
        rejectBtn.style.borderColor = !focusAccept ? 'rgba(160,60,60,0.9)'           : '';
        rejectBtn.style.background  = !focusAccept ? 'rgba(120,40,40,0.38)'          : '';
    }

    function _renderDialog() {
        var def   = _quests[_dlgQuestId];
        var qs    = _state[_dlgQuestId];
        var lines = (def.dialog[_dlgPhase] || []);
        var isLast = _dlgLine >= lines.length - 1;

        var box        = document.getElementById('dialog-box');
        var nameEl     = document.getElementById('dialog-npc-name');
        var textEl     = document.getElementById('dialog-text');
        var continueBtn = document.getElementById('dialog-continue');
        var acceptBtn   = document.getElementById('dialog-accept');
        var rejectBtn   = document.getElementById('dialog-reject');
        var closeBtn    = document.getElementById('dialog-close');

        if (!box) return;

        nameEl.textContent = def.npcName;
        textEl.textContent = lines[_dlgLine] || '';
        box.style.display  = 'flex';

        // Reset all buttons
        continueBtn.style.display = 'none';
        acceptBtn.style.display   = 'none';
        rejectBtn.style.display   = 'none';
        closeBtn.style.display    = 'none';

        if (!isLast) {
            continueBtn.style.display = 'inline-block';
            return;
        }

        // Last line — show contextual buttons
        if (_dlgPhase === 'greeting' && qs.phase === 'not_started') {
            acceptBtn.textContent = 'Accept';
            acceptBtn.style.display = 'inline-block';
            if (def.canReject) {
                rejectBtn.textContent = 'Reject';
                rejectBtn.style.display = 'inline-block';
                // Default keyboard focus to Reject; Tab will toggle
                if (!_dlgFocusBtn) _dlgFocusBtn = 'reject';
                _applyChoiceFocus(acceptBtn, rejectBtn);
            }
        } else if (_dlgPhase === 'readyToComplete') {
            acceptBtn.textContent = 'Return Item';
            acceptBtn.style.display = 'inline-block';
            closeBtn.textContent  = 'Not Yet';
            closeBtn.style.display = 'inline-block';
        } else {
            closeBtn.textContent = 'Close';
            closeBtn.style.display = 'inline-block';
        }
    }

    function _advance() {
        var lines = (_quests[_dlgQuestId].dialog[_dlgPhase] || []);
        if (_dlgLine < lines.length - 1) {
            _dlgLine++;
            _renderDialog();
        }
    }

    function _onAccept() {
        var qs = _state[_dlgQuestId];
        if (_dlgPhase === 'greeting') {
            qs.phase    = 'active';
            _dlgPhase   = 'accept';
            _dlgLine    = 0;
            QuestStore.save(_dlgQuestId, qs);
            _renderDialog();
        } else if (_dlgPhase === 'readyToComplete') {
            qs.phase    = 'complete';
            _dlgPhase   = 'complete';
            _dlgLine    = 0;
            QuestStore.save(_dlgQuestId, qs);
            _renderDialog();
        }
    }

    function _onReject() {
        var qs = _state[_dlgQuestId];
        qs.phase  = 'rejected';
        _dlgPhase = 'reject';
        _dlgLine  = 0;
        QuestStore.save(_dlgQuestId, qs);
        _renderDialog();
    }

    function _closeDialog() {
        _dlgOpen      = false;
        _dlgQuestId   = null;
        _dlgNpcId     = null;
        _dlgPhase     = null;
        _dlgFocusBtn  = null;
        var box = document.getElementById('dialog-box');
        if (box) box.style.display = 'none';
        // Re-check proximity immediately so prompt can reappear
        _promptNpcId = null;
        _refreshPrompt();
    }

    // ─────────────────────────────────────────────────────────
    // HUD notification (reuses the existing mp-notification element)
    // ─────────────────────────────────────────────────────────
    function _showNotification(msg) {
        var el = document.getElementById('mp-notification');
        if (!el) return;
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(function () { el.style.opacity = '0'; }, 4000);
    }

    // ─────────────────────────────────────────────────────────
    // init — bind DOM buttons and keyboard
    // ─────────────────────────────────────────────────────────
    function init() {
        var continueBtn = document.getElementById('dialog-continue');
        var acceptBtn   = document.getElementById('dialog-accept');
        var rejectBtn   = document.getElementById('dialog-reject');
        var closeBtn    = document.getElementById('dialog-close');

        if (continueBtn) continueBtn.addEventListener('click', _advance);
        if (acceptBtn)   acceptBtn.addEventListener('click', _onAccept);
        if (rejectBtn)   rejectBtn.addEventListener('click', _onReject);
        if (closeBtn)    closeBtn.addEventListener('click', _closeDialog);

        // Rehydrate quest state from storage for all registered quests
        for (var qid in _quests) {
            (function (questId) {
                QuestStore.load(questId, function (saved) {
                    if (saved && _state[questId]) {
                        _state[questId].phase         = saved.phase         || 'not_started';
                        _state[questId].receivedItems = saved.receivedItems || {};
                    }
                });
            })(qid);
        }

        document.addEventListener('keydown', function (e) {
            if (e.repeat) return;

            // Tab — when Accept/Reject choice is visible, toggle keyboard focus between them
            if (e.key === 'Tab' && _dlgOpen && _dlgFocusBtn) {
                e.preventDefault();
                e.stopPropagation();    // keep scoreboard from activating
                _dlgFocusBtn = (_dlgFocusBtn === 'accept') ? 'reject' : 'accept';
                var ab = document.getElementById('dialog-accept');
                var rb = document.getElementById('dialog-reject');
                if (ab && rb) _applyChoiceFocus(ab, rb);
                return;
            }

            if (e.code === 'KeyF') {
                if (_promptNpcId && !_dlgOpen) {
                    _openDialog(_promptNpcId);
                } else if (_dlgOpen) {
                    var lines = (_quests[_dlgQuestId].dialog[_dlgPhase] || []);
                    var isLast = _dlgLine >= lines.length - 1;
                    if (!isLast) {
                        _advance();
                    } else if (_dlgPhase === 'greeting') {
                        // Honour Tab-selected focus: accept or reject
                        if (_dlgFocusBtn === 'reject') _onReject(); else _onAccept();
                    } else if (_dlgPhase === 'readyToComplete') {
                        _onAccept();
                    } else {
                        _closeDialog();
                    }
                }
            }

            if (e.key === 'Escape' && _dlgOpen) _closeDialog();
        });
    }

    // ─────────────────────────────────────────────────────────
    // update — call every frame from Draw()
    // ─────────────────────────────────────────────────────────
    function update() {
        // Auto-close dialog if player walks too far from the NPC
        if (_dlgOpen && _dlgNpcId) {
            var pos = _npcPos[_dlgNpcId];
            if (pos) {
                var dx = pos.x - camera.x;
                var dy = pos.y - camera.y;
                if (dx * dx + dy * dy > DIALOG_LEASH_SQ) {
                    _closeDialog();
                    return;
                }
            }
        }
        _checkProximity();
    }

    // ─────────────────────────────────────────────────────────
    return {
        register:        register,
        setNpcPosition:  setNpcPosition,
        giveKeyItem:     giveKeyItem,
        getState:        getState,
        getAll:          getAll,
        getNpcMarkers:   getNpcMarkers,
        init:            init,
        update:          update
    };

}());
