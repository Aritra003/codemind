variable "env"                        { type = string }
variable "private_subnet_ids"         { type = list(string) }
variable "sg_database_id"             { type = string }
variable "kms_key_arn"                { type = string }
variable "instance_class"             { type = string; default = "db.t4g.medium" }
variable "allocated_storage_gb"       { type = number; default = 20 }
variable "max_allocated_storage_gb"   { type = number; default = 100 }
variable "enable_cross_region_replica" { type = bool; default = false }
variable "replica_instance_class"     { type = string; default = "db.t4g.small" }
variable "replica_kms_key_arn"        { type = string; default = "" }
variable "tags"                       { type = map(string); default = {} }
