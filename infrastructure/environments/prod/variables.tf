variable "aws_region"           { type = string; default = "us-east-1" }
variable "acm_certificate_arn"  { type = string; description = "ACM cert ARN for api.codemind.dev" }
variable "api_image"            { type = string; description = "ECR image URI for the API container" }
variable "route53_zone_id"      { type = string; description = "Route53 hosted zone for codemind.dev" }
