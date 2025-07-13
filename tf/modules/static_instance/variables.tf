variable "app_name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_id" { type = string }
variable "rds_sg_id" { type = string }
variable "image" { type = string }
variable "db_endpoint" { type = string }
variable "db_password" { type = string }
variable "coc_api_token" { type = string }
variable "allowed_ip" { type = string }
variable "key_name" { type = string }

variable "region" { type = string }
