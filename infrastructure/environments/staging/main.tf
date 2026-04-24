terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket         = "codemind-terraform-state-staging"
    key            = "staging/terraform.tfstate"
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
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  env  = "staging"
  azs  = ["${var.aws_region}a", "${var.aws_region}b"]
  tags = { Project = "codemind", Environment = "staging" }
}

# Staging is a 10-20% capacity mirror of prod (per IaC principles)
module "networking" {
  source             = "../../modules/networking"
  env                = local.env
  vpc_cidr           = "10.1.0.0/16"
  availability_zones = local.azs
  tags               = local.tags
}

module "database" {
  source               = "../../modules/database"
  env                  = local.env
  private_subnet_ids   = module.networking.private_subnet_ids
  sg_database_id       = module.networking.sg_database_id
  kms_key_arn          = aws_kms_key.main.arn
  instance_class       = "db.t4g.micro"  # Smaller for staging
  allocated_storage_gb = 10
  max_allocated_storage_gb = 20
  tags                 = local.tags
}

module "cache" {
  source             = "../../modules/cache"
  env                = local.env
  private_subnet_ids = module.networking.private_subnet_ids
  sg_cache_id        = module.networking.sg_cache_id
  kms_key_arn        = aws_kms_key.main.arn
  sns_topic_arn      = aws_sns_topic.staging_alerts.arn
  node_type          = "cache.t4g.micro"
  tags               = local.tags
}

module "compute" {
  source             = "../../modules/compute"
  env                = local.env
  aws_region         = var.aws_region
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  private_subnet_ids = module.networking.private_subnet_ids
  sg_alb_id          = module.networking.sg_alb_id
  sg_api_id          = module.networking.sg_api_id
  acm_certificate_arn = var.acm_certificate_arn
  access_log_bucket  = aws_s3_bucket.logs.id
  api_image          = var.api_image
  task_cpu           = "256"
  task_memory        = "512"
  desired_count      = 1  # Single task in staging
  max_capacity       = 2
  secrets_arns       = [aws_secretsmanager_secret.app_secrets.arn]
  secret_refs        = {}  # Fill before staging deploy
  tags               = local.tags
}

resource "aws_kms_key" "main" {
  description             = "CodeMind ${local.env}"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = local.tags
}

resource "aws_kms_alias" "main" {
  name          = "alias/codemind-${local.env}"
  target_key_id = aws_kms_key.main.key_id
}

resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "codemind/${local.env}/app"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = 7
  tags                    = local.tags
}

resource "aws_sns_topic" "staging_alerts" {
  name = "${local.env}-codemind-alerts"
  tags = local.tags
}

resource "aws_s3_bucket" "logs" {
  bucket = "codemind-${local.env}-logs"
  tags   = local.tags
}

resource "aws_route53_record" "api" {
  zone_id = var.route53_zone_id
  name    = "api.staging.codemind.dev"
  type    = "A"
  alias {
    name                   = module.compute.alb_dns_name
    zone_id                = module.compute.alb_zone_id
    evaluate_target_health = true
  }
}
