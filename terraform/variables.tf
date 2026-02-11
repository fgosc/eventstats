variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for event data"
  type        = string
  default     = "eventstats-data"
}

variable "admin_cors_origins" {
  description = "Allowed CORS origins for admin UI"
  type        = list(string)
  default     = [
    "http://localhost:5173",
    "https://fgosc.github.io",
  ]
}
