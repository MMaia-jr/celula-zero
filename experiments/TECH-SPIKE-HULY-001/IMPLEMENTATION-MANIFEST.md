# TECH-SPIKE-HULY-001 — Implementation Manifest

Data de preservação: 2026-08-16

Classe: Manifesto de implementação experimental

## Repositório upstream

- Projeto: Huly Platform
- Upstream: `https://github.com/hcengineering/platform.git`
- Base congelada: `1be6047c8a7c7b7a6674c9495834777f301f3379`
- Clone experimental local: `/Users/alexandrechagasleaocryptoboy/Downloads/huly-platform`
- Branch local de preservação: `experiment/tech-spike-huly-001-preserved`
- Commit local preservado: `c0939fcd4f69576780a63714c61f8a4138666dca`
- Push ao upstream oficial: NÃO REALIZADO

O commit local acima preserva a implementação executada. Ele não pertence ao
histórico upstream do Huly e não representa contribuição, aprovação ou adoção
pelo projeto Huly.

## Pacotes experimentais Intent

1. `models/intent/`
2. `plugins/intent/`
3. `plugins/intent-resources/`
4. `plugins/intent-assets/`

## Touchpoints upstream

- `rush.json`
- `models/all/package.json`
- `models/all/src/index.ts`
- `dev/prod/package.json`
- `dev/prod/src/platform.ts`

Esses touchpoints fazem o registro mecânico dos quatro pacotes e da aplicação
Intent no build/modelo de desenvolvimento. Nenhuma alteração funcional de core
foi preservada.

## Bookkeeping de dependências

- `common/config/rush/pnpm-lock.yaml`

O lockfile foi atualizado durante a preparação/execução local. Seu diff inclui
o registro dos pacotes Intent e alterações de resolução geradas pelo gerenciador
do monorepo. Ele é preservado como parte do working tree efetivamente executado,
sem atribuir significado arquitetural independente a cada mudança indireta.

## Correção PostCSS

Arquivo:

- `plugins/intent-resources/postcss.config.js`

A primeira tentativa de `docker:min` falhou porque a configuração referenciava
`@hcengineering/platform-rig/profiles/ui/postcss.config`, caminho inexistente na
base congelada. A correção preservada usa diretamente `autoprefixer`, seguindo o
padrão observado em pacotes upstream de referência.

Estado anterior → erro → alteração → resultado posterior:

configuração herdada com profile `ui` → módulo não encontrado durante
`docker:min` → configuração PostCSS local direta com `autoprefixer` → build da
imagem prosseguiu na execução reportada.

## Estatísticas do delta preservado

- Arquivos alterados/criados: 49
- Arquivos novos dos quatro pacotes: 43
- Arquivos upstream modificados: 6, incluindo o lockfile
- Inserções: 2.165
- Deleções: 582
- Serviços novos: nenhum
- Dependências arquiteturais externas novas: nenhuma
- Core funcional modificado: não

## Patch reproduzível

- Arquivo: `TECH-SPIKE-HULY-001-HULY-DELTA.patch`
- Base: `1be6047c8a7c7b7a6674c9495834777f301f3379`
- Commit representado: `c0939fcd4f69576780a63714c61f8a4138666dca`
- Tamanho: 295.099 bytes
- SHA-256: `a56130ce852ec192e46f5ecbcc68af6f931c68102fadb04e1fa6b80b96aea677`

## Reaplicação conceitual

Em um clone separado do Huly, com working tree limpo:

1. obter a base exata `1be6047c8a7c7b7a6674c9495834777f301f3379`;
2. criar uma branch experimental local a partir dessa base;
3. verificar o patch com `git apply --check <patch>`;
4. aplicar com `git apply --index <patch>`;
5. confirmar os 49 caminhos e o hash do patch antes de qualquer execução.

Essas instruções descrevem a restauração do delta. Elas não autorizam build,
runtime, push ao upstream ou adoção arquitetural.

## Separação de responsabilidades

- O source tree completo continua no clone separado do Huly.
- O repositório `celula-zero` preserva somente este manifesto, o patch, o
  inventário do runtime e o resultado do experimento.
- Images, containers, volumes e bancos Docker não são fonte canônica e não são
  versionados.
- A preservação demonstra a existência do delta experimental; não escolhe Huly
  como arquitetura do projeto.
