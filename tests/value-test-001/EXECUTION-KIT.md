# VALUE-TEST-001 — Execution Kit

## 0. Identificação da execução

- execution id:
- data:
- operador:
- participante pseudônimo:
- compensação, se houver:
- consentimento voluntário confirmado: SIM/NÃO

Não registrar dados pessoais sensíveis no repositório.

## 1. Elegibilidade do participante — preencher antes da BASELINE

Checklist exato:

- [ ] adulto real;
- [ ] não fundador;
- [ ] não participou de THESIS-ROUND-001;
- [ ] não integra núcleo interno;
- [ ] possui tarefas colaborativas reais envolvendo humano ou IA;
- [ ] consegue realizar duas tarefas comparáveis;
- [ ] não foi escolhido por possuir deliberadamente fluxo ruim.

Resultado:

ELIGÍVEL / NÃO ELIGÍVEL

Se NÃO ELIGÍVEL: não executar.

## 2. Comparabilidade — congelar antes da BASELINE

Tarefa A:

- família/tipo:
- objetivo:
- colaborador principal:
- canais/ferramentas:
- duração estimada:

Tarefa B:

- família/tipo:
- objetivo:
- colaborador principal:
- canais/ferramentas:
- duração estimada:

Razão objetiva de comparabilidade:

Riscos conhecidos de diferença:

Decisão prévia:

COMPARÁVEIS / NÃO COMPARÁVEIS

Se NÃO COMPARÁVEIS: não iniciar.

IMPORTANTE:

não preencher usando resultados observados posteriormente.

## 3. Auditor — congelar antes da BASELINE

- tipo: HUMANO / IA
- identidade:
- se IA, modelo exato:
- sessão/contexto novo e independente: SIM/NÃO
- participou da execução: NÃO
- recebeu história da Célula Zero: NÃO
- prompt/rubrica congelado:
- hash ou referência do prompt:
- método para ordem aleatória/invertida da apresentação:

### Prompt congelável do auditor

```text
Você é o auditor independente de uma condição experimental.

Analise somente os registros fornecidos nesta condição. Não use conhecimento
externo, não invente conteúdo ausente e não tente determinar se a condição é
BASELINE ou TREATMENT.

Reconstrua, para esta condição, exatamente estas oito dimensões:

1. SOURCE / ACTOR
2. INTENT
3. CONDITIONS
4. COMMITMENT
5. CONTRIBUTION / EVIDENCE
6. VERIFICATION
7. RESULT / STATUS
8. UNCERTAINTIES / CORRECTIONS

Para cada dimensão, responda com exatamente uma classificação:

- RECONSTRUÍDO CORRETAMENTE
- AMBÍGUO
- AUSENTE
- CONTRADITÓRIO / INCORRETO

Depois da classificação, apresente a reconstrução factual correspondente,
limitada ao que os registros permitem sustentar.

Não compare esta condição com outra condição. Não calcule PASS, FAIL ou
INCONCLUSIVO. Não presuma fatos ausentes. Se houver versões conflitantes ou
mais de uma reconstrução materialmente plausível, classifique AMBÍGUO ou
CONTRADITÓRIO / INCORRETO, conforme o caso, e identifique o conflito.
```

Não mencionar qual condição é BASELINE ou TREATMENT.

Não fornecer reference keys.

Não fornecer história da Célula Zero.

## 4. BASELINE

ANTES:

confirmar que o participante ainda NÃO viu os oito campos.

Confirmação: SIM/NÃO

Início:

Fim:

Duração:

Fluxo normal usado:

Artefatos/registros brutos existentes:

Local externo onde registros brutos foram congelados:

Identificador/hash, se aplicável:

Fundador introduziu estrutura de registro?

NÃO deve ocorrer.

Resposta: SIM/NÃO

Após terminar:

REGISTROS BASELINE CONGELADOS: SIM/NÃO

NÃO produzir reference key aqui.

NÃO apresentar ainda os oito campos antes do congelamento.

## 5. Onboarding TREATMENT

Somente depois do congelamento da BASELINE.

Início:

Fim:

Duração total:

Limite:

<= 10 minutos.

Conteúdo permitido:

somente explicar os oito campos preregistrados.

Registrar se houve qualquer conteúdo adicional:

Resultado:

CONFORME / DESVIO

## 6. TREATMENT

Registrar em linguagem comum:

1. SOURCE / ACTOR:
2. INTENT:
3. CONDITIONS:
4. COMMITMENT:
5. CONTRIBUTION / EVIDENCE:
6. VERIFICATION:
7. RESULT / STATUS:
8. UNCERTAINTIES / CORRECTIONS:

Início:

Fim:

Duração da tarefa:

Minutos extras gastos registrando o pacote:

Overhead percentual:

Clarificação logística durante a execução:

- nenhuma / uma
- conteúdo:

Intervenção substantiva do fundador:

SIM/NÃO

Local dos registros brutos congelados:

Identificador/hash, se aplicável:

REGISTROS TREATMENT CONGELADOS:

SIM/NÃO

## 7. Reference keys — somente após AMBAS as tarefas

Confirmar antes:

BASELINE congelada: SIM

TREATMENT congelado: SIM

Sortear ordem de produção:

BASELINE PRIMEIRO / TREATMENT PRIMEIRO

Registrar método do sorteio:

Horário da produção de cada key:

- key A — BASELINE:
- key B — TREATMENT:

Intervalo entre Tarefa A e key A:

Intervalo entre Tarefa B e key B:

Registrar isso explicitamente como limitação potencial de memória.

### Reference key A — BASELINE

1. SOURCE / ACTOR:
2. INTENT:
3. CONDITIONS:
4. COMMITMENT:
5. CONTRIBUTION / EVIDENCE:
6. VERIFICATION:
7. RESULT / STATUS:
8. UNCERTAINTIES / CORRECTIONS:

### Reference key B — TREATMENT

1. SOURCE / ACTOR:
2. INTENT:
3. CONDITIONS:
4. COMMITMENT:
5. CONTRIBUTION / EVIDENCE:
6. VERIFICATION:
7. RESULT / STATUS:
8. UNCERTAINTIES / CORRECTIONS:

Não alterar registros anteriores.

## 8. Auditoria

Registrar ordem efetivamente apresentada ao auditor:

### Condição correspondente à BASELINE

- posição na ordem apresentada:
- reconstruction score 0–8:
- ambiguidades materiais:
- erros de atribuição:
- erros de status:
- tempo de reconstrução:

### Condição correspondente ao TREATMENT

- posição na ordem apresentada:
- reconstruction score 0–8:
- ambiguidades materiais:
- erros de atribuição:
- erros de status:
- tempo de reconstrução:

Preservar resposta original do auditor separadamente.

Não mostrar reference keys antes da resposta final do auditor.

Depois da resposta:

comparar com reference keys.

## 9. Métricas do participante

- burden 1–5:
- benefício percebido 1–5:
- intenção de reutilização 1–5:

Registrar sem induzir resposta.

## 10. Validade — E2 ETAPA 1

Marcar SIM/NÃO:

- tarefas deixaram de ser comparáveis? SIM/NÃO
- registros necessários foram perdidos? SIM/NÃO
- auditor teve acesso indevido à reference key? SIM/NÃO
- protocolo de auditoria foi quebrado? SIM/NÃO
- evento externo invalidou a comparação? SIM/NÃO

Se qualquer SIM material:

INCONCLUSIVO.

Registrar justificativa:

## 11. PASS — E2 ETAPA 2

Aplicar literalmente todos os critérios da seção 16 da preregistração:

### A. TREATMENT reconstruction score >= 7/8

- valor observado:
- critério satisfeito: SIM/NÃO

### B. TREATMENT sem erro material de atribuição/status

- erro material de atribuição: SIM/NÃO
- erro material de status: SIM/NÃO
- critério satisfeito: SIM/NÃO

### C. Ganho comparativo ou regra de efeito teto

Regra normal:

- ganho de pelo menos +2 pontos no reconstruction score: SIM/NÃO
- OU redução >= 50% das ambiguidades materiais: SIM/NÃO

Caso BASELINE já seja >= 7/8, aplicar exclusivamente a regra de efeito teto:

- TREATMENT não inferior ao BASELINE: SIM/NÃO
- ambiguidades materiais não aumentam: SIM/NÃO
- tempo de reconstrução do auditor reduzido em >= 25%: SIM/NÃO

- critério satisfeito: SIM/NÃO

### D. Overhead <= 20% e <= 20 min

- overhead percentual observado:
- minutos observados:
- critério satisfeito: SIM/NÃO

O limite de overhead é hard gate.

### E. Nenhuma intervenção substantiva

- intervenção substantiva ocorreu: SIM/NÃO
- critério satisfeito: SIM/NÃO

### F. Intenção de reutilização >= 4/5

- valor observado:
- critério satisfeito: SIM/NÃO

TODOS precisam ser SIM.

## 12. Classificação — E2 ETAPA 3

Precedência obrigatória:

1. comparação materialmente inválida → INCONCLUSIVO;
2. válida + todos os critérios PASS → PASS;
3. válida + qualquer critério PASS não satisfeito → FAIL.

Resultado final:

PASS / FAIL / INCONCLUSIVO

Não reinterpretar resultado.

## 13. Limitações

Registrar obrigatoriamente:

- N=1;
- ordem fixa BASELINE → TREATMENT;
- possível efeito de aprendizado;
- possível impossibilidade de cegamento pela estrutura;
- intervalo entre tarefa e reference key;
- outros desvios observados.

Registro das limitações:

## 14. Privacidade

Dados brutos e dados pessoais podem ficar fora do Git.

No repositório público preservar somente:

- pseudônimo;
- métricas;
- hashes/referências quando úteis;
- fatos necessários para auditar a metodologia;
- redactions necessárias.
