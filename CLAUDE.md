# eventstats

## 環境

### Node.js

nvm で管理。Bash で node/npm/npx を使う際は事前に有効化が必要：

```bash
source ~/.nvm/nvm.sh && nvm use v22.22.0
```

## プロジェクト構成

- `lambda/aggregator/` — 集計 Lambda (Python)
- `viewer/` — 集計結果表示 (React + TypeScript)

## 検証コマンド

### viewer の型チェック

```bash
source ~/.nvm/nvm.sh && nvm use v22.22.0 && cd viewer && npx tsc --noEmit
```
