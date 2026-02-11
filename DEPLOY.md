# デプロイ手順

## viewer (GitHub Pages)

`viewer/` 配下の変更が main に push されると GitHub Actions で自動デプロイされる。

- URL: `https://fgosc.github.io/eventstats/`
- ワークフロー: `.github/workflows/deploy-viewer.yml`
- 手動実行: Actions タブから "Deploy viewer to GitHub Pages" を Run workflow

### 初回セットアップ

1. GitHub リポジトリ Settings → Pages → Source を **"GitHub Actions"** に変更
2. Settings → Environments → **github-pages** → Environment variables に以下を追加:
   - `VITE_DATA_URL` = `https://d393y4hhawhz2i.cloudfront.net`

## admin

### 1. ビルド

```bash
cd admin
npm run build
```

### 2. S3 にアップロード

```bash
aws s3 cp admin/dist/ s3://eventstats-data/admin/ --recursive --profile fgoharvest
```

## Lambda (集計・管理 API)

Terraform で管理。

```bash
cd terraform
terraform apply
```

Lambda コードの変更は `terraform apply` でデプロイされる（`archive_file` で自動 zip 化）。
