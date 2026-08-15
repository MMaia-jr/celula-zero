# TECH-SPIKE-003 — Teste externo de recuperabilidade semântica

Status: PROVISÓRIO — experimento; não constitui decisão de schema, arquitetura ou protocolo.

Data de registro: 2026-08-15

## Objetivo

Testar se um agente externo consegue reconstruir o significado essencial do ciclo Genesis encerrado usando somente:

- `graph/fixtures/GENESIS-CYCLE-000.jsonld`

O teste trata de recuperabilidade semântica, não de saber se o fixture, sozinho, permite reauditar independentemente cada artefato canônico de origem.

## Condição experimental

DeepSeek recebeu apenas `graph/fixtures/GENESIS-CYCLE-000.jsonld`. Os registros Markdown canônicos não foram fornecidos como entrada do teste externo.

A resposta integral recebida está preservada em `graph/TECH-SPIKE-003-DEEPSEEK-RESPONSE.md`.

## Proveniência e classes de afirmação

Este artefato mantém separadas três origens:

1. **Fatos dos registros canônicos** — provenientes de `genesis/INTENT-000.md`, `genesis/commitments/COMMITMENT-001.md`, `genesis/contributions/KIMI-ENTREGA-001.md` e `genesis/verifications/VERIFICATION-001.md`.
2. **Afirmações de DeepSeek** — preservadas como Registro Original em `graph/TECH-SPIKE-003-DEEPSEEK-RESPONSE.md`.
3. **Conclusões da auditoria pós-teste** — produzidas pela comparação entre a resposta de DeepSeek, o fixture e os registros canônicos.

Uma conclusão da auditoria não é atribuída a DeepSeek.

O aprendizado de proveniência de `incidents/CZ-001.md` permanece ativo:

> interpretação ≠ fala do participante

## Resultado externo — Registro Original de DeepSeek

Veredicto original de DeepSeek: **PARTIAL**

Confiança declarada por DeepSeek: **Alta**

Este resultado não é reescrito como `PASS`.

DeepSeek respondeu à pergunta sobre uso histórico de A2A com **NÃO É POSSÍVEL SABER**. Essa resposta é epistemicamente válida a partir do fixture isolado e não constitui erro.

## Auditoria contra os registros canônicos

Classe: conclusão da auditoria pós-teste.

A comparação encontrou reconstrução bem-sucedida, sem erro factual material, dos seguintes elementos:

- INTENT;
- OFFER;
- TERMS;
- ACCEPTANCE explícita;
- COMMITMENT;
- CONTRIBUTION;
- processo de verificação;
- duas tentativas de verificação;
- resultado final `PASSA`;
- estado do compromisso `CUMPRIDO / VERIFICADO`;
- estado do ciclo `CLOSED`;
- Kimi como produtor e proponente inicial;
- Célula Zero como contraparte;
- Claude como verificador;
- ausência de recompensa econômica;
- template candidato não aprovado como padrão;
- `INTENT-001` experimental não canônica.

Esses são resultados da auditoria comparativa. Não são citações nem reformulações atribuídas a DeepSeek.

## Distinção crítica descoberta

**Reconstrução semântica ≠ reauditoria evidenciária independente.**

O fixture permitiu reconstruir o processo essencial.

O fixture isolado não continha o texto integral da contribuição original nem o texto integral da oferta original de Kimi.

Ao mesmo tempo:

- os caminhos, blobs e commits Git canônicos estão preservados;
- a oferta original já estava ausente do repositório, e essa limitação está explicitamente representada;
- portanto, a ausência da oferta original não é perda semântica introduzida pela transformação para JSON-LD.

O fixture não substitui os registros canônicos.

## Resultados distintos

### Veredicto do consumidor externo

**PARTIAL — confiança alta.**

### Auditoria pós-teste — estrutura semântica

**PASS** para recuperação da estrutura semântica essencial deste ciclo encerrado.

### Auditoria pós-teste — reauditoria evidenciária

**PARTIAL** para reauditoria evidenciária integral e independente usando somente o fixture.

Esses três resultados não são colapsados em um único veredicto.

## Ambiguidades candidatas descobertas

As ambiguidades abaixo são achados para testes futuros. O fixture e o vocabulário não são modificados neste spike.

### `czv:assertedRepositoryChange: false`

Ambiguidade candidata **MATERIAL**: pode significar tanto:

- uma afirmação de que nenhuma alteração no repositório ocorreu; quanto
- ausência ou falsidade de uma afirmação sobre alteração no repositório.

### `czv:orderedMember`

A ordem é explícita, mas a representação não declara formalmente se ela é temporal, causal, lógica ou apresentacional.

## Relação com TECH-SPIKE-002

A dependência de termos de domínio `czv:` é esperada e não falsifica `graph/TECH-SPIKE-002.md`.

TECH-SPIKE-002 já propôs provisoriamente a composição:

- PROV-O;
- JSON-LD;
- pequeno vocabulário de domínio;
- referências ao Git canônico.

Assim, a conclusão de DeepSeek de que PROV genérico isolado perderia distinções corrobora a necessidade do pequeno vocabulário de domínio. Ela não demonstra necessidade de infraestrutura proprietária.

## Sem escalada arquitetural

Este teste não introduz:

- blockchain;
- IPFS;
- DID/VC;
- OPA;
- CRDT;
- Graphiti;
- Neo4j;
- banco de dados novo;
- plataforma nova;
- token;
- implementação A2A.

## Conclusão provisória

Um único consumidor externo reconstruiu com sucesso o ciclo Genesis essencial, sem erros factuais materiais, a partir do fixture estruturado.

Isso fornece evidência de portabilidade semântica para este único ciclo.

Não demonstra:

- completude geral;
- estabilidade do vocabulário;
- reprodutibilidade entre modelos;
- auditoria evidenciária independente usando somente o fixture;
- prontidão para produção.

`N=1` permanece uma limitação.

Nenhuma mudança de vocabulário ou schema é aprovada.
