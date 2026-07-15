# Terraform — Pedidos Veloz

Infraestrutura como código para o ambiente de produção da Loja Veloz (cluster Kubernetes gerenciado na AWS / EKS).

## Conteúdo

- Provider AWS e versão mínima do Terraform
- Variáveis tipadas (`region`, `cluster_name`, `environment`, node group)
- Tags padronizadas do projeto
- Estrutura preparada para módulos VPC e EKS
- Backend remoto sugerido (S3 + DynamoDB) para state
- Outputs com nome do cluster e sequência de apply

## Uso

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform validate
terraform plan
```

Após o cluster provisionado:

```bash
aws eks update-kubeconfig --name pedidos-veloz-prod
kubectl apply -k ../k8s/
```
