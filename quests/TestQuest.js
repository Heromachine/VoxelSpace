// ===============================
// Quest: TestQuest
// NPC:   GreenBox
//
// A demo quest used to validate the quest system end-to-end.
// The GreenBox NPC asks the player to retrieve the Green Fragment
// and return it.
//
// Format: call QuestManager.register() with the quest definition.
// Future: the Quest Editor will generate files like this one.
// ===============================
"use strict";

QuestManager.register({
    // ── Identity ──────────────────────────────────────────────
    id:       "TestQuest",
    npcId:    "greenCube",     // must match the ID used in QuestManager.setNpcPosition()
    npcName:  "GreenBox",
    description: "GreenBox has lost its ancient fragment. Find the Green Fragment somewhere in the world and return it.",

    // ── Rules ─────────────────────────────────────────────────
    canReject: true,           // player may decline this quest

    // ── Key items ─────────────────────────────────────────────
    // All must be returned to the quest giver to complete the quest.
    // Items can be delivered by the player, another player, an NPC,
    // or a system notification (QuestManager.giveKeyItem).
    keyItems: [
        { id: "green_fragment", name: "Green Fragment" }
    ],

    // ── Dialog ────────────────────────────────────────────────
    // Each phase is an array of lines shown one at a time.
    dialog: {
        greeting: [
            "I am the GreenBox. Ancient. Waiting.",
            "My Green Fragment was taken from me long ago.",
            "Will you help me recover it?"
        ],

        accept: [
            "I knew I could count on you.",
            "Seek the Green Fragment — it is somewhere in this world.",
            "Return it to me when you find it."
        ],

        reject: [
            "Understood. Return when you are ready.",
            "I will still be here."
        ],

        active: [
            "Still searching?",
            "The Green Fragment will call to you. You will know it when you see it."
        ],

        readyToComplete: [
            "I can feel it — you carry the Green Fragment.",
            "Please. Return it to me."
        ],

        complete: [
            "The fragment is mine once more. The cycle is complete.",
            "You have my gratitude, warrior.",
            "May the world remember what you did here."
        ]
    }
});
