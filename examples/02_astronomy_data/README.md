# Astronomy Data Visualization in VR

Navigate through real star catalogs and explore the 3D structure of our galaxy in virtual reality.

## What You'll Learn

- Download real astronomical catalogs from Gaia, Hipparcos, and other surveys
- Convert celestial coordinates (RA, Dec, Distance) to 3D Cartesian space
- Color stars by temperature, magnitude, or spectral type
- Explore star clusters, nebulae, and local stellar neighborhood

## Real Datasets

### 1. Gaia DR3 - Brightest Stars
The [Gaia mission](https://www.cosmos.esa.int/web/gaia) has mapped over 1 billion stars. We'll use a subset:
- **Source**: ESA Gaia Archive
- **Size**: ~10,000 nearest and brightest stars
- **Data**: Position, parallax (distance), magnitude, color

### 2. Hipparcos Catalog
Classic star catalog with precise positions:
- **Source**: ESA Hipparcos mission
- **Size**: 118,000 stars
- **Data**: Position, proper motion, parallax

### 3. Open Star Clusters
- **Pleiades** (M45) - Young open cluster, ~1,000 stars
- **Hyades** - Nearest open cluster, ~500 stars

## Quick Start

1. Open the Jupyter notebook: `astronomy_visualization.ipynb`
2. Choose a dataset (Gaia nearest stars or Hipparcos catalog)
3. The script downloads and converts the data automatically
4. View the generated VR link

## Requirements

```bash
pip install astropy astroquery numpy pandas
```

## Color Coding Options

**By Temperature (B-V color index)**:
- Blue stars (hot, O/B type) → hue 0.6
- White stars (medium, A/F type) → hue 0.5
- Yellow stars (Sun-like, G type) → hue 0.15
- Red stars (cool, K/M type) → hue 0.0

**By Magnitude (brightness)**:
- Bright stars → larger point size
- Dim stars → smaller point size

## Coordinate Systems

Astronomical coordinates (RA, Dec, Distance) are converted to 3D Cartesian:
```python
x = distance * cos(Dec) * cos(RA)
y = distance * cos(Dec) * sin(RA)
z = distance * sin(Dec)
```

Where our Sun is at the origin (0, 0, 0).

## Fun Facts

- Walk to Alpha Centauri (nearest star system) at 4.37 light-years
- See the Pleiades cluster shape in 3D (~444 light-years away)
- Understand why constellations are just 2D projections of 3D space
- Observe the "local bubble" structure of nearby stars
