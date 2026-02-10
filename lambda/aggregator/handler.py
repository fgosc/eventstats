import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.request import urlopen

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
BUCKET = os.environ["S3_BUCKET_NAME"]
EVENTS_KEY = "events.json"
HARVEST_QUEST_URL = "https://fgojunks.max747.org/harvest/contents/quest/{quest_id}.json"
JST = timezone(timedelta(hours=9))

# --- S3 ヘルパー ---


def read_json(key: str) -> dict | list | None:
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=key)
        return json.loads(obj["Body"].read().decode("utf-8"))
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            return None
        raise


def write_json(key: str, data: dict | list) -> None:
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=json.dumps(data, ensure_ascii=False, indent=2),
        ContentType="application/json",
    )


# --- アイテム分類 ---

RE_BOX_COUNT = re.compile(r"\(x(\d+)\)$")
RE_POINT_BONUS = re.compile(r"^(.+?)\(\+(\d+)\)$")


def strip_modifier(key: str) -> str:
    """キー名から (xN) や (+N) の修飾子を除去してベース名を返す。"""
    key = RE_BOX_COUNT.sub("", key)
    m = RE_POINT_BONUS.match(key)
    if m:
        return m.group(1)
    return key


def detect_event_items(reports: list[dict]) -> set[str]:
    """全報告の枠数報告キーからイベントアイテム名を特定する。

    (xN) 修飾子付きで出現するベースアイテム名のセットを返す。
    """
    event_items = set()
    for report in reports:
        items = report.get("items", {})
        for key in items:
            m = RE_BOX_COUNT.search(key)
            if m:
                base_name = RE_BOX_COUNT.sub("", key)
                event_items.add(base_name)
    return event_items


def is_raw_count_report(items: dict[str, str], event_items: set[str]) -> bool:
    """報告が実数報告かどうかを判定する。

    以下の条件を両方満たす場合に実数報告と判定:
    - (xN) キーが1つもない
    - イベントアイテム名が修飾子なしで存在する
    """
    has_box_count = any(RE_BOX_COUNT.search(k) for k in items)
    if has_box_count:
        return False
    has_event_item_raw = any(k in event_items for k in items)
    return has_event_item_raw


def transform_report(
    report: dict, event_items: set[str]
) -> tuple[dict[str, int | float | None], list[str]]:
    """Harvest の報告1件を中間 JSON 形式に変換する。

    (変換済みアイテム辞書, warnings リスト) を返す。
    """
    items = report.get("items", {})
    result = {}
    warnings = []
    point_total = 0
    point_all_nan = True
    has_point = False

    raw_count = is_raw_count_report(items, event_items)

    if raw_count:
        excluded_names = sorted(k for k in items if k in event_items)
        if excluded_names:
            warnings.append(
                "excluded_items:" + ",".join(excluded_names) + "(実数報告のため除外)"
            )

    for key, value_str in items.items():
        # NaN → null に変換
        if value_str == "NaN":
            value = None
        else:
            try:
                value = int(value_str)
            except (ValueError, TypeError):
                try:
                    value = float(value_str)
                except (ValueError, TypeError):
                    value = None

        # 枠数報告アイテム: 例 ぐん肥(x3)
        m_box = RE_BOX_COUNT.search(key)
        if m_box:
            multiplier = int(m_box.group(1))
            base_name = RE_BOX_COUNT.sub("", key)
            if value is not None:
                result[base_name] = value * multiplier
            else:
                result[base_name] = None
            continue

        # ポイントアイテム: 例 ポイント(+600)
        m_point = RE_POINT_BONUS.match(key)
        if m_point:
            has_point = True
            bonus = int(m_point.group(2))
            if value is not None:
                point_total += value * bonus
                point_all_nan = False
            # NaN の場合はこのポイント項目をスキップ
            continue

        # 実数報告のイベントアイテム: この報告から除外
        if raw_count and key in event_items:
            continue

        # 通常アイテム
        result[key] = value

    # ポイント合算値を追加
    if has_point:
        if point_all_nan:
            result["ポイント"] = None
        else:
            result["ポイント"] = point_total

    return result, warnings


# --- メインロジック ---


def fetch_harvest_reports(quest_id: str) -> list[dict]:
    """指定クエストの報告データを Harvest API から取得する。"""
    url = HARVEST_QUEST_URL.format(quest_id=quest_id)
    with urlopen(url) as resp:
        return json.loads(resp.read().decode("utf-8"))


def process_quest(event_id: str, quest: dict) -> None:
    """クエスト1件を処理: 取得・変換・中間 JSON 出力。"""
    quest_id = quest["questId"]
    logger.info("Processing quest %s (%s)", quest_id, quest["name"])

    reports = fetch_harvest_reports(quest_id)
    logger.info("Fetched %d reports for quest %s", len(reports), quest_id)

    event_items = detect_event_items(reports)
    logger.info("Detected event items: %s", event_items)

    transformed_reports = []
    for report in reports:
        items, warnings = transform_report(report, event_items)
        transformed_reports.append(
            {
                "id": report.get("id", report.get("report_id", "")),
                "reporter": report.get("reporter", ""),
                "reporterName": report.get("reporter_name", ""),
                "runcount": report.get("runcount", 0),
                "timestamp": report.get("timestamp", ""),
                "note": report.get("note", ""),
                "items": items,
                "warnings": warnings,
            }
        )

    now = datetime.now(JST)
    output = {
        "quest": {
            "questId": quest["questId"],
            "name": quest["name"],
            "level": quest["level"],
            "ap": quest["ap"],
        },
        "lastUpdated": now.isoformat(),
        "reports": transformed_reports,
    }

    key = f"{event_id}/{quest_id}.json"
    write_json(key, output)
    logger.info("Wrote %s (%d reports)", key, len(transformed_reports))


def lambda_handler(event: Any, context: Any) -> dict[str, int]:
    data = read_json(EVENTS_KEY)
    if data is None:
        logger.info("No events.json found, exiting")
        return {"processed": 0}

    now = datetime.now(JST)
    active_events = []

    for ev in data.get("events", []):
        period = ev.get("period", {})
        start = datetime.fromisoformat(period["start"])
        end = datetime.fromisoformat(period["end"])
        if start <= now <= end:
            active_events.append(ev)

    if not active_events:
        logger.info("No active events at %s, exiting", now.isoformat())
        return {"processed": 0}

    logger.info(
        "Found %d active event(s): %s",
        len(active_events),
        [e["name"] for e in active_events],
    )

    total_quests = 0
    for ev in active_events:
        event_id = ev["eventId"]
        for quest in ev.get("quests", []):
            process_quest(event_id, quest)
            total_quests += 1

    logger.info("Processed %d quest(s) total", total_quests)
    return {"processed": total_quests}
