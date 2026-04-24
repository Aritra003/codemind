terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

# SNS topic — feeds PagerDuty (P0) and Slack (P1/P2)
resource "aws_sns_topic" "ops_alerts" {
  name              = "${var.env}-codemind-ops-alerts"
  kms_master_key_id = var.kms_key_arn
  tags              = var.tags
}

resource "aws_sns_topic" "p0_pages" {
  name              = "${var.env}-codemind-p0-pages"
  kms_master_key_id = var.kms_key_arn
  tags              = var.tags
}

# CloudWatch Alarms — SLO-C03 GET /health
resource "aws_cloudwatch_metric_alarm" "api_health_5xx" {
  alarm_name          = "${var.env}-codemind-api-5xx-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "API returning > 5 5xx errors per minute — SLO-C03 at risk"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  ok_actions          = [aws_sns_topic.ops_alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "api_p99_latency" {
  alarm_name          = "${var.env}-codemind-api-latency-p99"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 0.6  # 600ms — SLO-C01 auth endpoint p99 target
  alarm_description   = "API p99 latency > 600ms — SLO-C01 breach risk"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.p0_pages.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

# RDS CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "db_connections" {
  alarm_name          = "${var.env}-codemind-db-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80  # Alert at 80% of max 100 connections
  alarm_description   = "RDS connection count high — risk of pool exhaustion"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = { DBInstanceIdentifier = var.db_identifier }
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "db_free_storage" {
  alarm_name          = "${var.env}-codemind-db-free-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120  # 5 GB remaining
  alarm_description   = "RDS free storage < 5GB — disk full risk"
  alarm_actions       = [aws_sns_topic.p0_pages.arn]

  dimensions = { DBInstanceIdentifier = var.db_identifier }
  tags = var.tags
}

# ElastiCache CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.env}-codemind-redis-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis CPU > 80% — rate limiting and session performance at risk"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = { ReplicationGroupId = var.redis_replication_group_id }
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.env}-codemind-redis-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis memory > 80% — eviction risk (maxmemory-policy: allkeys-lru)"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = { ReplicationGroupId = var.redis_replication_group_id }
  tags = var.tags
}

# ECS Task crash alarm
resource "aws_cloudwatch_metric_alarm" "ecs_task_stopped" {
  alarm_name          = "${var.env}-codemind-ecs-task-stopped"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "service.stoppedTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "ECS task stopped unexpectedly — crash loop or OOM risk"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.p0_pages.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }
  tags = var.tags
}

# Cost anomaly detection
resource "aws_ce_anomaly_monitor" "main" {
  name              = "${var.env}-codemind-cost-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
  tags              = var.tags
}

resource "aws_ce_anomaly_subscription" "main" {
  name      = "${var.env}-codemind-cost-anomaly"
  frequency = "DAILY"

  monitor_arn_list = [aws_ce_anomaly_monitor.main.arn]

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.ops_alerts.arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]  # Alert on > $100 anomaly
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  tags = var.tags
}
