# eventstats

## 環境

### Node.js

nvm で管理。Bash で node/npm/npx を使う際は事前に有効化が必要：

```bash
source ~/.nvm/nvm.sh && nvm use v22.22.0
```

## プロジェクト構成

- `lambda/aggregator/` - 集計 Lambda (Python)
- `viewer/` - 集計結果表示 (React + TypeScript)
- `SPEC.md` - プロジェクトの仕様書

## Lint / Format

Biome をルートに導入済み。設定は `biome.json`。

```bash
# チェックのみ（CI 向け）
source ~/.nvm/nvm.sh && nvm use v22.22.0 && npx biome ci .

# 自動修正
source ~/.nvm/nvm.sh && nvm use v22.22.0 && npx biome check --write .
```

## 検証コマンド

コード変更後は以下を実行して確認：

```bash
source ~/.nvm/nvm.sh && nvm use v22.22.0 && npx biome ci .
source ~/.nvm/nvm.sh && nvm use v22.22.0 && cd viewer && npx tsc --noEmit
source ~/.nvm/nvm.sh && nvm use v22.22.0 && cd viewer && npx vitest run
```
