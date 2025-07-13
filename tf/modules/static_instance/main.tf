
data "aws_ssm_parameter" "al2023_arm" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-minimal-kernel-6.1-arm64"
}

data "aws_ami" "al2023_arm" {
  owners      = ["amazon"]
  most_recent = true
  filter {
    name   = "image-id"
    values = [data.aws_ssm_parameter.al2023_arm.value]
  }
}

resource "aws_security_group" "this" {
  name        = "${var.app_name}-static-sg"
  description = "Allow outbound to CoC API and database"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.rds_sg_id]
  }
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "${var.app_name}-static-instance"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ecr" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "this" {
  role = aws_iam_role.this.name
}

resource "aws_instance" "this" {
  ami                         = data.aws_ami.al2023_arm.id
  instance_type               = "t4g.micro"
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.this.id]
  iam_instance_profile        = aws_iam_instance_profile.this.name
  key_name                    = var.key_name
  associate_public_ip_address = true
  user_data_replace_on_change = true

  lifecycle {
    create_before_destroy = true
  }

  root_block_device {
    volume_size = 16
  }

  user_data = <<-EOT
              #!/bin/bash
              set +H
              sudo yum install -y docker awscli
              sudo systemctl enable --now docker
              unset DOCKER_HOST
              ECR_REGISTRY=$(echo '${var.image}' | cut -d/ -f1)
              ECR_REGION=$(echo "$ECR_REGISTRY" | cut -d. -f4)
              aws ecr get-login-password --region $ECR_REGION | sudo docker login --username AWS --password-stdin $ECR_REGISTRY
              sudo docker run -d --restart=always --name ${var.app_name}-static \
                -e COC_API_TOKEN='${var.coc_api_token}' \
                -e DATABASE_URL='postgresql+psycopg://postgres:${var.db_password}@${var.db_endpoint}:5432/postgres' \
                ${var.image}
              set -H
              EOT
}

resource "aws_eip" "this" {
  instance = aws_instance.this.id
  domain   = "vpc"
}

