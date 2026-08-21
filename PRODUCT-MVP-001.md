# PRODUCT-MVP-001 — Solo fértil

Estado: `PROPOSED / PENDING HUMAN REVIEW AND CANONICALIZATION`

Janela: 2026-08-21 a 2026-09-20

Decisão vinculada:
`decisions/D006-mvp-habitavel-30-dias.md`

## Objetivo

Entregar uma aplicação web publicada e semeada que permita criar, explorar e
operar projetos por meio de oportunidades, condições, compromissos,
contribuições, evidências, reviews e resultados.

O MVP deve parecer um lugar onde algo pode acontecer, não uma apresentação
sobre algo que talvez exista no futuro.

## Definição de robustez

Robusto neste MVP significa:

- jornada principal verticalmente completa;
- estados e permissões explícitos;
- dados persistentes;
- interface responsiva e compreensível;
- autenticação mínima;
- conteúdo inicial real ou rotulado;
- exportação e recuperação;
- segurança básica e limites econômicos claros;
- demonstração reproduzível;
- falhas exibidas sem serem convertidas em sucesso.

Não significa segurança financeira de produção, alta disponibilidade, PMF ou
escala global.

## Usuários e atores

| Tipo | Pode fazer no MVP | Limite principal |
| --- | --- | --- |
| Pessoa | criar projeto, propor/aceitar oportunidade, contribuir, revisar, apoiar | autoridade apenas no escopo declarado |
| Agente de IA | declarar capacidade, propor, produzir e revisar com atribuição | exige operador e não é contraparte jurídica presumida |
| Organização | manter perfil e projetos | representação declarada; verificação jurídica fora do MVP |
| Visitante | explorar projetos, oportunidades e trajetórias públicas | sem ação autenticada |

Organização cobre inicialmente coletivo, empresa, startup ou DAO como tipo de
perfil. O MVP não implementa governança societária ou DAO on-chain.

## Papéis

- `PROJECT STEWARD` — responsável operacional pelo projeto;
- `OPPORTUNITY OWNER` — publica condições e decide aceitação;
- `CONTRIBUTOR` — assume e entrega contribuição;
- `REVIEWER` — avalia segundo critérios;
- `AUDITOR` — procura falhas e preserva contraprovas;
- `SUPPORTER` — oferece recurso, patrocínio ou interesse;
- `AGENT OPERATOR` — responde pela autorização atribuída a um agente de IA.

Papéis são contextuais e podem coexistir. Conflitos de interesse devem ser
visíveis quando a mesma parte produz e revisa.

## Objetos mínimos

### 1. Perfil

- identidade pública;
- tipo de ator;
- descrição;
- capacidades declaradas;
- operador, quando agente de IA;
- links e evidências opcionais.

### 2. Projeto

- título e resumo;
- Registro Original da intenção;
- interpretação/current intent aprovado;
- responsável;
- estágio;
- resultado pretendido;
- regras e limites;
- regime econômico;
- visibilidade;
- necessidades atuais;
- timeline.

### 3. Oportunidade

- projeto;
- problema ou necessidade;
- ação esperada;
- capacidade necessária;
- entrega e evidência esperadas;
- prazo;
- critérios de conclusão;
- recompensa ou troca;
- responsável pela aceitação;
- responsável pela revisão;
- estado.

### 4. Proposta e compromisso

- ator proponente;
- capacidade/evidência oferecida;
- disponibilidade;
- condições;
- decisão `ACCEPT / REVISE / REJECT`;
- acordo resultante;
- autoridade e timestamp.

### 5. Contribuição

- referência ao acordo;
- descrição do trabalho;
- artefatos ou links;
- declaração de execução;
- autor/agente;
- limitações conhecidas.

### 6. Evidência

- objeto apoiado;
- tipo;
- fonte/proveniência;
- conteúdo ou referência;
- estado de verificação;
- acesso público ou restrito.

### 7. Review ou auditoria

- objeto revisado;
- critérios;
- achados;
- classificação `PASS / FAIL / PARTIAL / INCONCLUSIVE`;
- conflitos de interesse;
- resposta ou contestação.

### 8. Apoio e interesse de financiamento

- projeto;
- tipo `SPONSORSHIP / BOUNTY / INVESTMENT INTEREST`;
- valor ou recurso indicativo;
- condições;
- estado `DECLARED / DISCUSSING / WITHDRAWN / EXTERNAL AGREEMENT`;
- aviso não vinculante.

### 9. Evento de trajetória

Registro derivado de criação, decisão, mudança de estado, contribuição, review,
contestação e encerramento. A timeline é projeção reconstruível dos objetos e
eventos preservados.

## Estados mínimos

### Projeto

`DRAFT → OPEN → ACTIVE → PAUSED → COMPLETED / ABANDONED`

### Oportunidade

`DRAFT → OPEN → PROPOSED → COMMITTED → SUBMITTED → UNDER REVIEW → ACCEPTED / REJECTED / DISPUTED / CLOSED`

### Evidência

`DOCUMENTED → UNDER REVIEW → PARTIALLY VERIFIED / VERIFIED / CONTESTED / FALSIFIED`

Esses estados não devem ser promovidos automaticamente apenas por atividade.

## Jornadas P0 obrigatórias

### J1 — Explorar

Um visitante vê projetos, oportunidades abertas, responsáveis, estágio e
trajetória sem compreender Git, blockchain ou a arquitetura interna.

### J2 — Criar projeto

Um usuário autenticado registra sua intenção, confirma uma interpretação mínima,
declara limites e publica um projeto.

### J3 — Publicar oportunidade

O responsável transforma uma necessidade em oportunidade com entrega,
condições, critérios e eventual recompensa.

### J4 — Propor e assumir

Uma pessoa ou agente de IA oferece capacidade e condições. O responsável aceita,
revisa ou rejeita. Somente aceitação explícita cria compromisso.

### J5 — Entregar

O colaborador envia contribuição e evidência vinculadas ao compromisso.

### J6 — Revisar ou auditar

Um revisor aplica critérios, registra achados e classifica o resultado. Dissenso
e contestação permanecem visíveis.

### J7 — Acompanhar

A página pública reconstrói a sequência do projeto e distingue proposta,
compromisso, execução, contribuição, evidência, review e decisão.

### J8 — Apoiar

Um interessado declara patrocínio, recurso ou interesse não vinculante de
investimento sem transferir fundos pela plataforma.

### J9 — Reutilizar

Um usuário copia um template de projeto ou oportunidade sem herdar participantes,
autoridade, reputação ou direitos econômicos.

## Financiamento no MVP

### Permitido

- declarar necessidade e meta de financiamento;
- publicar marcos e uso pretendido;
- registrar bounty pago externamente;
- registrar patrocínio;
- declarar interesse não vinculante;
- apontar para acordo externo;
- acompanhar resultados e prestação de contas declarada.

### Proibido

- custodiar dinheiro ou criptoativos;
- processar investimento;
- oferecer valor mobiliário;
- prometer retorno;
- representar interesse como compromisso vinculante;
- distribuir equity, token ou receita automaticamente;
- afirmar conformidade jurídica não verificada.

O status de recompensa externa deve distinguir:

`DECLARED / EXTERNALLY PAID / CONFIRMED BY RECIPIENT / DISPUTED / NOT VERIFIED`

## Demonstração de smart contract em testnet

A demonstração será um artefato separado e opcional no MVP.

Propriedade candidata:

> ativos sintéticos são depositados em escrow e liberados ou devolvidos segundo
> um marco explicitamente aprovado.

Requisitos:

- testnet;
- ativos sem valor;
- nenhum dado pessoal;
- nenhum token próprio;
- nenhum caminho de captação;
- contrato reutilizado ou extensão mínima de componente existente;
- código e endereço publicados;
- roteiro de reprodução;
- threat model mínimo;
- aviso de não produção;
- resultado classificado separadamente.

Escolha de rede, wallet e biblioteca permanece pendente de decisão técnica. O
usuário ordinário não precisará de wallet para usar o fluxo principal.

## Experiência e superfícies

P0:

1. landing page;
2. explorar projetos;
3. página de projeto;
4. página/lista de oportunidades;
5. criação/edição de projeto;
6. criação de oportunidade;
7. proposta/compromisso;
8. envio de contribuição/evidência;
9. review/auditoria;
10. timeline pública;
11. sala de financiamento;
12. perfil;
13. área administrativa mínima.

Não P0:

- chat em tempo real;
- feed algorítmico;
- mensagens privadas completas;
- matching automático sofisticado;
- reputação numérica;
- pagamentos internos;
- votação on-chain;
- agentes autônomos com wallets;
- marketplace financeiro;
- aplicativo móvel nativo.

## Conteúdo inicial obrigatório

Antes de abertura pública, o ambiente deverá conter no mínimo:

- 3 projetos semeados;
- 10 oportunidades distribuídas entre pesquisa, documentação, design, teste,
  desenvolvimento, tradução ou auditoria;
- contribuições atribuídas corretamente a Marcos e/ou agentes de IA;
- 1 resultado `FAIL` preservado;
- 1 oportunidade com bounty externo claramente condicionado;
- 1 sala de financiamento demonstrativa;
- templates de projeto e oportunidade;
- 1 demonstração testnet documentada.

Dados sintéticos devem estar marcados como `DEMO / SYNTHETIC`. Não criar perfis
humanos fictícios apresentados como reais.

## Segurança, privacidade e resiliência

P0 exige:

- autenticação segura por provedor existente;
- autorização server-side;
- validação de entrada;
- proteção contra abuso básico e rate limiting;
- segredos fora do repositório e do cliente;
- logs operacionais sem conteúdo sensível desnecessário;
- exportação de dados essenciais;
- backup e restauração documentados;
- visibilidade pública/restrita explícita;
- exclusão/correção compatível com LGPD para dados pessoais;
- nenhum dado sensível on-chain;
- nenhum SaaS como única cópia dos registros essenciais.

O repositório canônico não deve conter dados pessoais de participantes do piloto.

## Arquitetura

A especificação de produto não escolhe a stack.

A decisão técnica deverá priorizar:

- entrega em 30 dias;
- portabilidade;
- exportação;
- componentes existentes;
- baixo custo;
- segurança administrável por equipe pequena;
- possibilidade de migração;
- separação entre interface, domínio e provedores.

Antes de criar componente próprio, classificar `ADOPT / MAP / EXTEND / MISSING`.

## Critérios de aceitação

### AC-01 — Compreensão

Um visitante consegue explicar em uma frase o que pode fazer no ambiente.

### AC-02 — Projeto completo

É possível criar e publicar um projeto com intenção, responsável, estágio,
necessidades e regime econômico.

### AC-03 — Oportunidade completa

É possível publicar oportunidade com entrega, condições, prazo, critérios e
recompensa/troca.

### AC-04 — Compromisso explícito

Proposta não vira compromisso sem aceitação registrada.

### AC-05 — Contribuição e evidência

Uma contribuição pode ser vinculada ao acordo e conter evidência separada.

### AC-06 — Review contextual

Review pode retornar `PASS`, `FAIL`, `PARTIAL` ou `INCONCLUSIVE`, com achados e
contestação.

### AC-07 — Trajetória

Página pública permite reconstruir os principais eventos sem mostrar
infraestrutura interna.

### AC-08 — Financiamento seguro

Interesse ou bounty não movimenta fundos e exibe limites não custodiais.

### AC-09 — Agente atribuível

Contribuição de IA identifica agente, operador e autoridade.

### AC-10 — Portabilidade

Projeto pode ser exportado em formato aberto legível por máquina e por humano.

### AC-11 — Demonstração testnet

Escrow sintético é reproduzível e não é confundido com investimento real.

### AC-12 — Solo fértil

O ambiente abre com o conteúdo inicial obrigatório e sem falsificar adoção.

## Métricas iniciais

- projetos publicados;
- oportunidades publicadas;
- propostas recebidas;
- compromissos aceitos;
- contribuições submetidas;
- reviews concluídos;
- tempo de `OPEN` a `SUBMITTED`;
- ciclos que chegam a resultado;
- projetos ou templates reutilizados;
- participantes que retornam;
- valor declarado e confirmado de recompensas externas.

Cadastros isolados não são métrica principal.

## Definition of done

`PRODUCT-MVP-001` está entregue somente quando:

1. aplicação está publicada em URL acessível;
2. jornadas J1–J9 estão demonstráveis;
3. critérios AC-01–AC-12 possuem evidência;
4. conteúdo inicial está presente e rotulado;
5. exportação e restauração foram testadas;
6. ameaças e limitações estão documentadas;
7. demonstração testnet está separada e reproduzível;
8. não houve captação ou custódia real;
9. estado final é classificado `PASS / FAIL / PARTIAL / INCONCLUSIVE`;
10. uma decisão humana encerra ou continua o ciclo.

## Autoridade e próximo gate

Este documento autoriza revisão de produto, não implementação.

Após canonicalização, a engenharia deverá receber autorização explícita e uma
especificação técnica derivada. Mudança de escopo P0 exige `PRODUCT CHANGE
PROPOSAL` e decisão humana.
