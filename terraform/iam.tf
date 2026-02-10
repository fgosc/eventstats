data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "admin_api_lambda" {
  name               = "eventstats-admin-api-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "admin_api_s3" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.data.arn]
  }

  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.data.arn}/*"]
  }
}

resource "aws_iam_role_policy" "admin_api_s3" {
  name   = "s3-access"
  role   = aws_iam_role.admin_api_lambda.id
  policy = data.aws_iam_policy_document.admin_api_s3.json
}

resource "aws_iam_role_policy_attachment" "admin_api_logs" {
  role       = aws_iam_role.admin_api_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- Aggregator Lambda ---

resource "aws_iam_role" "aggregator_lambda" {
  name               = "eventstats-aggregator-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "aggregator_s3" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.data.arn]
  }

  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
    ]
    resources = ["${aws_s3_bucket.data.arn}/*"]
  }
}

resource "aws_iam_role_policy" "aggregator_s3" {
  name   = "s3-access"
  role   = aws_iam_role.aggregator_lambda.id
  policy = data.aws_iam_policy_document.aggregator_s3.json
}

resource "aws_iam_role_policy_attachment" "aggregator_logs" {
  role       = aws_iam_role.aggregator_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
