variable "env"                           { type = string }
variable "kms_key_arn"                   { type = string }
variable "alb_arn_suffix"                { type = string }
variable "target_group_arn_suffix"       { type = string }
variable "db_identifier"                 { type = string }
variable "redis_replication_group_id"    { type = string }
variable "ecs_cluster_name"              { type = string }
variable "ecs_service_name"              { type = string }
variable "tags"                          { type = map(string); default = {} }
