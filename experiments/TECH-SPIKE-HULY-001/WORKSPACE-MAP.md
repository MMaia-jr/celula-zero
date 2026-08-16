# TECH-SPIKE-HULY-001 — Workspace Map

Data da inspeção: 2026-08-16

Classe: Inventário operacional local

| PATH | PAPEL | REMOTE | BRANCH/HEAD | WRITABLE? | STATUS |
| --- | --- | --- | --- | --- | --- |
| `/Users/alexandrechagasleaocryptoboy/Downloads/celula-zero` | Fonte canônica da Célula Zero | `https://github.com/MMaia-jr/celula-zero.git` | `recovery/tech-spike-huly-001`; base `dce9151bec42f241bc6916fa61194ca6494aa54d` | Sim, somente artefatos autorizados | KEEP-WRITABLE; limpo antes da recuperação e sincronizado com `origin/main` |
| `/Users/alexandrechagasleaocryptoboy/Downloads/huly-platform` | Workspace experimental executado do TECH-SPIKE | `https://github.com/hcengineering/platform.git` | `experiment/tech-spike-huly-001-preserved` @ `c0939fcd4f69576780a63714c61f8a4138666dca`; base `1be6047c8a7c7b7a6674c9495834777f301f3379` | Sim, somente preservação local nesta tarefa | KEEP-WRITABLE; delta experimental commitado localmente; sem push |
| `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002` | Laboratório local A2A e seus artefatos de execução | não é repositório Git | n/a | Não | EXPERIMENT-LAB; aproximadamente 1,1 GB; não participou do TECH-SPIKE-HULY-001 |
| `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/A2A` | Repositório oficial do protocolo Agent2Agent | `https://github.com/a2aproject/A2A.git` | `main` @ `134a382ed38a0c527902e21b5b61c1666a60402e` | Não | KEEP-READONLY; clean e alinhado a `origin/main` |
| `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/a2a-samples` | Repositório oficial de exemplos Agent2Agent | `https://github.com/a2aproject/a2a-samples.git` | `main` @ `6603ba3f2c31a7ef33e70b9d8b5b5f8be42ac9a3` | Não | KEEP-READONLY; clean e alinhado a `origin/main` |
| `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/experimental-ext-oid4vp-auth` | Repositório experimental de extensão OID4VP para A2A | `https://github.com/a2aproject/experimental-ext-oid4vp-auth.git` | `main` @ `e86356d4a330ede795eb5b458fd2a838ffea0064` | Não | KEEP-READONLY; clean e alinhado a `origin/main` |
| `/Users/alexandrechagasleaocryptoboy/Documents/ChatGPT/a2atesr` | Diretório Git residual inicialmente confundido com a referência A2A | nenhum remote configurado | branch `main` sem commits (`HEAD` não resolvido) | Não | INVESTIGATE; limpo, sem conteúdo ou remote utilizável |
| `/Users/alexandrechagasleaocryptoboy/Downloads/huly-platform-tech-spike` | Clone Huly duplicado/antigo | `https://github.com/hcengineering/platform.git` | `develop` @ `1be6047c8a7c7b7a6674c9495834777f301f3379` | Não | ARCHIVE-LATER; clean, sem delta Intent |

## Classificação

- `celula-zero`: fonte canônica documental; não recebe a árvore completa do
  Huly ou A2A.
- `huly-platform`: única cópia identificada com o delta Intent executado; o
  estado foi preservado em commit local.
- `a2a-lab-002`: laboratório de experimentação A2A, com ambientes locais,
  artefatos e três repositórios Git independentes. Sua presença neste documento
  serve apenas ao mapa operacional; ele não foi usado no TECH-SPIKE-HULY-001.
- `A2A`, `a2a-samples` e `experimental-ext-oid4vp-auth`: repositórios técnicos
  confirmados por Git, remotes oficiais e metadados dos próprios projetos;
  mantidos estritamente como `KEEP-READONLY`.
- `a2atesr`: diretório Git residual mantido como `INVESTIGATE`; não substitui
  nem representa os repositórios confirmados no laboratório A2A.
- `huly-platform-tech-spike`: duplicata limpa da base, sem implementação Intent;
  não foi movida, renomeada ou excluída.

Nenhum workspace foi reorganizado fisicamente nesta tarefa.
