# GATE-1-RESULT — Fundação habitável

Estado: `PARTIAL / LOCAL IMPLEMENTATION COMPLETE, INTEGRATION EVIDENCE PENDING`

Data: 2026-08-21

Branch: `feat/mvp-001-gate-1`

Base: `cf8dd97847d1bbb64dae1ade436ee5df2f264c1f`

## Resumo

O Gate 1 foi implementado como aplicação local e reproduzível. A camada web,
domínio, exportação, schema, RLS, testes e CI estão versionados.

O resultado ainda não recebe `PASS` porque o executor atual não possui Docker e
o download do Chromium foi bloqueado pelo ambiente. Portanto:

- pgTAP/RLS foi escrito, mas não executado contra PostgreSQL local aqui;
- Playwright foi escrito, mas o navegador não pôde ser instalado aqui;
- criação autenticada persistente não foi demonstrada fim a fim neste executor;
- nenhum preview foi publicado, conforme a autorização humana.

Falha de ambiente não foi convertida em sucesso.

## Evidência produzida

| Verificação | Resultado |
| --- | --- |
| base Git exata | `PASS` |
| branch autorizada | `PASS` |
| lint | `PASS` — zero warnings |
| TypeScript estrito | `PASS` |
| Vitest + Testing Library | `PASS` — 10/10 |
| cobertura | `90.9%` statements; `66.66%` branches; `93.33%` functions; `95.23%` lines |
| contratos estáticos de segurança | `PASS` — 12/12 |
| build Next.js | `PASS` — 9 rotas + proxy |
| smoke HTTP local | `PASS` — landing, projeto, health e exportação |
| exportação `cz.project.v1` | `PASS` — original ≠ interpretação |
| pgTAP PostgreSQL | `NOT RUN` — Docker indisponível |
| Playwright | `NOT RUN` — CDN retornou arquivo de navegador vazio |
| preview externo | `NOT AUTHORIZED / NOT CREATED` |

## Critérios do Gate 1

| Critério | Estado | Evidência ou bloqueio |
| --- | --- | --- |
| aplicação inicia localmente | `PASS` | build + server + smoke HTTP |
| CI usa lockfile e executa checks | `PREPARED` | workflow fixado; aguarda push |
| usuário cria projeto persistente | `PREPARED / NOT DEMONSTRATED` | função, form e pgTAP versionados |
| visitante lê projeto público | `PASS` | seed read-only + smoke HTTP |
| usuário não lê draft alheio | `PREPARED / NOT EXECUTED` | teste pgTAP adversarial |
| Registro Original é imutável | `PREPARED / UNIT PASS` | trigger + schema/export tests |
| estado e evento são atômicos | `PREPARED / STATIC PASS` | função única + contratos |
| exportação JSON e Markdown | `PASS` | unit + HTTP smoke |
| restauração local | `PREPARED / NOT EXECUTED` | migrations + seed + reset CI |
| nenhum segredo versionado | `PASS` | `.env` ignorado; só placeholder público |
| framework corrigido antes de preview | `BLOCKED BY DATE` | Next `16.3.2`; sem preview |
| resultado e limitações preservados | `PASS` | este documento |

## Conteúdo do corte

- landing e navegação responsivas;
- catálogo com três projetos semeados e rotulados;
- página pública com Registro Original, interpretação, responsável, limites e
  timeline;
- exportação JSON e Markdown;
- autenticação local por link;
- convite de piloto;
- formulário autenticado de criação;
- função transacional para estado, intenções, membership e eventos;
- RLS deny-by-default e grants mínimos;
- triggers append-only;
- reconciliador material independente;
- CI web + banco sem deploy.

## Restrições comprovadas

Não foram criados:

- deploy, domínio ou publicação externa;
- projeto Supabase remoto;
- plano pago;
- smart contract ou código Solidity;
- testnet ou wallet;
- integração de pagamento;
- custódia, captação ou movimentação financeira;
- merge.

## Condição para reclassificar como PASS

1. executar `supabase db reset --local` e `supabase test db` com Docker;
2. executar Playwright em Chromium;
3. demonstrar login local, criação e reload do projeto;
4. demonstrar isolamento entre dois usuários;
5. validar o workflow no Draft PR;
6. manter qualquer preview externo bloqueado até patch de framework e nova
   autorização humana.

Até essas evidências existirem:

`IMPLEMENTED ≠ VERIFIED END TO END`
