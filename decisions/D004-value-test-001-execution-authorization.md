# Decisão D004 — autorização de execução do VALUE-TEST-001

Classe: Decisão

Data: 2026-08-15

Autoridade decisória:
Marcos Antonio Maia junior — fundador humano

## Objeto

VALUE-TEST-001 — teste preregistrado de utilidade externa do mecanismo mínimo de proveniência e handoff.

Documentos vinculantes para a execução:

- `tests/VALUE-TEST-001.md`
- `tests/VALUE-TEST-001-AUDIT-001.md`

Nos pontos modificados pelas emendas E1 e E2, prevalece `VALUE-TEST-001-AUDIT-001.md`.

## Declaração humana explícita

> AUTORIZO a execução do VALUE-TEST-001 conforme `tests/VALUE-TEST-001.md` e as emendas obrigatórias E1 e E2 de `tests/VALUE-TEST-001-AUDIT-001.md`.

## Decisão

EXECUÇÃO AUTORIZADA.

Está autorizada a preparação e execução do experimento conforme os documentos acima.

Isso inclui:

- seleção de um participante elegível;
- seleção e congelamento do auditor;
- registro prévio da comparabilidade das duas tarefas;
- execução da BASELINE;
- congelamento dos registros brutos;
- onboarding padronizado;
- execução do TREATMENT;
- congelamento dos registros;
- produção posterior das reference keys conforme E1;
- auditoria;
- cálculo das métricas preregistradas;
- classificação final conforme E2.

## Restrições

Esta decisão NÃO autoriza:

- alterar retroativamente a preregistração;
- alterar os critérios de PASS/FAIL depois de observar resultados;
- introduzir GRAPH;
- blockchain;
- A2A;
- PROV;
- JSON-LD;
- CZV;
- token;
- DAO;
- plataforma customizada;
- selecionar participante com base em expectativa de produzir PASS;
- reinterpretar eventual FAIL como sucesso narrativo.

O tratamento permanece limitado aos oito campos definidos em `tests/VALUE-TEST-001.md`.

## Regra metodológica

Nos pontos E1 e E2:

`VALUE-TEST-001-AUDIT-001.md`
prevalece sobre
`VALUE-TEST-001.md`.

Em particular:

- nenhuma reference key entre BASELINE e TREATMENT;
- teste válido + não satisfaz todos os critérios de PASS = FAIL.

## Escopo epistemológico

Mesmo um PASS constitui somente:

primeiro sinal externo mensurável compatível com a hipótese de utilidade.

Não demonstra:

- product-market fit;
- adoção;
- generalização;
- escala;
- superioridade universal;
- Protocolo dos Protocolos funcional.

## Próximo gate

Após preservação desta decisão:

PREPARAR EXECUÇÃO.

Nenhum resultado experimental existe no momento desta decisão.

## Status

VALUE-TEST-001:

EXECUÇÃO AUTORIZADA.

RESULTADO:

AINDA NÃO EXISTE.

END OF DECISION D004
