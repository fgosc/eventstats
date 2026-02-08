data "archive_file" "admin_api" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/admin_api"
  output_path = "${path.module}/.build/admin_api.zip"
}

resource "aws_lambda_function" "admin_api" {
  function_name    = "eventstats-admin-api"
  role             = aws_iam_role.admin_api_lambda.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  filename         = data.archive_file.admin_api.output_path
  source_code_hash = data.archive_file.admin_api.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      S3_BUCKET_NAME = aws_s3_bucket.data.bucket
    }
  }
}
