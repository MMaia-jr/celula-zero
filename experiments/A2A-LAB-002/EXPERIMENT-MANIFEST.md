# A2A-LAB-002 — Experiment Manifest

Data da execução registrada nos artefatos: 2026-08-15

Data da preservação canônica: 2026-08-16

Classe: Manifesto de experimento reconstruído a partir de registros locais

## Objetivo reconstruído

Examinar, por execução local, o que A2A core e extensões oficiais/experimentais
conseguem transportar e se fornecem semântica interoperável para condições,
critérios, verificação e decisão normativa sobre um resultado.

Esta formulação é reconstrução posterior baseada no harness, nos logs, no
inventário de extensões e no contexto fornecido pelo operador. Não substitui os
Original Records preservados em `raw/` e `harness/`.

## Componentes

- A2A core e documentação no SHA registrado em `REPOSITORY-MANIFEST.md`;
- samples oficiais A2A no SHA registrado;
- extensão experimental OID4VP no SHA registrado;
- harness próprio `native-model/client.py` e `native-model/server.py`;
- Python 3.12.14 e `a2a-sdk` 1.1.0;
- Node.js 24.19.0;
- npm 11.17.0;
- pnpm 10.29.3 no fluxo OID4VP;
- `@a2a-js/sdk` 1.0.1 no sample OID4VP;
- `@a2a-js/sdk` 1.0.0 no sample JavaScript Hello World.

## Procedimentos reconstruíveis

### Modelo A2A nativo

Os dois arquivos do harness são inputs únicos e preservam os entrypoints. O
server expõe Agent Card e JSON-RPC em `127.0.0.1:10002`. O client resolve o
Agent Card, envia duas Tasks via streaming e registra dois casos:

- `accepted`, target `OK`, limite de dois caracteres;
- `rejected-result`, target `TOOLONG`, limite de três caracteres.

O server produz `result.txt`, executa checks definidos pela aplicação, produz
`application-verification.json` e conclui ambas as Tasks como `COMPLETED`.

Os comandos shell exatos usados para iniciar esses entrypoints não foram
preservados. Não são reconstruídos como se fossem Original Record.

### OID4VP

Os logs registram os scripts de pacote `agent` e `client`, executados com
`tsx`, o Agent A2A em `localhost:10003` e o verifier OID4VP em
`localhost:3001/oid4vp`.

Foi observada a sequência `SUBMITTED → AUTH_REQUIRED → WORKING → FAILED`. O
client confirmou compartilhar `SampleCredential`. A execução posterior falhou
porque foi usada somente uma chave placeholder, rejeitada pela API.

Os comandos de instalação e a linha shell completa de inicialização não foram
preservados.

### Interoperabilidade heterogênea

Os logs registram um client Python oficial chamando um server JavaScript Hello
World oficial em `127.0.0.1:9999` por JSON-RPC. A Task terminou `COMPLETED` e
retornou Artifact com a resposta ao texto `Hello from Python client.`

Os caminhos de source permanecem recuperáveis no repositório de samples pelo
SHA, mas os comandos shell exatos não foram preservados.

## Fatos observados versus reconstrução

Fatos diretamente preservados:

- bytes dos dois arquivos do harness;
- outputs dos seis logs;
- metadados de ambiente e inventário de extensões;
- remotes, branches, SHAs e working trees dos repos upstream na inspeção de
  recuperação.

Reconstrução posterior:

- organização desses registros em um único objetivo experimental;
- descrição consolidada do procedimento quando a linha de comando não aparece
  nos outputs;
- interpretação metodológica registrada em `RESULT.md`.

## Conteúdo não preservado

- árvores upstream, recuperáveis por remote + SHA;
- `.bootstrap/`, `.venv/`, `node/`, `node.tar.gz` e `python/`;
- `node_modules`, caches, downloads e binários;
- qualquer `.env` ou exemplo upstream de `.env`;
- histórico completo do terminal e comandos exatos ausentes dos logs.

## Limitações

- execução única em um laboratório local;
- preservação parcial da sequência operacional;
- ausência de replicação independente;
- falha posterior no fluxo OID4VP por falta de chave OpenAI real;
- universo de extensões limitado aos repositórios e documentação inspecionados;
- nenhuma inferência sobre soluções fora desse universo.
