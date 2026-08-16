# TECH-SPIKE-HULY-001 — resultado de runtime

Data de registro do resultado: 2026-08-16

Classe: Resultado experimental reconstruído e preservado

## 1. PREREGISTRATION

Fonte:

- `tests/TECH-SPIKE-HULY-001.md`

Base Huly preregistrada:

`1be6047c8a7c7b7a6674c9495834777f301f3379`

A preregistração foi documentada antes da execução e não foi modificada por
esta recuperação.

Pergunta decisória:

A implementação mínima de Intent consegue funcionar no Huly usando os
mecanismos existentes, sem exigir alteração funcional do core ou expansão
arquitetural material?

## 2. IMPLEMENTATION STATE

A implementação executada foi preservada em clone Huly separado:

- branch local: `experiment/tech-spike-huly-001-preserved`;
- commit local: `c0939fcd4f69576780a63714c61f8a4138666dca`;
- base: `1be6047c8a7c7b7a6674c9495834777f301f3379`;
- quatro pacotes Intent;
- 43 arquivos novos;
- seis arquivos upstream modificados, incluindo o lockfile;
- 49 caminhos no total;
- nenhum core funcional modificado;
- nenhum serviço novo;
- nenhuma dependência arquitetural externa nova.

O source tree completo do Huly não foi incorporado ao `celula-zero`. O delta é
preservado por patch e manifesto em
`experiments/TECH-SPIKE-HULY-001/`.

## 3. ORIGINAL/LOCAL EVIDENCE AVAILABLE

Evidência local/canônica preservada:

- preregistração versionada;
- commit local do delta executado no clone Huly;
- patch binário/reaplicável contra a base congelada;
- manifesto de implementação com hashes e estatísticas;
- inventário read-only dos containers, images, volumes, healthchecks e portas
  ainda observáveis no Docker local;
- correção PostCSS preservada no código;
- estado final do código capaz de representar Intent, Contribution,
  `originator`, estado, `evidenceReference`, `result` e Activity/History.

Evidência bruta não integralmente preservada:

- não existe um pacote completo de logs de toda a execução;
- screenshots observadas durante a sessão não foram incorporadas a este
  registro;
- não existe gravação integral da interação de UI;
- parte dos 15 comportamentos depende do registro humano da sessão.

## 4. HUMAN-CONFIRMED RUNTIME OBSERVATIONS

Segundo o registro humano da execução, o teste cobriu somente os 15
comportamentos mínimos preregistrados:

| # | Comportamento mínimo | Estado reportado/observado durante a sessão |
| --- | --- | --- |
| 1 | Huly inicializa | confirmado |
| 2 | aplicação Intent aparece na interface | confirmado |
| 3 | usuário cria uma Intent | confirmado; Intent `Novo App` |
| 4 | `originator` é registrado explicitamente | confirmado |
| 5 | Intent persiste após navegação/reload | confirmado |
| 6 | estado inicia em `open` | confirmado |
| 7 | estado avança para `in_progress` | confirmado |
| 8 | estado avança para `completed` | confirmado |
| 9 | segunda Contribution pode ser adicionada | confirmado |
| 10 | Contribution preserva autor próprio | confirmado |
| 11 | Contribution preserva timestamp próprio | confirmado |
| 12 | múltiplas Contributions podem ser listadas | confirmado |
| 13 | `evidenceReference` pode ser salvo | confirmado |
| 14 | `result` pode ser salvo | confirmado |
| 15 | activity/history mostra criação ou alteração | confirmado |

Total reportado/observado durante a execução: **15/15**.

Esta tabela preserva o relato da sessão. Ela não transforma os itens em
verificação independente nem em replicação.

## 5. INCIDENTS AND CORRECTIONS

### PostCSS

Estado anterior → erro observado → alteração → resultado posterior:

`plugins/intent-resources/postcss.config.js` referenciava o profile `ui` do
`platform-rig` → a primeira tentativa de `docker:min` falhou porque o módulo não
existia na base congelada → foi adotada configuração direta com `autoprefixer`,
seguindo pacotes upstream de referência → o build posterior prosseguiu.

### Images ausentes

Estado anterior → erro observado → alteração → resultado posterior:

primeira tentativa de `docker:up:min` → `worker` e `events-processor` não tinham
images locais → as images upstream necessárias foram reconstruídas → a pilha
subiu posteriormente.

### Redpanda

O container Redpanda apareceu `unhealthy` por seu healthcheck SASL. Durante a
sessão, `rpk cluster info` e `rpk topic list` responderam corretamente. A
recuperação preserva ambos os fatos sem reclassificar o healthcheck.

## 6. RESULT

Classificação: **PASS**.

Formulação autorizada:

**TECH-SPIKE-HULY-001 = EXECUTED / PASS, 15/15 comportamentos mínimos
reportados/observados durante a execução, com preservação incompleta da
evidência bruta.**

O resultado se limita à pergunta e aos critérios preregistrados. Nenhuma
engenharia adicional foi realizada nesta recuperação para transformar falha em
sucesso.

## 7. LIMITATIONS

- O teste cobriu somente o mínimo preregistrado.
- A evidência bruta não foi integralmente preservada.
- Algumas confirmações dependem do registro humano da sessão.
- Não houve replicação independente.
- O resultado vale para uma execução local na base Huly congelada e no ambiente
  observado.
- PASS não demonstra estabilidade de upgrades, produção, segurança,
  escalabilidade, utilidade externa, adoção, product-market fit ou superioridade
  sobre outras plataformas.
- PASS não escolhe Huly como arquitetura e não autoriza expansão do Intent.

O resultado NÃO recebe os estados:

- `VERIFIED`;
- `REPLICATED`;
- `USEFUL TO EXTERNAL USER`;
- `ADOPTED`;
- `SCALABLE`.

## 8. STATE CHANGE

Estado anterior:

`DOCUMENTED preregistration`

Estado preservado após esta recuperação:

`DOCUMENTED preregistration → IMPLEMENTED → EXECUTED / PASS`

A viabilidade técnica mínima foi demonstrada no SHA/ambiente testado, com as
limitações acima. Nenhuma decisão arquitetural decorre automaticamente deste
resultado.

END OF TECH-SPIKE-HULY-001 RESULT
