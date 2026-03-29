"""OCR line clustering tests."""

from app.services.layout_analysis.fallback import cluster_words_into_line_blocks
from app.services.layout_analysis.schemas import OcrWordBox


def test_cluster_two_lines():
    words = [
        OcrWordBox(text="Hello", bbox=[10, 10, 40, 25], conf=95),
        OcrWordBox(text="World", bbox=[45, 12, 90, 26], conf=95),
        OcrWordBox(text="Next", bbox=[10, 50, 40, 65], conf=95),
    ]
    blocks = cluster_words_into_line_blocks(words, line_y_tol=10)
    assert len(blocks) == 2
    line1 = next(b for b in blocks if "Hello" in (b.text or ""))
    assert "World" in (line1.text or "")
