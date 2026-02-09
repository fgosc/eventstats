resource "aws_apigatewayv2_api" "admin" {
  name          = "eventstats-admin-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.admin_cors_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.admin.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.admin.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.admin_spa.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.admin.id}"
  }
}

resource "aws_apigatewayv2_integration" "admin_api" {
  api_id                 = aws_apigatewayv2_api.admin.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.admin_api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.admin.execution_arn}/*/*"
}

# Routes
resource "aws_apigatewayv2_route" "get_events" {
  api_id             = aws_apigatewayv2_api.admin.id
  route_key          = "GET /events"
  target             = "integrations/${aws_apigatewayv2_integration.admin_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "post_events" {
  api_id             = aws_apigatewayv2_api.admin.id
  route_key          = "POST /events"
  target             = "integrations/${aws_apigatewayv2_integration.admin_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "put_event" {
  api_id             = aws_apigatewayv2_api.admin.id
  route_key          = "PUT /events/{eventId}"
  target             = "integrations/${aws_apigatewayv2_integration.admin_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "delete_event" {
  api_id             = aws_apigatewayv2_api.admin.id
  route_key          = "DELETE /events/{eventId}"
  target             = "integrations/${aws_apigatewayv2_integration.admin_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_exclusions" {
  api_id             = aws_apigatewayv2_api.admin.id
  route_key          = "GET /exclusions/{questId}"
  target             = "integrations/${aws_apigatewayv2_integration.admin_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "put_exclusions" {
  api_id             = aws_apigatewayv2_api.admin.id
  route_key          = "PUT /exclusions/{questId}"
  target             = "integrations/${aws_apigatewayv2_integration.admin_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_harvest_quests" {
  api_id             = aws_apigatewayv2_api.admin.id
  route_key          = "GET /harvest/quests"
  target             = "integrations/${aws_apigatewayv2_integration.admin_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
