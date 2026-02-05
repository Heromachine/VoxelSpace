# VoxelSpace Development Notes

## JSON Config System (2026-02-04)

### Overview

Settings are now stored in JSON files in the `data/` folder, following the pattern from FPS Game project. This solves the localStorage problem - JSON files are committed to the repo and work for all users.

### File Structure

```
VoxelSpace-master/
├── data/                    # JSON config files (pure data)
│   ├── settings.json        # Camera, player, bullet, UI settings
│   ├── gunModel.json        # Gun positioning (ADS/Hip fire)
│   ├── weapons.json         # Weapon definitions
│   └── display.json         # Display/graphics settings
├── modules/                 # JavaScript modules (have functions)
│   ├── displayConfig.js     # Display config with helper functions
│   ├── weaponConfig.js      # Weapon helpers (getWeaponLength, etc.)
│   ├── scopeForwardPosition.js  # Forward position scope renderer
│   └── scopeFocalLength.js  # Crop zoom scope renderer
└── index.html               # Main game file with ConfigLoader
```

### How It Works

1. **On startup:** `ConfigLoader.loadAll()` fetches JSON files from `data/`
2. **Settings applied:** Gun model, weapons, etc. are configured from JSON
3. **localStorage fallback:** If JSON fails, falls back to localStorage
4. **Save button:** Saves to localStorage AND copies JSON to clipboard

### Updating Settings

1. **In-game:** Adjust settings using the Settings panel
2. **Click Save:** Settings saved to localStorage AND JSON copied to clipboard
3. **Update files:** Paste clipboard content into:
   - `data/settings.json` (camera, player, bullet settings)
   - `data/gunModel.json` (gun positioning)
4. **Commit:** Changes persist for all users via git

### Console Commands

```javascript
// Clear localStorage settings
clearVoxelSettings()

// Reload JSON configs without page refresh
reloadJsonConfigs()
```

### JSON File Formats

**settings.json:**
```json
{
  "camera": { "fov": 90, "pitchOffset": 0, "targetFPS": 60 },
  "player": { "playerHeight": 80, "normalHeight": 80, ... },
  "bullet": { "bulletSize": 2.0, "barrelDistance": 5 },
  "scope": { "mode": "crop" }
}
```

**gunModel.json:**
```json
{
  "ads": { "offsetX": 0, "offsetY": 100, "scale": 350, ... },
  "hip": { "offsetX": 100, "offsetY": 50, "scale": 300, ... },
  "barrel": { "x": 0.26, "y": 0.08, "z": 0.0, "distance": 5 },
  "world": { "forward": 10, "right": 15, "down": 8 }
}
```

---

## Previous Issue (Resolved)

The old system saved to `localStorage` only, which didn't persist across machines. This is now solved by the JSON config system above.
