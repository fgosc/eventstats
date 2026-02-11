# デプロイ手順

## viewer / admin (GitHub Pages)

`viewer/` または `admin/` 配下の変更が main に push されると GitHub Actions で自動デプロイされる。

- viewer URL: `https://fgosc.github.io/eventstats/`
- admin URL: `https://fgosc.github.io/eventstats/admin/`
- ワークフロー: `.github/workflows/deploy-viewer.yml`
- 手動実行: Actions タブから "Deploy to GitHub Pages" を Run workflow

### 初回セットアップ

1. GitHub リポジトリ Settings → Pages → Source を **"GitHub Actions"** に変更
2. Settings → Environments → **github-pages** → Environment variables に以下を追加:
   - `VITE_DATA_URL` = `https://d393y4hhawhz2i.cloudfront.net`
   - `VITE_COGNITO_USER_POOL_ID` = Cognito ユーザープール ID
   - `VITE_COGNITO_CLIENT_ID` = Cognito クライアント ID
   - `VITE_API_URL` = 管理 API の URL

## Lambda (集計・管理 API)

Terraform で管理。

```bash
cd terraform
terraform apply
```

Lambda コードの変更は `terraform apply` でデプロイされる（`archive_file` で自動 zip 化）。
