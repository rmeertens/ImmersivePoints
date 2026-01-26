# LiDAR Urban Planning Visualization

Explore real city-scale LiDAR scans in VR for urban planning, architecture analysis, and infrastructure assessment.

## What You'll Learn

- Load and process LAS/LAZ LiDAR files
- Color-code points by height, intensity, or classification
- Subsample large datasets for VR performance
- Analyze urban environments in immersive 3D

## Real Datasets

### Free Public LiDAR Data Sources:

1. **USGS 3DEP** (United States)
   - URL: https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/
   - Coverage: Major US cities
   - Format: LAS 1.2-1.4

2. **OpenTopography** (Global)
   - URL: https://opentopography.org/
   - Coverage: Worldwide high-resolution terrain
   - Requires free registration

3. **Amsterdam 3D** (Netherlands)
   - URL: https://3d.amsterdam.nl/
   - Format: LAZ, excellent urban data

4. **UK Environment Agency LiDAR**
   - URL: https://environment.data.gov.uk/
   - Coverage: England, Wales
   - Resolution: up to 25cm

5. **Sample Datasets in this folder:**
   - `sample_urban_area.las` - Small downtown area
   - Link to larger datasets in notebook

## Quick Start

1. Download a small LiDAR file (instructions in notebook)
2. Open `lidar_visualization.ipynb`
3. Load and subsample the data
4. Color-code by height or building classification
5. View in VR

## Requirements

```bash
pip install laspy numpy pandas immersivepoints
# For LAZ compression support:
pip install laszip
```

## Color Coding Options

**By Height (Elevation)**:
- Ground level → Blue (hue 0.6)
- Mid-height buildings → Green/Yellow (hue 0.3-0.15)
- Tall buildings → Red (hue 0.0)

**By LiDAR Classification**:
- Ground → Brown (hue 0.08)
- Vegetation → Green (hue 0.33)
- Buildings → Gray (hue 0.0)
- Water → Blue (hue 0.6)

**By Intensity** (Reflectivity):
- Low intensity → Dark (hue 0.0)
- High intensity → Bright (hue 0.5)

## Performance Tips

LiDAR files can be **huge** (100M+ points). For VR:
- **Subsample**: Use every Nth point (1:10 or 1:100 ratio)
- **Crop**: Select only area of interest
- **Target**: 100K-1M points for smooth VR performance

## Use Cases

- **Urban planning**: Visualize building heights and density
- **Shadow analysis**: See sunlight exposure at street level
- **Infrastructure**: Assess power lines, bridges, roads
- **Change detection**: Compare scans before/after construction
- **Virtual tours**: Walk through cities at scale
