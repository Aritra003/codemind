output "vpc_id"              { value = aws_vpc.main.id }
output "public_subnet_ids"   { value = aws_subnet.public[*].id }
output "private_subnet_ids"  { value = aws_subnet.private[*].id }
output "sg_alb_id"           { value = aws_security_group.alb.id }
output "sg_api_id"           { value = aws_security_group.api.id }
output "sg_database_id"      { value = aws_security_group.database.id }
output "sg_cache_id"         { value = aws_security_group.cache.id }
