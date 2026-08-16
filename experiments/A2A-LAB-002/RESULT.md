# A2A-LAB-002 — Result

Data da execução registrada: 2026-08-15

Data da preservação canônica: 2026-08-16

Classe: Resultado experimental preservado

## 1. ORIGINAL RECORDS AVAILABLE

- `raw/environment.txt`;
- `raw/extension-inventory.txt`;
- `harness/native-model/client.py`;
- `harness/native-model/server.py`;
- seis logs em `raw/` para o modelo nativo, OID4VP e teste heterogêneo.

Hashes, tamanhos e origens estão em `ARTIFACT-MANIFEST.md`.

## 2. EXECUTION OBSERVED

O laboratório registrou três probes:

1. modelo nativo sobre primitives A2A core, com condições e critérios
   interpretados pela aplicação;
2. sample da extensão experimental OID4VP para autorização durante uma Task;
3. interoperabilidade básica entre client Python e server JavaScript oficiais.

## 3. NATIVE A2A RESULT

A2A transportou dados estruturados de intenção, condições e critérios; Task,
status, mensagens e Artifacts transportaram execução, output e um Artifact de
checks/decisão.

O caso aceito pela aplicação terminou `TASK_STATE_COMPLETED`. O caso rejeitado
pela aplicação também terminou `TASK_STATE_COMPLETED`.

As decisões `ACCEPTED` e `REJECTED` foram produzidas pelo harness como dados e
metadata de aplicação. Não foram estados normativos fornecidos pelo protocolo.

Task completion é distinta de result verification. Não existe
`TASK_STATE_ACCEPTED`; `TASK_STATE_REJECTED` significa recusa do agente em
executar uma Task, não reprovação de um Artifact produzido.

## 4. OID4VP RESULT

A extensão experimental foi anunciada pelo Agent Card. Os logs preservam:

`SUBMITTED → AUTH_REQUIRED → apresentação de credencial → WORKING`.

Depois da autorização, a execução terminou `FAILED` porque não havia uma chave
OpenAI real. A chave placeholder foi rejeitada como esperado.

O probe demonstra o fluxo de autorização observado até `WORKING`. Não
demonstra execução OID4VP completa nem verificação normativa do resultado.

## 5. HETEROGENEOUS RESULT

Um client Python oficial chamou um server JavaScript Hello World oficial via
JSON-RPC. A Task terminou `COMPLETED` e retornou um Artifact de texto.

Isso constitui interoperabilidade básica no par e configuração testados, não
interoperabilidade universal.

## 6. EXTENSIONS FOUND

O inventário preservado registrou:

- OID4VP experimental: autorização baseada em apresentação verificável durante
  a Task;
- Secure Passport v1: identidade/contexto do caller e integridade opcional;
- Timestamp v1: timestamp de Message/Artifact;
- Traceability v1: passos, parâmetros, custos, tokens, latência e timestamps;
- AGP v1: Intent, capabilities e policy constraints para roteamento.

Nenhuma extensão existente adequada foi identificada no universo inspecionado
para compromisso + critérios de aceitação + verificação normativa do resultado.

## 7. MATERIAL GAP

Lacuna observada: acordo verificável sobre resultado, incluindo:

- condições identificadas;
- critérios objetivos e versionados;
- aceite explícito;
- associação critério ↔ Artifact ↔ verificador;
- decisão normativa `ACCEPTED`/`REJECTED`;
- correção/revisão.

Formulação preservada:

**A2A transporta os dados necessários, mas neste laboratório não foi
identificada semântica core ou extensão existente que dê efeito interoperável a
compromisso, critérios e verificação do resultado.**

## 8. RESULT

Classificação: **PARTIAL**.

Hipótese principal: **não refutada**.

A2A conseguiu transportar:

intenção → condições → execução → Artifact → verificações → decisão.

Porém condições, critérios, verificação e decisão `ACCEPTED`/`REJECTED`
ganharam significado somente porque a aplicação os interpretou. O protocolo
core não forneceu essa semântica.

## 9. LIMITATIONS

- execução única e local;
- três probes específicos;
- nenhum replay ou replicação independente nesta recuperação;
- comandos shell exatos não integralmente preservados;
- OID4VP falhou após o fluxo de autorização por ausência de chave real;
- pesquisa de extensões limitada ao universo documentado no inventário;
- aplicação do harness definiu seus próprios checks e decisões;
- o resultado não mede utilidade externa, adoção, segurança ou escala.

## 10. CLAIMS NOT SUPPORTED

Este resultado não demonstra:

- que nenhuma solução exista fora do universo pesquisado;
- que seja necessário construir um protocolo novo;
- que seja necessário construir uma extensão;
- que a lacuna implique mercado ou product-market fit;
- que PARTIAL valide a Célula Zero;
- interoperabilidade universal;
- verificação normativa fornecida por A2A core;
- sucesso completo do fluxo OID4VP;
- escolha ou adoção arquitetural.

END OF A2A-LAB-002 RESULT
