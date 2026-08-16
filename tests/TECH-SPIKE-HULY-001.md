# TECH-SPIKE-HULY-001 — preregistração de runtime

Data de preregistração: 2026-08-16

Classe:
Experimento preregistrado — execução ainda não realizada.

## 1. Objeto

Preregistrar a Fase C de TECH-SPIKE-HULY-001 antes da instalação de dependências,
compilação ou execução da implementação existente.

Base Huly:

`1be6047c8a7c7b7a6674c9495834777f301f3379`

## 2. Estado pré-execução

- quatro novos pacotes Intent;
- 43 novos arquivos;
- cinco arquivos upstream modificados;
- nenhum core modificado;
- nenhum serviço novo;
- nenhuma dependência externa nova;
- implementação ainda não compilada nem executada.

## 3. Pergunta decisória

A implementação mínima de Intent consegue funcionar no Huly usando os
mecanismos existentes, sem exigir alteração funcional do core ou expansão
arquitetural material?

## 4. Hipótese

H1:

Intent + Contribution compilam, carregam e executam usando os quatro pacotes
previstos e apenas wiring central mecânico.

## 5. Hipótese rival

A aparente modularidade observada estaticamente esconde dependências,
acoplamentos ou requisitos adicionais que tornam a extensão significativamente
mais intrusiva que o previsto.

## 6. Teste mínimo de runtime

Para considerar a implementação `EXECUTED`, deve ser possível demonstrar:

1. Huly inicializa;
2. aplicação Intent aparece na interface;
3. usuário cria uma Intent;
4. `originator` é registrado explicitamente;
5. Intent persiste após navegação/reload;
6. estado inicia em `open`;
7. estado pode avançar para `in_progress`;
8. estado pode avançar para `completed`;
9. uma segunda Contribution pode ser adicionada;
10. Contribution preserva autor próprio;
11. Contribution preserva timestamp próprio;
12. múltiplas contributions podem ser listadas;
13. `evidenceReference` pode ser salvo;
14. `result` pode ser salvo;
15. activity/history apresenta pelo menos criação ou alteração da Intent.

## 7. Fora do escopo desta fase

Não exigir:

- enforcement servidor-side de transições;
- attachments;
- notificações específicas;
- Desktop;
- traduções completas;
- reputação;
- Evidence como entidade;
- Verification;
- blockchain;
- token;
- DAO;
- DID;
- federação.

## 8. Classificação

### PASS

Todos os comportamentos mínimos necessários funcionam e nenhuma correção
exige:

- alteração funcional de core;
- quinto pacote;
- server plugin específico;
- serviço novo;
- dependência arquitetural externa.

Pequenas correções locais dentro dos quatro pacotes Intent são permitidas,
desde que sejam registradas.

### PARTIAL

A Intent funciona, mas necessita um ou mais dos seguintes:

- wiring upstream adicional relevante;
- uso frágil/não previsto de internals;
- correções materiais fora dos quatro pacotes;
- comportamento mínimo apenas parcialmente funcional.

### FAIL

Para tornar a Intent funcional seria necessário:

- modificar funcionalmente core/aplicações existentes;
- criar infraestrutura própria relevante;
- reinterpretar substancialmente uma entidade existente como Intent;
- abandonar propriedades mínimas da Intent apenas para fazer o teste passar.

### INCONCLUSIVO

Problemas de ambiente/toolchain impedem determinar se a falha é da arquitetura
ou da configuração local.

Erro de setup de Node, Docker, GitHub Packages ou Rush não deve ser
automaticamente classificado como FAIL arquitetural.

## 9. Registro de correções

Toda correção posterior à primeira execução deve registrar:

estado anterior → erro observado → alteração → resultado posterior.

Os critérios desta preregistração não podem ser alterados retroativamente
depois da observação do runtime.

## 10. Limitações epistemológicas

Mesmo PASS demonstrará apenas:

Intent executada uma vez no ambiente local neste SHA do Huly.

PASS NÃO demonstrará:

- estabilidade de upgrades;
- produção;
- segurança;
- escalabilidade;
- utilidade externa;
- adoção;
- product-market fit;
- superioridade sobre outras plataformas.

## 11. Estado

FASE C:

PREREGISTRADA / NÃO EXECUTADA.

RESULTADO:

AINDA NÃO EXISTE.


## Regras adicionais congeladas antes da primeira execução

### Correções durante o runtime

Uma correção posterior ao primeiro comando de execução ainda pode permanecer compatível com PASS somente quando estiver limitada a:

- `models/intent/`
- `plugins/intent/`
- `plugins/intent-resources/`
- `plugins/intent-assets/`

ou aos cinco touchpoints upstream já previstos, exclusivamente quando a alteração permanecer mecânica de wiring:

- `rush.json`
- `models/all/package.json`
- `models/all/src/index.ts`
- `dev/prod/package.json`
- `dev/prod/src/platform.ts`

O número de tentativas, isoladamente, não determina a classificação.

Entretanto, a necessidade de qualquer um dos itens abaixo impede classificação PASS:

- novo pacote além dos quatro pacotes Intent previstos;
- novo serviço;
- server plugin;
- nova dependência arquitetural externa;
- modificação funcional de core ou de aplicação upstream;
- novo touchpoint estrutural upstream não preregistrado.

Nesses casos, o resultado deverá ser classificado como PARTIAL ou FAIL conforme a natureza da dependência observada e os demais critérios preregistrados.

Toda correção posterior à primeira execução deverá preservar o registro:

estado anterior → erro observado → modificação realizada → estado posterior.

Os critérios desta preregistração não poderão ser alterados retroativamente para acomodar o resultado observado.

### Falhas de compilação e ambiente

Uma falha causada exclusivamente pelo ambiente ou toolchain poderá resultar em INCONCLUSIVO quando não for possível distinguir adequadamente setup de arquitetura.

Uma falha de compilação causada pelo código do Intent NÃO deverá ser classificada como problema ambiental.

Nesse caso:

1. registrar o erro original;
2. identificar sua causa;
3. verificar se a correção permanece dentro do escopo permitido pela regra de correções acima;
4. realizar a correção, se compatível;
5. registrar a alteração;
6. repetir a execução.

Erro de código corrigível dentro do escopo preregistrado não produz automaticamente FAIL, mas sua existência e correção devem permanecer registradas.

Erro cuja correção exija expansão arquitetural proibida pela regra acima impede PASS.


END OF TECH-SPIKE-HULY-001 PREREGISTRATION
