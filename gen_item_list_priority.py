#!/usr/bin/env python3

import argparse
import json
import logging
import sys

logger = logging.getLogger(__name__)


def make_item_dict(item: dict) -> dict:
    return {
        "id": item["id"],
        "rarity": item.get("rarity", 0),
        "shortname": item["shortname"],
        "dropPriority": item["dropPriority"],
    }


def main(args: argparse.Namespace):
    items = json.load(args.input)
    filtered_items = []

    # 特攻礼装 9005
    # ボーナス礼装 9005
    # 泥礼装 9005
    # 礼装 9005
    # ★4EXP礼装 9004
    # ★3EXP礼装 9003
    ce_cache: dict[str, dict] = {}

    for item in items:
        if "shortname" not in item:
            continue
        item_id = item["id"]
        if item_id < 10_000_000:
            # 礼装のデータは1つだけあればよいので、同一の shortname であれば id が大きい方を優先する
            if item["shortname"] in ["特攻礼装", "ボーナス礼装", "泥礼装", "礼装", "★4EXP礼装", "★3EXP礼装"]:
                if item["shortname"] in ce_cache:
                    cached_item = ce_cache[item["shortname"]]
                    if item["id"] > cached_item["id"]:
                        ce_cache[item["shortname"]] = item
                    else:
                        pass
                else:
                    ce_cache[item["shortname"]] = item

                # filtered_items への追加は最後にまとめて行うので、ここではスキップ
                continue

            # 種火はレアリティ 4, 5 のみを対象とする
            if item["type"] == "Exp. UP" and item["rarity"] < 4:
                continue

            # 上記規則に当てはまらない礼装は無視
            if item["type"] == "Craft Essence":
                logger.warning(f"Unknown Craft Essence: {item['name']} (id: {item['id']})")
                continue

            filtered_items.append(make_item_dict(item))

    # 礼装のデータを filtered_items に追加
    for item in ce_cache.values():
        filtered_items.append(make_item_dict(item))

    sorted_items = sorted(filtered_items, key=lambda x: x["dropPriority"], reverse=True)

    if args.output_format == "tsv":
        print("id\trarity\tshortname\tdropPriority", file=args.output)
        for item in sorted_items:
            print(f"{item['id']}\t{item['rarity']}\t{item['shortname']}\t{item['dropPriority']}", file=args.output)
    else:
        print(json.dumps(sorted_items, indent=2, ensure_ascii=False), file=args.output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", "-i", type=argparse.FileType("r"), default=sys.stdin)
    parser.add_argument("--output", "-o", type=argparse.FileType("w"), default=sys.stdout)
    parser.add_argument("--output-format", "-f", choices=["json", "tsv"], default="json")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    main(args)
