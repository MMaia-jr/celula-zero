# GATE-1-RESULT — Fundação habitável

Estado: `PARTIAL / CI INTEGRATION VERIFIED, INTERACTIVE PERSISTENCE AND PREVIEW PENDING`

Data: 2026-08-21

Branch: `feat/mvp-001-gate-1`

Base: `cf8dd97847d1bbb64dae1ade436ee5df2f264c1f`

Head técnico verificado: `bc22e91215b1aa3d16293a30ace491faf4570cd2`

CI verificado: `Gate 1 CI / run 32535685337 / SUCCESS`

## Resumo

O Gate 1 foi implementado como aplicação local e reproduzível. A camada web,
domínio, exportação, schema, RLS, testes e CI estão versionados.

O GitHub Actions executou com sucesso a integração que não estava disponível no
executor autoral:

- PostgreSQL isolado iniciou e foi restaurado integralmente por migrations e seed;
- pgTAP executou 23/23 verificações de persistência, autorização, RLS,
  append-only, reconciliação e rollback;
- Playwright executou 6/6 jornadas públicas em Chromium desktop e mobile;
- lint, TypeScript, 10 testes unitários/componentes, 12 contratos estáticos e
  build de produção passaram no mesmo commit.

O resultado permanece `PARTIAL`, e não `PASS`, porque o Gate definido em
`ROADMAP-30D.md` também exige preview reproduzível e uma jornada autenticada
completa pela aplicação. Publicação externa não foi autorizada, e o CI atual
exercita a criação autenticada diretamente no banco, não login, formulário e
reload no navegador.

Ausência de autorização ou de evidência não foi convertida em sucesso.

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
| GitHub Actions | `PASS` — run `32535685337`, head exato `bc22e912...` |
| reset PostgreSQL | `PASS` — migrations + seed em stack isolado |
| pgTAP PostgreSQL | `PASS` — 23/23 |
| Playwright | `PASS` — 6/6, Chromium desktop e mobile |
| jornada autenticada via navegador | `NOT DEMONSTRATED` |
| preview externo | `NOT AUTHORIZED / NOT CREATED` |

## Critérios do Gate 1

| Critério | Estado | Evidência ou bloqueio |
| --- | --- | --- |
| aplicação inicia localmente | `PASS` | build + server + smoke HTTP |
| CI usa lockfile e executa checks | `PASS` | run `32535685337` |
| usuário cria projeto persistente | `PARTIAL` | criação autenticada e persistência `PASS` no pgTAP; UI não demonstrada |
| visitante lê projeto público | `PASS` | Playwright desktop/mobile + seed read-only |
| usuário não lê draft alheio | `PASS` | pgTAP adversarial entre pilotos A e B |
| Registro Original é imutável | `PASS` | trigger + pgTAP + schema/export tests |
| estado e evento são atômicos | `PASS` | função única + pgTAP + contratos |
| exportação JSON e Markdown | `PASS` | unit + HTTP smoke |
| restauração local | `PASS` | migrations + seed + reset no CI |
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

1. aplicar o patch de segurança do framework quando disponível e repetir os
   checks;
2. demonstrar login por link, convite, criação pelo formulário e reload do
   projeto contra a stack isolada;
3. obter autorização humana específica antes de qualquer preview externo;
4. somente após essa autorização, criar o preview reproduzível exigido pelo
   `ROADMAP-30D.md`, sem segredo no cliente;
5. repetir o CI no commit exato e preservar a evidência.

Até essas evidências existirem:

`CI INTEGRATION VERIFIED ≠ GATE PASS`
