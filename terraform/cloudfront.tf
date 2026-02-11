resource "aws_cloudfront_origin_access_control" "data" {
  name                              = "eventstats-data-oac"
  description                       = "OAC for eventstats data bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_response_headers_policy" "cors" {
  name = "eventstats-data-cors"

  cors_config {
    access_control_allow_origins {
      items = ["*"]
    }
    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }
    access_control_allow_headers {
      items = ["*"]
    }
    access_control_allow_credentials = false
    access_control_max_age_sec       = 86400
    origin_override                  = true
  }
}

resource "aws_cloudfront_distribution" "data" {
  origin {
    domain_name              = aws_s3_bucket.data.bucket_regional_domain_name
    origin_id                = "s3-data"
    origin_access_control_id = aws_cloudfront_origin_access_control.data.id
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "eventstats public data"

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "s3-data"
    viewer_protocol_policy     = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cors.id

    default_ttl = 300
    max_ttl     = 3600
    min_ttl     = 0

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

data "aws_iam_policy_document" "cloudfront_s3" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.data.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.data.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "cloudfront" {
  bucket = aws_s3_bucket.data.id
  policy = data.aws_iam_policy_document.cloudfront_s3.json
}
