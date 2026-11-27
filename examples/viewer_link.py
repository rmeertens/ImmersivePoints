"""
Turn a numpy array into an ImmersivePoints viewer link.

Self-contained (needs only numpy), so an AI agent or a script can download
this one file and use it:

    curl -O https://immersivepoints.meertens.dev/examples/viewer_link.py

Usage:

    import numpy as np
    from viewer_link import fit_to_view, hue_from_values, viewer_link

    xyz = fit_to_view(my_xyz)                    # center + scale for a good first view (Z up)
    hue = hue_from_values(my_values)             # scalar value -> hue in [0, 0.55]
    print(viewer_link(np.column_stack([xyz, hue])))

Run it directly for a demo link:  python viewer_link.py
Full guide: https://immersivepoints.meertens.dev/for-ai-agents.html
"""

import base64
import json
import urllib.parse

import numpy as np

VIEWER = "https://immersivepoints.meertens.dev/oculus.html"

# Hues (0-1) that stay readable on the viewer's blue background (#2d4aa8).
# Pure blues and violets (about 0.58-0.78) blend into it, so they are skipped.
CATEGORY_HUES = [0.0, 0.33, 0.14, 0.5, 0.85, 0.08, 0.25, 0.42, 0.93, 0.2]


# The viewer reads X forward, Y left, Z up (the ROS convention), like LiDAR, ROS, GIS and most
# CAD data, so those need no conversion. Data from Y-up tools needs the rotation below.


def y_up_to_z_up(xyz):
    """Rotate Y-up data (three.js, glTF, OBJ, Unity, most game engines: X right, Y up, Z toward
    the viewer) into the viewer's frame: X forward, Y left, Z up. A rotation, so nothing is mirrored."""
    xyz = np.asarray(xyz, dtype=np.float64)
    return np.column_stack([-xyz[:, 2], -xyz[:, 0], xyz[:, 1]])


def fit_to_view(xyz, size=8.0, clip=(1, 99), floor=False):
    """Center on the origin and scale so the bulk of the data spans `size` units.

    Percentile clipping keeps a few stray points from shrinking everything else.
    With floor=True the lowest point sits at z=0, so a VR viewer stands on the data's ground.
    """
    xyz = np.asarray(xyz, dtype=np.float64)
    lo, hi = np.percentile(xyz, clip, axis=0)
    out = (xyz - (lo + hi) / 2) * (size / max(float((hi - lo).max()), 1e-12))
    if floor:
        out[:, 2] -= np.percentile(out[:, 2], clip[0])
    return out


def hue_from_values(values, max_hue=0.55, clip=(2, 98)):
    """Map a continuous value to a hue: red (low) -> yellow -> green -> cyan (high)."""
    v = np.asarray(values, dtype=np.float64)
    lo, hi = np.percentile(v, clip)
    return np.clip((v - lo) / max(hi - lo, 1e-12), 0.0, 1.0) * max_hue


def hue_from_labels(labels):
    """Map integer or string class labels to distinct, readable hues."""
    _, idx = np.unique(np.asarray(labels), return_inverse=True)
    return np.asarray(CATEGORY_HUES * (idx.max() // len(CATEGORY_HUES) + 1))[idx]


def subsample(points, max_points=500_000, seed=0):
    """Randomly keep at most `max_points` rows (keeps VR smooth on standalone headsets)."""
    points = np.asarray(points)
    if len(points) <= max_points:
        return points
    keep = np.random.default_rng(seed).choice(len(points), max_points, replace=False)
    return points[np.sort(keep)]


def encode_points(points):
    """Nx4 (XYZI) or Nx6 (XYZRGB) array -> (base64 string, point type)."""
    pts = np.asarray(points, dtype=np.float32)
    if pts.ndim != 2 or pts.shape[1] not in (3, 4, 6):
        raise ValueError(f"expected an Nx4 (XYZI) or Nx6 (XYZRGB) array, got shape {pts.shape}")
    if pts.shape[1] == 3:  # XYZ only: add a single readable hue
        pts = np.column_stack([pts, np.full(len(pts), 0.14, dtype=np.float32)])
    if not np.isfinite(pts).all():
        raise ValueError("points contain NaN or inf; drop or fill them first")
    if pts.shape[1] == 6 and (pts[:, 3:].min() < 0 or pts[:, 3:].max() > 1):
        raise ValueError("RGB values must be in 0-1 (divide 0-255 colors by 255)")
    point_type = "XYZI" if pts.shape[1] == 4 else "XYZRGB"
    # The viewer reads big-endian float32, row by row.
    return base64.b64encode(pts.astype(">f4").tobytes()).decode("ascii"), point_type


def viewer_link(points=None, url=None, point_type=None, point_size=None,
                bboxes_url=None, lines_url=None, auto_rotate=False, show_axes=False, version=None):
    """Build a viewer link.

    points: numpy array embedded in the link itself (good up to roughly 30k points).
    url:    a hosted, CORS-enabled .xyzi / .xyzrgb / .cldn file (for anything bigger).
    point_size: point diameter in scene units (the viewer's default is 0.02).
    version: any text; viewers cache hosted files (url=, bboxes_url=, lines_url=) until it changes.
            Bump it whenever you replace those files. Inline points are in the link and never cached.
    The data goes after '#', so it never reaches a web server and has no server URL limit.
    """
    if (points is None) == (url is None):
        raise ValueError("pass exactly one of points= or url=")
    if points is not None:
        data, point_type = encode_points(points)
        entry = {"source": "base64", "base64": data, "type": point_type}
    else:
        if point_type is None:
            path = url.split("?")[0].lower()
            point_type = "CLOUDINI" if path.endswith(".cldn") else "XYZI" if path.endswith("xyzi") else "XYZRGB"
        entry = {"source": "url", "url": url, "type": point_type}
    if point_size is not None:
        entry["pointSize"] = float(point_size)

    config = {"points": [entry]}
    if version is not None:
        config["version"] = str(version)
    if bboxes_url:
        config["bboxes"] = [{"source": "url", "url": bboxes_url}]
    if lines_url:
        config["lines"] = [{"source": "url", "url": lines_url}]

    params = {"jsonb64": base64.b64encode(json.dumps(config).encode()).decode("ascii")}
    if auto_rotate:
        params["autoRotate"] = "true"
    if show_axes:
        params["showAxes"] = "true"
    return VIEWER + "#" + urllib.parse.urlencode(params)


if __name__ == "__main__":
    # Demo: a trefoil knot tube, colored along its length.
    t = np.linspace(0, 2 * np.pi, 12_000)
    knot = np.column_stack([np.sin(t) + 2 * np.sin(2 * t), np.cos(t) - 2 * np.cos(2 * t), -np.sin(3 * t)])
    rng = np.random.default_rng(0)
    xyz = fit_to_view(knot + rng.normal(scale=0.12, size=knot.shape), size=8)
    print(viewer_link(np.column_stack([xyz, hue_from_values(t)]), point_size=0.035, auto_rotate=True))
