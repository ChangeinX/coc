output "db_endpoint" {
  value = aws_db_instance.postgres.address
}

output "rds_sg_id" {
  value = aws_security_group.rds.id
}

output "rds_remote_sg_id" {
  value = aws_security_group.remote.id
}
