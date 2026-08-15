# GTEST-002 — Recuperação de Proveniência

Status: Aberto

Resultado: PENDENTE

Objeto do teste: recuperação auditável de proveniência externa para lacunas identificadas no GTEST-001

## Pergunta do teste

Registros Originais externos hoje ausentes do repositório conseguem preencher lacunas identificadas no GTEST-001 sem converter memória posterior, síntese retrospectiva ou inferência em evidência histórica?

## Regra central

Recuperar não é reconstruir livremente.

Um item só pode reduzir uma LACUNA se existir um Registro Original identificável que sustente explicitamente a formulação ou relação.

Memória atual dos participantes não deve ser aceita como prova histórica por si só.

## Classes de resultado por lacuna

Para cada lacuna herdada do GTEST-001, usar apenas:

- MANTIDA
- REDUZIDA
- RESOLVIDA
- REFORMULADA

Nunca usar “RESOLVIDA” apenas por proximidade semântica.

## 1. Estado herdado

As lacunas abaixo são herdadas de `GTEST-001-reconstrucao-de-trajetoria.md` sem alteração de seu conteúdo ou resultado:

- **LACUNA-002 — “plataforma de comunidades”.**
- **LACUNA-003 — “cooperação verificável”.**
- **LACUNA-004 — cooperação → agentes + intenção.**
- **LACUNA-005 — “rede social de intenções”.**
- **LACUNA-006 — rede social de intenções → passado/presente/futuro.**
- **LACUNA-008 — autoria conceitual do GRAPH-000.**
- **LACUNA-009 — datas de ocorrência vs. datas de registro.**
- **LACUNA-011 — relações entre documentos.**

Estado inicial de todas as lacunas neste teste: MANTIDA.

Essa classificação inicial registra apenas que nenhuma fonte externa foi auditada. Ela não constitui nova avaliação do mérito das lacunas.

## 2. Fontes candidatas externas

Registrar somente metadados das fontes que forem posteriormente fornecidas:

- tipo;
- autor;
- data, se disponível;
- contexto;
- origem;
- integridade conhecida;
- relação com a lacuna;
- status de auditoria.

Estado inicial: Nenhuma fonte externa auditada ainda.

Memória atual, resumo retrospectivo ou relato reconstituído não deve ser registrado como Registro Original apenas por ter sido fornecido por um participante.

## 3. Critério de admissão

Uma fonte externa só pode ser admitida como Registro Original se:

- seu conteúdo integral estiver disponível;
- sua autoria ou origem estiver identificável;
- não tiver sido reescrita como síntese posterior;
- sua data ou ao menos ordem relativa puder ser explicitamente qualificada;
- sua relação com a lacuna puder ser auditada.

Quando algum desses elementos faltar, registrar a limitação.

A admissão de uma fonte como Registro Original não resolve automaticamente a lacuna à qual ela se relaciona.

## 4. Matriz de recuperação

| Lacuna do GTEST-001 | Fonte externa | O que a fonte demonstra | Classe | Resultado |
| --- | --- | --- | --- | --- |

A matriz permanece sem entradas até que uma fonte externa seja fornecida e auditada.

## 5. Relações recuperáveis

Testar futuramente apenas quando houver fonte:

- `proposed_by`
- `responds_to`
- `extends`
- `revises`
- `led_to`
- `tensions_with`

`supersedes` continua exigindo evidência explícita.

Nenhuma relação está sendo criada, confirmada ou modificada na abertura deste teste.

## 6. Temporalidade

Distinguir obrigatoriamente:

- data de ocorrência;
- data de formulação;
- data de recebimento;
- data de registro;
- data de commit.

Não inferir uma a partir da outra.

Quando uma data não estiver disponível, registrar sua ausência ou o grau de qualificação possível sem fabricar precisão.

## 7. Resultado do teste

Estado inicial:

PENDENTE

Classificações finais possíveis:

- RECUPERAÇÃO SUBSTANCIAL
- RECUPERAÇÃO PARCIAL
- SEM RECUPERAÇÃO

O resultado só deve ser definido depois da auditoria das fontes externas.

## 8. Relação com GTEST-001

GTEST-002 não altera retroativamente o resultado FALHA do GTEST-001. Ele mede se novas fontes permitem reduzir lacunas posteriores ao momento daquele teste.

Qualquer redução, resolução ou reformulação futura deve preservar o estado originalmente observado pelo GTEST-001.

## 9. Implicações para o produto

Pendente.

Não criar novos tipos de nó ou relações nesta etapa.
