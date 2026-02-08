resource "aws_cognito_user_pool" "admin" {
  name = "eventstats-admin"

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }
}

resource "aws_cognito_user_pool_client" "admin_spa" {
  name         = "eventstats-admin-spa"
  user_pool_id = aws_cognito_user_pool.admin.id

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  generate_secret = false

  supported_identity_providers = ["COGNITO"]
}
