variable "app_name" { type = string }
variable "vpc_cidr" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_password" { type = string }

variable "allowed_ip" {
  description = "CIDR block allowed to access the database remotely"
  type        = string
}
