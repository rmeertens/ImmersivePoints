# Machine Learning Embeddings in VR

Visualize high-dimensional ML embeddings (t-SNE, UMAP, PCA) in 3D space to understand your model's decision boundaries, find outliers, and debug classification failures.

## What You'll Learn

- Reduce high-dimensional data to 3D using t-SNE, UMAP, or PCA
- Color points by true labels, predictions, or confidence scores
- Identify misclassifications and clustering patterns
- Explore embedding spaces interactively in VR

## Real Datasets

### 1. MNIST Digits (Classic)
- 70,000 handwritten digits (0-9)
- 784 dimensions (28×28 pixels)
- Perfect for first embedding visualization

### 2. Fashion-MNIST
- 70,000 fashion items (10 categories)
- Same format as MNIST, more challenging

### 3. Word Embeddings (GloVe/Word2Vec)
- Pre-trained word vectors
- Explore semantic relationships in VR

### 4. Your Own Model Embeddings
- Extract from any neural network layer
- Visualize what your model "sees"

## Quick Start

1. Open `ml_embeddings_visualization.ipynb`
2. Choose a dataset (MNIST included for quick start)
3. Reduce to 3D using t-SNE or UMAP
4. Color by labels or predictions
5. Explore in VR to find patterns

## Requirements

```bash
pip install numpy scikit-learn umap-learn matplotlib immersivepoints
# For deep learning:
pip install torch torchvision  # or tensorflow
```

## Color Coding Strategies

**By Class Label**:
- Each of 10 classes gets a unique hue
- Perfect for supervised learning tasks

**By Prediction Correctness**:
- Green = Correct predictions
- Red = Misclassifications
- Walk through error regions in VR!

**By Prediction Confidence**:
- Bright = High confidence
- Dark = Low confidence
- Find uncertain regions

**By Cluster Assignment**:
- Unsupervised clustering visualization
- See if clusters match true labels

## Dimensionality Reduction Methods

**t-SNE** (t-Distributed Stochastic Neighbor Embedding):
- Best for visualization
- Preserves local structure
- Slow for large datasets (>10K points)

**UMAP** (Uniform Manifold Approximation and Projection):
- Faster than t-SNE
- Preserves global structure better
- Good for large datasets

**PCA** (Principal Component Analysis):
- Fastest, linear method
- May not capture complex patterns
- Good baseline

## Use Cases

- **Model Debugging**: Find systematically misclassified regions
- **Feature Engineering**: Identify which features separate classes
- **Anomaly Detection**: Spot outliers far from clusters
- **Clustering Validation**: Verify if clusters match expectations
- **Representation Learning**: Understand what embeddings capture
