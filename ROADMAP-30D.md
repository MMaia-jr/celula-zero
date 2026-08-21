# ROADMAP-30D — MVP habitável da Célula Zero

Estado: `PROPOSED / PENDING HUMAN REVIEW AND CANONICALIZATION`

Janela: 2026-08-21 a 2026-09-20

Objetivo vinculado:
`PRODUCT-MVP-001.md`

## Regra de execução

O horizonte de 30 dias busca um produto verticalmente completo. Não autoriza
somar funcionalidades sem retirar outra de prioridade equivalente.

Ordem de prioridade:

1. jornada P0 completa;
2. segurança, persistência e exportação;
3. conteúdo inicial;
4. demonstração testnet separada;
5. refinamentos.

## Gate 0 — Pacote canônico e autorização

Condição para iniciar código:

- `D006`, `PRODUCT-VISION`, `PRODUCT-MVP-001`, `ROADMAP-30D` e `STATE` revisados
  e merged;
- workspace e repositório de implementação declarados;
- branch declarada;
- arquivos/áreas permitidos e proibidos;
- operações Git autorizadas;
- stack e threat model mínimos aprovados;
- definition of done da primeira fase.

Sem Gate 0:

`PREPARED ≠ EXECUTED`

## Semana 1 — Fundação habitável

Datas-alvo: 2026-08-21 a 2026-08-27

### Produto e experiência

- mapa das superfícies P0;
- wireflow responsivo;
- modelo de papéis e permissões;
- microcopy de financiamento não custodial;
- seed plan dos três projetos.

### Engenharia

- arquitetura `ADOPT / MAP / EXTEND / MISSING`;
- aplicação publicada em ambiente de preview;
- autenticação;
- persistência;
- modelo inicial de Perfil, Projeto e Oportunidade;
- configuração segura de segredos;
- migração e exportação básicas.

### Gate 1

PASS somente se:

- usuário autenticado cria projeto persistente;
- visitante abre página pública do projeto;
- repositório e preview estão reproduzíveis;
- nenhum segredo está no cliente ou Git.

Evidência:

- URL de preview;
- commit;
- captura ou roteiro reproduzível;
- teste de criação e leitura.

## Semana 2 — Mercado de colaboração

Datas-alvo: 2026-08-28 a 2026-09-03

### Entregas

- oportunidades;
- propostas;
- decisão `ACCEPT / REVISE / REJECT`;
- compromissos;
- perfis de agentes de IA com operador;
- capacidades declaradas;
- filtros simples de projetos e oportunidades;
- templates copiáveis.

### Gate 2

PASS somente se:

- projeto publica oportunidade completa;
- outro perfil ou agente propõe contribuição;
- responsável aceita sob condições explícitas;
- estados permanecem distintos e reconstruíveis;
- copiar template não copia autoridade ou direitos econômicos.

Evidência:

- teste de fluxo feliz;
- teste de rejeição/revisão;
- teste de autorização;
- exportação do acordo.

## Semana 3 — Evidência, auditoria e trajetória

Datas-alvo: 2026-09-04 a 2026-09-10

### Entregas

- envio de contribuição;
- evidência separada;
- review e auditoria;
- `PASS / FAIL / PARTIAL / INCONCLUSIVE`;
- contestação;
- conflito de interesse visível;
- timeline pública;
- exportação humana e estruturada;
- administração e moderação mínimas.

### Gate 3

PASS somente se:

- execução não cria resultado ou evidência automaticamente;
- review `FAIL` permanece visível;
- contestação não apaga review anterior;
- timeline reconstrói o ciclo;
- projeto exportado pode ser lido fora da aplicação.

Evidência:

- casos de teste positivos e adversariais;
- exemplo com `FAIL`;
- pacote exportado;
- restauração em ambiente limpo ou procedimento verificado.

## Semana 4 — Financiamento, testnet e abertura

Datas-alvo: 2026-09-11 a 2026-09-20

### Sala de financiamento

- meta e uso pretendido;
- marcos;
- patrocínio;
- bounty externo;
- interesse não vinculante;
- avisos e estados;
- nenhuma custódia.

### Smart contract demonstrativo

- rede/testnet escolhida por decisão técnica;
- componente existente avaliado;
- escrow sintético por marco;
- liberação e reembolso demonstrados;
- código/endereço/roteiro;
- threat model;
- classificação separada.

### Solo fértil

- três projetos semeados;
- dez oportunidades;
- contribuições atribuídas;
- auditoria `FAIL`;
- bounty externo condicionado;
- sala de financiamento demonstrativa;
- templates;
- onboarding e documentação.

### Hardening

- revisão de autorização;
- validação de entrada;
- rate limiting;
- privacidade;
- acessibilidade básica;
- responsividade;
- backup/restore;
- observabilidade;
- limites e avisos.

### Gate 4 — Definition of done

Aplicar integralmente a Definition of Done de `PRODUCT-MVP-001`.

O resultado deve ser classificado mesmo se o prazo terminar:

- `PASS` — todos os critérios obrigatórios demonstrados;
- `PARTIAL` — produto utilizável, mas critérios P0 faltantes;
- `FAIL` — ciclo central não pode ser completado ou limite crítico violado;
- `INCONCLUSIVE` — método ou ambiente impede avaliação válida.

## Trabalho humano e de agentes

### Marcos

- decisões de produto e risco;
- revisão da experiência;
- escolha do conteúdo semeado;
- limites econômicos;
- autorização de publicação;
- relações humanas e feedback.

### ChatGPT

- coordenação;
- working spec;
- pesquisa;
- critérios e testes;
- coerência entre produto e evidência;
- preparação de trabalho executável;
- revisão de escopo.

### Codex

- implementação no workspace autorizado;
- testes;
- commits e PRs autorizados;
- documentação técnica;
- correções dentro do escopo.

### Outros agentes

- crítica de UX;
- auditoria adversarial;
- segurança;
- replicação;
- produção de seed content com atribuição.

Nenhuma votação entre IAs substitui decisão humana.

## Disciplina de capacidade

Distribuição de esforço recomendada:

- 60% — produto utilizável;
- 25% — conteúdo, projetos e abertura;
- 15% — protocolo, segurança e demonstração testnet.

Se houver atraso:

- não cortar segurança, persistência ou exportação;
- simplificar visual e automações;
- reduzir tipos de filtro;
- manter smart contract como demonstração separada;
- não criar token, chat, feed ou pagamentos internos.

## Ritmo de trabalho

### Diário

- objetivo observável;
- menor implementação;
- teste;
- resultado;
- bloqueio;
- próximo movimento.

### Semanal

- demonstração do gate;
- classificação;
- decisão humana;
- ajuste de escopo explícito;
- atualização curta de `STATE.md` quando canonicalizada.

## Riscos principais

| Risco | Salvaguarda |
| --- | --- |
| construir muitas superfícies sem ciclo completo | vertical slice antes de refinamento |
| marketplace vazio | seed content obrigatório |
| promessa de renda | recompensa condicionada, sem garantia |
| captação irregular | nenhum investimento real; parceiro regulado futuro |
| smart contract consumir o mês | demo separada, testnet e componente existente |
| IA agir sem responsável | operador e autoridade declarados |
| atividade virar reputação | evidência e review contextual |
| SaaS virar única memória | exportação, backup e formatos abertos |
| founder bottleneck | templates, estados e handoffs reconstruíveis |

## Fora do horizonte

- captação pública real;
- custódia;
- token;
- NFT;
- DAO operacional da Célula Zero;
- chain própria;
- staking financeiro;
- score universal;
- marketplace aberto sem moderação;
- agentes com autoridade financeira autônoma;
- escala global.

## Encerramento do ciclo

Em 2026-09-20, o trabalho não será prorrogado silenciosamente. O estado será
registrado com evidências, falhas, limitações e decisão humana sobre continuação.
