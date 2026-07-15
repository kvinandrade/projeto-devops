# Terraform — cluster Kubernetes gerenciado (AWS EKS)
# IaC para reproduzir o ambiente de produção da Loja Veloz.
# State remoto recomendado: S3 + DynamoDB lock.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # backend "s3" {
  #   bucket         = "lojaveloz-tfstate"
  #   key            = "pedidos-veloz/prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "lojaveloz-tflock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "Região AWS do cluster"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "Nome do cluster EKS"
  type        = string
  default     = "pedidos-veloz-prod"
}

variable "environment" {
  description = "Ambiente (staging|prod)"
  type        = string
  default     = "prod"
}

variable "node_instance_types" {
  description = "Tipos de instância do node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "desired_capacity" {
  description = "Capacidade desejada do node group"
  type        = number
  default     = 3
}

locals {
  tags = {
    Project     = "PedidosVeloz"
    Company     = "LojaVeloz"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# module "vpc" { source = "terraform-aws-modules/vpc/aws" ... }
# module "eks" {
#   source          = "terraform-aws-modules/eks/aws"
#   cluster_name    = var.cluster_name
#   cluster_version = "1.29"
#   vpc_id          = module.vpc.vpc_id
#   subnet_ids      = module.vpc.private_subnets
#   eks_managed_node_groups = {
#     default = {
#       instance_types = var.node_instance_types
#       desired_size   = var.desired_capacity
#       min_size       = 2
#       max_size       = 6
#     }
#   }
#   tags = local.tags
# }

output "cluster_name" {
  description = "Nome do cluster"
  value       = var.cluster_name
}

output "kubeconfig_command" {
  description = "Comando para configurar kubectl"
  value       = "aws eks update-kubeconfig --name ${var.cluster_name} --region ${var.aws_region}"
}
