#!/usr/bin/env python3
"""Generate minimal point-cloud test fixtures (< 1 MB each) for e2e tests.

Outputs (all placed alongside this script):
  - tiny_ascii.pcd          ASCII PCD, XYZ + RGB
  - tiny_binary.pcd         Binary PCD, XYZ + RGB
  - tiny_ascii.ply          ASCII PLY, XYZ + RGB
  - tiny_binary.ply         Binary little-endian PLY, XYZ + RGB
  - tiny.las                LAS 1.2 (point format 2, with color)
  - tiny.laz                LAZ 1.2 (point format 2, with color)
  - tiny.e57                E57 single scan, XYZ + RGB

Deterministic (fixed seed) so generated files are stable across runs.
Run: `python3 generate.py` (requires numpy, laspy[lazrs], pye57).
"""
from __future__ import annotations

import math
import os
import struct
from pathlib import Path

import numpy as np

OUT_DIR = Path(__file__).resolve().parent
N_POINTS = 1024  # keeps every format comfortably below 1 MB


def make_points(n: int = N_POINTS):
    rng = np.random.default_rng(seed=42)
    t = np.linspace(0.0, 4.0 * math.pi, n, dtype=np.float64)
    x = (np.cos(t) * (1.0 + 0.1 * t)).astype(np.float32)
    y = (np.sin(t) * (1.0 + 0.1 * t)).astype(np.float32)
    z = (t * 0.1).astype(np.float32)
    r = ((np.sin(t) * 0.5 + 0.5) * 255).astype(np.uint8)
    g = ((np.cos(t) * 0.5 + 0.5) * 255).astype(np.uint8)
    b = (rng.integers(0, 256, size=n)).astype(np.uint8)
    return x, y, z, r, g, b


def write_pcd_ascii(path: Path, x, y, z, r, g, b) -> None:
    n = len(x)
    rgb_packed = (r.astype(np.uint32) << 16) | (g.astype(np.uint32) << 8) | b.astype(np.uint32)
    # PCD stores packed RGB as a float (bit-cast). Use uint32->float32 view.
    rgb_float = rgb_packed.view(np.float32).astype(np.float32) if False else np.frombuffer(
        rgb_packed.astype(np.uint32).tobytes(), dtype=np.float32
    )
    header = (
        "# .PCD v0.7 - Point Cloud Data file format\n"
        "VERSION 0.7\n"
        "FIELDS x y z rgb\n"
        "SIZE 4 4 4 4\n"
        "TYPE F F F F\n"
        "COUNT 1 1 1 1\n"
        f"WIDTH {n}\n"
        "HEIGHT 1\n"
        "VIEWPOINT 0 0 0 1 0 0 0\n"
        f"POINTS {n}\n"
        "DATA ascii\n"
    )
    with path.open("w", encoding="utf-8") as f:
        f.write(header)
        for i in range(n):
            f.write(f"{x[i]:.4f} {y[i]:.4f} {z[i]:.4f} {rgb_float[i]:.9g}\n")


def write_pcd_binary(path: Path, x, y, z, r, g, b) -> None:
    n = len(x)
    header = (
        "# .PCD v0.7 - Point Cloud Data file format\n"
        "VERSION 0.7\n"
        "FIELDS x y z rgb\n"
        "SIZE 4 4 4 4\n"
        "TYPE F F F F\n"
        "COUNT 1 1 1 1\n"
        f"WIDTH {n}\n"
        "HEIGHT 1\n"
        "VIEWPOINT 0 0 0 1 0 0 0\n"
        f"POINTS {n}\n"
        "DATA binary\n"
    ).encode("ascii")
    rgb_packed = (r.astype(np.uint32) << 16) | (g.astype(np.uint32) << 8) | b.astype(np.uint32)
    arr = np.empty(n, dtype=np.dtype([("x", "<f4"), ("y", "<f4"), ("z", "<f4"), ("rgb", "<u4")]))
    arr["x"] = x
    arr["y"] = y
    arr["z"] = z
    arr["rgb"] = rgb_packed
    with path.open("wb") as f:
        f.write(header)
        f.write(arr.tobytes())


def write_ply_ascii(path: Path, x, y, z, r, g, b) -> None:
    n = len(x)
    with path.open("w", encoding="utf-8") as f:
        f.write(
            "ply\n"
            "format ascii 1.0\n"
            f"element vertex {n}\n"
            "property float x\n"
            "property float y\n"
            "property float z\n"
            "property uchar red\n"
            "property uchar green\n"
            "property uchar blue\n"
            "end_header\n"
        )
        for i in range(n):
            f.write(f"{x[i]:.4f} {y[i]:.4f} {z[i]:.4f} {int(r[i])} {int(g[i])} {int(b[i])}\n")


def write_ply_binary(path: Path, x, y, z, r, g, b) -> None:
    n = len(x)
    header = (
        "ply\n"
        "format binary_little_endian 1.0\n"
        f"element vertex {n}\n"
        "property float x\n"
        "property float y\n"
        "property float z\n"
        "property uchar red\n"
        "property uchar green\n"
        "property uchar blue\n"
        "end_header\n"
    ).encode("ascii")
    arr = np.empty(
        n,
        dtype=np.dtype(
            [("x", "<f4"), ("y", "<f4"), ("z", "<f4"),
             ("r", "u1"), ("g", "u1"), ("b", "u1")]
        ),
    )
    arr["x"] = x
    arr["y"] = y
    arr["z"] = z
    arr["r"] = r
    arr["g"] = g
    arr["b"] = b
    with path.open("wb") as f:
        f.write(header)
        f.write(arr.tobytes())


def write_las(path: Path, x, y, z, r, g, b, *, compress: bool = False) -> None:
    import laspy

    header = laspy.LasHeader(point_format=2, version="1.2")
    header.scales = np.array([0.001, 0.001, 0.001])
    header.offsets = np.array([0.0, 0.0, 0.0])
    las = laspy.LasData(header=header)
    las.x = x.astype(np.float64)
    las.y = y.astype(np.float64)
    las.z = z.astype(np.float64)
    # LAS/LAZ colors are 16-bit.
    las.red = (r.astype(np.uint16) * 257)
    las.green = (g.astype(np.uint16) * 257)
    las.blue = (b.astype(np.uint16) * 257)
    if compress:
        las.write(str(path), laz_backend=laspy.LazBackend.Lazrs)
    else:
        las.write(str(path))


def write_e57(path: Path, x, y, z, r, g, b) -> None:
    import pye57

    if path.exists():
        path.unlink()
    e57 = pye57.E57(str(path), mode="w")
    data = {
        "cartesianX": x.astype(np.float64),
        "cartesianY": y.astype(np.float64),
        "cartesianZ": z.astype(np.float64),
        "colorRed": r.astype(np.uint8),
        "colorGreen": g.astype(np.uint8),
        "colorBlue": b.astype(np.uint8),
    }
    e57.write_scan_raw(data, name="tiny_scan")
    e57.close()


def main() -> None:
    os.chdir(OUT_DIR)
    x, y, z, r, g, b = make_points(N_POINTS)

    targets = [
        ("tiny_ascii.pcd", lambda p: write_pcd_ascii(p, x, y, z, r, g, b)),
        ("tiny_binary.pcd", lambda p: write_pcd_binary(p, x, y, z, r, g, b)),
        ("tiny_ascii.ply", lambda p: write_ply_ascii(p, x, y, z, r, g, b)),
        ("tiny_binary.ply", lambda p: write_ply_binary(p, x, y, z, r, g, b)),
        ("tiny.las", lambda p: write_las(p, x, y, z, r, g, b, compress=False)),
        ("tiny.laz", lambda p: write_las(p, x, y, z, r, g, b, compress=True)),
        ("tiny.e57", lambda p: write_e57(p, x, y, z, r, g, b)),
    ]
    for name, fn in targets:
        p = OUT_DIR / name
        fn(p)
        size = p.stat().st_size
        assert size < 1_000_000, f"{name} exceeds 1 MB: {size} bytes"
        print(f"  {name:22s} {size:>8d} bytes")


if __name__ == "__main__":
    main()
