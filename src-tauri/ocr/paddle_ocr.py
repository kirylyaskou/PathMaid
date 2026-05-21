import argparse
import contextlib
import hashlib
import io
import json
import os
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")


def eprint(*args):
    print(*args, file=sys.stderr)


def image_paths_from_pdf(path: Path, tmp_dir: Path) -> list[Path]:
    try:
        from pypdf import PdfReader
    except Exception as exc:
        raise RuntimeError("pypdf is required for PDF OCR. Install src-tauri/ocr/requirements.txt") from exc

    reader = PdfReader(str(path))
    images: list[Path] = []
    seen_hashes: set[str] = set()
    for page_index, page in enumerate(reader.pages):
        for image_index, image_file in enumerate(page.images):
            image = image_file.image
            if image.width < 80 or image.height < 80:
                continue
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            digest = hashlib.sha256(buffer.getvalue()).hexdigest()
            if digest in seen_hashes:
                continue
            seen_hashes.add(digest)
            out = tmp_dir / f"page-{page_index + 1}-{image_index + 1}.png"
            out.write_bytes(buffer.getvalue())
            images.append(out)
    return images


def input_images(path: Path, tmp_dir: Path) -> list[Path]:
    if path.suffix.lower() == ".pdf":
        images = image_paths_from_pdf(path, tmp_dir)
        if not images:
            raise RuntimeError("No usable images found in PDF.")
        return images
    return [path]


def create_ocr(lang: str):
    try:
        from paddleocr import PaddleOCR
    except Exception as exc:
        raise RuntimeError(
            "PaddleOCR is not installed. Run: python -m pip install -r src-tauri/ocr/requirements.txt"
        ) from exc

    try:
        return PaddleOCR(
            lang=lang,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )
    except TypeError:
        return PaddleOCR(lang=lang, use_angle_cls=False)


def as_json_result(result) -> dict:
    data = getattr(result, "json", None)
    if callable(data):
        data = data()
    if isinstance(data, dict) and isinstance(data.get("res"), dict):
        return data["res"]
    if isinstance(data, dict):
        return data
    return {}


def lines_from_predict_result(result) -> list[dict]:
    data = as_json_result(result)
    texts = data.get("rec_texts") or data.get("texts") or []
    scores = data.get("rec_scores") or data.get("scores") or []
    lines = []
    for index, text in enumerate(texts):
        if not isinstance(text, str) or not text.strip():
            continue
        score = scores[index] if index < len(scores) else None
        try:
            score = float(score) if score is not None else None
        except (TypeError, ValueError):
            score = None
        lines.append({"text": text.strip(), "score": score})
    return lines


def lines_from_legacy_result(result) -> list[dict]:
    lines = []
    pages = result if isinstance(result, list) else []
    if len(pages) == 1 and isinstance(pages[0], list):
        pages = pages[0]
    for item in pages:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        text_score = item[1]
        if not isinstance(text_score, (list, tuple)) or len(text_score) < 1:
            continue
        text = text_score[0]
        if not isinstance(text, str) or not text.strip():
            continue
        score = text_score[1] if len(text_score) > 1 else None
        try:
            score = float(score) if score is not None else None
        except (TypeError, ValueError):
            score = None
        lines.append({"text": text.strip(), "score": score})
    return lines


def recognize_image(ocr, path: Path) -> list[dict]:
    if hasattr(ocr, "predict"):
        with contextlib.redirect_stdout(sys.stderr):
            results = list(ocr.predict(str(path)))
        lines: list[dict] = []
        for result in results:
            lines.extend(lines_from_predict_result(result))
        return lines
    with contextlib.redirect_stdout(sys.stderr):
        return lines_from_legacy_result(ocr.ocr(str(path), cls=False))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--lang", default="en")
    args = parser.parse_args()

    source = Path(args.input)
    if not source.exists():
        raise RuntimeError(f"Input file not found: {source}")

    with contextlib.redirect_stdout(sys.stderr):
        ocr = create_ocr(args.lang)
    with tempfile.TemporaryDirectory(prefix="pathmaid-ocr-pages-") as tmp:
        pages = []
        for page_index, image_path in enumerate(input_images(source, Path(tmp))):
            lines = recognize_image(ocr, image_path)
            pages.append({"pageIndex": page_index, "lines": lines})

    text = "\n".join(line["text"] for page in pages for line in page["lines"])
    print(json.dumps({"text": text, "pages": pages}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        eprint(str(exc))
        raise SystemExit(1)
