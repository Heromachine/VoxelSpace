# VoxelSpace Development Notes

## Critical Issue: Settings Save System (2026-02-04)

### Problem

The "Save" button saves to browser `localStorage` instead of hard-coding values into the source.

**Current Behavior:**
- Save button stores settings in `localStorage` (key: `voxelSpaceSettings`)
- Settings only persist in the same browser on the same machine
- GitHub Pages visitors see default hard-coded values, not saved settings
- This causes gun position/rotation mismatches between dev machine and production

**Intended Behavior:**
- Save button should be a **development tool** that hard-codes values into the source
- Settings panel is for development/tuning, NOT end-user preferences
- Saved configurations should persist in the actual code for all users

### Files and Locations

- **Default gun values:** `index.html` lines 677-707 (the `gunModel` object)
- **Save button logic:** `index.html` lines 3661-3665 (localStorage save)
- **Load logic:** `index.html` lines 3677-3690 (localStorage load on startup)

### Fix Instructions

1. **Extract current localStorage settings from this Mac's browser:**
   - Open browser console on the running game
   - Run: `console.log(JSON.stringify(JSON.parse(localStorage.getItem('voxelSpaceSettings')), null, 2))`
   - Copy the output

2. **Update defaults in index.html lines 677-707** with the extracted values

3. **Clear localStorage after updating** to verify hard-coded defaults work:
   - Run: `localStorage.removeItem('voxelSpaceSettings')`

4. **Fix the Save button** - change it to output copy-pasteable code instead of saving to localStorage

### Settings That May Need Hard-Coding

- Gun position (X, Y, Z offsets)
- Gun scale
- Gun rotation (X, Y, Z)
- ADS vs Hip Fire mode settings
- Barrel positioning and yaw
- World offsets (forward, right, down)
