# ImmersivePoints Examples

Practical projects with real datasets to get you started with VR point cloud visualization.

## Quick Start Projects

Each project folder contains:
- 📘 **README.md** - Overview, datasets, and requirements
- 📓 **Jupyter Notebook** - Working code with step-by-step instructions
- 🔗 **Real data sources** - Links to download actual datasets

## Available Projects

### 01. Molecular Structures in VR
**Folder:** `01_molecular_structures/`

Visualize proteins from the Protein Data Bank in virtual reality.

- **Dataset:** RCSB PDB (Protein Data Bank)
- **Examples:** Hemoglobin, Insulin, COVID spike protein, DNA
- **What you'll learn:** Parse PDB files, color by element, explore at atomic scale

**Quick start:**
```bash
cd 01_molecular_structures
jupyter notebook molecular_visualization.ipynb
```

---

### 02. Astronomy & Star Catalogs
**Folder:** `02_astronomy_data/`

Navigate through real star catalogs and explore galactic structure.

- **Datasets:** Gaia DR3, Hipparcos, synthetic star fields
- **What you'll learn:** Convert celestial coordinates to 3D, color by temperature, create clusters

**Quick start:**
```bash
cd 02_astronomy_data
jupyter notebook astronomy_visualization.ipynb
```

---

### 03. LiDAR Urban Planning
**Folder:** `03_lidar_urban_planning/`

Process city-scale LiDAR scans for urban analysis.

- **Datasets:** USGS 3DEP, OpenTopography, Amsterdam 3D
- **What you'll learn:** Load LAS/LAZ files, subsample large datasets, color by height/classification

**Quick start:**
```bash
cd 03_lidar_urban_planning
jupyter notebook lidar_visualization.ipynb
```

---

### 04. Machine Learning Embeddings
**Folder:** `04_ml_embeddings/`

Visualize high-dimensional ML embeddings in 3D space.

- **Datasets:** MNIST, Fashion-MNIST, your own models
- **What you'll learn:** t-SNE/UMAP/PCA reduction, debug classifiers, find misclassifications

**Quick start:**
```bash
cd 04_ml_embeddings
jupyter notebook ml_embeddings_visualization.ipynb
```

---

### 05. Sports Analytics
**Folder:** `05_sports_analytics/`

Analyze player tracking and game strategy data.

- **Datasets:** StatsBomb Open Data, Metrica Sports samples
- **What you'll learn:** Process tracking data, create heatmaps, analyze tactics

**Quick start:**
```bash
cd 05_sports_analytics
jupyter notebook sports_tracking_visualization.ipynb
```

---

## Legacy Examples

These examples were created for the original version of ImmersivePoints:

- `Astyx dataset lidar and radar.ipynb` - Automotive radar and LiDAR
- `Export PandaSet.ipynb` - Self-driving car dataset
- `export_AEV_data.ipynb` - Audi dataset export
- `export_csv.ipynb` - CSV file conversion
- `export_embeddings.ipynb` - ML embeddings (older version)
- `export_ply.ipynb` - PLY file format
- `export_subsample.ipynb` - Subsampling large point clouds
- `inline_visualization.ipynb` - Basic inline rendering examples

---

## Installation

All projects require:
```bash
pip install numpy immersivepoints
```

Project-specific requirements are listed in each folder's README.

## Need Help?

- 📖 Main documentation: [README.md](../README.md)
- 🐛 Issues: [GitHub Issues](https://github.com/rmeertens/ImmersivePoints/issues)
- 💡 Ideas: Check out our [blog](https://immersivepoints.com/blog.html) for more use cases

## Contributing

Have a cool example? We'd love to see it! Create a pull request with:
1. A new folder following the naming convention
2. README.md explaining the project
3. Jupyter notebook with working code
4. Links to real, publicly available datasets
