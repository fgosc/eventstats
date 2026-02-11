# デプロイ手順

## viewer

### 1. ビルド

```bash
cd viewer
npm run build
```

`dist/` ディレクトリにビルド成果物が出力される。

### 2. S3 にアップロード

```bash
aws s3 cp viewer/dist/ s3://eventstats-data/eventstats/ --recursive --profile fgoharvest
```

- `vite.config.ts` の `base: "/eventstats/"` に対応するパスにアップロード
- データ取得先 URL は `.env.local` の `VITE_DATA_URL` でビルド時に埋め込まれる

### 3. CloudFront キャッシュ無効化（必要に応じて）

```bash
aws cloudfront create-invalidation \
  --distribution-id d393y4hhawhz2i \
  --paths "/eventstats/*" \
  --profile fgoharvest
```

現在は `default_ttl=0` / `max_ttl=0` のため通常は不要。

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
