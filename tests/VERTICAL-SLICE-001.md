# VERTICAL-SLICE-001 — preregistração de fluxo composto

Data de preregistração: 2026-08-16

Classe:
Experimento preregistrado — execução ainda não realizada.

Base canônica no momento da preregistração:

`507986acd68130543ddbdbbd71d09e13b335d5ed`

## 1. Objeto

Testar um fluxo vertical mínimo da Célula Zero usando, de forma deliberadamente
manual e sem nova integração customizada:

- Git/GitHub como memória canônica e registro de mudanças;
- Huly como workspace/projeção operacional para o humano;
- o modelo de dados A2A como envelope estruturado de handoff entre Working Cells;
- agentes externos de IA como participantes especializados;
- Marcos Antonio Maia junior como originador/autoridade da Intent e mediador
  humano entre interfaces que ainda não interoperam diretamente.

O experimento NÃO adota essa composição como arquitetura final.

## 2. Contexto pré-execução

Evidência canônica já existente antes deste teste:

### Git/GitHub

O repositório `MMaia-jr/celula-zero` é a fonte canônica atual e preserva
preregistrações, resultados, deltas, Original Records e decisões através de
histórico Git e Pull Requests.

O GTEST-001 já demonstrou que memória preservada não implica, por si só,
reconstrução suficiente de contexto.

### Huly

`TECH-SPIKE-HULY-001` está preservado como:

`EXECUTED / PASS`

com 15/15 comportamentos mínimos reportados/observados durante a execução,
preservação incompleta da evidência bruta e sem escolha arquitetural.

O spike demonstrou representação mínima de Intent, Contribution, originator,
estado, evidenceReference, result e Activity/History.

### A2A

`A2A-LAB-002` está preservado como:

`EXECUTED / PARTIAL`

O laboratório demonstrou transporte/representação de Task, Messages, Artifacts
e lifecycle em configurações específicas, além de fluxo experimental OID4VP e
interoperabilidade básica Python ↔ JavaScript.

Também preservou a lacuna observada: compromisso, critérios, verificação do
resultado e decisão normativa receberam significado da aplicação, não de
semântica core ou extensão identificada no universo inspecionado.

### Agentes

Agentes externos candidatos ao fluxo:

- GPT;
- Claude;
- Kimi;
- DeepSeek.

Esses agentes não são presumidos como endpoints A2A diretamente interoperáveis
em suas interfaces de chat atuais.

## 3. Pergunta decisória

Uma única Intent consegue avançar por múltiplas Working Cells usando
Git/GitHub + Huly + um handoff estruturado segundo A2A, preservando intenção,
decisões, proveniência e limites de autoridade, sem exigir nova integração
customizada e sem obrigar Marcos a reconstruir repetidamente o contexto já
registrado?

## 4. Hipótese

H1:

A composição mínima consegue sustentar um ciclo real de trabalho
multidisciplinar em que cada Working Cell recebe contexto suficiente, produz um
artefato rastreável e transfere o estado relevante à etapa seguinte, enquanto
GitHub permanece canônico e Huly/A2A permanecem camadas substituíveis.

## 5. Hipótese rival

H0:

A composição acrescenta overhead, duplicação e mediação humana sem preservar
contexto melhor do que um fluxo simples; Marcos continua funcionando como banco
de dados e roteador principal, e Huly/A2A não adicionam propriedade operacional
suficiente para justificar sua presença.

## 6. Intent usada no teste

A execução deverá congelar uma referência canônica para a Intent do teste antes
do primeiro handoff.

Objeto de trabalho provisório:

**Projetar a primeira experiência de um usuário que chega com um sonho e precisa
transformá-lo em uma Intent operacional.**

O objetivo do experimento NÃO é construir o APP completo.

Entrega mínima esperada:

`DREAM → INTENT CREATION → QUESTIONS/CONSTRAINTS → INTENT RECORD → FIRST NEXT ACTION`

A formulação final da Intent usada na execução deverá ser registrada antes da
primeira Working Cell e não poderá ser alterada silenciosamente.

## 7. Working Cells

### CELL-PRODUCT-001

Humano:
Marcos Antonio Maia junior

Papel operacional:
Product / Founder

IA:
GPT

Responsabilidade:

- definir problema e usuário;
- explicitar comportamento desejado;
- formular requisitos mínimos;
- registrar constraints;
- definir critérios da entrega.

Não possui autoridade para transformar hipótese em decisão arquitetural final.

### CELL-DESIGN-001

Humano:
Marcos Antonio Maia junior

Papel operacional:
Design

IA:
Claude

Recebe somente o contexto necessário para Design, incluindo a Intent e decisões
Product vigentes.

Responsabilidade:

- jornada;
- sequência de interação;
- informações solicitadas ao usuário;
- pontos de fricção;
- decisões UX justificadas.

Não pode alterar silenciosamente requisitos Product nem a Intent.

### CELL-ENGINEERING-001

Humano:
Marcos Antonio Maia junior

Papel operacional:
Software Engineering

IA:
Kimi

Recebe a Intent, requisitos aprovados, fluxo Design e constraints técnicas
relevantes.

Responsabilidade:

- representação técnica mínima;
- alternativa de protótipo mais barata;
- classificação ADOPT / MAP / EXTEND / MISSING quando aplicável;
- riscos técnicos;
- explicitação do que não precisa ser construído.

Assumir o papel Software Engineering não constitui claim de competência
profissional de Marcos.

### AUDIT-001

Agente:
DeepSeek

Função:
auditor adversarial externo ao fluxo principal.

Procura:

- mudança silenciosa de Intent;
- perda de decisão;
- contradição;
- claim não sustentado;
- complexidade prematura;
- autoridade indevida;
- gap de handoff;
- confusão entre registro, evidência, verificação e decisão.

DeepSeek não decide por votação e não possui autoridade final.

### DECISION-001

Autoridade:
Marcos Antonio Maia junior.

A decisão humana final deverá ser registrada separadamente das recomendações dos
agentes.

## 8. Papel das três infraestruturas

### Git/GitHub — canônico

Deve preservar:

- Intent congelada;
- Context Packets ou referências suficientes para reconstruí-los;
- outputs relevantes de cada Working Cell;
- auditoria;
- decisão final;
- resultado do experimento;
- mudanças de estado.

Nenhuma outra camada pode silenciosamente substituir o GitHub como fonte
canônica durante este teste.

### Huly — projeção operacional

Huly poderá representar manualmente:

- Intent;
- Working Cells;
- Contributions;
- estado;
- referências para artifacts/decisões canônicas.

Huly NÃO é canônico neste teste.

Informação existente somente em Huly e ausente do registro canônico será tratada
como falha de preservação se for necessária para reconstruir uma decisão ou
handoff material.

### A2A — envelope de handoff

Como as interfaces atuais de GPT/Claude/Kimi/DeepSeek não são presumidas como
endpoints A2A interoperáveis, Marcos poderá mediar fisicamente o transporte.

Cada handoff deverá, porém, ser representado de forma compatível com os
mecanismos core já observados no A2A-LAB-002 sempre que aplicável, usando
conceitos como:

- Message;
- Task;
- context/task identifiers quando disponíveis;
- structured data/Parts;
- Artifact;
- metadata de aplicação explicitamente marcada como aplicação.

A mediação humana entre interfaces NÃO será descrita como interoperabilidade
A2A direta entre os modelos.

Este teste não exige criar uma nova extensão A2A.

Se uma propriedade necessária ao handoff não puder ser preservada sem nova
semântica, ela deverá ser registrada como gap; não deverá ser inventada
retroativamente como capacidade core do A2A.

## 9. Context Packet mínimo

Cada Working Cell deverá receber um pacote orientado à sua função contendo, no
mínimo quando relevante:

- TASK / objetivo imediato;
- referência da INTENT;
- CURRENT STATE;
- DECISIONS IN FORCE;
- CONSTRAINTS;
- AUTHORITY / limites de decisão;
- RELEVANT EVIDENCE;
- ORIGINAL RECORD REFERENCES;
- OPEN QUESTIONS;
- EXPECTED OUTPUT;
- PROHIBITED INFERENCES.

Informação não necessária à função deve ser evitada quando possível.

## 10. Fluxo preregistrado

1. congelar a Intent canônica do teste;
2. gerar Context Packet Product;
3. executar CELL-PRODUCT-001;
4. preservar output e decisões Product;
5. projetar estado relevante no Huly;
6. gerar handoff estruturado para Design;
7. executar CELL-DESIGN-001;
8. preservar output e decisões Design;
9. projetar estado relevante no Huly;
10. gerar handoff estruturado para Engineering;
11. executar CELL-ENGINEERING-001;
12. preservar output Engineering;
13. executar AUDIT-001;
14. Marcos realiza DECISION-001;
15. registrar novo estado canônico;
16. produzir RESULT de VERTICAL-SLICE-001.

Nenhuma etapa autoriza implementação do APP.

## 11. Métricas

### M1 — Integridade da Intent

Número de alterações materiais da Intent sem decisão explícita de Marcos.

Objetivo:
`0`

### M2 — Preservação de decisões

Número de decisões vigentes contraditas por uma Working Cell sem que a
contradição seja apresentada como proposta explícita de revisão.

Objetivo:
`0`

### M3 — Reconstrução manual de contexto

Contar cada ocasião em que Marcos precise reexplicar um fato material que:

1. já estava disponível no estado canônico; e
2. deveria ter sido transportado pelo Context Packet relevante.

Intervenções para decidir, esclarecer preferência nova ou fornecer informação
que nunca foi registrada não contam como reconstrução.

### M4 — Handoff rastreável

Para cada Working Cell, deve ser possível identificar:

- input;
- versão/referência da Intent;
- decisões vigentes relevantes;
- output;
- ator/agente;
- próximo consumidor.

### M5 — Proveniência da decisão final

Deve ser possível reconstruir:

`Intent → Product → Design → Engineering → Audit → decisão humana`

sem atribuir ao agente uma decisão humana ou converter interpretação em Original
Record.

### M6 — Overhead

Registrar qualitativamente:

- número de handoffs;
- duplicação relevante;
- trabalho manual de transporte;
- necessidade de copiar a mesma informação;
- fricção causada por GitHub, Huly ou A2A.

### M7 — Necessidade de extensão

Registrar qualquer propriedade concreta que não possa ser preservada com a
stack e o método atuais.

Classificar cada necessidade como:

- ADOPT;
- MAP;
- EXTEND;
- MISSING.

EXTEND ou MISSING devem indicar qual propriedade concreta seria perdida sem a
extensão.

## 12. Erro material

É material qualquer ocorrência que:

- altere a Intent sem autorização;
- viole constraint explícita;
- transforme hipótese em decisão;
- transforme Artifact em evidência validada automaticamente;
- transforme `COMPLETED` em `ACCEPTED`;
- confunda autorização com verificação de resultado;
- atribua autoridade ao agente incorreto;
- perca decisão crítica;
- faça a próxima Working Cell operar sobre premissa material falsa.

Erro de estilo ou preferência não conta como erro material.

## 13. Classificação

### PASS

Todos os seguintes critérios devem ser satisfeitos:

1. o fluxo Product → Design → Engineering → Audit → Decision é concluído;
2. zero erro material;
3. zero mudança silenciosa da Intent;
4. todos os handoffs materiais são rastreáveis;
5. a decisão final pode ser reconstruída a partir do registro canônico;
6. Marcos precisa reconstruir manualmente no máximo dois fatos materiais já
   existentes que deveriam ter sido transportados;
7. GitHub permanece canônico;
8. Huly permanece projeção substituível;
9. o handoff A2A não é confundido com semântica de compromisso/verificação que
   não foi demonstrada;
10. nenhuma nova integração customizada, serviço, banco, protocolo ou extensão
    é necessária para concluir o fluxo.

PASS demonstra apenas a viabilidade desta composição manual em uma execução.

### PARTIAL

O fluxo é concluído, mas ocorre pelo menos uma das condições:

- mais de duas reconstruções manuais de fatos materiais;
- Huly ou A2A exigem mapeamento/adaptação relevante não prevista;
- a proveniência é preservada apenas com trabalho manual alto;
- parte do handoff depende de metadata/application semantics significativa;
- uma propriedade necessária aparece como EXTEND/MISSING, mas o fluxo ainda
  consegue terminar sem falsificar a semântica;
- uma etapa depende excessivamente de Marcos como roteador.

### FAIL

Qualquer uma das condições:

- erro material não corrigível sem invalidar a execução;
- perda de Intent ou decisão crítica;
- impossibilidade de reconstruir a decisão final a partir do canônico;
- necessidade de tornar Huly fonte canônica para o fluxo funcionar;
- necessidade de atribuir ao A2A semântica que ele não demonstrou;
- necessidade de nova infraestrutura material apenas para completar este slice;
- a coordenação adicionada impede a conclusão da entrega mínima.

### INCONCLUSIVO

Problema externo impede avaliar a hipótese, por exemplo:

- Huly local indisponível por problema ambiental não relacionado ao modelo;
- ambiente A2A indisponível quando sua execução for necessária para uma
  observação específica;
- interface de agente externa indisponível;
- perda/corrupção de arquivo ou acesso que impeça distinguir falha do método de
  falha operacional.

## 14. Falsificador central

A composição deve ser rejeitada como justificativa arquitetural se o fluxo
mostrar que:

**Git + Huly + A2A adicionam principalmente overhead e Marcos continua tendo que
reconstruir e transportar manualmente o significado essencial entre agentes.**

Mesmo um PASS não demonstrará superioridade sobre um fluxo mais simples.

Essa comparação exige teste posterior ou baseline separado.

## 15. Fora do escopo

Não testar nem construir nesta execução:

- APP completo;
- sincronização automática Huly ↔ GitHub;
- adapter direto Claude/Kimi/GPT ↔ A2A;
- protocolo novo;
- extensão A2A nova;
- blockchain;
- token;
- DAO;
- reputação;
- mecanismo econômico;
- produção;
- segurança abrangente;
- escalabilidade;
- utilidade externa;
- replicabilidade entre humanos;
- product-market fit.

## 16. Regras epistemológicas

Preservar:

Original Record ≠ Interpretation ≠ Claim ≠ Evidence ≠ Verification ≠ Decision.

Não transformar:

- Task em commitment;
- Artifact em evidência validada;
- `COMPLETED` em resultado aceito;
- autorização em verificação;
- consenso entre agentes em decisão;
- papel operacional em competência demonstrada;
- Huly em fonte canônica por conveniência;
- PASS em adoção arquitetural.

Toda mudança de critério após o início da execução invalida a preregistração
para aquela mudança e deverá ser registrada como desvio.

## 17. Autorização de execução

Esta preregistração NÃO autoriza:

- execução do experimento;
- modificação dos clones Huly/A2A;
- nova feature;
- nova integração;
- commit em repos upstream;
- push em repos upstream;
- adoção de arquitetura.

Após a preregistração estar canônica, a execução requer decisão humana
explícita separada.

## 18. Estado

VERTICAL-SLICE-001:

PREREGISTRADO / NÃO EXECUTADO.

RESULTADO:

AINDA NÃO EXISTE.

END OF VERTICAL-SLICE-001 PREREGISTRATION
