"""Tests for image ↔ text spatial mapping."""

from app.services.layout_analysis.mapping_service import map_image_blocks_to_text
from app.services.layout_analysis.schemas import LayoutBlock


def test_map_image_nearest_label_below():
    img = LayoutBlock(type="image", bbox=[10, 10, 50, 50])
    t_label = LayoutBlock(type="text", bbox=[12, 52, 48, 62], text="Blu")
    t_price = LayoutBlock(type="text", bbox=[40, 52, 90, 62], text="12.99")
    out = map_image_blocks_to_text([img], [t_label, t_price])["products"]
    assert len(out) == 1
    assert out[0]["label"] == "Blu"
    texts = {x["text"] for x in out[0]["related_text_blocks"]}
    assert "Blu" in texts
    assert "12.99" in texts


def test_map_image_empty_when_no_text():
    img = LayoutBlock(type="image", bbox=[0, 0, 10, 10])
    out = map_image_blocks_to_text([img], [])["products"]
    assert out[0]["label"] == ""
