terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.env}-codemind-cache"
  subnet_ids = var.private_subnet_ids
  tags       = var.tags
}

resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.env}-codemind-redis7"
  family = "redis7"

  # Require TLS (in-transit encryption enforced at parameter level)
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = var.tags
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.env}-codemind-redis"
  description          = "CodeMind ${var.env} Redis — sessions, rate limits, usage quotas"

  node_type            = var.node_type
  num_cache_clusters   = var.env == "prod" ? 2 : 1  # Primary + 1 read replica in prod
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [var.sg_cache_id]

  # Encryption
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  transit_encryption_mode     = "required"
  kms_key_id                  = var.kms_key_arn

  # Automatic failover requires >= 2 replicas (prod only)
  automatic_failover_enabled = var.env == "prod" ? true : false
  multi_az_enabled           = var.env == "prod" ? true : false

  # Redis version — 7.x for BullMQ LMPOP support
  engine_version = "7.1"

  # Backup (prod only)
  snapshot_retention_limit = var.env == "prod" ? 1 : 0
  snapshot_window          = "05:00-06:00"
  maintenance_window       = "sun:06:00-sun:07:00"

  # Notifications via SNS (feeds OBSERVABILITY.md Redis unavailable alert)
  notification_topic_arn = var.sns_topic_arn

  apply_immediately = var.env != "prod"
  tags              = merge(var.tags, { Name = "${var.env}-codemind-redis" })
}
