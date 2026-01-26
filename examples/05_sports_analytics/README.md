# Sports Analytics & Player Tracking in VR

Visualize player movement data in 3D space to analyze game strategy, player performance, and tactical patterns.

## What You'll Learn

- Load player tracking data from sports datasets
- Map field position + time to 3D coordinates
- Color-code by team, player, or event type
- Analyze entire games in VR

## Real Datasets

### 1. StatsBomb Open Data (Soccer)
- URL: https://github.com/statsbomb/open-data
- Format: JSON event data with x,y coordinates
- Includes World Cups, Champions League, etc.
- **FREE** and detailed

### 2. Metrica Sports Sample Data (Soccer)
- URL: https://github.com/metrica-sports/sample-data
- Format: CSV with player tracking at 25Hz
- Includes full match tracking data
- Perfect for learning

### 3. NBA Tracking Data (Basketball)
- Second Spectrum tracking data (limited free samples)
- Player positions at 25 FPS

### 4. NFL Next Gen Stats (American Football)
- Available through NFL's Big Data Bowl competitions
- Player tracking with speed, acceleration

## Quick Start

1. Open `sports_tracking_visualization.ipynb`
2. Download sample data (automatic in notebook)
3. Choose visualization type:
   - Full game trajectory (time as Z-axis)
   - Heat maps (position density)
   - Pass networks
4. View in VR

## Requirements

```bash
pip install numpy pandas requests immersivepoints
# For StatsBomb data:
pip install statsbombpy
```

## Coordinate Systems

### Soccer Field Mapping:
```
Field: 105m × 68m (standard)
X: 0-105m (length)
Y: 0-68m (width)
Z: Time or game importance
```

### 3D Visualization Strategies:

**Option 1: Time as Z-axis**
- X, Y = field position
- Z = game time (0-90 minutes)
- See player trajectories through match

**Option 2: Height for Event Importance**
- X, Y = field position
- Z = event importance score
- Peaks show key moments (goals, shots, etc.)

**Option 3: Speed/Acceleration**
- Color by player speed
- Point size by acceleration
- Identify sprint patterns

## Color Coding

**By Team**:
- Home team: hue 0.0 (red)
- Away team: hue 0.6 (blue)

**By Player**:
- Each player gets unique hue
- Track individual movement

**By Event Type**:
- Passes: green
- Shots: red
- Tackles: yellow
- Goals: bright white/gold

## Use Cases

- **Tactical Analysis**: See defensive shape, pressing patterns
- **Player Comparison**: Overlay multiple players' heatmaps
- **Pattern Recognition**: Find repeated play patterns
- **Performance Review**: Review game with coaching staff in VR
- **Broadcast Innovation**: Create immersive game replays
