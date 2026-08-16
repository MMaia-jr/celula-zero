# A2A-LAB-002 — Repository Manifest

Data da inspeção: 2026-08-16

Classe: Manifesto de referências externas

## Laboratório

- Path local: `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002`
- Classificação: `EXPERIMENT-LAB`
- Tamanho aproximado observado: 1,1 GB
- Repositório Git na raiz: não

O laboratório agrega repositórios upstream, código próprio do experimento,
outputs, metadados e runtimes descartáveis. A árvore integral não foi copiada
para a fonte canônica.

## Repositórios upstream

| Repositório | Remote | Branch | HEAD observado | Status observado | Função no experimento |
| --- | --- | --- | --- | --- | --- |
| `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/A2A` | `https://github.com/a2aproject/A2A.git` | `main` | `134a382ed38a0c527902e21b5b61c1666a60402e` | clean; alinhado a `origin/main` | especificação e documentação oficiais do protocolo core A2A |
| `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/a2a-samples` | `https://github.com/a2aproject/a2a-samples.git` | `main` | `6603ba3f2c31a7ef33e70b9d8b5b5f8be42ac9a3` | clean; alinhado a `origin/main` | samples oficiais; fonte dos componentes usados no teste heterogêneo e inventário de extensões |
| `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/experimental-ext-oid4vp-auth` | `https://github.com/a2aproject/experimental-ext-oid4vp-auth.git` | `main` | `e86356d4a330ede795eb5b458fd2a838ffea0064` | clean; alinhado a `origin/main` | extensão experimental e sample do fluxo OID4VP em Task |

Últimos commits observados:

- A2A: `134a382 docs: fix broken links (#2139)`;
- a2a-samples: `6603ba3 Add demo for OID4VP In-Task Auth Extension (#629)`;
- experimental-ext-oid4vp-auth: `e86356d Update wording for Authorization Request data structure`.

## Classificação de preservação

Os três repositórios são `UPSTREAM-RECOVERABLE` e `KEEP-READONLY`.

Eles são referências externas recuperáveis por remote + SHA. Não são código da
Célula Zero, não foram incorporados a este repositório e não foram modificados
durante a recuperação.

## Integridade

Antes e depois da preservação canônica, os três repositórios permaneceram nos
HEADs acima e com `git status --porcelain` vazio. Nenhum pull, checkout, reset,
clean, stash, commit ou push foi executado neles.
