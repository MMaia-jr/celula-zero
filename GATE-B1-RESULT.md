# GATE-B1-RESULT — Autoridade e coordenação

Classificação local: `PASS`

Data: 2026-08-22

Branch: `feat/backend-b1-authority-coordination`

Base exata: `e210df89715d45595e432c8c0441a9f7887c7967`

Head técnico integralmente testado: `028bfc4d8567e4a263e99753444966574af78505`

O commit posterior que contém apenas este resultado é identificável pelo Git e
pelo Draft PR. Um arquivo versionado não tenta declarar o hash do próprio
commit.

Base futura do Draft PR: `feat/mvp-001-gate-1`

## Escopo implementado

- célula seed `cell-zero` e policy mínima v1;
- definições de capabilities, papéis contextuais e assignments;
- delegações limitadas por capability, escopo, policy e validade, com revogação;
- oportunidades e versões imutáveis;
- propostas e versões imutáveis;
- revisão, rejeição e aceite explícitos;
- compromisso atômico referenciando versões exatas aceitas;
- decision records e domain events append-only;
- recibos idempotentes com conflito de payload tipado;
- reconciliação de oportunidade e proposta;
- negação auditável de autoaceite e autoampliação de autoridade;
- objetos criados como `PROJECT`, com publicação em comando separado.

## Arquivos e migration

- `.github/workflows/gate-b1-ci.yml` — CI isolado do Gate B1;
- `scripts/check-gate-b1-concurrency.sh` — dez corridas PostgreSQL reais;
- `supabase/migrations/20260822120000_gate_b1_authority_coordination.sql` —
  migration aditiva B1;
- `supabase/tests/database/gate_b1.test.sql` — 57 verificações B1;
- `GATE-B1-RESULT.md` — este registro.

Nenhuma migration existente foi alterada.

## Comandos executados

Ambiente:

```text
node --version
npm --version
npx --yes supabase@2.115.0 --version
docker --version
```

Bootstrap e banco local isolado:

```text
npx --yes supabase@2.115.0 start -x vector,logflare
npx --yes supabase@2.115.0 db reset --local
npx --yes supabase@2.115.0 test db
B1_CONCURRENCY_ITERATIONS=10 ./scripts/check-gate-b1-concurrency.sh
```

Regressão Node 24:

```text
PATH=<runtime-node-24>:$PATH npx --yes npm@11.6.2 ci
npx --yes npm@11.6.2 run lint
npx --yes npm@11.6.2 run typecheck
npx --yes npm@11.6.2 run test
npx --yes npm@11.6.2 run test:contracts
npx --yes npm@11.6.2 run build
```

Tentativa adicional de regressão por navegador:

```text
npx playwright install chromium
npx --yes npm@11.6.2 run test:e2e
```

## Resultados e contagens

| Verificação | Resultado |
| --- | --- |
| base remota exata | `PASS` — `e210df89715d45595e432c8c0441a9f7887c7967` |
| Node | `PASS` — `v24.19.0` |
| npm efêmero | `PASS` — `11.6.2` |
| instalação por lockfile | `PASS` — 496 pacotes; 0 vulnerabilidades reportadas |
| lint | `PASS` — zero warnings |
| typecheck | `PASS` |
| Vitest | `PASS` — 14/14 |
| contratos Gate 1 | `PASS` — 20/20 |
| build | `PASS` — 9 rotas; compilação e TypeScript concluídos |
| reset por migrations + seed | `PASS` |
| pgTAP Gate 1 | `PASS` — 25/25 |
| pgTAP Gate B1 | `PASS` — 57/57 |
| pgTAP combinado | `PASS` — 82/82 |
| S7 concorrente | `PASS` — 10/10 corridas reais |
| reconciliação pós-corrida | `PASS` — 10/10 sem divergência |
| corrupção material sintética | `PASS` — `event_material_version` detectado |
| CI do Draft PR | `PENDING` no momento deste registro |

## Evidência dos cenários obrigatórios

### S2 — revisão antes do compromisso

`PASS`.

- pedido de revisão não criou compromisso;
- revisão criou proposta v2 e preservou literalmente v1;
- tentativa de aceitar v1 após revisão retornou `CZ409:STALE_VERSION`;
- aceite explícito criou compromisso referenciando oportunidade v2 e proposta
  v2;
- proposta e oportunidade reconciliaram sem issues.

### S3 — rejeição

`PASS`.

- proposta terminou em `REJECTED`;
- nenhum compromisso foi criado;
- decisão append-only preservou o fundamento;
- proposta rejeitada reconciliou sem issues.

### S4 — agente limitado

`PASS` no recorte autorizado de B1.

- ator `AI_AGENT` com operador e papel limitado submeteu proposta atribuível;
- capability delegada não permitiu autoaceite;
- autoaceite retornou `SELF_ACCEPTANCE_DENIED` e preservou decisão/evento `DENY`;
- delegação de gestão não permitiu autoampliação;
- autoampliação retornou `SELF_ESCALATION_DENIED` e preservou decisão/evento
  `DENY`;
- delegação autorizada foi revogada explicitamente.

`Contribution` pertence ao Gate B2 da especificação controladora e não foi
implementada para fabricar um S4 mais amplo fora do escopo autorizado.

### S7 — concorrência

`PASS`.

Dez iterações abriram duas sessões PostgreSQL concorrentes sobre uma
oportunidade de capacidade um. Em todas:

- exatamente uma sessão criou compromisso;
- a perdedora recebeu `CZ409:STALE_VERSION` ou
  `CZ409:CAPACITY_EXHAUSTED`;
- permaneceu exatamente um compromisso;
- a oportunidade fechou com versão imutável adicional;
- a reconciliação retornou `{}`.

### S11 — idempotência

`PASS`.

- replay com a mesma chave e payload retornou a mesma resposta lógica;
- permaneceu um objeto, um evento e um recibo;
- mesma chave com payload diferente retornou
  `CZ409:IDEMPOTENCY_CONFLICT`.

## Regressão do Gate 1

As 25 verificações pgTAP originais passaram junto das 57 novas verificações.
Lint, typecheck, 14 testes unitários, 20 contratos estáticos e build também
passaram sem alterar frontend, manifests ou lockfile.

A tentativa local adicional de Playwright não iniciou porque a porta 3000 do
Mac estava ocupada pelo container preexistente `dev-account-1`, pertencente ao
laboratório Huly. Esse container não foi interrompido. Não houve asserção E2E
vermelha: o `webServer` expirou antes da execução. O workflow Gate 1 já
versionado executará as jornadas pública e autenticada em runner isolado do
Draft PR.

## Limitações

- o `PASS` cobre somente o Gate B1 e os cenários S2, S3, S4 no recorte B1, S7
  e S11;
- não cobre Contribution, Evidence, Verification, outcome, contestação,
  portabilidade ou adapters, que pertencem a gates posteriores;
- policies e digests detectam a divergência testada, mas não tornam um operador
  privilegiado criptograficamente resistente;
- a validação local usou Supabase CLI efêmera 2.115.0 e excluiu `vector` e
  `logflare`, serviços não necessários aos testes PostgreSQL;
- CI remoto ainda precisava confirmar os workflows no head publicado quando
  este registro foi criado.

## Ausências confirmadas

Não foram criados ou executados:

- frontend ou alteração em `apps/web/**`;
- deploy ou produção;
- serviço novo ou dependência arquitetural externa;
- alteração de manifest, engine ou lockfile;
- Huly, A2A, ATProto, DID, VC ou Web3;
- wallet, testnet, smart contract, blockchain, token ou fundos;
- merge dos PRs #63 ou #64;
- qualquer merge.

## Classificação

`PASS` para o Gate B1 localmente testado.

Esta classificação não autoriza merge e permanece condicionada à observação
dos checks do Draft PR no head publicado.
