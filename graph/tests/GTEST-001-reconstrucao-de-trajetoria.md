# GTEST-001 — Reconstrução de trajetória

Status: Aberto

Resultado: Pendente

Objeto do teste: trajetória histórica da Célula Zero até o GRAPH-000

## Pergunta do teste

É possível reconstruir, a partir dos registros preservados, como a Célula Zero evoluiu de uma hipótese centrada em comunidades para o GRAPH-000, sem depender da memória informal dos participantes?

## Trajetória a reconstruir

plataforma de comunidades → cooperação verificável → agentes + intenção → rede social de intenções → passado/presente/futuro → GRAPH-000

Esta sequência é o objeto da verificação e não deve ser tratada antecipadamente como trajetória comprovada.

## Regras

- Usar apenas registros já existentes no repositório.
- Não inventar falas, datas, decisões ou relações.
- Quando não houver proveniência suficiente, registrar `LACUNA`.
- Preservar a distinção entre:
  - Registro Original;
  - Interpretação;
  - Síntese;
  - Decisão;
  - Hipótese.
- Não converter mudança de conversa em decisão formal automaticamente.
- Não alterar o GRAPH-000.
- Não alterar `PROTOCOL.md`.
- Não corrigir retrospectivamente participantes.

## 1. Estado inicial

Pergunta de execução:

Qual formulação aparece primeiro nos registros disponíveis?

Registrar:

- formulação;
- autor, quando identificável;
- fonte;
- data, se disponível;
- classe epistemológica;
- limitações de proveniência.

Estado da apuração: Pendente.

## 2. Eventos de transição

Para cada mudança, registrar:

| Campo | Conteúdo |
| --- | --- |
| ID provisório do evento | |
| Formulação anterior | |
| Formulação posterior | |
| Agente que introduziu a mudança | |
| Registro/fonte | |
| Data, se disponível | |
| `responds_to`, se identificável | |
| Classe epistemológica | |
| Motivo explicitamente registrado | |
| Observação sobre incerteza | |

Criar uma entrada separada para cada transição que possa ser sustentada documentalmente. Se um elo da trajetória não puder ser sustentado, registrar `LACUNA` em vez de inferir o evento.

Estado da apuração: Pendente.

## 3. Claims centrais

Identificar apenas os claims necessários para explicar a transição.

Formato:

`Claim → autor → fonte → status → relações`

Não elevar uma formulação a claim histórico do participante quando ela estiver disponível apenas como Interpretação ou Síntese posterior.

Estado da apuração: Pendente.

## 4. Relações

Testar pelo menos:

- `proposed_by`
- `responds_to`
- `revises`
- `extends`
- `supersedes` — somente quando houver evidência explícita;
- `supports`
- `tensions_with`
- `led_to`

Não usar `supersedes` para simples evolução conceitual.

Cada relação deve apontar para sua fonte e indicar se é Registro Original, Interpretação, Síntese, Decisão ou Hipótese.

Estado da apuração: Pendente.

## 5. O que foi preservado através das mudanças

Verificar se elementos anteriores sobreviveram à transição, especialmente:

- evidência;
- reputação contextual;
- autonomia;
- proveniência;
- agentes;
- intenções;
- Web3 como camada possível.

Sobrevivência conceitual não deve ser inferida apenas pela repetição de palavras: deve haver relação documental suficiente entre as formulações.

Estado da apuração: Pendente.

## 6. O que foi abandonado, rebaixado ou permanece aberto

Separar:

- rejeitado;
- não prioritário;
- incorporado;
- ainda hipótese;
- sem evidência suficiente.

Ausência em registros posteriores não constitui, por si só, rejeição ou abandono.

Estado da apuração: Pendente.

## 7. Lacunas

Listar tudo que o repositório atual não permite reconstruir com segurança.

Para cada `LACUNA`, registrar:

- elo ou afirmação afetada;
- registros consultados;
- informação ausente;
- efeito da lacuna sobre a reconstrução.

Estado da apuração: Pendente.

## 8. Resultado do teste

Classificações possíveis:

- PASSA
- PASSA PARCIALMENTE
- FALHA

Critério:

PASSA somente se a sequência puder ser reconstruída com proveniência suficiente sem depender de lembrança oral externa.

Resultado atual: Pendente.

## 9. Implicações para o schema

Somente depois da reconstrução, apontar quais objetos ou relações faltaram.

Não alterar o schema nesta etapa.

Estado da apuração: Pendente.
