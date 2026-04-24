variable "env"                  { type = string }
variable "aws_region"           { type = string }
variable "vpc_id"               { type = string }
variable "public_subnet_ids"    { type = list(string) }
variable "private_subnet_ids"   { type = list(string) }
variable "sg_alb_id"            { type = string }
variable "sg_api_id"            { type = string }
variable "acm_certificate_arn"  { type = string }
variable "access_log_bucket"    { type = string }
variable "api_image"            { type = string }
variable "task_cpu"             { type = string; default = "512" }
variable "task_memory"          { type = string; default = "1024" }
variable "desired_count"        { type = number; default = 2 }
variable "max_capacity"         { type = number; default = 10 }
variable "secrets_arns"         { type = list(string) }
variable "secret_refs"          { type = map(string); default = {} }
variable "tags"                 { type = map(string); default = {} }
