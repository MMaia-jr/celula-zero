# HUMAN-DIRECTION-001 — Verdade Contextual Versionada

## Metadados

- Data: 2026-08-21
- Autoridade: Marcos, fundador humano
- Estado: `HUMAN DIRECTION — ACCEPTED PROVISIONALLY, PENDING CANONICALIZATION`
- Origem: auditoria independente do `AGENT-COUNCIL-MVP-002` e reflexão humana posterior
- Decisão de aceitação: `decisions/D005-contextual-truth-and-web3-hypothesis.md`
- Próxima revisão: após o primeiro experimento de ancoragem externa ou nova decisão explícita do fundador

## Direção humana aceita provisoriamente

A Célula Zero deverá preservar estados contextuais aceitos por agentes definidos,
sob política, evidências, tempo, domínio e escopo explícitos, sem transformar
consenso em verdade universal.

Cada estado aceito deverá ser versionado. Correções, contestações, revogações e
novas evidências produzirão novos registros vinculados aos anteriores; não
apagarão nem reescreverão silenciosamente o que foi aceito no passado.

Uma formulação curta:

> Uma verdade contextual é aquilo que determinados agentes aceitaram como
> estado válido, sob determinada política e evidência, em um contexto, tempo e
> escopo explícitos. Ela permanece como verdade histórica do processo mesmo
> quando for posteriormente contestada ou superada.

## Três sentidos de verdade

### 1. Verdade do registro

Afirma que determinados agentes registraram, assinaram ou aceitaram determinado
conteúdo em certo momento.

Essa propriedade pode ser demonstrada por hashes, assinaturas, proveniência e
ancoragem externa.

### 2. Verdade contextual aceita

Afirma que, segundo a política declarada da célula, uma interpretação ou decisão
atingiu o estado `ACCEPTED` dentro de um domínio e escopo específicos.

Ela não exige unanimidade, mas exige que participação, autoridade, posições,
divergências e regra decisória sejam preservadas.

### 3. Verdade sobre o mundo

Afirma que a interpretação aceita corresponde à realidade externa.

Consenso, assinatura e blockchain não demonstram essa correspondência por si
sós. Ela permanece dependente de evidência, verificação, replicação, crítica e
possibilidade de revisão.

## Distinções obrigatórias

- consenso da rede não é consenso da célula;
- consenso da célula não é verdade universal;
- registro imutável não é evidência verdadeira;
- proveniência não é validação;
- decisão legítima não é descoberta empírica;
- assinatura não prova que a afirmação assinada corresponde ao mundo;
- tempo declarado não é necessariamente tempo verificado;
- espaço declarado não é necessariamente presença física verificada;
- estado atual não apaga estados anteriores;
- correção não autoriza reescrita silenciosa.

## A célula como entidade

Conceitualmente, uma célula é composta por:

1. identidade;
2. propósito e domínio;
3. participantes e papéis;
4. política própria;
5. memória versionada;
6. capacidade de deliberar;
7. capacidade de agir;
8. direito de contestar, corrigir, sair e evoluir.

A forma social ou jurídica não é determinada por esta decisão. Uma célula pode
ser uma comunidade informal, projeto, associação, cooperativa, empresa, ONG,
DAO ou outra organização legitimamente constituída.

Da mesma forma, sua representação técnica pode usar arquivos assinados,
repositório Git, banco de dados, smart account, contrato, NFT, blockchain
compartilhada ou chain própria. A representação técnica não substitui a célula
social.

## Bloco de consenso contextual

Um bloco contextual candidato deverá comprometer, direta ou indiretamente, os
seguintes elementos:

```text
cell_id
block_sequence
previous_block_hash

context_id
domain
declared_event_time
anchor_time
declared_space

policy_hash
participants
roles
eligible_deciders
positions_and_votes
signatures

original_records_root
claims
evidence_root
interpretations

accepted_statement
decision_status
dissenting_positions
limitations
scope_of_validity

valid_from
review_at
supersedes
challenges
revokes
```

Esse envelope é um modelo conceitual, não uma especificação técnica aprovada.

## Estados epistemológicos mínimos

O sistema deverá poder distinguir, conforme o tipo de objeto:

- `PROPOSED`;
- `DOCUMENTED`;
- `ACCEPTED`;
- `CONTESTED`;
- `PARTIALLY_VERIFIED`;
- `VERIFIED`;
- `SUPERSEDED`;
- `REVOKED`;
- `FALSIFIED`;
- `EXPIRED`.

Nenhum estado deverá ser promovido automaticamente apenas porque foi incluído
num bloco.

## Regra de evolução

O estado atual deverá ser derivável da sequência válida de registros:

```text
State(n) = apply(State(n-1), Block(n))
```

Bancos de dados, índices, páginas e dashboards deverão ser tratados como
projeções reconstruíveis. Se uma projeção divergir da sequência canônica, ela
deverá ser rejeitada ou reconstruída.

Um novo bloco poderá confirmar, contestar, corrigir, revogar ou superar um bloco
anterior. Não poderá fazer o bloco anterior deixar de ter existido.

## Divergência e dissenso

O consenso não deverá apagar posições divergentes. Quando relevante, o registro
preservará:

- quem participou;
- quem estava elegível e não participou;
- quem apoiou;
- quem rejeitou;
- quem se absteve;
- quais evidências foram consideradas;
- quais evidências foram contestadas ou excluídas;
- qual política produziu a decisão;
- qual foi o grau e o limite do acordo.

## Tempo, espaço e privacidade

O registro deverá separar:

- tempo declarado do evento;
- tempo de assinatura;
- tempo de ancoragem externa.

Localização e presença física são afirmações que podem exigir testemunhas,
dispositivos, autoridades contextuais ou outros mecanismos de atestação. O
registro imutável de uma localização declarada não prova a presença física.

Dados pessoais, conhecimento sensível, coordenadas protegidas e informações que
precisem ser corrigidas ou excluídas não deverão ser publicados diretamente em
blockchain pública. Quando necessário, deverão ser usados compromissos
criptográficos, acesso controlado, criptografia e armazenamento apropriado ao
contexto.

## Relação com Web3

Esta direção não decide que blockchain, NFT, DAO, token ou chain própria serão
obrigatórios.

Ela estabelece uma propriedade que poderá justificar essas tecnologias:

> Nenhum operador isolado deverá conseguir reescrever silenciosamente um estado
> contextual já aceito sem que a divergência seja detectável por terceiros
> autorizados ou independentes.

Permanecem como hipóteses:

- blockchain pública como âncora compartilhada;
- smart account como capacidade coletiva de agir;
- DAO como mecanismo de governança e tesouraria;
- NFT como identidade ou passaporte de uma célula;
- chain própria como instrumento de soberania futura.

## Relação com o AGENT-COUNCIL-MVP-002

O experimento demonstrou validação de inserções, atomicidade e consistência
interna de uma hash chain. A auditoria demonstrou que votos, autorizações,
resultados e evidências podiam divergir do log sem detecção.

O aprendizado arquitetural é:

> Um log internamente consistente não é fonte canônica se os objetos que ele
> representa permanecem mutáveis e o verificador não confronta estado material
> e registro encadeado.

O resultado do experimento deve permanecer separado desta direção humana.

## O que esta decisão não autoriza

Esta direção não autoriza automaticamente:

- implantar smart contracts;
- emitir NFT ou token;
- criar DAO;
- criar chain própria;
- colocar dados pessoais on-chain;
- declarar governança definitiva;
- tratar consenso de IAs como legitimidade;
- substituir comunidade por infraestrutura;
- iniciar novo experimento técnico sem pergunta e gate de produto.

## Consequência imediata

A Célula Zero continua sendo comunidade-laboratório primeiro. A próxima decisão
técnica sobre Web3 deverá ser tomada por um experimento mínimo de ancoragem
externa, descrito separadamente em `HYPOTHESIS-WEB3-001`.

## Condição para canonicalização

Este documento torna-se direção canônica somente após:

1. revisão explícita do fundador — concluída em 2026-08-21 e preservada em `D005`;
2. registro no repositório canônico;
3. commit, push, PR e merge devidamente verificados.

Até lá, seu estado é `PREPARED`, não `CANONICAL`.
