"""Pack the Gaia DR3 CSV described in README.md into the neighborhood preview."""
import argparse
import csv
import json
import math
from pathlib import Path
import struct
from collections import defaultdict

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("csv", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--outer-csv", type=Path)
args = parser.parse_args()

tile_width = 40
bright_count = 12
tiles = defaultdict(list)
source_ids = set()
inputs = [(args.csv, 40, math.inf)]
if args.outer_csv:
    inputs.append((args.outer_csv, 30, 40))
for path, minimum, maximum in inputs:
    with path.open(newline="") as file:
        for row in csv.DictReader(file):
            source_id = int(row["source_id"])
            if source_id in source_ids:
                raise ValueError(f"Duplicate Gaia source: {source_id}")
            source_ids.add(source_id)
            ra, dec = map(math.radians, (float(row["ra"]), float(row["dec"])))
            parallax = float(row["parallax"])
            if not minimum <= parallax < maximum:
                raise ValueError(f"Parallax outside preview selection: {source_id}")
            distance = 3261.5638 / parallax
            magnitude = float(row["phot_g_mean_mag"])
            position = (
                distance * math.cos(dec) * math.cos(ra),
                distance * math.sin(dec),
                -distance * math.cos(dec) * math.sin(ra),
            )
            key = tuple(math.floor(value / tile_width + 0.5) for value in position)
            tiles[key].append((*position, magnitude, source_id))

args.output.mkdir(parents=True, exist_ok=True)
manifest = []
for key, sources in sorted(tiles.items()):
    name = "_".join(map(str, key))
    sources.sort(key=lambda source: (source[3], source[4]))
    bright, detail = sources[:bright_count], sources[bright_count:]
    for suffix, rows in (("bright", bright), ("detail", detail)):
        if rows:
            with (args.output / f"{name}.{suffix}.bin").open("wb") as file:
                for row in rows:
                    file.write(struct.pack("<4fQ", *row))
    manifest.append({
        "id": name,
        "center": [index * tile_width for index in key],
        "bright": len(bright),
        "detail": len(detail),
    })

(args.output / "manifest.json").write_text(json.dumps({
    "tileSize": tile_width,
    "maxDistanceLightYears": 3261.5638 / (30 if args.outer_csv else 40),
    "pointCount": len(source_ids),
    "tiles": manifest,
}, separators=(",", ":")) + "\n")
