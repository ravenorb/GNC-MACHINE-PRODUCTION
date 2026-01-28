#!/usr/bin/env python3
"""Parse cut sheet PDFs into simple JSON metadata attachments."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SAMPLES_DIR = ROOT / "samples"
OUTPUT_DIR = ROOT / "data" / "cutsheets"


@dataclass
class FileEntry:
    path: Path
    product: str
    station_code: str | None
    run_number: str | None


FILENAME_PATTERN = re.compile(
    r"^(?P<product>.+?)\s*-?\s*(?P<run>\d+)(?P<station>[A-Z]+)$"
)
PART_PATTERN = re.compile(r"\b(FR-[A-Z0-9]+)\b")
GAUGE_PATTERN = re.compile(r"\b(\d{1,2})\s*GA\b", re.IGNORECASE)
SHEET_SIZE_PATTERN = re.compile(
    r"(?P<width>\d+(?:\.\d+)?)'\s*[xX]\s*(?P<length>\d+(?:\.\d+)?)'"
)


def parse_filename(path: Path) -> FileEntry:
    stem = path.stem
    match = FILENAME_PATTERN.match(stem)
    if match:
        product = match.group("product").strip()
        return FileEntry(
            path=path,
            product=product,
            station_code=match.group("station"),
            run_number=match.group("run"),
        )
    return FileEntry(path=path, product=stem, station_code=None, run_number=None)


def material_hint_from_product(product: str) -> str | None:
    match = re.search(r"([A-Z]{2,})$", product)
    return match.group(1) if match else None


def read_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_parts_from_table(lines: list[str]) -> list[dict]:
    parts: list[dict] = []
    for line in lines:
        if not line.strip():
            continue
        match = re.match(r"^(FR-[A-Z0-9]+)\s+(.*)\s+(\d+)$", line.strip())
        if match:
            parts.append(
                {
                    "part_number": match.group(1),
                    "description": match.group(2).strip(),
                    "quantity": int(match.group(3)),
                    "source": "item_table",
                }
            )
    return parts


def extract_parts_from_lines(lines: Iterable[str]) -> list[dict]:
    parts: list[dict] = []
    for line in lines:
        if not line.strip():
            continue
        match = re.match(r"^(FR-[A-Z0-9]+)\s+(.*)$", line.strip())
        if not match:
            continue
        part_number = match.group(1)
        rest = match.group(2).strip()
        weight = None
        dimensions = None
        weight_match = re.search(r"\b(\d+\.\d+)\b", rest)
        if weight_match:
            weight = float(weight_match.group(1))
        dim_match = re.search(r"(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)", rest)
        if dim_match:
            dimensions = {
                "length": float(dim_match.group(1)),
                "width": float(dim_match.group(2)),
            }
        parts.append(
            {
                "part_number": part_number,
                "details": rest,
                "weight_lb": weight,
                "dimensions_in": dimensions,
                "source": "line_scan",
            }
        )
    return parts


def collect_related_files(entries: list[FileEntry], current: FileEntry) -> list[dict]:
    related: list[dict] = []
    for entry in entries:
        if entry.path == current.path:
            continue
        if entry.product != current.product:
            continue
        relation = "same_product"
        if current.station_code and entry.station_code == current.station_code:
            relation = "same_station"
        related.append(
            {
                "path": str(entry.path.relative_to(ROOT)),
                "extension": entry.path.suffix.lower().lstrip("."),
                "station_code": entry.station_code,
                "relation": relation,
            }
        )
    return related


def parse_sheet_size(text: str) -> dict | None:
    match = SHEET_SIZE_PATTERN.search(text)
    if not match:
        return None
    width = float(match.group("width"))
    length = float(match.group("length"))
    if width > 20 or length > 30:
        return None
    return {"width": width, "length": length}


def extract_metadata(entry: FileEntry, all_entries: list[FileEntry]) -> dict:
    text = read_pdf_text(entry.path)
    lines = [line.strip() for line in text.splitlines()]

    parts: list[dict] = []
    if any("ITEM #" in line for line in lines):
        try:
            start_index = next(i for i, line in enumerate(lines) if "ITEM #" in line)
        except StopIteration:
            start_index = None
        if start_index is not None:
            table_lines = []
            for line in lines[start_index + 1 :]:
                if line.startswith("DWG#"):
                    break
                table_lines.append(line)
            parts = extract_parts_from_table(table_lines)

    if not parts:
        parts = extract_parts_from_lines(lines)

    gauge_match = GAUGE_PATTERN.search(text)

    return {
        "cutsheet": {
            "file_name": entry.path.name,
            "source_pdf": str(entry.path.relative_to(ROOT)),
            "product": entry.product,
            "station_code": entry.station_code,
            "run_number": entry.run_number,
            "material_hint": material_hint_from_product(entry.product),
            "file_type": entry.path.suffix.lower().lstrip("."),
        },
        "parsed_from_pdf": {
            "gauge": gauge_match.group(1) if gauge_match else None,
            "sheet_size_ft": parse_sheet_size(text),
        },
        "parts": parts,
        "related_files": collect_related_files(all_entries, entry),
        "extracted_text_excerpt": "\n".join(lines[:40]),
    }


def write_metadata() -> list[dict]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(SAMPLES_DIR.glob("*.pdf"))
    entries = [parse_filename(pdf) for pdf in pdfs + list(SAMPLES_DIR.glob("*.MPF"))]
    pdf_entries = [entry for entry in entries if entry.path.suffix.lower() == ".pdf"]

    index: list[dict] = []
    for entry in pdf_entries:
        metadata = extract_metadata(entry, entries)
        output_path = OUTPUT_DIR / f"{entry.path.stem}.json"
        output_path.write_text(json.dumps(metadata, indent=2, sort_keys=True))
        index.append(
            {
                "product": entry.product,
                "station_code": entry.station_code,
                "cutsheet_metadata": str(output_path.relative_to(ROOT)),
            }
        )
    return index


def main() -> None:
    index = write_metadata()
    index_path = OUTPUT_DIR / "index.json"
    index_path.write_text(json.dumps(index, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
