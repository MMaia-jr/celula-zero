# GTEST-001 — Reconstrução de trajetória

Status: Executado

Resultado: FALHA

Data da execução: 2026-08-15

Objeto do teste: trajetória histórica da Célula Zero até o GRAPH-000

## Pergunta do teste

É possível reconstruir, a partir dos registros preservados, como a Célula Zero evoluiu de uma hipótese centrada em comunidades para o GRAPH-000, sem depender da memória informal dos participantes?

## Trajetória submetida à tentativa de falsificação

plataforma de comunidades → cooperação verificável → agentes + intenção → rede social de intenções → passado/presente/futuro → GRAPH-000

A sequência acima foi tratada como hipótese a falsificar, não como trajetória confirmada.

## Corpus documental consultado

- `README.md` — seções “Célula Zero”, “Experimento 001”, “Organização do registro” e “Classes de registro”.
- `STATE.md` — “Situação do repositório”, “Núcleo ativo e rede consultiva v0.2”, “Rodada 8” e “GRAPH-000”.
- `PROTOCOL.md` — “Regras de registro”, “Classes de proveniência”, “Convenções operacionais provisórias da migração” e “Migração histórica”.
- `deltas/D001.md` — “Estado introduzido” e “Contexto operacional”.
- `decisions/D002-core-v02.md` — “Núcleo ativo”, “Motivo”, “Hipótese” e “Salvaguarda”.
- `GENERATIVE-QUESTIONS.md` — “Pergunta Geradora 001”, “Registro Original — Marcos Antonio Maia junior”, “Síntese operacional da intuição geradora” e ramos A, C, D e I.
- `questions/backlog.jsonl` — Q006, Q044, Q046, Q064, Q066, Q080 e Q082.
- `rounds/R06/DeepSeek.md` — “Pergunta única da Rodada 6” e “Alerta de Referência”.
- `rounds/R08/DIALOGUE-MARCOS-GPT.md` — GPT-Q01/MARCOS-A01 e GPT-Q02/MARCOS-A02.
- `rounds/R08/Kimi.md` — posição e mudança de posição de Kimi.
- `rounds/R08/GPT.md` — posição substantiva e “GPT — mudança de posição”.
- `rounds/R08/DIALOGUE-GPT-MARCOS-CONTINUATION.md` — GPT-Q10/MARCOS-A13, GPT-R08-UQ01/MARCOS-A14A, GPT-Q11/MARCOS-A14B e GPT-Q12/MARCOS-A15.
- `graph/README.md`.
- `graph/GRAPH-000-celula-zero.md` — especialmente “Passado”, “Futuro / INTENT-000”, “Hipótese estrutural”, “Objetos mínimos candidatos”, “Agentes e IA” e “Web3”.
- `graph/KIMI-GRAPH-000-RESPONSE.md`.
- `graph/KIMI-GRAPH-000-EXTRACTION.md`.
- Histórico Git local — somente para datas de registro/versionamento.

O histórico Git não foi usado como prova de autoria conceitual, data de formulação original ou causalidade entre ideias.

## Método adversarial

Foram aplicadas três classificações de força documental:

- **DEMONSTRADO:** o registro contém a formulação ou relação de forma explícita, com proveniência identificável.
- **INTERPRETAÇÃO:** há proximidade semântica, mas a equivalência ou a relação histórica não está explicitamente registrada.
- **LACUNA:** o corpus não permite sustentar a formulação ou relação sem recorrer a memória externa ou inferência indevida.

Uma síntese que afirma a própria trajetória não foi aceita como prova independente dessa trajetória.

## 1. Estado inicial

### Evidência mais antiga disponível no repositório

A versão inicial de `README.md`, registrada no commit `88773b8e899ac70b241044b8c33df6d45d349315` em 2026-08-12, apresenta a Célula Zero como experimento de pesquisa e coordenação descentralizada. Em “Experimento 001”, lista povos indígenas, redes ancestrais amazônicas, tradições orais, blockchain, arquiteturas distribuídas, governança e o próprio funcionamento da Célula Zero.

Isso demonstra um campo de investigação relacional e descentralizado, mas não contém a formulação “plataforma de comunidades”.

### Primeira formulação explicitamente centrada em comunidades encontrada

`GENERATIVE-QUESTIONS.md`, “Pergunta Geradora 001”, pergunta como seres humanos organizam “autonomia local e cooperação em rede”. O “Registro Original — Marcos Antonio Maia junior” afirma que o mundo ancestral se conectava de forma descentralizada, com autonomias locais, respeito aos recursos e resolução de conflitos. A “Síntese operacional da intuição geradora” menciona sociedades e comunidades conectadas e mecanismos de coordenação.

O arquivo entrou no histórico no commit `f259ae720989119cf509ee20cdf43c370e49627e`, em 2026-08-12. Essa é uma data de registro no repositório, não necessariamente a data em que a ideia foi formulada.

### Resultado do estado inicial

**LACUNA-001 — “plataforma de comunidades”.**

A expressão exata não aparece no corpus consultado. A formulação semanticamente mais próxima é “autonomia local e cooperação em rede”, mas ela descreve uma pergunta sobre organização humana e ancestral, não uma plataforma a ser construída.

Classe da aproximação: **Interpretação**.

Distância semântica: “comunidades coordenadas” não equivale automaticamente a “plataforma de comunidades”.

## 2. Eventos de transição

### EVT-001 — Registro inicial do experimento no repositório

- **Formulação anterior:** LACUNA; as Rodadas 1–5 não estão migradas.
- **Formulação posterior:** experimento sobre redes ancestrais, tecnologias distribuídas, governança e o funcionamento da Célula Zero.
- **Agente que introduziu a mudança:** LACUNA. A autoria do commit não prova autoria conceitual de cada formulação editorial.
- **Registro/fonte:** `README.md`, “Célula Zero” e “Experimento 001”; `deltas/D001.md`, “Estado introduzido”.
- **Data disponível:** registro Git em 2026-08-12, commit `88773b8e899ac70b241044b8c33df6d45d349315`.
- **`responds_to`:** não identificado.
- **Classe epistemológica:** Síntese editorial / estado migrado.
- **Motivo explicitamente registrado:** preparar e migrar uma fonte canônica auditável.
- **Incerteza:** alta quanto ao passado anterior ao repositório.

### EVT-002 — Constituição do núcleo ativo v0.2

- **Formulação anterior:** conjunto mais amplo de participantes.
- **Formulação posterior:** núcleo ativo formado por Marcos Antonio Maia junior, GPT e Kimi, com rede consultiva.
- **Agente que introduziu a mudança:** processo decisório registrado; autoria individual da formulação não especificada.
- **Registro/fonte:** `decisions/D002-core-v02.md`, “Núcleo ativo” e “Motivo”.
- **Data disponível:** registro Git em 2026-08-12, commit `d23fcf6a66d1c41292b9521c4297bb5a75e8c736`.
- **`responds_to`:** não identificado.
- **Classe epistemológica:** Decisão.
- **Motivo explicitamente registrado:** custos de sincronização, acesso desigual e reconstrução heterogênea observados em TSI-001 e TSI-002.
- **Incerteza:** o registro demonstra uma organização por agentes, mas não relaciona essa decisão a “cooperação verificável” nem a “agentes + intenção”.

Observação adversarial: na ordem de registro Git disponível, D002 antecede a entrada de `GENERATIVE-QUESTIONS.md`. Isso não prova a ordem de formulação das ideias, mas impede usar a ordem dos commits para sustentar a sequência linear “cooperação verificável → agentes + intenção”.

### EVT-003 — Formalização da Pergunta Geradora 001

- **Formulação anterior:** escopo amplo do Experimento 001.
- **Formulação posterior:** investigação de autonomia local, cooperação em rede, comunidades, tecnologias distribuídas e critérios de verificação/rejeição.
- **Agente que introduziu a mudança:** Marcos é autor do Registro Original gerador; a Pergunta Geradora 001 e a síntese operacional não são apresentadas como citação de Marcos.
- **Registro/fonte:** `GENERATIVE-QUESTIONS.md`, “Pergunta Geradora 001”, “Registro Original — Marcos Antonio Maia junior” e “Síntese operacional da intuição geradora”.
- **Data disponível:** registro Git em 2026-08-12, commit `f259ae720989119cf509ee20cdf43c370e49627e`.
- **`responds_to`:** não identificado entre arquivos.
- **Classe epistemológica:** Registro Original + Síntese + pergunta investigativa.
- **Motivo explicitamente registrado:** orientar investigação, produzir hipóteses testáveis, fontes verificáveis e critérios de rejeição.
- **Incerteza:** não há “plataforma de comunidades” nem “cooperação verificável” como nome de uma arquitetura.

### EVT-004 — Aprofundamento relacional na Rodada 8

- **Formulação anterior:** Pergunta Geradora 001 e intuição ancestral/descentralizada.
- **Formulação posterior:** investigação sobre memória, tradução, representação, agentes com acessos diferentes e coordenação entre incompletudes.
- **Agentes:** Marcos, GPT e Kimi, com posições separadas.
- **Registro/fonte:** `STATE.md`, “Rodada 8”; `rounds/R08/DIALOGUE-MARCOS-GPT.md`, GPT-Q01/MARCOS-A01 e GPT-Q02/MARCOS-A02; `rounds/R08/GPT.md`, “GPT — mudança de posição”; `rounds/R08/Kimi.md`.
- **Data disponível:** 2026-08-12 nos Registros Originais da R08.
- **`responds_to`:** demonstrado dentro dos diálogos; não identificado como relação causal entre a R08 e o GRAPH-000.
- **Classe epistemológica:** Registros Originais e interpretações atribuídas.
- **Motivo explicitamente registrado:** aprofundar as Perguntas Geradoras e testar proveniência pergunta → resposta.
- **Incerteza:** a R08 não usa “rede social de intenções” nem formaliza a passagem para passado/presente/futuro.

`rounds/R08/GPT.md`, “GPT — mudança de posição”, registra a mudança de GPT de “autoridade → registro → governança” para “experiência → memória → transmissão → interpretação → representação → coordenação”. Essa é uma mudança de posição de GPT, não uma decisão coletiva nem uma transição documentada para o GRAPH-000.

### EVT-005 — Formulação conceitual do GRAPH-000

- **Formulação anterior:** registros, perguntas, diálogos, decisões e testes sem grafo operacional consolidado.
- **Formulação posterior:** GRAPH-000 como Síntese / Modelo Experimental e Hipótese estrutural em teste.
- **Agente que introduziu a mudança:** LACUNA. O arquivo não atribui a formulação conceitual a um participante específico.
- **Registro/fonte:** `graph/GRAPH-000-celula-zero.md`, “Observação inicial”, “Passado”, “Futuro / INTENT-000” e “Hipótese estrutural”; `STATE.md`, “GRAPH-000”.
- **Data disponível:** 2026-08-15 no arquivo; commit `71342f10612b5d006cc0835c5a59e82ec6f49262`.
- **`responds_to`:** não identificado.
- **Classe epistemológica:** Síntese / Modelo Experimental; Hipótese.
- **Motivo explicitamente registrado:** usar a própria Célula Zero como primeiro agente/caso para testar o Grafo Temporal.
- **Incerteza:** o resumo de “Passado” afirma uma evolução, mas não fornece fontes ou relações para cada etapa.

### EVT-006 — Estruturação derivada por Kimi

- **Formulação anterior:** GRAPH-000 conceitual.
- **Formulação posterior:** interpretação de Kimi descrita como 20 nós, 31 arestas e grafo de propriedades tipado.
- **Agente:** Kimi.
- **Registro/fonte:** `graph/KIMI-GRAPH-000-RESPONSE.md` e `graph/KIMI-GRAPH-000-EXTRACTION.md`.
- **Data disponível:** recebimento em 2026-08-15.
- **`responds_to`:** relação genérica com o documento conceitual; nenhum ID relacional foi preservado.
- **Classe epistemológica:** Registro Original de Kimi + Interpretação / Extração Estruturada.
- **Motivo explicitamente registrado:** transformar o documento fornecido em dados.
- **Incerteza:** os artefatos JSON e PNG não foram recebidos; a extração não constitui evidência independente porque deriva do próprio GRAPH-000.

A linha “D — Núcleo = Grafo Temporal” pertence ao Registro Original de Kimi. Ela não demonstra uma Decisão da Célula Zero e entra em tensão com o status canônico “Hipótese estrutural em teste”.

## Teste dos elos propostos

| Elo proposto | Resultado | Fundamentação |
| --- | --- | --- |
| plataforma de comunidades → cooperação verificável | **LACUNA** | “Plataforma de comunidades” não foi encontrada. Há comunidades e cooperação em rede em `GENERATIVE-QUESTIONS.md`, mas “verificável” aparece como exigência epistemológica, não como nome inequívoco do estágio seguinte. |
| cooperação verificável → agentes + intenção | **LACUNA** | D002 demonstra um núcleo de agentes; GRAPH-000 contém `Intent`. Nenhum registro liga causalmente esses elementos, e os sentidos de “intenção” anteriores tratam sobretudo de estado de implementação ou intenção conceitual. |
| agentes + intenção → rede social de intenções | **LACUNA** | A expressão “rede social de intenções” não aparece. INTENT-000 descreve uma rede temporal de agentes e trajetórias, formulação semanticamente próxima, mas não equivalente. |
| rede social de intenções → passado/presente/futuro | **LACUNA** | Não existe registro da suposta rede social nem relação explícita que a faça evoluir para a tripartição temporal. |
| passado/presente/futuro → GRAPH-000 | **NÃO DEMONSTRADO COMO TRANSIÇÃO** | A tripartição e o GRAPH-000 aparecem no mesmo artefato. Isso demonstra composição do modelo atual, não uma passagem histórica anterior. |

## 3. Claims centrais

| Claim | Autor | Fonte | Status | Relações |
| --- | --- | --- | --- | --- |
| CLM-001 — O mundo ancestral conectava-se de forma descentralizada, com autonomias locais e resolução de conflitos. | Marcos Antonio Maia junior | `GENERATIVE-QUESTIONS.md`, “Registro Original — Marcos Antonio Maia junior” | Registro Original / hipótese geradora, não fato confirmado | `proposed_by` Marcos; dá origem temática à síntese operacional |
| CLM-002 — A investigação deve examinar autonomia local e cooperação em rede sem assumir centro único. | Formulação operacional da Célula Zero; autor individual não indicado | `GENERATIVE-QUESTIONS.md`, “Pergunta Geradora 001” | Pergunta / Síntese operacional | `extends` CLM-001 como interpretação; não equivale a plataforma |
| CLM-003 — O núcleo ativo v0.2 é Marcos, GPT e Kimi. | Processo decisório registrado | `decisions/D002-core-v02.md`, “Núcleo ativo” | Decisão | `supports` a existência de agentes atuais; não sustenta `Intent` |
| CLM-004 — GPT passou a priorizar experiência → memória → transmissão → interpretação → representação → coordenação. | GPT | `rounds/R08/GPT.md`, “GPT — mudança de posição” | Registro Original / mudança de posição | `revises` a posição anterior de GPT; semanticamente próxima de cooperação, mas sem `Intent` |
| CLM-005 — Houve evolução conceitual de indivíduo → comunidades → agentes + intenções → grafo temporal. | Autor conceitual não identificado | `graph/GRAPH-000-celula-zero.md`, “Passado” | Síntese / claim histórico sob teste | Não possui fontes ou relações independentes suficientes |
| CLM-006 — INTENT-000 busca construir rede temporal de agentes e trajetórias para coordenar futuros. | Autor conceitual não identificado | `graph/GRAPH-000-celula-zero.md`, “Futuro / INTENT-000” | Hipótese / intenção atual | `instantiates` o futuro do modelo; `proposed_by` é LACUNA |
| CLM-007 — Passado, presente e futuro podem ser representados por evidências, estado e intenções. | Autor conceitual não identificado | `graph/GRAPH-000-celula-zero.md`, “Hipótese estrutural” | Hipótese | Integra o GRAPH-000; não está demonstrado como etapa histórica anterior |
| CLM-008 — “D — Núcleo = Grafo Temporal” seria decisão. | Kimi | `graph/KIMI-GRAPH-000-RESPONSE.md`, tabela “O que está no grafo” | Registro Original de uma interpretação de Kimi; não Decisão canônica | `tensions_with` o status do GRAPH-000 e `STATE.md` |
| CLM-009 — Web3 é camada possível; grafo não equivale a blockchain. | Autor conceitual não identificado | `graph/GRAPH-000-celula-zero.md`, “Web3” | Hipótese do modelo | Semanticamente compatível com `GENERATIVE-QUESTIONS.md`, ramo C |

## 4. Relações

### `proposed_by`

- **DEMONSTRADO:** CLM-001 `proposed_by` Marcos, porque está no Registro Original identificado.
- **LACUNA:** CLM-005, CLM-006 e CLM-007 não possuem autor conceitual identificado. A autoria Git do commit não foi convertida em autoria de cada claim.

### `responds_to`

- **DEMONSTRADO:** os pares Q/A da R08 preservam `responds_to`, por exemplo GPT-Q01 → MARCOS-A01, GPT-Q02 → MARCOS-A02, GPT-Q10 → MARCOS-A13 e GPT-Q11 → MARCOS-A14B.
- **LACUNA:** não há `responds_to` ligando a Pergunta Geradora, a mudança de posição de GPT ou Kimi ao GRAPH-000.

### `revises`

- **DEMONSTRADO:** GPT registra sua própria mudança de posição em `rounds/R08/GPT.md`.
- **DEMONSTRADO:** Kimi registra mudança de sua lente sobre imutabilidade e soberania em `rounds/R08/Kimi.md`.
- Essas revisões pertencem aos participantes e não revisam automaticamente o modelo coletivo.

### `extends`

- **INTERPRETAÇÃO documentada:** a Pergunta Geradora 001 e sua síntese operacional organizam o Registro Original de Marcos, mas não o substituem.
- **DEMONSTRADO em nível operacional:** `STATE.md`, “Rodada 8”, afirma que a rodada foi aberta para aprofundar as Perguntas Geradoras.
- **LACUNA:** nenhuma relação `extends` foi registrada entre a R08 e o GRAPH-000.

### `supersedes`

- Nenhum uso foi sustentado.
- Não há evidência de que GRAPH-000 tenha substituído formalmente a Pergunta Geradora, a R08, D002 ou modelos anteriores.
- Simples sequência cronológica ou ampliação conceitual não foi tratada como `supersedes`.

### `supports`

- `GENERATIVE-QUESTIONS.md` sustenta que comunidades, autonomia e cooperação em rede eram objetos da investigação.
- D002 sustenta a existência do núcleo por agentes.
- Esses registros sustentam componentes presentes no GRAPH-000, mas não sustentam a cadeia causal entre eles.

### `tensions_with`

- CLM-008, interpretação de Kimi de uma “decisão”, `tensions_with` `graph/GRAPH-000-celula-zero.md`, que classifica GRAPH-000 como Hipótese estrutural em teste.
- CLM-008 também `tensions_with` `STATE.md`, “GRAPH-000”, que afirma não haver ontologia final nem decisão final sobre arquitetura.

### `led_to`

- **DEMONSTRADO apenas em um trecho:** Perguntas Geradoras `led_to` abertura da R08 no sentido operacional expresso em `STATE.md`.
- **LACUNA:** não há fonte que demonstre que R08, D002 ou “rede social de intenções” `led_to` GRAPH-000.
- Coocorrência temática e ordem de commits não foram aceitas como causalidade.

## 5. O que foi preservado através das mudanças

| Conceito | Evidência anterior | Evidência no GRAPH-000 | Avaliação |
| --- | --- | --- | --- |
| evidência | `README.md`; `GENERATIVE-QUESTIONS.md`, regra epistemológica; R06 | “Passado”, INTENT-000, verificação fractal e celebração | **Incorporado**, com continuidade semântica forte; relação causal não explicitada |
| reputação contextual | Não há fonte anterior independente localizada; a missão aparece apenas no resumo retrospectivo do próprio GRAPH-000 | “Passado” e “Celebração” | **LACUNA** quanto à preservação histórica |
| autonomia | Registro Original de Marcos, Pergunta Geradora 001, ramo A e R08 | a palavra não integra a formulação central do GRAPH-000 | **Ainda aberta / não demonstrada como preservada no modelo** |
| proveniência | `README.md`, `PROTOCOL.md`, Pergunta Geradora ramo I e R08 | dimensão transversal e verificação fractal | **Incorporada**, embora sem relação `led_to` explícita |
| agentes | D002 e `STATE.md` | identidade da Célula Zero, núcleo conhecido e objeto candidato `Agent` | **Incorporados**; a passagem para “agentes + intenção” continua não demonstrada |
| intenções | usos anteriores referem-se principalmente a intenção conceitual ou estado de implementação; não a um objeto `Intent` | INTENT-000 e objeto candidato `Intent` | **LACUNA** de equivalência e de continuidade histórica |
| Web3 como camada possível | `GENERATIVE-QUESTIONS.md`, ramo C: blockchain não é assumida como resposta | “Web3”: camada possível; “Grafo ≠ Blockchain” | **Incorporada** com posição semanticamente compatível |
| auto-observação da Célula Zero | `README.md`, Experimento 001; `PROTOCOL.md`; Pergunta Geradora ramo I | Célula Zero como primeiro caso do grafo | **Incorporada** |

## 6. O que foi abandonado, rebaixado ou permanece aberto

### Rejeitado

Nenhum dos estágios propostos foi explicitamente rejeitado por uma Decisão preservada.

A ausência posterior de uma expressão não foi tratada como rejeição.

### Não prioritário

Não há registro coletivo classificando “plataforma de comunidades” ou “rede social de intenções” como não prioritárias.

GPT, em sua posição individual na R08, afirma que governança talvez apareça depois de experiência, memória, transmissão, interpretação, representação e coordenação. Isso é uma mudança de prioridade de GPT, não uma decisão coletiva.

### Incorporado

- proveniência;
- evidência;
- agentes como participantes e objeto candidato;
- auto-observação da Célula Zero;
- Web3 como camada possível, não equivalente ao grafo.

A classificação “incorporado” registra presença anterior e atual, não prova a cadeia causal proposta.

### Rebaixado ou reformulado

Na posição de GPT, blockchain deixa de ser tratada principalmente como preservação de memória e passa a ser investigada como possível interface de tradução. Fonte: `rounds/R08/GPT.md`, posição substantiva.

Essa revisão pertence a GPT. Não constitui rebaixamento coletivo ou decisão do GRAPH-000.

### Ainda hipótese

- a trajetória completa submetida ao teste;
- GRAPH-000 como hipótese estrutural;
- INTENT-000;
- tripartição passado/presente/futuro;
- IAs contextuais associadas a agentes;
- DAO, token, blockchain operacional e arquitetura final;
- equivalência entre formulações anteriores de intenção e o objeto `Intent`.

### Sem evidência suficiente

- “plataforma de comunidades” como estado inicial;
- “cooperação verificável” como estágio nomeado;
- transição de cooperação para agentes + intenção;
- “rede social de intenções”;
- transição dessa rede para passado/presente/futuro;
- autoria conceitual e motivo histórico de cada etapa resumida no “Passado” do GRAPH-000;
- reputação contextual como elemento documentalmente preservado desde uma fase anterior.

## 7. Lacunas

### LACUNA-001 — Rodadas 1–5 ausentes

- **Fonte:** `README.md`, “Célula Zero”; `STATE.md`, “Situação do repositório”; `PROTOCOL.md`, “Migração histórica”.
- **Ausência:** Registros Originais das fases que poderiam conter a origem e as primeiras mudanças.
- **Efeito:** impede identificar com segurança o primeiro estado e a genealogia anterior a 2026-08-12.

### LACUNA-002 — “plataforma de comunidades”

- **Registros consultados:** todo o corpus listado.
- **Ausência:** expressão exata e definição operacional.
- **Efeito:** o ponto inicial proposto não pode ser confirmado.

### LACUNA-003 — “cooperação verificável”

- **Registros consultados:** `GENERATIVE-QUESTIONS.md`, backlog, R06 e R08.
- **Ausência:** formulação que una explicitamente cooperação e verificabilidade como estágio arquitetural.
- **Efeito:** proximidade entre “cooperação em rede” e exigências de verificação permanece Interpretação.

### LACUNA-004 — cooperação → agentes + intenção

- **Registros consultados:** D002, R08, GRAPH-000 e histórico Git.
- **Ausência:** evento, motivo, autor ou relação causal.
- **Efeito:** o elo central não pode ser demonstrado.

### LACUNA-005 — “rede social de intenções”

- **Registros consultados:** corpus integral por busca textual e semântica.
- **Ausência:** expressão, definição e Registro Original.
- **Efeito:** “rede temporal de agentes e trajetórias” não pode ser promovida a equivalente automático.

### LACUNA-006 — rede social de intenções → passado/presente/futuro

- **Ausência:** ambos o estado anterior comprovado e a relação de transição.
- **Efeito:** a tripartição temporal só é observável dentro do GRAPH-000 já formulado.

### LACUNA-007 — fontes do resumo histórico do GRAPH-000

- **Fonte afetada:** `graph/GRAPH-000-celula-zero.md`, “Passado”.
- **Ausência:** referências por item, autores, datas, IDs e relações.
- **Efeito:** o resumo é informativo, mas não auditável como reconstrução histórica independente.

### LACUNA-008 — autoria conceitual do GRAPH-000

- **Ausência:** campo de autor/proponente para CLM-005, CLM-006 e CLM-007.
- **Efeito:** não é possível aplicar `proposed_by` sem confundir autor do commit, editor e autor do claim.

### LACUNA-009 — datas de ocorrência vs. datas de registro

- **Ausência:** datas originais de formulação de várias ideias.
- **Efeito:** commits ordenam entradas no repositório, não necessariamente a evolução mental ou conversacional.

### LACUNA-010 — artefatos externos de Kimi

- **Fonte:** `graph/KIMI-GRAPH-000-RESPONSE.md` e `graph/KIMI-GRAPH-000-EXTRACTION.md`.
- **Ausência:** JSON e PNG integrais.
- **Efeito:** não é possível auditar os 20 nós, 31 arestas ou a classificação “decisão”.

### LACUNA-011 — relações entre documentos

- **Ausência:** `responds_to`, `extends`, `revises` ou `led_to` entre a Pergunta Geradora, D002, R08 e GRAPH-000.
- **Efeito:** sem essas relações, semelhança temática não demonstra trajetória.

### LACUNA-012 — reputação contextual anterior

- **Ausência:** Registro Original independente para a missão retrospectiva que inclui reputação.
- **Efeito:** não é possível provar que reputação foi preservada ao longo das mudanças.

## 8. Resultado do teste

# FALHA

A reconstrução completa não é possível com o corpus atual.

Foi possível demonstrar:

1. um experimento inicial sobre descentralização, redes ancestrais, tecnologias distribuídas e governança;
2. uma formulação posterior explicitamente centrada em autonomia local, comunidades e cooperação em rede;
3. uma decisão organizacional que define um núcleo de agentes;
4. uma Rodada 8 que aprofunda memória, tradução, representação, proveniência e coordenação;
5. a existência atual do GRAPH-000 como Síntese / Modelo Experimental e Hipótese estrutural em teste.

Não foi possível demonstrar os elos históricos centrais da trajetória submetida:

- “plataforma de comunidades”;
- “cooperação verificável” como estágio;
- cooperação verificável → agentes + intenção;
- agentes + intenção → rede social de intenções;
- rede social de intenções → passado/presente/futuro;
- passado/presente/futuro como etapa anterior que levou ao GRAPH-000.

A classificação não é **PASSA PARCIALMENTE** porque o objeto do teste não era apenas localizar temas compatíveis ou os dois extremos. Era reconstruir **como** ocorreu a evolução. Quatro elos centrais são LACUNAS e o último aparece apenas como composição interna do próprio GRAPH-000, não como transição histórica.

O resultado FALHA não afirma que a trajetória real seja falsa. Afirma que o repositório atual não consegue demonstrá-la sem depender de memória externa ou da síntese que está sendo testada.

## 9. Implicações para o schema

Nenhum objeto, relação ou schema foi alterado nesta execução.

A falha indica requisitos que uma versão futura deverá avaliar:

1. Cada claim histórico precisa apontar para arquivo, seção/ID, versão e classe de proveniência.
2. Datas devem distinguir ocorrência, formulação, recebimento, registro e commit.
3. `proposed_by` deve distinguir autor do claim, autor do documento, editor e committer.
4. Relações como `extends`, `revises`, `supersedes` e `led_to` precisam carregar fonte, autor da relação, confiança e justificativa.
5. `led_to` não pode ser inferida apenas de ordem cronológica ou similaridade temática.
6. O sistema precisa registrar distância entre expressão exata e aproximação semântica sem convertê-las automaticamente em equivalência.
7. Lacunas e evidência negativa precisam ser representáveis sem inventar um evento ausente.
8. Sínteses retrospectivas precisam declarar suas fontes por item para evitar suporte circular.
9. Mudanças de status devem preservar a sequência hipótese → interpretação → decisão ou revisão, quando ela realmente existir.
10. `supersedes` deve exigir evidência explícita; evolução conceitual simples não basta.

Esses pontos são achados do teste, não novos tipos de nó nem alterações aprovadas do schema.
