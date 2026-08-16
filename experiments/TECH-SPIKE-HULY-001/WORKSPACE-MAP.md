# TECH-SPIKE-HULY-001 — Workspace Map

Data da inspeção: 2026-08-16

Classe: Inventário operacional local

| PATH | PAPEL | REMOTE | BRANCH/HEAD | WRITABLE? | STATUS |
| --- | --- | --- | --- | --- | --- |
| `/Users/alexandrechagasleaocryptoboy/Downloads/celula-zero` | Fonte canônica da Célula Zero | `https://github.com/MMaia-jr/celula-zero.git` | `recovery/tech-spike-huly-001`; base `dce9151bec42f241bc6916fa61194ca6494aa54d` | Sim, somente artefatos autorizados | KEEP-WRITABLE; limpo antes da recuperação e sincronizado com `origin/main` |
| `/Users/alexandrechagasleaocryptoboy/Downloads/huly-platform` | Workspace experimental executado do TECH-SPIKE | `https://github.com/hcengineering/platform.git` | `experiment/tech-spike-huly-001-preserved` @ `c0939fcd4f69576780a63714c61f8a4138666dca`; base `1be6047c8a7c7b7a6674c9495834777f301f3379` | Sim, somente preservação local nesta tarefa | KEEP-WRITABLE; delta experimental commitado localmente; sem push |
| `/Users/alexandrechagasleaocryptoboy/Documents/ChatGPT/a2atesr` | Referência técnica externa declarada | nenhum remote configurado | branch `main` sem commits (`HEAD` não resolvido) | Não | INVESTIGATE; diretório Git limpo, mas sem conteúdo/remote utilizável na inspeção |
| `/Users/alexandrechagasleaocryptoboy/Downloads/huly-platform-tech-spike` | Clone Huly duplicado/antigo | `https://github.com/hcengineering/platform.git` | `develop` @ `1be6047c8a7c7b7a6674c9495834777f301f3379` | Não | ARCHIVE-LATER; clean, sem delta Intent |

## Classificação

- `celula-zero`: fonte canônica documental; não recebe a árvore completa do
  Huly ou A2A.
- `huly-platform`: única cópia identificada com o delta Intent executado; o
  estado foi preservado em commit local.
- `a2atesr`: mantido somente leitura. A inspeção encontrou um repositório Git
  inicializado, porém sem commits, remote ou arquivos de trabalho.
- `huly-platform-tech-spike`: duplicata limpa da base, sem implementação Intent;
  não foi movida, renomeada ou excluída.

Nenhum workspace foi reorganizado fisicamente nesta tarefa.
