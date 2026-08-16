# A2A-LAB-002 — Artifact Manifest

Data da preservação: 2026-08-16

Classe: Manifesto de Original Records, inputs e outputs

Todos os arquivos abaixo foram copiados sem edição e comparados byte a byte com
a origem local antes do commit.

| Arquivo canônico | Origem local | Classe | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `raw/environment.txt` | `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/environment.txt` | Original Record / Environment Metadata | 1.531 | `91d9fa58685f34600cae64fed0ce91631652f4fe9821f21e4a342b0e6a3dd13b` |
| `raw/extension-inventory.txt` | `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/extension-inventory.txt` | Original Record / Environment Metadata | 1.632 | `b470533ff4c1d852e5e7f2b6ed9ee00cc1506c2cccfc61a93016d5be13f3ff3f` |
| `harness/native-model/client.py` | `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/native-model/client.py` | Original Record / Input | 1.648 | `f44ed9bcb57948dbfae21e560f2f0239ac7d001c4f9bd78600403350e5402255` |
| `harness/native-model/server.py` | `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/native-model/server.py` | Original Record / Input | 3.820 | `a29342e0c86e20259ee3984f61895a22cc416ca9e9eebea9ecec7813bac1d68d` |
| `raw/native-client.log` | `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/native-client.log` | Original Record / Output | 17.022 | `3205f90381837c3832f18e8c536f57a333683d3eaaa0645652a435f83531c8e7` |
| `raw/native-server.log` | `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/native-server.log` | Original Record / Output | 463 | `3cb10595873f9d47f129e491cbc447825e58bcb436ae5d5764f05e25ce3c99d8` |
| `raw/oid4vp-client.log` | `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/oid4vp-client.log` | Original Record / Output | 4.034 | `6f6ee6a108a3be260dbbc423001714eae21cb380852bc9e37357731c8a531bb7` |
| `raw/oid4vp-server.log` | `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/oid4vp-server.log` | Original Record / Output | 4.307 | `d7d1083e8e3c72306dc282d41bc8e33cdc95394f2a4378e800bc434d7fcd1d6b` |
| `raw/heterogeneous-python-client.log` | `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/heterogeneous-python-client.log` | Original Record / Output | 2.020 | `d726cf5b31fc8a8533a5be595bc13a3fdcac9675383c74cae669531649c1023f` |
| `raw/heterogeneous-js-server.log` | `/Users/alexandrechagasleaocryptoboy/labs/a2a-lab-002/heterogeneous-js-server.log` | Original Record / Output | 269 | `67c6256982bd1b40bd1cab77fcca814a036fd2e445ca7b7915c69bd8839e6b3f` |

## Classificação do conteúdo local

### UPSTREAM-RECOVERABLE

- `A2A/`;
- `a2a-samples/`;
- `experimental-ext-oid4vp-auth/`.

As árvores não foram copiadas. Remotes e SHAs estão em
`REPOSITORY-MANIFEST.md`.

### UNIQUE-INPUT

- `native-model/client.py`;
- `native-model/server.py`.

### ORIGINAL-OUTPUT

- `native-client.log`;
- `native-server.log`;
- `oid4vp-client.log`;
- `oid4vp-server.log`;
- `heterogeneous-python-client.log`;
- `heterogeneous-js-server.log`.

### ENVIRONMENT-METADATA

- `environment.txt`;
- `extension-inventory.txt`.

### GENERATED/CACHE — NÃO VERSIONADO

- `.bootstrap/`;
- `.venv/`;
- `node/`;
- `node.tar.gz`;
- `python/`;
- `node_modules`, caches, bytecode, downloads e binários nos repos upstream.

### UNKNOWN

Nenhum outro arquivo único foi identificado na inspeção da raiz e de
`native-model/`. Conteúdo não classificado não foi removido do laboratório.

## Segurança

Uma varredura dos dez arquivos preservados não encontrou API key real, bearer
token, client secret ou private key. Os logs OID4VP contêm somente a chave
placeholder mascarada já registrada como causa da falha posterior.

## Integridade de whitespace

O `git diff --check` integral reporta três características presentes nos bytes
originais: whitespace final no prompt de `heterogeneous-python-client.log`,
whitespace final em duas linhas ANSI de `oid4vp-client.log` e uma linha vazia no
fim de `native-client.log`. Esses bytes não foram normalizados porque os logs
são Original Records. O mesmo check, restrito aos manifests, delta e harness,
deve permanecer limpo.
