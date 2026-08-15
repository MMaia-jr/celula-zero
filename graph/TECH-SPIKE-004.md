# TECH-SPIKE-004 — Replicação entre consumidores externos

Status: PROVISÓRIO — experimento de replicação; não constitui decisão de schema, vocabulário, arquitetura ou protocolo.

Data de registro: 2026-08-15

## Objetivo

Testar se a reconstrução semântica essencial observada em `graph/TECH-SPIKE-003.md` se reproduz em um segundo consumidor externo usando o mesmo fixture:

- `graph/fixtures/GENESIS-CYCLE-000.jsonld`

Este experimento compara:

- resultado externo de DeepSeek;
- resultado externo de Mistral Vibe;
- registros Genesis canônicos.

O experimento testa a reprodutibilidade da recuperação semântica entre consumidores.

Ele não testa se o fixture, sozinho, permite reauditar independentemente cada artefato original.

## Disciplina de proveniência

Este artefato mantém estritamente separados:

1. fatos canônicos;
2. afirmações de DeepSeek;
3. afirmações de Mistral;
4. conclusões da auditoria pós-teste.

As afirmações dos consumidores estão preservadas em:

- `graph/TECH-SPIKE-003-DEEPSEEK-RESPONSE.md`;
- `graph/TECH-SPIKE-004-MISTRAL-RESPONSE.md`.

Uma conclusão da auditoria não é atribuída a DeepSeek nem a Mistral.

O aprendizado de proveniência de `incidents/CZ-001.md` permanece ativo:

> interpretação ≠ fala do participante

## Veredictos externos

### DeepSeek

- veredicto: **PARTIAL**;
- confiança: **Alta**.

### Mistral Vibe

- veredicto: **PARTIAL**;
- confiança: **Média**.

Nenhum dos veredictos externos é reescrito como `PASS`.

## Concordância entre consumidores

DeepSeek e Mistral Vibe recuperaram independentemente o mesmo processo essencial:

INTENT
→ OFFER
→ TERMS
→ ACCEPTANCE explícita
→ COMMITMENT
→ CONTRIBUTION
→ tentativas de verificação
→ VERIFICATION final

Ambos recuperaram corretamente:

- Kimi como proponente inicial e produtor da contribuição;
- Célula Zero como contraparte;
- Claude como verificador;
- aceitação explícita por Kimi;
- ausência de recompensa econômica;
- contribuição posterior à aceitação e ao compromisso;
- duas tentativas de verificação;
- primeira tentativa inconclusiva;
- segunda tentativa executada;
- resultado final `PASSA`;
- estado do compromisso `CUMPRIDO / VERIFICADO`;
- `INTENT-001` experimental não canônica;
- `PASSA` não aprova o template como padrão;
- uso histórico de A2A não determinável apenas pelo fixture.

Isso constitui evidência de reprodutibilidade entre modelos/consumidores para a estrutura semântica essencial deste único ciclo.

`N = 2` consumidores externos.

O resultado não é generalizado além deste ciclo.

## Auditoria da resposta de Mistral

Classe: conclusões da auditoria pós-teste.

Esta seção separa a reconstrução correta de Mistral de seus erros de interpretação. As conclusões abaixo não são falas de Mistral.

### Erro material do consumidor 1 — blob Git versus commit

Mistral afirmou que `gitBlob` e `sourceCommit` eram iguais em `INTENT-000`, `COMMITMENT-001`, `CONTRIBUTION-001` e `VERIFICATION-001`.

Essa afirmação é factualmente incorreta.

O fixture usa o mesmo snapshot `sourceCommit` para esses quatro registros:

- `2ee52d91b2421db06c9f0b9ad073798843274340`.

Os valores `gitBlob` são distintos:

- `INTENT-000`: `39a1f06d52611d2b0a1a97960d6819a1b12377b8`;
- `COMMITMENT-001`: `ccf55c01da6924b06c8a7a8d1a729de5b429086b`;
- `CONTRIBUTION-001`: `3d27b21589c1d361227877efc7e86d720e851e54`;
- `VERIFICATION-001`: `95297e718f578a880eba31be739f459bdb327624`.

Trata-se de erro de leitura do consumidor, não de perda semântica demonstrada no fixture.

### Erro material do consumidor 2 — ausência interpretada como não canonicidade

Mistral classificou `OFFER-001`, `TERMS-001`, `ACCEPTANCE-001` e `TemplateCandidate-001` como não canônicos principalmente porque não possuem marcadores `gitPath` ou `storedIn`.

A ausência de uma afirmação explícita de armazenamento canônico não implica logicamente uma afirmação explícita de não canonicidade.

O fixture permite distinguir:

- **explicitamente canônico/armazenado no repositório canônico**: `INTENT-000`, `COMMITMENT-001`, `CONTRIBUTION-001` e `VERIFICATION-001`;
- **explicitamente não canônica**: `ClaudeExperimentalIntentOutput`, por `czv:isCanonicalIntent: false`;
- **canonicidade não explicitamente representada**: `OFFER-001`, `TERMS-001`, `ACCEPTANCE-001` e `TemplateCandidate-001`.

Esta é uma questão semântica candidata **MATERIAL**: um consumidor que aplique raciocínio de mundo fechado pode transformar “não representado” em “falso”.

O schema e o fixture não são redesenhados neste spike.

### `czv:doesNotApproveTemplate`

Mistral sugeriu que `czv:doesNotApproveTemplate` poderia significar tanto rejeição quanto mera ausência de padronização.

O fixture também contém:

- `czv:status: "HIPÓTESE — não padrão aprovado"`.

Conclusão da auditoria: a interpretação “não aprovado como padrão” possui suporte materialmente maior que “rejeitado”. A alegação de ambiguidade de Mistral é preservada, mas não é aceita como ambiguidade bloqueante demonstrada.

### Oferta original ausente

Mistral classificou a ausência do Registro Original integral de `OFFER-001` como **BLOCKING**.

Essa é a avaliação de Mistral.

Conclusão da auditoria:

- a ausência é **BLOCKING** para reauditoria evidenciária independente e integral da oferta original;
- ela não se demonstrou bloqueante para reconstrução do processo essencial, porque há uma síntese estruturada e a própria limitação de proveniência está explicitamente representada.

Permanece a distinção:

**reconstrução semântica ≠ reauditoria evidenciária independente.**

## Achados repetidos entre consumidores

Os itens abaixo permanecem candidatos para testes futuros e não são resolvidos neste spike:

1. o vocabulário de domínio `czv:` é necessário para distinções importantes;
2. a oferta original não está integralmente preservada;
3. `VerificationAttempt-A` não contém contexto detalhado sobre o input e a falha;
4. `VerificationAttempt-B` não contém as instruções de preenchimento integrais;
5. `INTENT-000` não possui `prov:wasAttributedTo` explícito;
6. reconstrução semântica e reauditoria evidenciária são tarefas distintas;
7. `czv:assertedRepositoryChange: false` possui ambiguidade candidata;
8. `czv:orderedMember` não declara se sua ordem é temporal, causal, lógica ou apresentacional;
9. ambiguidade de canonicidade entre mundo aberto e mundo fechado: a ausência de `storedIn` ou de marcador canônico pode ser interpretada incorretamente como não canonicidade explícita.

## Resultados distintos

### Veredicto externo de DeepSeek

**PARTIAL — confiança Alta.**

### Veredicto externo de Mistral

**PARTIAL — confiança Média.**

### Auditoria pós-teste — estrutura semântica

**PASS** para recuperação da estrutura semântica essencial por ambos os consumidores externos.

### Auditoria pós-teste — reauditoria evidenciária

**PARTIAL** para reauditoria evidenciária integral e independente usando somente o fixture.

### Replicação entre consumidores

**PASS** para reprodutibilidade da reconstrução semântica essencial neste único ciclo, `N = 2`.

Esses resultados não são colapsados em um único veredicto.

## O que TECH-SPIKE-004 demonstra

Provisoriamente, dois consumidores externos independentes reconstruíram o mesmo processo Genesis essencial a partir do mesmo fixture estruturado.

Isso reduz a limitação `N=1` registrada em `graph/TECH-SPIKE-003.md`.

O resultado fornece evidência de portabilidade semântica entre consumidores para este ciclo.

Ele não demonstra:

- completude geral do schema;
- estabilidade da ontologia;
- reprodutibilidade universal entre modelos;
- ausência de erros de interpretação do consumidor;
- autossuficiência evidenciária;
- prontidão para produção.

Nenhuma mudança de vocabulário ou schema é aprovada.

## Arquitetura

Não há escalada arquitetural.

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

TECH-SPIKE-004 fornece evidência de que a reconstrução semântica essencial deste ciclo se reproduz entre dois consumidores externos, apesar de diferenças de interpretação e de erros materiais do segundo consumidor.

O resultado permanece limitado a este ciclo e a `N = 2`.

Nenhuma mudança de schema, vocabulário, arquitetura ou protocolo é aprovada.
