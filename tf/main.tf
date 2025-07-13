terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

module "networking" {
  source   = "./modules/networking"
  region   = var.region
  app_name = var.app_name
}

module "alb" {
  source            = "./modules/alb"
  app_name          = var.app_name
  vpc_id            = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids
  certificate_arn   = var.certificate_arn
}

module "ecs" {
  source            = "./modules/ecs"
  app_name          = var.app_name
  vpc_id            = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids
  alb_sg_id         = module.alb.alb_sg_id
  target_group_arn  = module.alb.target_group_arn
  listener_arn      = module.alb.https_listener_arn
  region            = var.region
  app_image         = var.app_image
  worker_image      = var.worker_image
  frontend_image    = var.frontend_image
  app_env           = var.app_env
  db_endpoint       = module.rds.db_endpoint
  db_password       = var.db_password
}

module "rds" {
  source             = "./modules/rds"
  app_name           = var.app_name
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.public_subnet_ids
  vpc_cidr           = module.networking.vpc_cidr
  db_password        = var.db_password
  allowed_ip         = var.db_allowed_ip
}

module "static_instance" {
  source        = "./modules/static_instance"
  app_name      = var.app_name
  vpc_id        = module.networking.vpc_id
  subnet_id     = module.networking.public_subnet_ids[0]
  rds_sg_id     = module.rds.rds_sg_id
  image         = var.static_ip_image
  db_endpoint   = module.rds.db_endpoint
  db_password   = var.db_password
  coc_api_token = var.coc_api_token
  allowed_ip    = var.static_ip_allowed_ip
  key_name      = var.static_ip_key_name
  region        = var.region
}
