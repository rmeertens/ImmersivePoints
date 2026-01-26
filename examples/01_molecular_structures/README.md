# Molecular Structure Visualization in VR

Explore protein and molecular structures in virtual reality by converting PDB (Protein Data Bank) files into 3D point clouds.

## What You'll Learn

- Download real protein structures from the RCSB Protein Data Bank
- Parse PDB files to extract atomic coordinates
- Color atoms by element type (carbon, oxygen, nitrogen, etc.)
- Visualize molecular structures at human scale in VR

## Real Datasets

We use publicly available protein structures from the [RCSB Protein Data Bank](https://www.rcsb.org/):

1. **Hemoglobin** (PDB: 1A3N) - Oxygen-carrying protein in blood
2. **Insulin** (PDB: 1MSO) - Hormone regulating blood sugar
3. **DNA Double Helix** (PDB: 1BNA) - Classic DNA structure
4. **SARS-CoV-2 Spike Protein** (PDB: 6VXX) - COVID-19 virus spike

## Quick Start

1. Open the Jupyter notebook: `molecular_visualization.ipynb`
2. Run the cells to download a protein structure
3. The script will convert it to VR-ready format
4. View the generated link in your VR headset

## Requirements

```bash
pip install biopython numpy requests
```

## Color Coding

Atoms are colored by element:
- **Carbon**: Gray (hue 0.0)
- **Oxygen**: Red (hue 0.0)
- **Nitrogen**: Blue (hue 0.6)
- **Sulfur**: Yellow (hue 0.15)
- **Phosphorus**: Orange (hue 0.08)
- **Others**: White (hue 0.5)

## Example Output

After running the notebook, you'll get:
- A binary `.xyzi` file ready for VR
- A direct link to view in immersivepoints.com
- ~10,000-50,000 points depending on protein size
