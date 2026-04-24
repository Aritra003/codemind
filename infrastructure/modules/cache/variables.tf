variable "env"                { type = string }
variable "private_subnet_ids"  { type = list(string) }
variable "sg_cache_id"         { type = string }
variable "kms_key_arn"         { type = string }
variable "sns_topic_arn"       { type = string }
variable "node_type"           { type = string; default = "cache.t4g.small" }
variable "tags"                { type = map(string); default = {} }
