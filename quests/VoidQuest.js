// ===============================
// Quest: VoidQuest
// NPC:   VoidKeeper  (shadowCube entity — violet cube)
//
// VoidKeeper is an ancient sentinel stationed west of GreenBox.
// Its power source, the Void Crystal, was taken. The player must
// find and return it.
//
// World position: SHADOW_NPC_X (-90), SHADOW_NPC_Y (-120)
// ===============================
"use strict";

QuestManager.register({
    // ── Identity ──────────────────────────────────────────────
    id:       "VoidQuest",
    npcId:    "shadowCube",    // must match QuestManager.setNpcPosition() in shadowCube.js
    npcName:  "VoidKeeper",
    description: "An ancient sentinel stands watch to the west. Its power crystal was taken — recover the Void Crystal and restore the guardian.",

    // ── Rules ─────────────────────────────────────────────────
    canReject: true,

    // ── Key items ─────────────────────────────────────────────
    keyItems: [
        { id: "void_crystal", name: "Void Crystal" }
    ],

    // ── Dialog ────────────────────────────────────────────────
    dialog: {
        greeting: [
            "I am VoidKeeper. My vigil has lasted for centuries.",
            "But my power wanes. The Void Crystal was stolen from me.",
            "Without it I cannot protect this boundary. Will you recover it?"
        ],

        accept: [
            "Good. The crystal is unmistakable —",
            "a dense shard of void energy, dark and cold to the touch.",
            "Find it. Return it to me before the boundary fails."
        ],

        reject: [
            "Then I will endure alone. My watch does not end.",
            "Return if you change your mind. I will still be here."
        ],

        active: [
            "The Void Crystal... its absence is like a wound.",
            "Search the darker reaches of this world. You will know it when you see it."
        ],

        readyToComplete: [
            "You carry the Void Crystal. I can sense its resonance.",
            "Bring it to me. My strength will return."
        ],

        complete: [
            "The Void Crystal is restored. My vigil resumes.",
            "The boundary holds once more — this world is safe, for now.",
            "You have earned the gratitude of an ancient order."
        ]
    }
});
