# Pedidos Veloz — Loja Veloz

**Entrega contínua de uma plataforma de pedidos em microsserviços: do Docker Compose ao Kubernetes com observabilidade e CI/CD**

Trabalho acadêmico — Cloud DevOps: Orchestrating Containers and Micro Services

## Contexto

A Loja Veloz é um e-commerce de médio porte que enfrentava indisponibilidades em deploys, dificuldade de escala em picos de acesso e baixa rastreabilidade entre serviços. Este repositório apresenta a solução **Pedidos Veloz**: ambiente local padronizado, imagens versionadas, orquestração em Kubernetes, pipeline CI/CD, observabilidade e infraestrutura como código com Terraform.

## Arquitetura

```
Cliente HTTP
    │
    ▼
┌─────────────┐
│ API Gateway │  :8080
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
  ┌─────────┐   ┌───────────┐   ┌─────────┐
  │ Pedidos │   │Pagamentos │   │ Estoque │
  └────┬────┘   └─────┬─────┘   └────┬────┘
       │              │              │
       └──────────────┴──────────────┘
                      │
                      ▼
               ┌────────────┐
               │ PostgreSQL │
               └────────────┘
```

| Serviço | Porta | Responsabilidade |
|---------|-------|------------------|
| `api-gateway` | 8080 | Entrada HTTP, proxy e propagação de trace |
| `pedidos` | 3001 | Criação e consulta de pedidos |
| `pagamentos` | 3002 | Autorização de pagamento (adquirente mock) |
| `estoque` | 3003 | Reserva, liberação e baixa de itens |
| `postgres` | 5432 | Persistência |

## Pré-requisitos

- Docker Desktop / Docker Engine + Compose v2
- Node.js 20+ (testes locais)
- kubectl (deploy Kubernetes)

## Ambiente local

```bash
cp .env.example .env
docker compose up --build
```

Gateway: http://localhost:8080

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/estoque

curl -X POST http://localhost:8080/api/pedidos \
  -H "Content-Type: application/json" \
  -d "{\"clienteId\":\"cli-001\",\"itens\":[{\"sku\":\"SKU-MOCHILA\",\"quantidade\":1}]}"

curl http://localhost:8080/api/pedidos
```

## Conteinerização

- Dockerfiles multi-stage (`deps` → `runner`)
- Base `node:20-alpine`, usuário não-root
- Imagens versionadas: `lojaveloz/<servico>:1.0.0`

```bash
docker build -f services/pedidos/Dockerfile -t lojaveloz/pedidos:1.0.0 .
```

## Kubernetes

```bash
kubectl apply -k k8s/
kubectl get pods -n pedidos-veloz
kubectl port-forward svc/api-gateway -n pedidos-veloz 8080:80
```

Manifests com Deployments, Services, ConfigMaps, Secrets, probes, HPA, NetworkPolicies, Pod Security Admission e estratégia RollingUpdate (`maxUnavailable: 0`).

## CI/CD

Pipeline em `.github/workflows/ci-cd.yml`:

1. Testes e validação de sintaxe por serviço
2. Build e publicação de imagens no GHCR
3. Scan de vulnerabilidades (Trivy)
4. Validação dos manifests e gate de staging

## Observabilidade

- Logs estruturados em JSON (stdout)
- Tracing distribuído com header W3C `traceparent`
- OpenTelemetry Collector em `observability/`

## Infraestrutura como código

Esqueleto Terraform para cluster Kubernetes gerenciado (EKS): variáveis, tags, outputs e estrutura de módulos. Ver `terraform/`.

## Testes

```bash
npm run install:all
npm test
```

## Documentação da entrega

| Artefato | Caminho |
|----------|---------|
| Relatório teórico (ABNT, PDF) | `docs/Relatorio_Teorico_Pedidos_Veloz.pdf` |
| Relatório prático (ABNT, PDF) | `docs/Relatorio_Pratico_Pedidos_Veloz.pdf` |
| Evidências de execução (ABNT, PDF) | `docs/Evidencias_Pedidos_Veloz.pdf` |
| Materiais de apoio | `docs/evidencias/` |

## Referência de pesquisa

Case público [Google Cloud Online Boutique (microservices-demo)](https://github.com/GoogleCloudPlatform/microservices-demo), complementado pela documentação oficial de Kubernetes, Docker, 12-Factor App, Terraform, GitHub Actions e OpenTelemetry.

## Princípios 12-Factor

- Configuração por ambiente
- Logs como streams
- Processos stateless
- Port binding explícito
- Disposability (probes e rolling deploy)
