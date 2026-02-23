"""handler.py のユニットテスト"""

import os
import sys
from unittest.mock import MagicMock

# boto3 はテスト環境に存在しないため、インポート前にモック化する
os.environ.setdefault("S3_BUCKET_NAME", "test-bucket")
sys.modules["boto3"] = MagicMock()
sys.modules["botocore"] = MagicMock()
sys.modules["botocore.exceptions"] = MagicMock()

from handler import detect_event_items, is_raw_count_report, transform_report  # noqa: E402


# --- detect_event_items ---


def test_detect_event_items_basic():
    reports = [
        {"items": {"三角巾(x3)": "5", "素材A": "10"}},
        {"items": {"三角巾(x1)": "2", "素材B": "8"}},
    ]
    result = detect_event_items(reports)
    assert result == {"三角巾"}


def test_detect_event_items_multiple():
    reports = [
        {"items": {"ぐん肥(x3)": "5", "ミトン(x2)": "3", "素材A": "10"}},
    ]
    result = detect_event_items(reports)
    assert result == {"ぐん肥", "ミトン"}


def test_detect_event_items_no_event_items():
    reports = [
        {"items": {"素材A": "10", "素材B": "5"}},
    ]
    result = detect_event_items(reports)
    assert result == set()


# --- is_raw_count_report ---


def test_is_raw_count_report_true():
    """(xN) なし、イベントアイテムベース名あり → 実数報告"""
    items = {"三角巾": "15", "素材A": "10"}
    event_items = {"三角巾"}
    assert is_raw_count_report(items, event_items) is True


def test_is_raw_count_report_false_has_box_count():
    """(xN) ありなら実数報告ではない"""
    items = {"三角巾(x3)": "5", "素材A": "10"}
    event_items = {"三角巾"}
    assert is_raw_count_report(items, event_items) is False


def test_is_raw_count_report_false_no_event_item():
    """(xN) なし、イベントアイテムなし → 実数報告ではない"""
    items = {"素材A": "10", "素材B": "5"}
    event_items = {"三角巾"}
    assert is_raw_count_report(items, event_items) is False


# --- transform_report ---


def _make_report(items: dict[str, str]) -> dict:
    return {
        "items": items,
        "id": "r1",
        "reporter": "u1",
        "reporter_name": "user1",
        "runcount": 10,
        "timestamp": "",
        "note": "",
    }


class TestTransformReportNormal:
    """通常の枠数報告（(xN) 形式）"""

    def test_event_item_with_box_count(self):
        report = _make_report({"三角巾(x3)": "5", "素材A": "10"})
        result, warnings = transform_report(report, {"三角巾"})
        assert result == {"三角巾(x3)": 5, "素材A": 10}
        assert warnings == []

    def test_point_item(self):
        report = _make_report({"ポイント(+600)": "3", "素材A": "10"})
        result, warnings = transform_report(report, set())
        assert result == {"ポイント(+600)": 3, "素材A": 10}
        assert warnings == []


class TestTransformReportRawCount:
    """実数報告: (xN) なし、添字なしイベントアイテムあり"""

    def test_bare_event_item_excluded(self):
        """三角巾（添字なし）は除外される"""
        report = _make_report({"三角巾": "15", "素材A": "10"})
        result, warnings = transform_report(report, {"三角巾"})
        assert "三角巾" not in result
        assert result == {"素材A": 10}

    def test_raw_count_warning_issued(self):
        """実数報告の警告が出ること"""
        report = _make_report({"三角巾": "15", "素材A": "10"})
        _, warnings = transform_report(report, {"三角巾"})
        assert any("実数報告のため除外" in w for w in warnings)


class TestTransformReportBareEventItemMixed:
    """混合報告: (xN) あり、かつ添字なしイベントアイテムも混在"""

    def test_bare_event_item_excluded_even_with_box_count(self):
        """(xN) アイテムがあっても、添字なしイベントアイテムは除外される（バグ修正の検証）"""
        report = _make_report({"三角巾": "8", "三角巾(x3)": "2", "素材A": "10"})
        result, warnings = transform_report(report, {"三角巾"})
        assert "三角巾" not in result
        assert "三角巾(x3)" in result
        assert result["素材A"] == 10

    def test_bare_event_item_warning_issued(self):
        """添字なしイベントアイテム除外の警告が出ること"""
        report = _make_report({"三角巾": "8", "三角巾(x3)": "2", "素材A": "10"})
        _, warnings = transform_report(report, {"三角巾"})
        assert any("添字なしイベントアイテムのため除外" in w for w in warnings)

    def test_normal_material_not_excluded(self):
        """素材アイテム（event_items 外）は除外されない"""
        report = _make_report({"三角巾": "8", "素材A(x2)": "4", "素材B": "12"})
        result, warnings = transform_report(report, {"三角巾"})
        assert "素材A(x2)" in result
        assert "素材B" in result
        assert "三角巾" not in result

    def test_multiple_bare_event_items(self):
        """複数の添字なしイベントアイテムが混在する場合"""
        report = _make_report({"三角巾": "5", "ぐん肥": "3", "三角巾(x3)": "2", "素材A": "10"})
        result, warnings = transform_report(report, {"三角巾", "ぐん肥"})
        assert "三角巾" not in result
        assert "ぐん肥" not in result
        assert "三角巾(x3)" in result
        assert result["素材A"] == 10


class TestTransformReportNaN:
    """NaN 値の処理"""

    def test_nan_becomes_none(self):
        report = _make_report({"素材A": "NaN"})
        result, _ = transform_report(report, set())
        assert result["素材A"] is None
