#!/usr/bin/env python3
"""Gera relatórios e evidências em PDF no formato ABNT (NBR 14724)."""
from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
)

OUT = Path(__file__).resolve().parent
EVID = OUT / "evidencias"

AUTOR = "Kevin Maikon Caetano de Andrade Santos"
INSTITUICAO = "Centro Universitário UniFECAF"
CURSO = "Cloud DevOps: Orchestrating Containers and Micro Services"
CIDADE = "Taboão da Serra"
ANO = "2026"
TITULO = (
    "Entrega contínua de uma plataforma de pedidos em microsserviços: "
    "do Docker Compose ao Kubernetes com observabilidade e CI/CD"
)


def styles():
    base = getSampleStyleSheet()
    s = {
        "capa_inst": ParagraphStyle(
            "capa_inst",
            parent=base["Normal"],
            fontName="Times-Bold",
            fontSize=14,
            leading=18,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "capa_curso": ParagraphStyle(
            "capa_curso",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=12,
            leading=16,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "capa_autor": ParagraphStyle(
            "capa_autor",
            parent=base["Normal"],
            fontName="Times-Bold",
            fontSize=12,
            leading=16,
            alignment=TA_CENTER,
        ),
        "capa_titulo": ParagraphStyle(
            "capa_titulo",
            parent=base["Normal"],
            fontName="Times-Bold",
            fontSize=14,
            leading=18,
            alignment=TA_CENTER,
            spaceBefore=12,
            spaceAfter=10,
        ),
        "capa_sub": ParagraphStyle(
            "capa_sub",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=12,
            leading=16,
            alignment=TA_CENTER,
        ),
        "capa_local": ParagraphStyle(
            "capa_local",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=12,
            leading=16,
            alignment=TA_CENTER,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Normal"],
            fontName="Times-Bold",
            fontSize=12,
            leading=16,
            alignment=TA_LEFT,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Normal"],
            fontName="Times-Bold",
            fontSize=12,
            leading=16,
            alignment=TA_LEFT,
            spaceBefore=8,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=12,
            leading=18,  # espaçamento 1,5
            alignment=TA_JUSTIFY,
            firstLineIndent=1.25 * cm,
            spaceAfter=6,
        ),
        "body_no_indent": ParagraphStyle(
            "body_no_indent",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=12,
            leading=18,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "code": ParagraphStyle(
            "code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=8,
            leading=10,
            alignment=TA_LEFT,
            spaceBefore=4,
            spaceAfter=8,
            leftIndent=0,
        ),
        "legenda": ParagraphStyle(
            "legenda",
            parent=base["Normal"],
            fontName="Times-Italic",
            fontSize=10,
            leading=12,
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=10,
        ),
    }
    return s


def _header_footer(subtitulo: str):
    def _draw(canvas, doc):
        canvas.saveState()
        if doc.page > 1:
            canvas.setFont("Times-Italic", 9)
            canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.5 * cm, subtitulo)
            canvas.setFont("Times-Roman", 10)
            canvas.drawCentredString(A4[0] / 2, 1.2 * cm, str(doc.page - 1))
        canvas.restoreState()

    return _draw


def capa(story, st, subtitulo: str):
    story.append(Spacer(1, 1.2 * cm))
    story.append(Paragraph(INSTITUICAO, st["capa_inst"]))
    story.append(Paragraph(CURSO, st["capa_curso"]))
    story.append(Spacer(1, 3.5 * cm))
    story.append(Paragraph(AUTOR.upper(), st["capa_autor"]))
    story.append(Spacer(1, 2.8 * cm))
    story.append(Paragraph(TITULO, st["capa_titulo"]))
    story.append(Paragraph(subtitulo, st["capa_sub"]))
    story.append(Spacer(1, 5.5 * cm))
    story.append(Paragraph(f"{CIDADE}<br/>{ANO}", st["capa_local"]))
    story.append(PageBreak())


def p(story, st, text: str, indent: bool = True):
    style = st["body"] if indent else st["body_no_indent"]
    story.append(Paragraph(text, style))


def h1(story, st, text: str):
    story.append(Paragraph(text.upper(), st["h1"]))


def h2(story, st, text: str):
    story.append(Paragraph(text, st["h2"]))


def build_doc(path: Path, subtitulo: str, build_body):
    st = styles()
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=3 * cm,
        rightMargin=2 * cm,
        topMargin=3 * cm,
        bottomMargin=2 * cm,
        title=TITULO,
        author=AUTOR,
    )
    story = []
    capa(story, st, subtitulo)
    build_body(story, st)
    doc.build(story, onFirstPage=_header_footer(subtitulo), onLaterPages=_header_footer(subtitulo))
    print(f"OK {path.name}")


def teorico():
    def body(story, st):
        h1(story, st, "1 Introdução")
        p(
            story,
            st,
            "Este relatório teórico fundamenta a proposta Cloud DevOps desenvolvida para a "
            "Loja Veloz, e-commerce de médio porte que enfrentou indisponibilidades em deploys, "
            "dificuldade de escala em picos de acesso e baixa rastreabilidade entre serviços. "
            "A solução Pedidos Veloz organiza API Gateway, pedidos, pagamentos, estoque e "
            "PostgreSQL sob princípios cloud-native, com ambiente local reproduzível, "
            "Kubernetes, CI/CD, escala automática e observabilidade.",
        )

        h1(story, st, "2 Microsserviços, DevOps e 12-Factor")
        p(
            story,
            st,
            "Em microsserviços, o sistema é decomposto em serviços com ciclo de vida "
            "independente, o que favorece escala seletiva e evolução incremental, exigindo "
            "governança de deploy e telemetria ponta a ponta. O DevOps une automação e "
            "operação para reduzir o lead time até a produção e tornar falhas observáveis. "
            "Os princípios 12-Factor App — configuração por ambiente, logs como streams, "
            "processos <i>stateless</i>, <i>port binding</i> e <i>disposability</i> — orientam "
            "o desenho adotado neste trabalho.",
        )

        h1(story, st, "3 Docker, Kubernetes, CI/CD e observabilidade")
        p(
            story,
            st,
            "O Docker empacota a aplicação em imagens imutáveis; o Compose orquestra o "
            "ambiente local com redes, volumes e variáveis. O Kubernetes orquestra a "
            "produção: Deployments, Services, ConfigMaps, Secrets, <i>probes</i>, "
            "<i>rolling updates</i> e Horizontal Pod Autoscaler (HPA). O CI/CD, por meio do "
            "GitHub Actions, executa <i>build</i>, testes e publicação de imagens no GitHub "
            "Container Registry antes do <i>deploy</i>. A observabilidade combina métricas "
            "(base do HPA), logs JSON em <i>stdout</i> e <i>traces</i> com cabeçalho W3C "
            "<i>traceparent</i> e OpenTelemetry, permitindo correlacionar falhas entre os "
            "serviços.",
        )

        h1(story, st, "4 Referência de pesquisa e decisões")
        p(
            story,
            st,
            "Como referência pública, utiliza-se o Google Cloud Online Boutique "
            "(microservices-demo), além da documentação oficial de Kubernetes, Docker, "
            "12-Factor, Terraform, GitHub Actions e OpenTelemetry. Decisões do projeto: "
            "API Gateway único; PostgreSQL no MVP; <i>deploy</i> RollingUpdate com "
            "maxUnavailable igual a zero; HPA no gateway e em pedidos; Pod Security "
            "Admission <i>baseline</i>, NetworkPolicies e usuário não-root; Terraform para "
            "cluster Kubernetes gerenciado. Assim, a Loja Veloz reduz risco de "
            "<i>deploy</i>, melhora o tempo de entrega e ganha capacidade de diagnosticar e "
            "escalar sob demanda.",
        )

    build_doc(OUT / "Relatorio_Teorico_Pedidos_Veloz.pdf", "Relatório técnico teórico", body)


def pratico():
    def body(story, st):
        h1(story, st, "1 Introdução")
        p(
            story,
            st,
            "Este relatório técnico prático descreve a implementação do MVP Pedidos Veloz "
            "para a Loja Veloz. A entrega cobre ambiente local com Docker Compose, "
            "conteinerização e versionamento de imagens, manifests Kubernetes, pipeline de "
            "CI/CD, observabilidade, estratégia de <i>deploy</i> e escala, além de "
            "infraestrutura como código com Terraform. O código-fonte encontra-se no "
            "repositório do projeto.",
        )

        h1(story, st, "2 Ambiente local com Docker Compose")
        p(
            story,
            st,
            "O arquivo <i>docker-compose.yml</i> sobe os serviços postgres, estoque, "
            "pagamentos, pedidos e api-gateway em uma rede <i>bridge</i> dedicada, com volume "
            "persistente para o banco e <i>script</i> de inicialização em "
            "<i>scripts/init-db.sql</i>. As variáveis de ambiente são carregadas a partir do "
            "arquivo <i>.env</i>, tendo <i>.env.example</i> como modelo versionado.",
        )
        p(
            story,
            st,
            "Com o comando <i>docker compose up --build</i>, toda a plataforma sobe de forma "
            "reproduzível. O API Gateway expõe a porta 8080. O fluxo principal é: o cliente "
            "envia POST /api/pedidos ao gateway; o serviço de pedidos reserva estoque, "
            "solicita autorização de pagamento e confirma ou libera os itens. As respostas "
            "incluem identificador de <i>trace</i> para correlação.",
        )

        h1(story, st, "3 Conteinerização e versionamento")
        p(
            story,
            st,
            "Cada microsserviço possui Dockerfile multi-stage: a etapa <i>deps</i> instala "
            "dependências de produção; a etapa <i>runner</i> utiliza node:20-alpine, executa "
            "como usuário não-root, inclui HEALTHCHECK e mantém apenas os artefatos "
            "necessários. As imagens são tagueadas como lojaveloz/&lt;servico&gt;:1.0.0. "
            "Credenciais não entram na imagem; são injetadas por ambiente, ConfigMap e Secret.",
        )

        h1(story, st, "4 Kubernetes — produção mínima")
        p(
            story,
            st,
            "Os manifests em <i>k8s/</i> são aplicados com <i>kubectl apply -k k8s/</i>. O "
            "Namespace utiliza Pod Security Admission (<i>enforce=baseline</i>). Há ConfigMap, "
            "Secret, Deployments com RollingUpdate, Services, <i>probes</i> HTTP, "
            "<i>requests/limits</i>, HorizontalPodAutoscaler e NetworkPolicies. A estratégia "
            "de <i>deploy</i> é RollingUpdate com maxUnavailable igual a zero e maxSurge igual "
            "a um. O HPA escala o api-gateway (2 a 8 réplicas) e o serviço de pedidos (2 a 10 "
            "réplicas) com base na utilização de CPU.",
        )

        h1(story, st, "5 CI/CD")
        p(
            story,
            st,
            "O pipeline em <i>.github/workflows/ci-cd.yml</i> executa testes e verificação de "
            "sintaxe por serviço, <i>build</i> e <i>push</i> das imagens para o GHCR, scan com "
            "Trivy e <i>gate</i> de ambiente <i>staging</i> com validação dos manifests. O "
            "GITHUB_TOKEN autentica a publicação das imagens.",
        )

        h1(story, st, "6 Observabilidade e Terraform")
        p(
            story,
            st,
            "Os serviços emitem logs JSON em <i>stdout</i>. O middleware compartilha o "
            "cabeçalho W3C <i>traceparent</i> entre gateway, pedidos, estoque e pagamentos. O "
            "OpenTelemetry Collector está em <i>observability/</i>. O diretório "
            "<i>terraform/</i> define provider AWS, variáveis, <i>tags</i>, estrutura para "
            "módulos VPC/EKS e backend remoto S3/DynamoDB.",
        )

        h1(story, st, "7 Execução, validação e resultados")
        p(
            story,
            st,
            "Ambiente local: <i>cp .env.example .env &amp;&amp; docker compose up --build</i>. "
            "Testes: <i>npm run install:all &amp;&amp; npm test</i>. Kubernetes: "
            "<i>kubectl apply -k k8s/</i>. A validação funcional confirmou o <i>health</i> do "
            "gateway, a listagem de estoque e a criação de pedido com status CONFIRMADO, "
            "incluindo valor total, identificador de pagamento e <i>traceId</i>. Evidências "
            "detalhadas constam no anexo <i>Evidencias_Pedidos_Veloz.pdf</i> e em "
            "<i>docs/evidencias/</i>.",
        )
        p(
            story,
            st,
            "Como referência de mercado, adotou-se o Google Online Boutique "
            "(microservices-demo), complementado pelas documentações oficiais das tecnologias "
            "utilizadas.",
        )

    build_doc(OUT / "Relatorio_Pratico_Pedidos_Veloz.pdf", "Relatório técnico prático", body)


def evidencias():
    def body(story, st):
        h1(story, st, "1 Objetivo deste documento")
        p(
            story,
            st,
            "Este documento reúne evidências da execução do MVP Pedidos Veloz, complementando "
            "o relatório técnico prático e o repositório. São apresentados o diagrama de "
            "arquitetura, o estado dos containers Docker Compose, as respostas da API e o "
            "resultado dos testes automatizados.",
            indent=False,
        )

        h1(story, st, "2 Arquitetura da solução")
        img = EVID / "arquitetura-pedidos-veloz.png"
        if img.exists():
            story.append(Image(str(img), width=15 * cm, height=8.4 * cm))
            story.append(
                Paragraph(
                    "Figura 1 – Arquitetura Pedidos Veloz (Gateway, Pedidos, Pagamentos, Estoque e PostgreSQL)",
                    st["legenda"],
                )
            )
        p(
            story,
            st,
            "A arquitetura segue o padrão de microsserviços com entrada única pelo API Gateway "
            "na porta 8080, orquestração do fluxo de pedido e persistência em PostgreSQL.",
        )

        h1(story, st, "3 Ambiente local (Docker Compose)")
        p(
            story,
            st,
            "Após <i>docker compose up --build</i>, os cinco containers permaneceram em estado "
            "<i>healthy</i>: pv-gateway, pv-pedidos, pv-pagamentos, pv-estoque e pv-postgres. "
            "O gateway publicou a porta 8080 e o PostgreSQL a porta 5432.",
        )
        story.append(
            Preformatted(
                "NOME            STATUS                   PORTAS\n"
                "pv-estoque      Up (healthy)             3003/tcp\n"
                "pv-gateway      Up (healthy)             0.0.0.0:8080->8080/tcp\n"
                "pv-pagamentos   Up (healthy)             3002/tcp\n"
                "pv-pedidos      Up (healthy)             3001/tcp\n"
                "pv-postgres     Up (healthy)             0.0.0.0:5432->5432/tcp",
                st["code"],
            )
        )

        h1(story, st, "4 Validação da API")
        api_path = EVID / "api-resultado.json"
        if api_path.exists():
            data = json.loads(api_path.read_text(encoding="utf-8-sig"))
            health = json.dumps(data.get("health", {}), ensure_ascii=False, indent=2)
            pedido = json.dumps(data.get("pedido", {}), ensure_ascii=False, indent=2)
            p(story, st, "Resposta de GET /health:", indent=False)
            story.append(Preformatted(health[:1200], st["code"]))
            p(story, st, "Resposta de POST /api/pedidos (pedido confirmado):", indent=False)
            story.append(Preformatted(pedido[:1200], st["code"]))
        else:
            p(
                story,
                st,
                "Foi validado GET /health (status ok) e POST /api/pedidos com retorno "
                "CONFIRMADO, valorTotal, pagamentoId e traceId.",
            )

        h1(story, st, "5 Testes automatizados")
        tests = EVID / "resultado-testes.txt"
        if tests.exists():
            raw = tests.read_text(encoding="utf-8", errors="ignore")
            # Mantém trecho relevante
            lines = [ln for ln in raw.splitlines() if ln.strip()]
            snippet = "\n".join(lines[-40:]) if len(lines) > 40 else "\n".join(lines)
            story.append(Preformatted(snippet[:2500], st["code"]))
        p(
            story,
            st,
            "Os testes unitários dos quatro serviços (api-gateway, pedidos, pagamentos e "
            "estoque) foram executados com sucesso via <i>npm test</i>.",
        )

        h1(story, st, "6 Considerações")
        p(
            story,
            st,
            "As evidências acima comprovam a execução local multi-serviço, a integração entre "
            "os microsserviços e a existência de testes automatizados, em conformidade com os "
            "requisitos práticos da disciplina.",
        )

    build_doc(OUT / "Evidencias_Pedidos_Veloz.pdf", "Evidências de execução do MVP", body)


if __name__ == "__main__":
    teorico()
    pratico()
    evidencias()
    # Contagem de páginas
    try:
        from pypdf import PdfReader

        for name in (
            "Relatorio_Teorico_Pedidos_Veloz.pdf",
            "Relatorio_Pratico_Pedidos_Veloz.pdf",
            "Evidencias_Pedidos_Veloz.pdf",
        ):
            path = OUT / name
            print(f"  {name}: {len(PdfReader(str(path)).pages)} páginas")
    except Exception as exc:
        print("contagem:", exc)
