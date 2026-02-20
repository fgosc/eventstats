import json
import os
import uuid
from urllib.request import urlopen

import boto3
from botocore.exceptions import ClientError

s3 = boto3.client("s3")
BUCKET = os.environ["S3_BUCKET_NAME"]
EVENTS_KEY = "events.json"
EXCLUSIONS_KEY = "exclusions.json"
HARVEST_ALL_URL = "https://fgojunks.max747.org/harvest/contents/quest/all.json"


def lambda_handler(event, context):
    """管理 API Lambda のエントリーポイント。

    HTTP メソッドとパスに基づいてルーティングし、対応するハンドラ関数を呼び出す。
    未定義のルートは 404、ハンドラ内の例外は 500 を返す。
    """
    method = event["requestContext"]["http"]["method"]
    path = event["requestContext"]["http"]["path"]

    try:
        if path == "/events" and method == "GET":
            return get_events()
        if path == "/events" and method == "POST":
            return post_event(json.loads(event.get("body", "{}")))
        if path.startswith("/events/") and method == "PUT":
            event_id = event["pathParameters"]["eventId"]
            return put_event(event_id, json.loads(event.get("body", "{}")))
        if path.startswith("/events/") and method == "DELETE":
            event_id = event["pathParameters"]["eventId"]
            return delete_event(event_id)
        if path.startswith("/exclusions/") and method == "GET":
            quest_id = event["pathParameters"]["questId"]
            return get_exclusions(quest_id)
        if path.startswith("/exclusions/") and method == "PUT":
            quest_id = event["pathParameters"]["questId"]
            return put_exclusions(quest_id, json.loads(event.get("body", "{}")))
        if path == "/harvest/quests" and method == "GET":
            return get_harvest_quests()
        return response(404, {"error": "Not found"})
    except Exception as e:
        return response(500, {"error": str(e)})


# --- S3 helpers ---


def read_json(key):
    """S3 から指定キーの JSON を読み込む。キーが存在しない場合は None を返す。"""
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=key)
        return json.loads(obj["Body"].read().decode("utf-8"))
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            return None
        raise


def write_json(key, data):
    """data を JSON シリアライズして S3 の指定キーに書き込む。"""
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=json.dumps(data, ensure_ascii=False, indent=2),
        ContentType="application/json",
    )


# --- Events ---


def get_events():
    """イベント一覧を返す。events.json が存在しない場合は空のイベントリストを返す。"""
    data = read_json(EVENTS_KEY)
    if data is None:
        data = {"events": []}
    return response(200, data)


def post_event(body):
    """イベントを新規作成する。eventId が未指定または空の場合は UUID を自動生成する。"""
    data = read_json(EVENTS_KEY)
    if data is None:
        data = {"events": []}

    if "eventId" not in body or not body["eventId"]:
        body["eventId"] = str(uuid.uuid4())

    data["events"].append(body)
    write_json(EVENTS_KEY, data)
    return response(201, body)


def put_event(event_id, body):
    """指定 eventId のイベントを更新する。イベントが存在しない場合は 404 を返す。"""
    data = read_json(EVENTS_KEY)
    if data is None:
        return response(404, {"error": "Event not found"})

    for i, ev in enumerate(data["events"]):
        if ev["eventId"] == event_id:
            body["eventId"] = event_id
            data["events"][i] = body
            write_json(EVENTS_KEY, data)
            return response(200, body)

    return response(404, {"error": "Event not found"})


def delete_event(event_id):
    """指定 eventId のイベントを削除する。イベントが存在しない場合は 404 を返す。"""
    data = read_json(EVENTS_KEY)
    if data is None:
        return response(404, {"error": "Event not found"})

    original_len = len(data["events"])
    data["events"] = [ev for ev in data["events"] if ev["eventId"] != event_id]
    if len(data["events"]) == original_len:
        return response(404, {"error": "Event not found"})

    write_json(EVENTS_KEY, data)
    return response(200, {"message": "Deleted"})


# --- Exclusions ---


def get_exclusions(quest_id):
    """指定クエストの除外リストを返す。exclusions.json が存在しない場合は空リストを返す。"""
    data = read_json(EXCLUSIONS_KEY)
    if data is None:
        data = {}
    exclusions = data.get(quest_id, [])
    return response(200, exclusions)


def put_exclusions(quest_id, body):
    """指定クエストの除外リストを更新する（全件置き換え）。"""
    data = read_json(EXCLUSIONS_KEY)
    if data is None:
        data = {}

    data[quest_id] = body
    write_json(EXCLUSIONS_KEY, data)
    return response(200, body)


# --- Harvest proxy ---


def get_harvest_quests():
    """Harvest API から全クエスト一覧を取得してそのまま返す（プロキシ）。"""
    with urlopen(HARVEST_ALL_URL) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return response(200, data)


# --- Response helper ---


def response(status_code, body):
    """API Gateway (HTTP API) 互換のレスポンス辞書を生成する。"""
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }
