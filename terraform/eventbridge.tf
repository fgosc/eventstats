resource "aws_cloudwatch_event_rule" "aggregator_schedule" {
  name                = "eventstats-aggregator-schedule"
  description         = "Trigger aggregator Lambda every 3 hours"
  schedule_expression = "cron(0 0/3 * * ? *)"
}

resource "aws_cloudwatch_event_target" "aggregator" {
  rule = aws_cloudwatch_event_rule.aggregator_schedule.name
  arn  = aws_lambda_function.aggregator.arn
}

resource "aws_lambda_permission" "eventbridge_aggregator" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.aggregator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.aggregator_schedule.arn
}
