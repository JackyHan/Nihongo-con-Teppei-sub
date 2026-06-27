#!/usr/bin/env python3
"""
Build one web-player episode JSON file from a three-line SRT transcript.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from subtitle_exports import build_web_episode_payload, write_web_episode_json


SRT_TIMESTAMP_RE = re.compile(r"(?P<h>\d{2}):(?P<m>\d{2}):(?P<s>\d{2}),(?P<ms>\d{3})")


def parse_srt_timestamp(text: str) -> float:
    match = SRT_TIMESTAMP_RE.fullmatch(text.strip())
    if not match:
        raise ValueError(f"Invalid SRT timestamp: {text!r}")
    parts = {k: int(v) for k, v in match.groupdict().items()}
    return parts["h"] * 3600 + parts["m"] * 60 + parts["s"] + parts["ms"] / 1000.0


def parse_srt(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8-sig")
    blocks = re.split(r"\n\s*\n", text.replace("\r\n", "\n").strip())
    entries = []
    for idx, block in enumerate(blocks):
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if len(lines) < 2:
            continue
        line_idx = 1 if re.fullmatch(r"\d+", lines[0]) else 0
        if line_idx >= len(lines) or "-->" not in lines[line_idx]:
            continue
        start_text, end_text = [part.strip() for part in lines[line_idx].split("-->", 1)]
        body = lines[line_idx + 1:]
        if not body:
            continue
        jp = body[0]
        zh = body[1] if len(body) >= 2 else ""
        en = "\n".join(body[2:]) if len(body) >= 3 else ""
        start = parse_srt_timestamp(start_text)
        end = parse_srt_timestamp(end_text)
        entries.append(
            {
                "id": idx,
                "start": start,
                "end": end,
                "jp": jp,
                "zh": zh,
                "en": en,
            }
        )
    if not entries:
        raise ValueError("No subtitle entries found in the SRT file.")
    return entries


def build_episode_payload(args: argparse.Namespace) -> dict:
    entries = parse_srt(Path(args.srt))
    normalized_entries = [
        {
            "id": entry["id"],
            "start": entry["start"],
            "end": entry["end"],
            "jp": entry["jp"],
            "zh": entry["zh"],
            "en": entry["en"],
        }
        for entry in entries
    ]
    return build_web_episode_payload(
        episode_id=args.episode_id,
        title=args.title,
        media_url=args.media_url or args.audio_url,
        source_url=args.source_url,
        entries=normalized_entries,
        media_type=args.media_type,
        series_id=args.series_id,
        series_title=args.series_title,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--episode-id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--audio-url", default="")
    parser.add_argument("--media-url", default="")
    parser.add_argument("--media-type", choices=("audio", "video"), default="audio")
    parser.add_argument("--series-id", default="teppei")
    parser.add_argument("--series-title", default="Nihongo con Teppei")
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--srt", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    payload = build_episode_payload(args)
    write_web_episode_json(payload, Path(args.output))


if __name__ == "__main__":
    main()
