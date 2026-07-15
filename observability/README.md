# Observabilidade — Pedidos Veloz

## Pilares

| Pilar | Abordagem no projeto |
|-------|----------------------|
| **Logs** | JSON em stdout (`services/shared/logger.js`) |
| **Métricas** | CPU/memória dos Pods alimentando o HPA |
| **Traces** | Header W3C `traceparent` entre gateway e serviços + OpenTelemetry Collector |

## Tracing distribuído

Cada requisição cria ou propaga o contexto de trace. O gateway injeta o header; pedidos, estoque e pagamentos registram o mesmo `traceId` nos logs.

## Deploy e escala

- **Deploy:** RollingUpdate (`maxUnavailable: 0`, `maxSurge: 1`)
- **Escala:** HPA no API Gateway e no serviço de Pedidos

## Collector

```bash
kubectl apply -f observability/otel-collector.yaml
```
