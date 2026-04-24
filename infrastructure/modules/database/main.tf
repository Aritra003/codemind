terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.env}-codemind-db"
  subnet_ids = var.private_subnet_ids
  tags       = merge(var.tags, { Name = "${var.env}-db-subnet-group" })
}

resource "aws_db_parameter_group" "main" {
  name   = "${var.env}-codemind-pg16"
  family = "postgres16"

  # Force SSL connections from all clients
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
  # Log slow queries > 100ms (feeds OBSERVABILITY.md slow query dashboard)
  parameter {
    name  = "log_min_duration_statement"
    value = "100"
  }
  # Shared buffers: 25% of instance RAM (AWS manages this via default.postgres16)
  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  tags = var.tags
}

resource "aws_db_instance" "main" {
  identifier     = "${var.env}-codemind-db"
  engine         = "postgres"
  engine_version = "16.2"
  instance_class = var.instance_class

  db_name  = "codemind"
  username = "codemind_admin"
  # Password via Secrets Manager — never in TF state
  manage_master_user_password = true

  # Storage
  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = var.max_allocated_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  # High availability (Multi-AZ for production)
  multi_az               = var.env == "prod" ? true : false
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.sg_database_id]
  parameter_group_name   = aws_db_parameter_group.main.name

  # Backups
  backup_retention_period   = var.env == "prod" ? 7 : 1
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot     = true
  delete_automated_backups  = false

  # Point-in-time recovery
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Prevent accidental deletion
  deletion_protection = var.env == "prod" ? true : false
  skip_final_snapshot = var.env == "prod" ? false : true
  final_snapshot_identifier = var.env == "prod" ? "${var.env}-codemind-db-final" : null

  # Performance Insights — feed Grafana slow query dashboard
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  tags = merge(var.tags, { Name = "${var.env}-codemind-db" })
}

# Cross-region read replica for disaster recovery (prod only)
resource "aws_db_instance" "replica" {
  count = var.env == "prod" && var.enable_cross_region_replica ? 1 : 0

  identifier          = "${var.env}-codemind-db-replica"
  replicate_source_db = aws_db_instance.main.arn
  instance_class      = var.replica_instance_class
  storage_encrypted   = true
  kms_key_id          = var.replica_kms_key_arn
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.env}-codemind-db-replica-final"

  # Replica is read-only — no parameter group needed
  tags = merge(var.tags, { Name = "${var.env}-codemind-db-replica", Role = "replica" })
}
