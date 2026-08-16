# TECH-SPIKE-HULY-001 — Local Runtime Inventory

Data da inspeção: 2026-08-16

Classe: Inventário read-only de runtime local

Este documento registra metadados observáveis do Docker local. Images,
containers, volumes e dados persistidos não foram copiados, exportados,
modificados ou versionados.

## Containers relevantes

Todos os 19 containers abaixo estavam em estado `running` durante a inspeção.
`none` significa que o container não expunha healthcheck Docker.

| Container | Image | Image SHA (prefixo) | Health | Portas publicadas |
| --- | --- | --- | --- | --- |
| `dev-collaborator-1` | `hardcoreeng/collaborator` | `d3c6fba0faff` | none | `3078:3078` |
| `dev-transactor_cockroach-1` | `hardcoreeng/transactor` | `6e545f83cb02` | none | `3332:3332` |
| `dev-workspace_cockroach-1` | `hardcoreeng/workspace` | `582676c0c8d2` | none | nenhuma |
| `dev-events-processor-1` | `hardcoreeng/events-processor` | `36dda71180ac` | none | nenhuma |
| `dev-time-machine-1` | `hardcoreeng/worker` | `0f8b8f4317e1` | none | nenhuma |
| `dev-datalake-1` | `hardcoreeng/datalake` | `e0eb5bb1447c` | none | `4030:4030` |
| `dev-hulylake-1` | `hardcoreeng/hulylake` | `e42b26160e5f` | none | `8096:8096` |
| `dev-export-1` | `hardcoreeng/export` | `4c5e767fa268` | none | `4009:4009` |
| `dev-redpanda_console-1` | `docker.redpanda.com/redpandadata/console:v2.8.3` | `fc8006f22072` | none | `8000:8080` |
| `dev-account-1` | `hardcoreeng/account` | `f57ab16f100f` | none | `3000:3000` |
| `dev-front-1` | `hardcoreeng/front` | `79b0bbbe7104` | none | `8087:8080`, `8088:8080` |
| `dev-rekoni-1` | `hardcoreeng/rekoni-service` | `516497043885` | none | `4004:4004` |
| `dev-analytics-1` | `hardcoreeng/analytics-collector` | `5fe2936fe818` | none | `4017:4017` |
| `media` | `hardcoreeng/media` | `8ac52912ef1f` | none | nenhuma |
| `dev-cockroach-1` | `cockroachdb/cockroach:latest-v24.3` | `0ea746e5e1f2` | none | `26257:26257`, `8089:8080` |
| `dev-jaeger-1` | `jaegertracing/all-in-one:latest` | `ab6f1a1f0fb4` | none | `4317:4317`, `4318:4318`, `16686:16686` |
| `dev-minio-1` | `minio/minio` | `14cea493d9a3` | healthy | `9000:9000`, `9001:9001` |
| `stream` | `hardcoreeng/stream` | `2a51a59f34e7` | none | `1080:1080` |
| `redpanda` | `docker.redpanda.com/redpandadata/redpanda:v24.3.6` | `04baa40ed34e` | unhealthy | `18081:18081`, `18082:18082`, `19092:19092`, `19644:9644` |

## Images locais associadas à base congelada

As seguintes images Huly possuíam tag
`1be6047c8a7c7b7a6674c9495834777f301f3379` e tag `latest` apontando para o
mesmo image ID local:

| Image | Image ID (prefixo) |
| --- | --- |
| `hardcoreeng/events-processor` | `36dda71180ac` |
| `hardcoreeng/worker` | `0f8b8f4317e1` |
| `hardcoreeng/front` | `79b0bbbe7104` |
| `hardcoreeng/transactor` | `6e545f83cb02` |
| `hardcoreeng/rating` | `a5273d7c6533` |
| `hardcoreeng/rekoni-service` | `516497043885` |
| `hardcoreeng/analytics-collector` | `5fe2936fe818` |
| `hardcoreeng/workspace` | `582676c0c8d2` |
| `hardcoreeng/datalake` | `e0eb5bb1447c` |
| `hardcoreeng/collaborator` | `d3c6fba0faff` |
| `hardcoreeng/tool` | `2ae137ace2c9` |
| `hardcoreeng/account` | `f57ab16f100f` |
| `hardcoreeng/export` | `4c5e767fa268` |
| `hardcoreeng/telegram-bot` | `a8c6dda11235` |
| `hardcoreeng/media` | `8ac52912ef1f` |
| `hardcoreeng/translate` | `c86fbddeee82` |

`hardcoreeng/hulylake` e `hardcoreeng/stream` estavam disponíveis somente
em tags de serviço/`latest` observadas, não na tag do SHA congelado.

## Volumes

| Volume | Uso observado |
| --- | --- |
| `dev_cockroach_db` | dados CockroachDB em `/cockroach/cockroach-data` |
| `dev_files` | dados MinIO em `/data` |
| `dev_redpanda` | dados Redpanda em `/var/lib/redpanda/data` |
| `dev_telemetry` | dados Jaeger em `/badger` |
| `b9a4943947d506a18a960b703aa8b9bc39717ed24d7fc07306ed0abac78012aa` | volume anônimo montado pelo Jaeger em `/tmp` |

Nenhum conteúdo de volume foi inspecionado ou exportado.

## Observações de execução fornecidas pelo operador

- `frontend` respondeu HTTP 200 durante a sessão.
- `huly.local` respondeu HTTP 200 durante a sessão.
- O healthcheck Docker do Redpanda apresentou `unhealthy`, atribuído na sessão
  à configuração SASL do healthcheck.
- `rpk cluster info` e `rpk topic list` responderam corretamente durante a
  sessão.

Essas quatro observações são registro humano da execução. Nesta recuperação,
somente o estado atual dos containers, healthchecks, portas, images e volumes
foi inspecionado diretamente. Nenhum novo teste de runtime foi executado.
