output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "db_endpoint" {
  value = module.rds.db_endpoint
}

output "static_instance_ip" {
  value = module.static_instance.public_ip
}
