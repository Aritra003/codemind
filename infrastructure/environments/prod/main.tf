terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  # Remote state — fill before first apply
  backend "s3" {
    bucket         = "codemind-terraform-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "alias/codemind-terraform-state"
    dynamodb_table = "codemind-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "codemind"
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  env  = "prod"
  azs  = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  tags = { Project = "codemind", Environment = "prod" }
}

module "networking" {
  source             = "../../modules/networking"
  env                = local.env
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = local.azs
  tags               = local.tags
}

module "database" {
  source                      = "../../modules/database"
  env                         = local.env
  private_subnet_ids          = module.networking.private_subnet_ids
  sg_database_id              = module.networking.sg_database_id
  kms_key_arn                 = aws_kms_key.main.arn
  instance_class              = "db.t4g.medium"  # ~$60/mo — review at 500K MAU
  allocated_storage_gb        = 20
  max_allocated_storage_gb    = 200
  enable_cross_region_replica = false            # Enable at Series A
  tags                        = local.tags
}

module "cache" {
  source            = "../../modules/cache"
  env               = local.env
  private_subnet_ids = module.networking.private_subnet_ids
  sg_cache_id        = module.networking.sg_cache_id
  kms_key_arn        = aws_kms_key.main.arn
  sns_topic_arn      = module.monitoring.sns_ops_alerts_arn
  node_type          = "cache.t4g.small"  # ~$25/mo
  tags               = local.tags
}

module "compute" {
  source              = "../../modules/compute"
  env                 = local.env
  aws_region          = var.aws_region
  vpc_id              = module.networking.vpc_id
  public_subnet_ids   = module.networking.public_subnet_ids
  private_subnet_ids  = module.networking.private_subnet_ids
  sg_alb_id           = module.networking.sg_alb_id
  sg_api_id           = module.networking.sg_api_id
  acm_certificate_arn = var.acm_certificate_arn
  access_log_bucket   = aws_s3_bucket.logs.id
  api_image           = var.api_image
  task_cpu            = "512"
  task_memory         = "1024"
  desired_count       = 2
  max_capacity        = 10
  secrets_arns        = [module.database.master_secret_arn, aws_secretsmanager_secret.app_secrets.arn]
  secret_refs         = {
    DATABASE_URL            = "${aws_secretsmanager_secret.app_secrets.arn}:DATABASE_URL::"
    JWT_SECRET              = "${aws_secretsmanager_secret.app_secrets.arn}:JWT_SECRET::"
    STRIPE_SECRET_KEY       = "${aws_secretsmanager_secret.app_secrets.arn}:STRIPE_SECRET_KEY::"
    STRIPE_WEBHOOK_SECRET   = "${aws_secretsmanager_secret.app_secrets.arn}:STRIPE_WEBHOOK_SECRET::"
    RESEND_API_KEY          = "${aws_secretsmanager_secret.app_secrets.arn}:RESEND_API_KEY::"
    REDIS_URL               = "${aws_secretsmanager_secret.app_secrets.arn}:REDIS_URL::"
    CLICKHOUSE_URL          = "${aws_secretsmanager_secret.app_secrets.arn}:CLICKHOUSE_URL::"
    GITHUB_CLIENT_SECRET    = "${aws_secretsmanager_secret.app_secrets.arn}:GITHUB_CLIENT_SECRET::"
  }
  tags = local.tags
}

module "monitoring" {
  source                        = "../../modules/monitoring"
  env                           = local.env
  kms_key_arn                   = aws_kms_key.main.arn
  alb_arn_suffix                = module.compute.alb_dns_name
  target_group_arn_suffix       = ""  # Fill after first apply
  db_identifier                 = "${local.env}-codemind-db"
  redis_replication_group_id    = "${local.env}-codemind-redis"
  ecs_cluster_name              = module.compute.ecs_cluster_name
  ecs_service_name              = module.compute.ecs_service_name
  tags                          = local.tags
}

# KMS key for encrypting all resources at rest
resource "aws_kms_key" "main" {
  description             = "CodeMind ${local.env} — encrypt RDS, Redis, Secrets, S3"
  deletion_window_in_days = 14
  enable_key_rotation     = true
  tags                    = local.tags
}

resource "aws_kms_alias" "main" {
  name          = "alias/codemind-${local.env}"
  target_key_id = aws_kms_key.main.key_id
}

# Secrets Manager — all app secrets in one secret (individual key access via path)
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "codemind/${local.env}/app"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = 14
  description             = "All CodeMind application secrets. Rotate per runbook."
  tags                    = local.tags
}

# S3 bucket for ALB access logs
resource "aws_s3_bucket" "logs" {
  bucket = "codemind-${local.env}-logs"
  tags   = local.tags
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    id     = "alb-logs-retention"
    status = "Enabled"
    filter { prefix = "prod/alb/" }
    expiration { days = 90 }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
  }
}

# Route53 DNS record for API
resource "aws_route53_record" "api" {
  zone_id = var.route53_zone_id
  name    = "api.codemind.dev"
  type    = "A"
  alias {
    name                   = module.compute.alb_dns_name
    zone_id                = module.compute.alb_zone_id
    evaluate_target_health = true
  }
}
