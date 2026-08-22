# GATE-1-RESULT — Fundação habitável

Estado: `PARTIAL / AUTHENTICATED LOCAL CI VERIFIED, EXTERNAL PREVIEW PENDING`

Data: 2026-08-21

Branch: `feat/mvp-001-gate-1`

Base: `cf8dd97847d1bbb64dae1ade436ee5df2f264c1f`

Head técnico integrado: `5767f4fc95b19d44e0851bd0c50939bebbccd155`

CI verificado: `Gate 1 CI / SUCCESS no head técnico exato; execução preservada nos checks do PR #63`

## Resumo

O Gate 1 foi implementado como aplicação local e reproduzível. A camada web,
domínio, exportação, schema, RLS, testes e CI estão versionados.

O GitHub Actions verificou no mesmo head técnico:

- restauração integral de PostgreSQL por migrations e seed;
- 25/25 verificações pgTAP de persistência, autorização, RLS, append-only,
  reconciliação e rollback;
- 6/6 jornadas públicas em Chromium desktop e mobile;
- uma jornada autenticada completa: convite, link mágico, callback PKCE,
  formulário, criação transacional, reload e leitura pública anônima;
- lint, TypeScript, 14 testes unitários/componentes, 20 contratos estáticos e
  build de produção.

O resultado permanece `PARTIAL`, e não `PASS`, porque `ROADMAP-30D.md` também
exige preview reproduzível e sua URL como evidência. Publicação externa não foi
autorizada. A jornada autenticada usa apenas Supabase, Mailpit e Chromium
locais, sem provedor remoto.

## Falhas preservadas e correções

O run `32539427571` revelou que a política de leitura de `actors` consultava
`actor_memberships` sob o papel anônimo. A consulta foi encapsulada em função
privada `SECURITY DEFINER`, sem conceder leitura pública à tabela de memberships.

O run `32540459721` revelou exports síncronos em módulos `"use server"`. Os
estados iniciais foram movidos para módulos neutros e um contrato impede a
regressão.

O run `32541126063` chegou ao callback, mas não renderizou o formulário
autenticado. A resposta de callback passou a receber diretamente os cookies da
sessão e o CI começou a preservar trace, screenshot e relatório HTML.

O run `32542033513` produziu a contraprova decisiva: o callback recebeu os
verificadores em `127.0.0.1`, mas redirecionou para `localhost`, perdendo o
escopo dos cookies. A correção final:

- deriva a origem do `NEXT_PUBLIC_SITE_URL` configurado;
- aceita somente caminhos internos como destino;
- inicializa explicitamente o cliente SSR antes da troca PKCE;
- verifica se a resposta contém cookie de sessão e repete a persistência via
  API pública `setSession` se necessário;
- exige no Playwright o host exato e a presença real do cookie de sessão.

O run `32545165654` confirmou que login, sessão, criação e navegação até o novo
projeto já funcionavam. A falha restante estava no próprio teste: a expressão
de URL aceitava a rota reservada `/projects/new` e capturava esse endereço
antes da navegação terminar. O matcher passou a excluir `new` explicitamente e
a aguardar a rota persistente do projeto criado.

Este registro só pode ser publicado depois que o publicador observar CI verde
no head técnico exato. Ausência de autorização ou evidência não é sucesso.

## Evidência produzida

| Verificação | Resultado |
| --- | --- |
| base Git exata | `PASS` |
| branch autorizada | `PASS` |
| lint | `PASS` — zero warnings |
| TypeScript estrito | `PASS` |
| Vitest + Testing Library | `PASS` — 14/14 |
| cobertura | `90.9%` statements; `66.66%` branches; `93.33%` functions; `95.23%` lines |
| contratos estáticos de segurança | `PASS` — 20/20 |
| build Next.js | `PASS` — 9 rotas + proxy |
| smoke HTTP local | `PASS` — landing, projeto, health e exportação |
| exportação `cz.project.v1` | `PASS` — original ≠ interpretação |
| GitHub Actions | `PASS` — head técnico exato `5767f4fc...`; check preservado no PR #63 |
| reset PostgreSQL | `PASS` — migrations + seed em stack isolada |
| pgTAP PostgreSQL | `PASS` — 25/25 |
| Playwright público | `PASS` — 6/6, Chromium desktop e mobile |
| jornada autenticada via navegador | `PASS` — 1/1 em Chromium contra stack local isolada |
| origem do callback | `PASS` — host configurado preservado até o formulário |
| sessão no callback | `PASS` — cookie não-verificador exigido pelo teste |
| persistência após reload | `PASS` — mesma URL e Registro Original |
| leitura pública pós-criação | `PASS` — novo contexto anônimo |
| evidência adversarial | `PASS` — traces dos runs falhos preservaram as causas |
| preview externo | `NOT AUTHORIZED / NOT CREATED` |

## Critérios do Gate 1

| Critério | Estado | Evidência ou bloqueio |
| --- | --- | --- |
| aplicação inicia localmente | `PASS` | build + server + smoke HTTP |
| CI usa lockfile e executa checks | `PASS` | CI no head técnico exato |
| usuário cria projeto persistente | `PASS` | link mágico, sessão, formulário, RPC e reload |
| visitante lê projeto público | `PASS` | projeto recém-criado em contexto anônimo + seeds |
| usuário não lê draft alheio | `PASS` | pgTAP adversarial entre pilotos A e B |
| Registro Original é imutável | `PASS` | trigger + pgTAP + schema/export tests |
| estado e evento são atômicos | `PASS` | função única + pgTAP + contratos |
| exportação JSON e Markdown | `PASS` | unit + HTTP smoke |
| restauração local | `PASS` | migrations + seed + reset no CI |
| nenhum segredo versionado | `PASS` | `.env` ignorado; só placeholder público |
| framework corrigido antes de preview | `BLOCKED BY DATE` | Next `16.3.2`; sem preview |
| resultado e limitações preservados | `PASS` | este documento |

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
2. obter autorização humana específica antes de qualquer preview externo;
3. somente após essa autorização, criar o preview reproduzível exigido pelo
   `ROADMAP-30D.md`, sem segredo no cliente;
4. repetir o CI no commit exato e preservar a URL e a evidência.

Até essas evidências existirem:

`AUTHENTICATED LOCAL CI VERIFIED ≠ EXTERNAL PREVIEW ≠ GATE PASS`
