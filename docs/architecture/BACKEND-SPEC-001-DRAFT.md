# BACKEND-SPEC-001 — Núcleo operacional da Célula Zero

- Estado: `PREPARED / DRAFT FOR HUMAN REVIEW`
- Data: 2026-08-22
- Tipo: especificação técnica backend-first
- Base técnica inspecionada: PR #63, head `e210df89715d45595e432c8c0441a9f7887c7967`
- Autoridade: nenhuma implementação é autorizada por este documento
- Próxima decisão: aceitar, revisar ou rejeitar os defaults da seção 18

## 1. Decisão que este artefato permite

Esta especificação permite decidir se o próximo trabalho de engenharia deve
estender a fundação do Gate 1 para um ciclo operacional completo, antes de
ampliar o frontend.

Se aceita, ela poderá orientar uma autorização técnica separada para:

`oportunidade → proposta → compromisso → contribuição → evidência → verificação → resultado → contestação`

Ela não autoriza commit, push, PR, merge, deploy, integração externa, testnet,
smart contract, wallet, token, DAO, custódia ou movimentação financeira.

## 2. Fontes e precedência

Esta especificação foi derivada de:

- `PRODUCT-MVP-001.md`;
- `ROADMAP-30D.md`;
- `docs/architecture/TECHNICAL-ARCHITECTURE-001.md`;
- `GATE-1-RESULT.md`;
- `PROTOCOL.md`;
- `HUMAN-DIRECTION-001-CONTEXTUAL-TRUTH.md`;
- `HYPOTHESIS-WEB3-001-EXTERNAL-ANCHOR.md`;
- `TECH-LANDSCAPE-WEB3-001`;
- arquivos de visão e fontes históricas fornecidos pelo fundador;
- schema, RLS, funções e testes implementados no Gate 1.

Em caso de conflito, prevalece esta ordem:

1. nova decisão humana explícita;
2. decisões canônicas do repositório;
3. registro original;
4. evidência executável e resultado de teste;
5. esta especificação;
6. interpretações e hipóteses ainda não aceitas.

Documentos antigos com token, DAO, soulbound token, DeFi, rede planetária ou
governança indígena digital são fontes históricas e hipóteses, não requisitos
do MVP. Nenhuma comunidade indígena, pertencimento étnico ou protocolo de
consulta será representado sem participação, consentimento e autoridade reais.

## 3. Resultado pretendido

O backend estará suficientemente habitável quando três atores distintos — ou
dois humanos e um agente com operador — conseguirem completar e reconstruir o
seguinte ciclo sem depender de manipulação manual do banco:

1. um responsável publica uma oportunidade em um projeto;
2. outro ator apresenta uma proposta com condições;
3. o responsável aceita explicitamente uma versão específica da proposta;
4. a aceitação cria um compromisso com termos congelados;
5. o colaborador submete uma contribuição e seus artefatos;
6. evidências são registradas separadamente da contribuição;
7. um verificador aplica critérios explícitos e emite um resultado;
8. o responsável aceita, rejeita ou mantém o resultado em disputa;
9. uma contestação pode ser registrada sem apagar a verificação anterior;
10. o ciclo é exportado em formato humano e PROV/JSON-LD;
11. outra instância consegue reconstruir a trajetória essencial.

O sucesso desse backend não demonstra utilidade externa, PMF, legitimidade
social, verdade empírica, segurança financeira ou necessidade de Web3.

## 4. Princípios arquiteturais obrigatórios

### 4.1 Separações semânticas

O domínio deve impedir, e não apenas explicar na interface, as seguintes
confusões:

- conta de login ≠ ator;
- ator ≠ identidade verificada;
- papel ≠ capability;
- delegação ≠ propriedade;
- apadrinhamento ≠ endorsement;
- oportunidade ≠ tarefa atribuída;
- proposta ≠ compromisso;
- compromisso ≠ execução;
- contribuição ≠ artefato;
- artefato ≠ evidência;
- evidência ≠ verificação;
- verificação ≠ verdade universal;
- review concluído ≠ resultado aceito;
- decisão contextual ≠ descoberta empírica;
- atividade ≠ contribuição;
- contribuição ≠ reputação;
- interesse financeiro ≠ acordo vinculante;
- publicação ≠ autorização para reutilização irrestrita;
- ação de agente ≠ autorização humana implícita.

### 4.2 Núcleo soberano, integrações substituíveis

PostgreSQL/Supabase permanece como núcleo operacional do MVP. Nenhuma
integração externa recebe autoridade para promover estados internos.

Cada integração futura deve ser um adaptador com:

- mapeamento explícito;
- importação e exportação;
- idempotência;
- reconciliação;
- rastreio da origem externa;
- comportamento de indisponibilidade;
- capacidade de desligamento;
- nenhuma credencial privilegiada no cliente.

### 4.3 Escritas por comandos, leituras por projeções

- Clientes não recebem `INSERT`, `UPDATE` ou `DELETE` direto nas tabelas do
  domínio.
- Toda mudança passa por um comando server-side ou função transacional
  delimitada.
- RLS permanece como defesa em profundidade para leitura e para qualquer
  superfície inevitável.
- Cada comando valida ator, capability, escopo, versão esperada e política.
- Estado material, versões imutáveis e evento de domínio são gravados na mesma
  transação.
- Dashboards, timelines, contadores e busca são projeções reconstruíveis.

### 4.4 Histórico aditivo

Original Records, propostas submetidas, termos aceitos, contribuições,
verificações, contestações e decisões não são sobrescritos.

Uma correção cria novo objeto ou nova versão com vínculo `supersedes`,
`corrects`, `challenges` ou `revokes`. O sistema pode ocultar conteúdo por
política de acesso ou apagar dados pessoais quando juridicamente necessário,
mas deve preservar um tombstone mínimo não identificável quando isso for
seguro e lícito.

### 4.5 Verdade contextual versionada

O backend deve distinguir:

1. verdade do registro — quem declarou ou aceitou o quê e quando;
2. estado contextual aceito — o que uma política e atores autorizados aceitaram
   naquele escopo;
3. verdade sobre o mundo — afirmação ainda sujeita a evidência, verificação,
   crítica e revisão.

Nenhum hash, assinatura, maioria, credencial ou evento promove automaticamente
uma afirmação entre esses níveis.

## 5. Modelo de autoridade e fontes de verdade

| Camada | Autoridade no MVP | Limite |
| --- | --- | --- |
| GitHub | código, migrations, especificações e histórico de engenharia | não é banco operacional dos participantes |
| PostgreSQL | registros operacionais aceitos e autorizações do runtime | operador do banco continua sendo uma confiança administrativa |
| versões + eventos | histórico interno reconciliável | sem âncora externa, não detecta toda reescrita por operador privilegiado |
| exportações | cópia portátil e auditável | não substituem o estado operacional por si sós |
| ATProto, Huly, A2A, VC, EAS e outros | projeções ou transportes futuros | nunca promovem estado interno sem comando autorizado |
| blockchain futura | possível âncora externa | hipótese `NOT TESTED` |

No P0, a fonte operacional é o conjunto consistente de:

- objeto material atual;
- versões imutáveis relevantes;
- decisões e autorizações explícitas;
- sequência de eventos produzida na mesma transação.

Nenhuma dessas partes é confiável isoladamente. `reconcile_*` deve comparar as
partes e falhar de forma visível quando houver divergência.

## 6. Escopo de domínio

### 6.1 Dentro desta especificação

- contas, atores e identidades declaradas;
- um contexto operacional inicial chamado Célula Zero;
- políticas versionadas;
- papéis, capabilities e delegações;
- projetos e intenções;
- oportunidades e critérios;
- propostas e revisão de proposta;
- compromissos e termos congelados;
- contribuições, artefatos, claims e evidências;
- pedidos de verificação, reviews, auditorias e contestações;
- decisão de resultado;
- eventos, reconciliação e exportação;
- agente de IA com operador e autoridade limitada;
- visibilidade, privacidade, retenção e tombstones;
- adaptadores apenas como contratos de interface.

### 6.2 Fora desta especificação

- frontend além do necessário para testar comandos;
- chat, feed, mensagens privadas e matching algorítmico;
- reputação numérica ou universal;
- recomendação automatizada de pessoas;
- pagamentos, custódia, investimento, equity ou revenue share;
- tesouraria, Safe, Allo, Kleros ou UMA em runtime;
- DID/VC, AT Protocol, EAS, Sign, A2A ou Huly implementados;
- wallet, token, NFT, DAO, smart contract ou testnet;
- governança jurídica de organizações;
- verificação de identidade civil;
- moderação completa de comunidade pública;
- multi-tenant global ou federação entre células.

## 7. Vocabulário operacional

### Conta

Credencial de autenticação de uma pessoa. Conta não é exibida como identidade
pública e não pode agir sem estar ligada a um ator.

### Ator

Entidade atribuível que pode declarar ou executar ações: `PERSON`, `AI_AGENT`,
`ORGANIZATION`, `COLLECTIVE` ou `SYSTEM`.

### Identidade

Identificador local ou externo controlado ou representado por um ator. Um DID,
e-mail verificado ou perfil ATProto pode ser uma identidade; nenhum deles prova
automaticamente unicidade, competência ou legitimidade.

### Contexto ou célula

Namespace operacional que declara propósito, política e participantes. No P0
existirá apenas uma célula ativa sem presumir que a aplicação já suporte uma
rede de células soberanas.

### Papel

Relação contextual legível por humanos, como `PROJECT_STEWARD`, `CONTRIBUTOR`,
`REVIEWER` ou `AGENT_OPERATOR`.

### Capability

Ação executável específica, como `opportunity.publish` ou `review.issue`. A
autorização é calculada por capability, escopo, validade e condições; o nome do
papel sozinho não concede acesso.

### Delegação

Concessão revogável e limitada de capabilities por um ator autorizado a outro.
Possui escopo, validade, limites, emissor e revogador. Delegação a agente nasce
com capacidade financeira `false`.

### Oportunidade

Necessidade publicada por um projeto, com ação esperada, entrega, critérios,
prazo, responsável e condições. Ainda não atribui trabalho a ninguém.

### Proposta

Oferta de um ator para atender uma versão específica da oportunidade, contendo
capacidade declarada, disponibilidade e condições. Pode ser revisada,
rejeitada, retirada ou aceita.

### Compromisso

Registro criado somente por aceitação explícita de uma versão específica da
proposta. Congela partes, termos, critérios, autoridade e prazos. Não concede
direitos econômicos além do que estiver explicitamente acordado e juridicamente
válido fora da plataforma.

### Contribuição

Declaração atribuída de trabalho realizado sob um compromisso. Pode apontar
para artefatos e limitações, mas não é prova automática de conclusão.

### Artefato

Arquivo, código, documento, mídia, link ou pacote produzido ou utilizado. Pode
existir sem ser qualificado como evidência.

### Claim

Afirmação explícita e contestável sobre um artefato, contribuição, processo ou
mundo externo.

### Evidência

Material explicitamente vinculado para apoiar, enfraquecer ou contextualizar
um claim, critério ou resultado. Preserva fonte, acesso, proveniência e
limitações.

### Verificação

Atividade atribuída em que um avaliador aplica método e critérios a objetos
declarados e emite `PASS`, `FAIL`, `PARTIAL` ou `INCONCLUSIVE`.

### Resultado contextual

Estado aceito por autoridade explícita após considerar contribuição,
evidências, verificações, limites e dissenso. Pode ser contestado, revogado ou
superado.

### Contestação

Registro aditivo que desafia objeto anterior, declara fundamento e pode anexar
contraprova. Não apaga o alvo contestado.

## 8. Modelo lógico mínimo

### 8.1 Identidade, contexto e autoridade

| Tabela lógica | Campos essenciais | Invariantes |
| --- | --- | --- |
| `profiles` | `id`, nome de exibição, status | ligada a `auth.users`; dados privados separados |
| `actors` | `id`, `kind`, nome público, status | agente exige operador; ator não equivale a pessoa verificada |
| `actor_identities` | ator, método, identificador, controlador, estado, validade | identificador único por método; revogável; dados mínimos |
| `actor_memberships` | ator, profile, relação | preserva `OWNER`, `OPERATOR`, `REPRESENTATIVE` |
| `cells` | id, slug, propósito, estado, política atual | uma célula seed no P0; criação de novas células não exposta |
| `policy_versions` | cell, versão, conteúdo, hash, vigência, autor da aceitação | append-only; decisões referenciam versão exata |
| `role_assignments` | ator, role, escopo, emissor, validade, estado | papel contextual, revogável e temporal |
| `capability_definitions` | código, descrição, nível de risco | catálogo versionado em migration/code |
| `role_capabilities` | role, capability, condições | papel não é checado diretamente em comandos |
| `delegations` | delegador, delegado, capabilities, escopo, validade, limites, estado | sem autodelegação de novas capacidades; revogação imediata |

`scope_type` deve começar com `CELL`, `PROJECT` e `OPPORTUNITY`. Outros escopos
só entram por migration e teste.

### 8.2 Projeto e coordenação

| Tabela lógica | Campos essenciais | Invariantes |
| --- | --- | --- |
| `projects` | cell, slug, título, resumo, steward, estágio, visibilidade, versão atual | um steward ativo; versão otimista |
| `project_intents` | project, kind, conteúdo, versão, accepted_by, supersedes | um `ORIGINAL`; interpretações append-only |
| `project_members` | project, ator, role_assignment | papel e capability derivados de concessão válida |
| `opportunities` | project, owner, estado, versão atual, visibilidade | estado material, sem termos históricos mutáveis |
| `opportunity_versions` | opportunity, versão, necessidade, ação, entrega, evidência esperada, critérios, prazo, condições, regime econômico | append-only; versão publicada não muda |
| `proposals` | opportunity, proposer, estado, versão atual | um ator pode ter propostas sucessivas, mas só uma ativa por vez |
| `proposal_versions` | proposal, opportunity_version, capacidade, disponibilidade, condições, mensagem | append-only; aceite referencia esta versão exata |
| `commitments` | project, opportunity_version, proposal_version, partes, termos, estado, datas | criado atomicamente com decisão `ACCEPT`; termos congelados |
| `decision_records` | subject, tipo, decisão, decisor, autoridade, policy_version, fundamentos, timestamp | append-only; nenhuma decisão sem autoridade resolvida |

No P0, `commitment` é o acordo operacional. Uma tabela genérica `agreements`
não será criada até existir outro tipo concreto de acordo que não caiba neste
objeto.

### 8.3 Produção, evidência e avaliação

| Tabela lógica | Campos essenciais | Invariantes |
| --- | --- | --- |
| `contributions` | commitment, autor, descrição, limitações, submitted_at, supersedes | append-only; revisão cria nova contribuição |
| `artifacts` | contribution, tipo, URI interna/externa, digest, mídia, tamanho, acesso, retenção | conteúdo separado de metadados e eventos |
| `claims` | sujeito, autor, afirmação, escopo, estado, supersedes | afirmação explícita; não nasce de evidência automaticamente |
| `evidence_items` | fonte, custodiante, descrição, digest, acesso, retenção, estado, supersedes | append-only nos metadados; conteúdo pode ser apagável |
| `evidence_links` | evidence, target, relação, declarado_por | relação `SUPPORTS`, `CHALLENGES`, `CONTEXTUALIZES` ou `REPLICATES` |
| `verification_requests` | alvo, critérios, método esperado, requester, reviewer, prazo, estado | reviewer e conflito declarados antes da emissão |
| `verifications` | request, verifier, método, objetos examinados, achados, classificação, estado, limitações | append-only; uma nova verificação não apaga a anterior |
| `contestations` | alvo, autor, fundamento, evidência, estado, resposta | aditiva; alvo continua consultável segundo sua visibilidade |
| `outcomes` | commitment/project, estado contextual, decisor, verifications consideradas, limitações, validade | aceitação explícita; pode ser contestada ou superada |

### 8.4 Integração, auditoria e portabilidade

| Tabela lógica | Campos essenciais | Invariantes |
| --- | --- | --- |
| `domain_events` | sequência, aggregate, tipo, actor, authorized_by, delegation, policy_version, payload, correlation, causation, idempotency, datas | append-only; uma sequência por agregado; gravado atomicamente |
| `external_references` | objeto local, provider, external_id, versão, direção, estado | nenhum external id vira autoridade local |
| `adapter_outbox` | evento, adapter, payload mínimo, tentativas, estado | envio depois do commit; falha não reverte domínio |
| `redaction_tombstones` | objeto, motivo categórico, autoridade, data | sem conteúdo pessoal; preserva que houve retirada legítima |
| `export_manifests` | project, schema, objetos, digests, criado_por | exportação reproduzível e validável |

## 9. Máquinas de estado

Transições não listadas devem falhar no domínio, mesmo se uma atualização SQL
fosse tecnicamente possível.

### 9.1 Projeto

```text
DRAFT → OPEN → ACTIVE ↔ PAUSED → COMPLETED
  └──────────────→ ABANDONED
```

- `COMPLETED` e `ABANDONED` são terminais para aquela versão da trajetória.
- Reabertura, se necessária, cria decisão e novo ciclo; não sobrescreve o
  encerramento anterior.

### 9.2 Oportunidade

```text
DRAFT → OPEN → CLOSED
          ├→ SUSPENDED → OPEN
          └→ CANCELLED
```

- A existência de proposta não muda a oportunidade para `COMMITTED`.
- Uma oportunidade pode gerar mais de um compromisso somente se
  `capacity_slots > 1` tiver sido declarado na versão publicada.

### 9.3 Proposta

```text
DRAFT → SUBMITTED → REVISION_REQUESTED → SUBMITTED
                    ├→ ACCEPTED
                    ├→ REJECTED
                    └→ EXPIRED
SUBMITTED → WITHDRAWN
```

- `ACCEPTED` exige decisão explícita e cria exatamente um compromisso.
- Uma revisão nunca altera a versão que foi previamente submetida.

### 9.4 Compromisso

```text
ACTIVE → SUBMITTED → UNDER_REVIEW → FULFILLED
  │           │             ├→ NOT_ACCEPTED
  │           │             └→ DISPUTED
  ├→ CANCELLED_BY_AGREEMENT
  └→ EXPIRED
```

- `SUBMITTED` exige ao menos uma contribuição.
- `UNDER_REVIEW` exige pedido de verificação válido.
- `FULFILLED` exige outcome aceito; contribuição ou review sozinho não basta.
- `NOT_ACCEPTED` não apaga a contribuição nem o review.

### 9.5 Evidência

```text
DOCUMENTED → UNDER_REVIEW → PARTIALLY_VERIFIED
                         ├→ VERIFIED
                         ├→ CONTESTED
                         ├→ FALSIFIED
                         └→ INCONCLUSIVE
DOCUMENTED → SUPERSEDED / REVOKED
```

O estado pertence à relação contextual examinada. A mesma fonte pode ter
resultados diferentes sob claims, critérios e contextos distintos.

### 9.6 Verificação, resultado e contestação

```text
VERIFICATION: DRAFT → ISSUED → CONTESTED → SUPERSEDED / UPHELD
OUTCOME:      PROPOSED → ACCEPTED → CONTESTED → SUPERSEDED / UPHELD
CONTESTATION: OPEN → RESPONDED → RESOLVED / UNRESOLVED
```

`UPHELD` confirma que o processo manteve o objeto, não que a afirmação se tornou
verdade universal.

## 10. Comandos de aplicação

O contrato abaixo é independente de REST, GraphQL, Server Actions, MCP ou A2A.
Cada transporte deve chamar o mesmo serviço de domínio.

### 10.1 Envelope comum

```json
{
  "command_id": "uuid",
  "command_type": "proposal.accept.v1",
  "actor_id": "uuid",
  "authorized_by_actor_id": "uuid-or-null",
  "delegation_id": "uuid-or-null",
  "scope": { "type": "PROJECT", "id": "uuid" },
  "expected_version": 3,
  "idempotency_key": "client-stable-key",
  "occurred_at": "client-declared-optional",
  "payload": {}
}
```

O servidor sempre acrescenta `recorded_at`, resolve a política vigente e
rejeita tempos futuros ou antigos fora da tolerância configurada sem evidência
adicional.

### 10.2 Catálogo P0

| Comando | Capability | Pré-condição principal | Efeito atômico |
| --- | --- | --- | --- |
| `project.create.v1` | `project.create` | piloto ativo | projeto, original, interpretação, steward e evento |
| `project.publish.v1` | `project.publish` | steward; conteúdo válido | versão pública e evento |
| `opportunity.create.v1` | `opportunity.create` | membro autorizado | oportunidade draft + versão |
| `opportunity.publish.v1` | `opportunity.publish` | owner; critérios completos | versão congelada + estado `OPEN` |
| `proposal.submit.v1` | `proposal.submit` | ator elegível; oportunidade aberta | proposta + versão submetida |
| `proposal.request_revision.v1` | `proposal.decide` | owner; versão atual | decisão + estado, sem compromisso |
| `proposal.reject.v1` | `proposal.decide` | owner; fundamento | decisão + `REJECTED` |
| `proposal.accept.v1` | `proposal.decide` | owner; versão exata; slot disponível | decisão + compromisso + eventos |
| `delegation.grant.v1` | `delegation.grant` | delegador possui e pode delegar capability | delegação limitada |
| `delegation.revoke.v1` | `delegation.revoke` | emissor/revogador autorizado | revogação imediata |
| `contribution.submit.v1` | `contribution.submit` | parte ativa do compromisso | contribuição append-only + evento |
| `artifact.attach.v1` | `artifact.attach` | autor/parte; política de acesso | metadados, digest e referência |
| `claim.record.v1` | `claim.record` | ator atribuível | claim explícito |
| `evidence.register.v1` | `evidence.register` | origem e acesso declarados | evidence item + link explícito |
| `verification.request.v1` | `verification.request` | alvo e critérios congelados | request + conflito calculado |
| `verification.issue.v1` | `verification.issue` | reviewer autorizado | verificação append-only + evento |
| `outcome.decide.v1` | `outcome.decide` | autoridade contextual; revisão considerada | outcome + estado do compromisso |
| `contestation.open.v1` | `contestation.open` | ator com standing definido | contestação + evento, sem apagar alvo |
| `contestation.resolve.v1` | `contestation.resolve` | autoridade da política; não autor do alvo isoladamente | decisão e novo estado contextual |
| `export.create.v1` | `export.create` | acesso a todos os objetos exportados | manifest + JSON-LD/Markdown |

### 10.3 Respostas e erros

Todo comando retorna:

- `command_id`;
- resultado ou erro tipado;
- `aggregate_id` e nova versão, quando aplicável;
- IDs de decisões e eventos produzidos;
- avisos de conflito de interesse ou visibilidade;
- nenhum segredo ou conteúdo restrito em logs.

Erros mínimos:

- `AUTHENTICATION_REQUIRED`;
- `ACTOR_NOT_CONTROLLED`;
- `CAPABILITY_DENIED`;
- `DELEGATION_EXPIRED`;
- `SCOPE_MISMATCH`;
- `POLICY_CHANGED`;
- `STALE_VERSION`;
- `INVALID_TRANSITION`;
- `IDEMPOTENCY_CONFLICT`;
- `VISIBILITY_VIOLATION`;
- `SENSITIVE_DATA_FORBIDDEN`;
- `CONFLICT_REQUIRES_DISCLOSURE`;
- `INTEGRITY_DIVERGENCE`;
- `RATE_LIMITED`.

## 11. Eventos de domínio

Eventos descrevem fatos do processo; não substituem os objetos materiais nem a
decisão que os originou.

Eventos mínimos:

```text
PROJECT_CREATED
PROJECT_PUBLISHED
OPPORTUNITY_CREATED
OPPORTUNITY_PUBLISHED
PROPOSAL_SUBMITTED
PROPOSAL_REVISION_REQUESTED
PROPOSAL_REJECTED
PROPOSAL_ACCEPTED
COMMITMENT_CREATED
DELEGATION_GRANTED
DELEGATION_REVOKED
CONTRIBUTION_SUBMITTED
ARTIFACT_ATTACHED
CLAIM_RECORDED
EVIDENCE_REGISTERED
VERIFICATION_REQUESTED
VERIFICATION_ISSUED
OUTCOME_ACCEPTED
OUTCOME_NOT_ACCEPTED
CONTESTATION_OPENED
CONTESTATION_RESOLVED
OBJECT_SUPERSEDED
OBJECT_REDACTED
EXPORT_CREATED
```

Cada evento deve conter:

- `event_id` e versão do schema;
- tipo e sequência no agregado;
- agregado e objeto afetado;
- ator executor;
- ator autorizador, quando diferente;
- delegação e policy version usadas;
- `command_id`, correlação e causa;
- versão material antes/depois;
- payload mínimo sem conteúdo sensível;
- `occurred_at`, `recorded_at` e origem do tempo;
- nível de visibilidade;
- digest canônico para detectar corrupção acidental.

O digest interno não prova resistência a um administrador malicioso. Essa
propriedade continua pertencendo a `HYPOTHESIS-WEB3-001`.

## 12. Autorização

### 12.1 Regra de cálculo

```text
ALLOW se, e somente se:
account controls actor
AND actor is active
AND capability is granted
AND scope contains target
AND delegation is valid when required
AND policy version permits action
AND object state permits transition
AND expected version matches
AND visibility/sensitivity rules permit supplied data
```

Uma decisão deve preservar o snapshot suficiente para explicar por que a ação
foi autorizada naquele momento, mesmo se o papel for revogado depois.

### 12.2 Papéis iniciais e capabilities

| Papel | Capabilities padrão | Limites |
| --- | --- | --- |
| `CELL_ADMIN` | administrar piloto, políticas operacionais e moderação | não equivale a autoridade sobre projetos de terceiros |
| `PROJECT_STEWARD` | publicar projeto, criar/publicar oportunidade, decidir proposta e outcome | apenas no projeto; deve declarar conflito |
| `OPPORTUNITY_OWNER` | gerir oportunidade e decidir propostas | não altera intenção original do projeto |
| `CONTRIBUTOR` | submeter contribuição, artefato, claim e evidência | apenas compromissos próprios |
| `REVIEWER` | responder request e emitir verificação | conflito sempre calculado e exibido |
| `AUDITOR` | emitir verificação adversarial e contraprova | não promove outcome automaticamente |
| `SUPPORTER` | declarar apoio futuro | nenhuma transferência ou direito econômico |
| `AGENT_OPERATOR` | operar agente dentro de delegação | responsável pela autorização atribuída |

### 12.3 Agentes de IA

Um ator `AI_AGENT` deve possuir:

- operador humano ou organizacional identificável;
- descrição de modelo/sistema suficiente para atribuição;
- capabilities explícitas;
- escopo e validade;
- limite de ações e recursos;
- dados que pode ler;
- ações que exigem coassinatura;
- revogador;
- trilha de cada comando.

Por padrão, agente não pode:

- criar ou ampliar sua própria delegação;
- aceitar sua própria proposta ou contribuição;
- emitir outcome final sobre seu próprio trabalho;
- ocultar operador;
- movimentar fundos;
- criar obrigação econômica;
- publicar dados restritos;
- transformar output em evidência ou verificação automaticamente.

## 13. Visibilidade, privacidade e LGPD

Visibilidade e sensibilidade são dimensões separadas.

### 13.1 Visibilidade

- `PUBLIC`: qualquer visitante;
- `CELL`: membros ativos da célula;
- `PROJECT`: participantes autorizados do projeto;
- `PARTIES`: partes de um compromisso ou decisão;
- `PRIVATE`: controlador e administradores estritamente necessários.

### 13.2 Sensibilidade

- `NORMAL`;
- `PERSONAL`;
- `SENSITIVE_PERSONAL`;
- `RESTRICTED_KNOWLEDGE`.

Regras:

- `PUBLIC` aceita apenas `NORMAL` ou uma projeção redigida;
- origem étnica, saúde, sexualidade, biometria, localização protegida e
  conhecimento tradicional restrito nunca entram em payload público;
- eventos públicos guardam IDs opacos e descrições não sensíveis;
- conteúdo de artefato e evidência fica em storage com política própria;
- URLs assinadas expiram e não são copiadas para logs ou exports públicos;
- exports são filtrados pelo autorizador e registram o perfil de acesso usado;
- retenção e base legal são declaradas por categoria;
- correção aditiva vale para o histórico epistemológico, mas não anula direito
  de exclusão de dados pessoais;
- exclusão legítima remove ou anonimiza o conteúdo e cria tombstone mínimo,
  desde que o próprio tombstone não reidentifique a pessoa;
- conhecimento indígena ou comunitário exige política específica e não será
  incluído no piloto técnico sintético.

## 14. Portabilidade e PROV/JSON-LD

O schema novo será `cz.project-cycle.v2`. O export `cz.project.v1` existente
permanece suportado durante a migração.

### 14.1 Mapeamento mínimo

| Célula Zero | PROV |
| --- | --- |
| pessoa, agente, coletivo, organização | `prov:Agent` |
| Original Record, versão de proposta, artefato, claim, evidência, verificação e outcome | `prov:Entity` |
| elaboração, execução da contribuição e atividade de verificação | `prov:Activity` |
| autoria/operador | `prov:wasAttributedTo` / `prov:actedOnBehalfOf` |
| artefato gerado por contribuição | `prov:wasGeneratedBy` |
| verificação usa evidência e critérios | `prov:used` |
| revisão/correção | `prov:wasRevisionOf` / `prov:wasDerivedFrom` |
| contribuição sob compromisso | `prov:wasAssociatedWith` + relação CZ específica |
| sequência causal | `prov:wasInformedBy` |

PROV não representa sozinho aceitação, capability, contestação ou condição
econômica. O contexto `cz:` deve acrescentar esses termos sem redefinir os
conceitos W3C.

### 14.2 Conteúdo do pacote

- manifest com versão e digests;
- atores públicos ou pseudonimizados conforme acesso;
- projeto, intenções e políticas referenciadas;
- oportunidades e versões pertinentes;
- propostas e compromisso aceito;
- contribuições, artefatos e claims;
- evidências e suas relações;
- verificações, outcomes, contestações e dissenso;
- eventos essenciais ordenados;
- avisos de limitações, economia e privacidade;
- arquivos somente quando permitidos; caso contrário, referências e tombstones.

Um importador deve validar schema, digests, referências e sequência antes de
criar qualquer projeção. Importar um pacote não concede autoridade aos atores
importados.

## 15. Contratos de adaptadores futuros

Nenhum adaptador abaixo faz parte da implementação agora.

| Porta | Uso futuro | Regra de segurança |
| --- | --- | --- |
| `IdentityPort` | DID/VC/OpenID4VC | credencial vira declaração verificada do emissor, não confiança automática |
| `SocialPublicationPort` | AT Protocol | publicação externa é projeção; remoção/revisão reconcilia sem apagar histórico local permitido |
| `AgentTransportPort` | A2A | mensagem vira input de comando; nunca autorização por si só |
| `AttestationPort` | EAS/Sign/assinatura JSON-LD | attestation preserva emissor e digest; não promove `VERIFIED` |
| `WorkbenchPort` | Huly | tarefas/documentos externos não viram compromisso ou outcome automaticamente |
| `ExternalAnchorPort` | Git assinado/timestamp/blockchain | somente após hipótese e gate separados |
| `TreasuryPort` | Safe/Allo futuros | ausente no MVP; nenhuma implementação vazia ou credencial preparada |

Todo adaptador grava `external_references`, usa `adapter_outbox` e aceita replay
idempotente. Dados recebidos entram como `DECLARED/IMPORTED` até um comando
autorizado mapear o objeto para estado interno.

## 16. Threat model e controles

| Ameaça | Controle mínimo | Teste obrigatório |
| --- | --- | --- |
| escrita direta por cliente | revogar DML + comandos delimitados | tentativas anon/auth falham |
| acesso a draft alheio | RLS + scope resolver | ator A não lê projeto B |
| agente ampliar autoridade | capabilities e delegação imutável/revogável | agente não concede capability a si |
| confused deputy | `actor_id`, autorizador e escopo no comando | operador não usa agente fora do projeto |
| replay ou duplo clique | idempotency key única | repetição produz mesmo resultado, não duplicata |
| corrida de aceitação | expected version + slot lock | duas aceitações concorrentes não excedem vagas |
| proposta alterada após aceite | commitment referencia versão imutável | edição cria nova versão e não muda termos |
| contribuição virar sucesso automático | estados independentes | submit não cria review/outcome |
| autoavaliação silenciosa | conflito calculado | review permitido ou bloqueado conforme política e sempre rotulado |
| apagar FAIL/contestação | append-only + RLS | update/delete falham; supersession preserva alvo |
| vazamento em evento/export | payload mínimo + filtro de acesso | PII canário não aparece no público |
| link/arquivo alterado | digest, tamanho e media type | mudança de bytes é detectada |
| malware em upload | limite, allowlist e varredura antes de servir | arquivo proibido fica em quarentena |
| divergência material/evento | transação + reconciliador | corrupção sintética gera `INTEGRITY_DIVERGENCE` |
| adapter comprometido | outbox, credencial mínima e inbound não autoritativo | evento externo não muda estado sozinho |
| indisponibilidade externa | retry/backoff e core independente | ciclo local continua com adapter offline |
| exclusão LGPD incompatível | conteúdo separado + tombstone mínimo | apagamento não expõe nem quebra referências |
| abuso/spam | convite, rate limit e auditoria administrativa | limiar bloqueia sem perder evidência de moderação |

## 17. Estratégia de testes e gates

### 17.1 Camadas de teste

1. **Domínio puro:** máquinas de estado, capabilities, conflitos, versionamento e
   regras econômicas.
2. **PostgreSQL/pgTAP:** constraints, RLS, grants, comandos transacionais,
   concorrência, append-only e reconciliação.
3. **Integração server-side:** validação, sessão, idempotência, erros tipados,
   storage e exports.
4. **Contratos:** nenhum segredo, nenhum DML direto, nenhuma dependência Web3,
   schemas versionados e adapters atrás de portas.
5. **Jornada de API:** três atores completam fluxo feliz e fluxos adversariais
   numa base limpa.
6. **Portabilidade:** exportar, validar, importar numa base limpa e comparar a
   trajetória essencial.

### 17.2 Cenários obrigatórios

#### S1 — Fluxo feliz humano

Steward publica oportunidade; segundo humano propõe; steward aceita; segundo
humano entrega; reviewer distinto emite `PASS`; steward aceita outcome; export
reconstrói o ciclo.

Resultado esperado: `PASS` restrito ao processo testado.

#### S2 — Revisão antes do compromisso

Owner solicita revisão, proponente cria nova versão, owner aceita somente a
nova versão.

Resultado esperado: versão anterior preservada e nenhum compromisso prematuro.

#### S3 — Rejeição

Proposta rejeitada com fundamento.

Resultado esperado: nenhum compromisso, contribuição ou direito econômico.

#### S4 — Agente limitado

Agente com operador e delegação `contribution.submit` entrega artefato, mas
tenta aceitar a própria proposta, publicar dado restrito e ampliar capability.

Resultado esperado: entrega permitida; demais comandos negados e auditáveis.

#### S5 — FAIL e contestação

Reviewer emite `FAIL`; contribuidor contesta com contraprova; autoridade mantém
ou supera o outcome.

Resultado esperado: `FAIL`, contestação, resposta e novo estado permanecem
visíveis; nada é reescrito.

#### S6 — Conflito de interesse

Contributor também possui papel de reviewer.

Resultado esperado: política decide se bloqueia ou permite; em qualquer caso o
conflito aparece no objeto e no export. Nunca classificar como revisão
independente.

#### S7 — Concorrência

Duas propostas são aceitas simultaneamente para uma oportunidade com uma vaga.

Resultado esperado: exatamente um compromisso; outra transação recebe
`STALE_VERSION` ou `CAPACITY_EXHAUSTED`.

#### S8 — Privacidade

Projeto restrito contém PII canário e possui uma projeção pública redigida.

Resultado esperado: consultas anônimas, eventos, logs e export público não
contêm o canário.

#### S9 — Correção e exclusão

Um claim é corrigido e um dado pessoal recebe pedido válido de exclusão.

Resultado esperado: correção aditiva; conteúdo pessoal removido/anônimo;
tombstone mínimo preserva integridade sem reidentificação.

#### S10 — Reconciliação

Teste privilegiado altera projeção material, remove referência ou apresenta
sequência inconsistente.

Resultado esperado: reconciliador falha e nenhum export é marcado íntegro.

#### S11 — Idempotência

O mesmo comando é repetido após timeout.

Resultado esperado: mesma resposta lógica e nenhum objeto duplicado.

#### S12 — Adaptador offline

Outbox não consegue publicar uma projeção externa.

Resultado esperado: domínio local permanece confirmado; integração fica
`PENDING/FAILED`, com retry e sem dupla fonte de verdade.

### 17.3 Gates backend-first

#### Gate B0 — Decisão humana

PASS se:

- vocabulário, defaults e limites desta especificação forem aceitos;
- workspace, branch, arquivos, rede e operações Git forem autorizados;
- o PR #63 receber classificação explícita separada.

#### Gate B1 — Autoridade e coordenação

Implementa somente:

- célula/policy mínima;
- capabilities e delegação;
- oportunidade, proposta e compromisso;
- eventos, idempotência e reconciliação correspondentes.

PASS se S2, S3, S4, S7 e S11 passarem em banco limpo, sem frontend novo.

#### Gate B2 — Produção e avaliação

Implementa:

- contribuição, artefato, claim e evidência;
- verificação, outcome e contestação;
- privacidade e tombstones.

PASS se S1, S5, S6, S8, S9 e S10 passarem.

#### Gate B3 — Portabilidade

Implementa:

- `cz.project-cycle.v2`;
- manifest, PROV/JSON-LD e Markdown;
- importação em base limpa;
- outbox e portas sem provedores externos.

PASS se export/import reproduzir atores públicos permitidos, versões, decisões,
dissenso e estados essenciais; adapter offline não interromper o core.

Somente depois de B1–B3 deve ser autorizada uma interface humana para esse
ciclo. A2A, ATProto, VC ou Web3 permanecem em spikes separados.

## 18. Defaults propostos para decisão humana

Estes itens são recomendações, não decisões canônicas.

### D1 — Contexto único agora, multi-célula depois

Proposta: todo projeto pertence desde já a `cell-zero`, mas a interface não cria
ou administra outras células.

Motivo: preserva o escopo contextual de autoridade sem construir federação.

### D2 — Compromisso como acordo operacional

Proposta: usar `commitment` como objeto P0 e adiar uma abstração genérica de
`agreement`.

Motivo: evita duplicação enquanto ainda não existe acordo financeiro ou
jurídico interno.

### D3 — Review com conflito permitido, mas não independente

Proposta: permitir que um participante também revise quando o piloto não tiver
terceiro disponível, exibindo conflito e proibindo o rótulo `INDEPENDENT`.

Motivo: torna o N=1 executável sem fabricar independência.

### D4 — Autoridade final do outcome

Proposta: no P0, o `PROJECT_STEWARD` aceita ou não aceita o outcome conforme a
policy da Célula Zero. Reviewer avalia; steward decide; auditor ou parte pode
contestar.

Motivo: separa verificação de decisão e preserva a autoridade do criador do
projeto sem torná-la verdade universal.

### D5 — Privacidade conservadora

Proposta: novos projetos e objetos nascem `PROJECT`; publicação exige comando
separado e projeção redigida. Perfis exibem apenas nome público, tipo e
atribuição do operador do agente.

Motivo: reduz exposição acidental e é mais compatível com LGPD.

### D6 — Entrada por convite no primeiro piloto

Proposta: manter allowlist de pilotos no backend enquanto moderação, recuperação
e proteção contra abuso não estiverem prontas.

Motivo: o produto ainda é laboratório, não rede pública aberta.

### D7 — Sem Web3 no caminho crítico

Proposta: nenhum protocolo Web3 entra em B1–B3. As interfaces são desenhadas,
mas os spikes só começam quando um uso real demonstrar a propriedade perdida.

Motivo: backend precisa primeiro provar sua semântica com operação local.

## 19. Migração da fundação do Gate 1

O trabalho atual deve ser preservado. A evolução recomendada é aditiva:

1. não reescrever migrations já executadas;
2. preservar `profiles`, `actors`, `actor_memberships`, invites, projects,
   intents e project members;
3. criar `cells` e ligar projetos existentes à célula seed;
4. adicionar policy, capabilities, roles e delegations;
5. adicionar objetos B1 e depois B2 em migrations separadas;
6. congelar a tabela `events` atual como `legacy gate-1 events` para novas
   escritas quando `domain_events` entrar;
7. importar cada evento legado para `domain_events` com referência ao ID
   original, sem fingir que possuía campos inexistentes;
8. manter `cz.project.v1` e introduzir `cz.project-cycle.v2` sem quebra;
9. manter o modo `seed-read-only`, mas rotulá-lo claramente como demonstração;
10. repetir todos os testes do Gate 1 para impedir regressão.

O PR #63 não deve ser chamado de MVP completo. Sua classificação adequada,
segundo a evidência atual, é:

`FOUNDATION / AUTHENTICATED LOCAL CI VERIFIED / PRODUCT HABITABILITY NOT YET DEMONSTRATED`

Merge, se houver, exige decisão própria; esta especificação não o autoriza.

## 20. Definition of Done do backend P0

O backend está `PASS` somente se:

1. B1, B2 e B3 passarem numa instalação limpa;
2. o fluxo S1 funcionar por contratos server-side, sem edição manual de banco;
3. S2–S12 preservarem os resultados esperados;
4. proposta nunca criar compromisso sem aceite explícito;
5. agente não ampliar autoridade nem decidir o próprio trabalho;
6. contribuição, evidência, verificação e outcome permanecerem distintos;
7. `FAIL`, dissenso e contestação não puderem ser apagados por usuário comum;
8. RLS e grants bloquearem leitura/escrita fora do escopo;
9. toda mudança for atômica, idempotente e versionada;
10. reconciliação detectar divergência material/evento testada;
11. dados pessoais não vazarem em evento, log ou export público;
12. export/import em base limpa reconstruir a trajetória essencial;
13. nenhum componente externo ou blockchain for necessário para o ciclo;
14. backups e restauração local forem reproduzíveis;
15. limitações e threat model forem preservados;
16. uma decisão humana classificar o resultado como `PASS`, `FAIL`, `PARTIAL`
    ou `INCONCLUSIVE`.

Mesmo um `PASS` permite afirmar apenas:

> O núcleo local executou e reconstruiu o ciclo operacional testado, preservando
> autoridade contextual, versões, evidência, verificação e dissenso nos
> cenários definidos.

Não permite afirmar adoção, utilidade externa, escalabilidade, legitimidade
social, resistência a operador privilegiado ou necessidade de Web3.

## 21. Próxima ação após revisão

Se D1–D7 forem aceitos, preparar uma autorização executável para o Gate B1 com:

- workspace e branch novos;
- base exata do PR #63 ou da `main`, conforme decisão de merge;
- migrations e áreas permitidas;
- proibição explícita de frontend, deploy e integrações;
- comandos de teste;
- commit/push/PR autorizados ou não autorizados;
- critérios S2, S3, S4, S7 e S11 como Definition of Done.

Até essa decisão:

`SPEC PREPARED ≠ HUMAN ACCEPTED ≠ IMPLEMENTATION AUTHORIZED`
