# HYPOTHESIS-WEB3-001 — Âncora Externa de Verdade Contextual

## Metadados

- Data: 2026-08-21
- Categoria: tecnologia, integridade e interoperabilidade
- Estado: `NOT TESTED`
- Autorização de registro: `decisions/D005-contextual-truth-and-web3-hypothesis.md`
- Dependência: direção humana aceita provisoriamente em `HUMAN-DIRECTION-001`, ainda pendente de canonicalização
- Repositório experimental citado: `MMaia-jr/celula-zero-lab` (`experiments/AGENT-COUNCIL-MVP-002/`)
- Prioridade: não bloqueia o MVP da comunidade

## Hipótese

Uma âncora externa em infraestrutura blockchain existente pode tornar
detectável a alteração unilateral de decisões, autorizações, resultados e
evidências mantidos fora da blockchain, sem publicar o conteúdo integral ou
dados sensíveis on-chain.

## Problema observado

As observações abaixo se originam da auditoria do experimento mantido no
repositório separado `MMaia-jr/celula-zero-lab`. Esta hipótese não incorpora nem
preserva os arquivos do experimento ou de sua auditoria.

No `AGENT-COUNCIL-MVP-002`, a cadeia de eventos permaneceu matematicamente
válida enquanto objetos materiais foram modificados:

- o voto humano pôde mudar e divergir da decisão armazenada;
- a ação e o alvo de uma autorização puderam ser alterados;
- uma execução não aprovada pôde ser aceita;
- um resultado pôde mudar de `PASS` para `FAIL`;
- uma evidência pôde ser excluída;
- o verificador continuou retornando sucesso.

## Propriedade que poderá ser perdida sem extensão

Sem uma âncora independente, um operador com controle sobre o armazenamento e
o verificador poderá reescrever o estado e recalcular a história apresentada
aos demais participantes.

A propriedade desejada é:

> Um observador independente consegue demonstrar que o conteúdo atual diverge
> do estado contextual anteriormente aceito, mesmo sem confiar no operador do
> armazenamento local.

## Classificação preliminar

| Componente | Classificação | Motivo |
| --- | --- | --- |
| Blockchain pública existente | `ADOPT` | Pode fornecer ordem, timestamp e âncora externa |
| Envelope de bloco contextual | `MAP` | Exige mapear os objetos da Célula Zero para formato canônico |
| Verificador independente | `EXTEND` | Deve comparar conteúdo material, assinaturas e âncora |
| NFT da célula | `OPTIONAL HYPOTHESIS` | Pode representar identidade, mas não é necessário para o teste |
| DAO | `DEFER` | Não há governança ou patrimônio coletivo reais a administrar |
| Token | `DEFER` | Nenhuma função econômica necessária foi demonstrada |
| Chain própria | `NOT JUSTIFIED` | Nenhuma propriedade exige soberania computacional própria hoje |

## Pergunta experimental

Um pacote contextual assinado e ancorado externamente permite que um terceiro
detecte alteração, exclusão ou reordenação de qualquer elemento comprometido,
inclusive quando o banco local e seu operador apresentam o estado adulterado
como válido?

## Escopo mínimo futuro

O experimento deverá usar somente dados sintéticos e uma célula fictícia.

Deverá produzir:

1. uma policy explícita;
2. uma proposta;
3. posições ou votos;
4. uma decisão contextual;
5. uma autorização;
6. uma execução;
7. um resultado;
8. uma evidência;
9. divergência preservada;
10. um pacote canônico;
11. uma raiz criptográfica ou CID;
12. uma âncora externa;
13. um verificador executado em ambiente independente.

Não deverá incluir:

- fundos reais;
- dados pessoais;
- conhecimento indígena;
- token;
- NFT obrigatório;
- DAO;
- chain própria;
- frontend;
- promessa de segurança de produção.

## Modelo conceitual

```text
Original records
      ↓
Canonical contextual bundle
      ↓
Merkle root / CID
      ↓
Participant signatures
      ↓
External blockchain anchor
      ↓
Independent reconstruction and verification
```

A blockchain não deverá ser tratada como armazenamento integral da verdade. Ela
deverá preservar o compromisso criptográfico com o estado aceito.

## Cenários obrigatórios

### A. Baseline

O pacote original é reconstruído e corresponde à raiz ancorada.

Resultado esperado: `PASS`.

### B. Voto alterado

Um voto é modificado depois da decisão.

Resultado esperado: divergência detectada.

### C. Autorização alterada

Executor, ação, alvo ou parâmetros são modificados.

Resultado esperado: divergência detectada e execução rejeitada.

### D. Resultado alterado

Um resultado muda de `PASS` para `FAIL`, ou vice-versa.

Resultado esperado: divergência detectada.

### E. Evidência excluída

Uma evidência comprometida desaparece do armazenamento apresentado.

Resultado esperado: ausência detectada.

### F. Reordenação

Registros são apresentados em ordem diferente.

Resultado esperado: divergência detectada.

### G. Reescrita completa local

O operador recalcula todos os hashes locais e apresenta uma nova história.

Resultado esperado: raiz local diverge da âncora externa anterior.

### H. Correção legítima

Uma nova evidência corrige a decisão anterior.

Resultado esperado: criação de novo bloco que referencia e supera ou contesta o
anterior, sem alteração do bloco original.

### I. Participação divergente

Um participante discorda da decisão majoritária.

Resultado esperado: decisão e dissenso permanecem verificáveis.

## Critérios de sucesso

O experimento será `PASS` somente se:

- qualquer alteração nos campos comprometidos mudar a raiz verificável;
- o verificador comparar o pacote atual à âncora independente;
- a reescrita completa do armazenamento local for detectada;
- correções legítimas forem aditivas e referenciarem o estado anterior;
- divergências não forem apagadas pela conclusão majoritária;
- um terceiro puder reproduzir a verificação;
- nenhuma informação sensível precisar ser publicada on-chain;
- o teste distinguir consenso da rede, consenso da célula e verdade empírica.

## Critérios de falha ou abandono

O experimento será `FAIL` se:

- o verificador aceitar conteúdo diferente do conteúdo ancorado;
- a âncora depender do mesmo operador que controla o armazenamento;
- for necessário confiar numa cópia privada não verificável;
- a correção legítima exigir apagar o passado;
- dados sensíveis precisarem ser publicados;
- o custo ou a complexidade superar claramente uma alternativa mais simples;
- a blockchain não acrescentar propriedade verificável além de assinaturas e
  repositórios independentes.

## Alternativas mais simples a comparar

O experimento deverá comparar blockchain com pelo menos:

- commit Git assinado e replicado em repositórios independentes;
- arquivo canônico assinado por múltiplos participantes;
- serviço independente de timestamp;
- log append-only operado por terceiro;
- armazenamento content-addressed com múltiplas cópias.

Blockchain só será escolhida se preservar uma propriedade relevante melhor do
que essas alternativas, considerando custo, disponibilidade, privacidade,
portabilidade e controle.

## Interpretação permitida de um PASS

Um `PASS` permitirá afirmar apenas:

> Neste experimento sintético, a âncora externa tornou detectáveis as classes de
> adulteração testadas sem publicar o conteúdo integral on-chain.

Não permitirá afirmar:

- que a informação ancorada é verdadeira;
- que a governança é legítima;
- que o sistema é seguro em produção;
- que NFT, DAO, token ou chain própria são necessários;
- que existe utilidade externa, adoção ou escalabilidade.

## Gate de execução

Este experimento não deverá consumir trabalho técnico antes de:

1. `HUMAN-DIRECTION-001` ser aceito pelo fundador — satisfeito em 2026-08-21 por `D005`;
2. o `AGENT-COUNCIL-MVP-002` ser preservado com sua auditoria `FAIL` no
   repositório separado `MMaia-jr/celula-zero-lab`;
3. a pergunta de produto beneficiada pelo teste ser declarada;
4. existir autorização explícita de workspace, branch, escopo e operações Git;
5. o trabalho não interromper o MVP da comunidade e a busca de utilidade externa.

Até esses gates serem satisfeitos, seu estado permanece `NOT TESTED`.
