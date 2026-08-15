# TECH-SPIKE-002 — Teste de representação do ciclo Genesis encerrado

Classe: Síntese / Spike tecnológico experimental

Status: PROVISÓRIO — teste de representação; não constitui decisão arquitetural nem decisão de protocolo

Data de registro: 2026-08-15

Base documental: `2ee52d91b2421db06c9f0b9ad073798843274340`

## Objetivo

Testar se o ciclo real já encerrado

INTENT-000 → COMMITMENT-001 → CONTRIBUTION-001 → VERIFICATION-001

pode ser representado com padrões existentes sem perda de fatos essenciais.

Este spike testa a hipótese provisória registrada em `graph/TECH-SPIKE-001.md`. Ele não a substitui silenciosamente.

## Fontes do repositório lidas integralmente

- `genesis/INTENT-000.md`
- `genesis/commitments/COMMITMENT-001.md`
- `genesis/contributions/KIMI-ENTREGA-001.md`
- `genesis/verifications/VERIFICATION-001.md`

O conteúdo ausente dessas fontes não foi reconstruído por memória.

## Padrões e limites do teste

- W3C PROV / PROV-O: `http://www.w3.org/ns/prov#`
- JSON-LD 1.1: `https://www.w3.org/TR/json-ld11/`
- A2A: conceitos de Task, Artifact e Context apenas quando materialmente úteis — `https://a2a-protocol.org/latest/specification/`
- Git: armazenamento canônico atual

A2A não é afirmado como mecanismo histórico deste ciclo. Seus conceitos servem apenas para testar alinhamento futuro de interação, ciclo de tarefa e artefatos.

Não são introduzidos blockchain, IPFS, DID/VC, OPA, CRDT, Graphiti, Neo4j, tokens, banco de dados novo ou plataforma nova.

## Teste de alinhamento A2A

| Elemento do ciclo | Conceito A2A útil | Resultado |
|---|---|---|
| atividade de entrega e tentativa B | Task | DOMAIN-SEMANTIC — alinhamento conceitual; não houve Task A2A histórica demonstrada |
| contribuição de Kimi e saída experimental de Claude | Artifact | DOMAIN-SEMANTIC — poderiam ser outputs de Task; os arquivos Git continuam canônicos |
| agrupamento das interações do ciclo | Context | DOMAIN-SEMANTIC — poderia correlacionar tarefas; não substitui proveniência nem o fluxo registrado |
| termos, aceitação e estado do compromisso | nenhum conceito A2A central suficiente | DOMAIN-SEMANTIC — permanecem no vocabulário JSON-LD e na composição PROV |

A2A cobre comportamento de interação e ciclo de tarefa. Ele não fornece, neste teste, a semântica completa do compromisso nem substitui os registros canônicos.

## Classes de resultado

- `REPRESENTED`: preservado diretamente por primitivas existentes e referência ao registro canônico.
- `LOSSY`: representável apenas com perda identificável de significado essencial.
- `UNREPRESENTED`: sem representação adequada demonstrada neste teste.
- `DOMAIN-SEMANTIC`: preservado por composição de primitivas existentes com vocabulário JSON-LD específico do domínio.

Uma propriedade JSON-LD específica da aplicação não implica, por si só, nova infraestrutura, novo protocolo ou nova plataforma.

## Representação candidata JSON-LD / PROV

O namespace `urn:celula-zero:vocab:` abaixo é apenas vocabulário candidato deste teste. Ele não é schema aprovado.

Os campos estruturados destacam os fatos necessários ao teste. Os blobs Git identificados preservam o conteúdo integral das quatro fontes e continuam sendo a autoridade textual; a extração JSON-LD não os substitui.

```json
{
  "@context": {
    "prov": "http://www.w3.org/ns/prov#",
    "cz": "urn:celula-zero:id:",
    "czv": "urn:celula-zero:vocab:",
    "id": "@id",
    "type": "@type"
  },
  "@graph": [
    {
      "id": "cz:GenesisCycle-000",
      "type": ["prov:Collection", "czv:ClosedGenesisCycle"],
      "czv:status": "CLOSED",
      "prov:hadMember": [
        {"id": "cz:INTENT-000"},
        {"id": "cz:COMMITMENT-001"},
        {"id": "cz:CONTRIBUTION-001"},
        {"id": "cz:VERIFICATION-001"}
      ],
      "czv:orderedMember": {
        "@list": [
          {"id": "cz:INTENT-000"},
          {"id": "cz:COMMITMENT-001"},
          {"id": "cz:CONTRIBUTION-001"},
          {"id": "cz:VERIFICATION-001"}
        ]
      }
    },
    {
      "id": "cz:CanonicalGitStore",
      "type": ["prov:Entity", "czv:CanonicalStore"],
      "czv:repository": "https://github.com/MMaia-jr/celula-zero",
      "czv:storageTechnology": "Git"
    },
    {
      "id": "cz:CelulaZero",
      "type": "prov:Agent",
      "czv:label": "Célula Zero"
    },
    {
      "id": "cz:Kimi",
      "type": "prov:Agent",
      "czv:label": "Kimi"
    },
    {
      "id": "cz:Claude",
      "type": "prov:Agent",
      "czv:label": "Claude"
    },
    {
      "id": "czv:initialProposer",
      "type": "prov:Role"
    },
    {
      "id": "czv:counterparty",
      "type": "prov:Role"
    },
    {
      "id": "cz:INTENT-000",
      "type": ["prov:Entity", "czv:Intent"],
      "czv:label": "Construir o Protocolo dos Protocolos",
      "czv:gitPath": "genesis/INTENT-000.md",
      "czv:sourceCommit": "2ee52d91b2421db06c9f0b9ad073798843274340",
      "czv:gitBlob": "39a1f06d52611d2b0a1a97960d6819a1b12377b8",
      "czv:storedIn": {"id": "cz:CanonicalGitStore"},
      "czv:status": "SONHO / início do PLANEJAMENTO",
      "czv:formulation": "Construir e testar um Protocolo dos Protocolos usando a própria Célula Zero como Genesis Cell: uma infraestrutura em que agentes com identidades, regras, objetivos e formas de governança diferentes possam declarar intenções, estabelecer compromissos, cooperar, produzir evidências e interoperar sem submeter tudo a um protocolo central único.",
      "czv:problem": "Agentes diferentes possuem regras, contextos, capacidades e objetivos diferentes, mas hoje cooperar entre esses sistemas exige frequentemente centralização, perda de contexto ou adoção de uma estrutura comum.",
      "czv:hypothesis": "É possível criar um meta-protocolo mínimo que permita interoperabilidade entre agentes/protocolos distintos preservando autonomia local.",
      "czv:operationalBoundary": "O Protocolo dos Protocolos não define como cada agente deve funcionar internamente.",
      "czv:coordinationGoal": "Permitir coordenação entre protocolos diferentes sem exigir governança, identidade ou infraestrutura interna comum.",
      "czv:definitionStatus": "provisória e testada pela própria INTENT-000",
      "czv:minimumInterface": [
        "quem são",
        "o que pretendem",
        "o que podem oferecer",
        "o que precisam",
        "quais condições impõem",
        "com o que se comprometem",
        "quais evidências produzem",
        "como um resultado pode ser verificado",
        "quais regras locais precisam ser respeitadas na interação"
      ],
      "czv:currentAsset": [
        "Célula Zero",
        "repositório",
        "GRAPH-000",
        "pesquisa sobre proveniência e governança",
        "agentes atuais",
        "histórico de testes",
        "visão de passado/presente/futuro"
      ],
      "czv:candidateNeed": [
        "desenvolvimento",
        "produto/UX",
        "segurança",
        "economia/modelo de incentivos",
        "jurídico/regulatório",
        "usuários externos para teste"
      ],
      "czv:needsAreFormalVacancies": false,
      "czv:externalContributionDeclaration": [
        "capacidade",
        "disponibilidade",
        "condições",
        "recompensa esperada",
        "evidência de capacidade"
      ],
      "czv:contributionProcessDefinitive": false,
      "czv:currentOffer": [
        "participação pública na construção",
        "evidência de contribuição",
        "reconhecimento contextual",
        "possibilidade de papel futuro na Genesis Cell"
      ],
      "czv:nonPromise": [
        "salário",
        "equity",
        "token",
        "renda futura",
        "participação econômica",
        "governança permanente",
        "emprego"
      ],
      "czv:minimumExpectedResult": "Um agente externo deve conseguir entender o que está sendo construído, o estado atual, o que falta, como contribuir e o que receberia ou não receberia.",
      "czv:firstTest": "Tornar a INTENT-000 compreensível para um agente externo e permitir proposta de contribuição com capacidade, condições, disponibilidade, recompensa esperada e evidências relevantes.",
      "czv:firstTestExclusion": [
        "plataforma",
        "blockchain",
        "smart contract",
        "token",
        "DAO operacional"
      ],
      "czv:validationCriterion": "A INTENT-000 só avança de SONHO / PLANEJAMENTO para execução quando pelo menos um agente externo conseguir compreender a intenção e formular uma proposta concreta de contribuição sem precisar de explicação privada extensa."
    },
    {
      "id": "cz:OFFER-001",
      "type": ["prov:Entity", "czv:ContributionOffer"],
      "prov:wasAttributedTo": {"id": "cz:Kimi"},
      "prov:wasDerivedFrom": {"id": "cz:INTENT-000"},
      "czv:offerItem": [
        "analisar quais das nove interfaces mínimas estão presentes na INTENT-000",
        "identificar quais estão ausentes ou implícitas",
        "propor um template mínimo para futuras INTENTs",
        "testar se o protocolo é auto-aplicável"
      ],
      "czv:provenanceLimitation": "Síntese da oferta recebida; o Registro Original integral da oferta não foi incorporado ao repositório."
    },
    {
      "id": "cz:TERMS-001",
      "type": ["prov:Entity", "czv:CommitmentTerms"],
      "prov:wasAttributedTo": {"id": "cz:CelulaZero"},
      "czv:scope": "Analisar a INTENT-000 contra as nove interfaces mínimas já declaradas.",
      "czv:expectedDelivery": [
        "quais das nove interfaces estão explicitamente presentes",
        "quais estão implícitas",
        "quais estão ausentes",
        "quais são necessárias para uma intenção mínima",
        "um template mínimo candidato para futuras INTENTs"
      ],
      "czv:restriction": [
        "não definir arquitetura técnica",
        "não introduzir blockchain, token ou DAO como requisito",
        "não alterar o repositório",
        "separar conteúdo do repositório de inferências próprias",
        "tratar o template como hipótese, não como padrão aprovado"
      ],
      "czv:reward": "nenhuma recompensa econômica neste ciclo",
      "czv:preservationCondition": "Caso a contribuição seja preservada, autoria, contexto e evidência de participação serão registrados.",
      "czv:completionCriterion": "Uma pessoa ou agente diferente deve conseguir usar o template proposto para expressar uma nova intenção sem precisar conhecer a história da Célula Zero."
    },
    {
      "id": "cz:ACCEPTANCE-001",
      "type": ["prov:Entity", "czv:ExplicitAcceptance"],
      "prov:wasAttributedTo": {"id": "cz:Kimi"},
      "prov:wasDerivedFrom": {"id": "cz:TERMS-001"},
      "prov:value": "ACEITO."
    },
    {
      "id": "cz:COMMITMENT-001",
      "type": ["prov:Entity", "czv:Commitment"],
      "czv:gitPath": "genesis/commitments/COMMITMENT-001.md",
      "czv:sourceCommit": "2ee52d91b2421db06c9f0b9ad073798843274340",
      "czv:gitBlob": "ccf55c01da6924b06c8a7a8d1a729de5b429086b",
      "czv:storedIn": {"id": "cz:CanonicalGitStore"},
      "prov:wasDerivedFrom": [
        {"id": "cz:INTENT-000"},
        {"id": "cz:OFFER-001"},
        {"id": "cz:TERMS-001"},
        {"id": "cz:ACCEPTANCE-001"}
      ],
      "prov:qualifiedAttribution": [
        {
          "type": "prov:Attribution",
          "prov:agent": {"id": "cz:Kimi"},
          "prov:hadRole": {"id": "czv:initialProposer"}
        },
        {
          "type": "prov:Attribution",
          "prov:agent": {"id": "cz:CelulaZero"},
          "prov:hadRole": {"id": "czv:counterparty"}
        }
      ],
      "czv:party": [
        {"id": "cz:Kimi"},
        {"id": "cz:CelulaZero"}
      ],
      "czv:proposal": {"id": "cz:OFFER-001"},
      "czv:terms": {"id": "cz:TERMS-001"},
      "czv:acceptance": {"id": "cz:ACCEPTANCE-001"},
      "czv:relatedIntent": {"id": "cz:INTENT-000"},
      "czv:status": "CUMPRIDO / VERIFICADO",
      "czv:contribution": {"id": "cz:CONTRIBUTION-001"},
      "czv:verification": {"id": "cz:VERIFICATION-001"},
      "czv:doesNotApproveTemplate": true
    },
    {
      "id": "cz:DeliveryActivity-001",
      "type": "prov:Activity",
      "prov:used": [
        {"id": "cz:INTENT-000"},
        {"id": "cz:COMMITMENT-001"}
      ],
      "prov:wasAssociatedWith": {"id": "cz:Kimi"},
      "prov:generated": {"id": "cz:CONTRIBUTION-001"}
    },
    {
      "id": "cz:CONTRIBUTION-001",
      "type": ["prov:Entity", "czv:Contribution"],
      "czv:gitPath": "genesis/contributions/KIMI-ENTREGA-001.md",
      "czv:sourceCommit": "2ee52d91b2421db06c9f0b9ad073798843274340",
      "czv:gitBlob": "3d27b21589c1d361227877efc7e86d720e851e54",
      "czv:storedIn": {"id": "cz:CanonicalGitStore"},
      "czv:recordedDate": "2026-08-15",
      "prov:wasAttributedTo": {"id": "cz:Kimi"},
      "prov:wasGeneratedBy": {"id": "cz:DeliveryActivity-001"},
      "prov:wasDerivedFrom": [
        {"id": "cz:INTENT-000"},
        {"id": "cz:COMMITMENT-001"}
      ],
      "czv:contains": [
        {"id": "cz:InterfaceAssessment-001"},
        {"id": "cz:TemplateCandidate-001"}
      ],
      "czv:assertedRepositoryChange": false,
      "czv:evidenceOfParticipation": true
    },
    {
      "id": "cz:InterfaceAssessment-001",
      "type": ["prov:Entity", "czv:InterfaceAssessment"],
      "prov:wasAttributedTo": {"id": "cz:Kimi"},
      "prov:wasDerivedFrom": {"id": "cz:INTENT-000"},
      "czv:assessment": [
        {"czv:interface": "quem são", "czv:classification": "EXPLICITAMENTE PRESENTE"},
        {"czv:interface": "o que pretendem", "czv:classification": "EXPLICITAMENTE PRESENTE"},
        {"czv:interface": "o que podem oferecer", "czv:classification": "EXPLICITAMENTE PRESENTE"},
        {"czv:interface": "o que precisam", "czv:classification": "EXPLICITAMENTE PRESENTE"},
        {"czv:interface": "quais condições impõem", "czv:classification": "PARCIALMENTE PRESENTE / IMPLÍCITA"},
        {"czv:interface": "com o que se comprometem", "czv:classification": "IMPLÍCITA"},
        {"czv:interface": "quais evidências produzem", "czv:classification": "IMPLÍCITA"},
        {"czv:interface": "como um resultado pode ser verificado", "czv:classification": "EXPLICITAMENTE PRESENTE"},
        {"czv:interface": "quais regras locais precisam ser respeitadas", "czv:classification": "AUSENTE"}
      ],
      "czv:sourceInferenceSeparated": true
    },
    {
      "id": "cz:TemplateCandidate-001",
      "type": ["prov:Entity", "czv:IntentTemplateCandidate"],
      "prov:wasAttributedTo": {"id": "cz:Kimi"},
      "prov:wasDerivedFrom": {"id": "cz:CONTRIBUTION-001"},
      "czv:status": "HIPÓTESE — não padrão aprovado",
      "czv:requiredSection": [
        "IDENTIDADE",
        "INTENÇÃO",
        "COMPROMISSO",
        "VERIFICAÇÃO",
        "ESTADO"
      ],
      "czv:recommendedSection": [
        "OFERTA",
        "NECESSIDADES",
        "CONDIÇÕES",
        "HISTÓRICO DE REVISÕES"
      ],
      "czv:desirableSection": [
        "EVIDÊNCIAS",
        "REGRAS LOCAIS"
      ],
      "czv:designConstraint": [
        "não requer conhecimento da Célula Zero ou de sua história",
        "não assume arquitetura técnica, blockchain, token ou DAO",
        "separa obrigatório de opcional",
        "trata o template como hipótese testável"
      ],
      "czv:selfTest": {
        "czv:explicitInterfaceCount": 5,
        "czv:implicitInterfaceCount": 2,
        "czv:absentInterfaceCount": 2
      }
    },
    {
      "id": "cz:VerificationAttempt-A",
      "type": ["prov:Activity", "czv:VerificationAttempt"],
      "czv:status": "INCONCLUSIVA",
      "czv:reason": "input incorreto"
    },
    {
      "id": "cz:VerificationAttempt-B",
      "type": ["prov:Activity", "czv:VerificationAttempt"],
      "prov:used": {"id": "cz:TemplateCandidate-001"},
      "prov:wasAssociatedWith": {"id": "cz:Claude"},
      "prov:generated": {"id": "cz:ClaudeExperimentalIntentOutput"},
      "czv:status": "EXECUTADA",
      "czv:inputContext": "somente o template e instruções de preenchimento",
      "czv:historicalContextProvided": false
    },
    {
      "id": "cz:ClaudeExperimentalIntentOutput",
      "type": ["prov:Entity", "czv:ExperimentalIntentOutput"],
      "prov:wasAttributedTo": {"id": "cz:Claude"},
      "prov:wasGeneratedBy": {"id": "cz:VerificationAttempt-B"},
      "prov:wasDerivedFrom": {"id": "cz:TemplateCandidate-001"},
      "czv:label": "INTENT-001 — Responder com precisão e utilidade genuína nesta conversa",
      "czv:declaredState": "EXECUÇÃO",
      "czv:isCanonicalIntent": false
    },
    {
      "id": "cz:VerificationEvaluation-001",
      "type": "prov:Activity",
      "prov:used": [
        {"id": "cz:ClaudeExperimentalIntentOutput"},
        {"id": "cz:COMMITMENT-001"}
      ],
      "prov:generated": {"id": "cz:VERIFICATION-001"}
    },
    {
      "id": "cz:VERIFICATION-001",
      "type": ["prov:Entity", "czv:Verification"],
      "czv:gitPath": "genesis/verifications/VERIFICATION-001.md",
      "czv:sourceCommit": "2ee52d91b2421db06c9f0b9ad073798843274340",
      "czv:gitBlob": "95297e718f578a880eba31be739f459bdb327624",
      "czv:storedIn": {"id": "cz:CanonicalGitStore"},
      "prov:wasGeneratedBy": {"id": "cz:VerificationEvaluation-001"},
      "prov:wasDerivedFrom": [
        {"id": "cz:ClaudeExperimentalIntentOutput"},
        {"id": "cz:COMMITMENT-001"}
      ],
      "czv:objectVerified": {"id": "cz:TemplateCandidate-001"},
      "czv:verifier": {"id": "cz:Claude"},
      "czv:attempt": [
        {"id": "cz:VerificationAttempt-A"},
        {"id": "cz:VerificationAttempt-B"}
      ],
      "czv:criterion": "Uma pessoa ou agente diferente deve conseguir usar o template proposto para expressar uma nova intenção sem precisar conhecer a história da Célula Zero.",
      "czv:result": "PASSA",
      "czv:justification": "Claude usou o template para expressar uma nova intenção sem receber contexto histórico da Célula Zero.",
      "czv:doesNotApproveTemplate": true
    }
  ]
}
```

## Inventário de fatos essenciais

| Fonte | Fato essencial | Classe | Representação candidata |
|---|---|---|---|
| INTENT-000 | existência, identificador, título e arquivo canônico | REPRESENTED | `prov:Entity`, identificador e `czv:gitPath` |
| INTENT-000 | estado `SONHO / início do PLANEJAMENTO` | DOMAIN-SEMANTIC | `czv:status` preserva o literal |
| INTENT-000 | formulação central, problema e hipótese | DOMAIN-SEMANTIC | propriedades namespaced com texto preservado |
| INTENT-000 | limite sobre funcionamento interno, objetivo de coordenação e caráter provisório | DOMAIN-SEMANTIC | `czv:operationalBoundary`, `czv:coordinationGoal` e `czv:definitionStatus` |
| INTENT-000 | nove interfaces mínimas | DOMAIN-SEMANTIC | lista `czv:minimumInterface` |
| INTENT-000 | ativos existentes e necessidades candidatas | DOMAIN-SEMANTIC | `czv:currentAsset` e `czv:candidateNeed` |
| INTENT-000 | necessidades não são vagas formais e processo de contribuição não é definitivo | DOMAIN-SEMANTIC | dois booleanos explícitos |
| INTENT-000 | dados pedidos a uma oferta externa | DOMAIN-SEMANTIC | `czv:externalContributionDeclaration` |
| INTENT-000 | ofertas atuais e não promessas | DOMAIN-SEMANTIC | `czv:currentOffer` e `czv:nonPromise` |
| INTENT-000 | resultado mínimo, primeiro teste e exclusões | DOMAIN-SEMANTIC | literais e listas namespaced |
| INTENT-000 | critério de validação | DOMAIN-SEMANTIC | `czv:validationCriterion` |
| COMMITMENT-001 | relação com INTENT-000 | REPRESENTED | `prov:wasDerivedFrom` e `czv:relatedIntent` |
| COMMITMENT-001 | Kimi como proponente e Célula Zero como contraparte | DOMAIN-SEMANTIC | agentes PROV, associação qualificada e papéis de domínio |
| COMMITMENT-001 | síntese da oferta e ausência do Registro Original integral | DOMAIN-SEMANTIC | `cz:OFFER-001` e `czv:provenanceLimitation` |
| COMMITMENT-001 | proposta/termos e aceitação explícita `ACEITO.` | DOMAIN-SEMANTIC | entidades atribuídas, derivação e `prov:value` |
| COMMITMENT-001 | escopo | DOMAIN-SEMANTIC | `czv:scope` em `cz:TERMS-001` |
| COMMITMENT-001 | cinco itens de entrega esperada | DOMAIN-SEMANTIC | `czv:expectedDelivery` |
| COMMITMENT-001 | cinco restrições | DOMAIN-SEMANTIC | `czv:restriction` |
| COMMITMENT-001 | recompensa não econômica | DOMAIN-SEMANTIC | `czv:reward` |
| COMMITMENT-001 | condição de preservação de autoria, contexto e evidência | DOMAIN-SEMANTIC | `czv:preservationCondition` |
| COMMITMENT-001 | critério de conclusão | DOMAIN-SEMANTIC | `czv:completionCriterion` |
| COMMITMENT-001 | estado `CUMPRIDO / VERIFICADO` | DOMAIN-SEMANTIC | `czv:status` |
| COMMITMENT-001 | referências à contribuição e à verificação | REPRESENTED | relações identificadas para as entidades |
| COMMITMENT-001 | template não convertido em decisão de protocolo | DOMAIN-SEMANTIC | `czv:doesNotApproveTemplate` |
| CONTRIBUTION-001 | autoria de Kimi, arquivo, data e derivação | REPRESENTED | agente, atribuição, atividade, derivação e Git path |
| CONTRIBUTION-001 | conteúdo integral e observações analíticas | REPRESENTED | commit e blob Git preservam o Registro Original completo |
| CONTRIBUTION-001 | avaliação das nove interfaces | DOMAIN-SEMANTIC | nove pares interface/classificação |
| CONTRIBUTION-001 | separação entre repositório e inferência | DOMAIN-SEMANTIC | `czv:sourceInferenceSeparated` e fonte canônica |
| CONTRIBUTION-001 | template candidato e status de hipótese | DOMAIN-SEMANTIC | `cz:TemplateCandidate-001` e `czv:status` |
| CONTRIBUTION-001 | seções obrigatórias, recomendáveis e desejáveis | DOMAIN-SEMANTIC | três listas namespaced |
| CONTRIBUTION-001 | autoaplicação: cinco explícitas, duas implícitas e duas ausentes | DOMAIN-SEMANTIC | `czv:selfTest` com contagens exatas |
| CONTRIBUTION-001 | afirmação de nenhuma alteração no repositório | DOMAIN-SEMANTIC | `czv:assertedRepositoryChange: false` |
| CONTRIBUTION-001 | evidência de participação | DOMAIN-SEMANTIC | `czv:evidenceOfParticipation: true` e atribuição |
| VERIFICATION-001 | objeto verificado e Claude como agente verificador | DOMAIN-SEMANTIC | atividade PROV mais `czv:objectVerified` e `czv:verifier` |
| VERIFICATION-001 | tentativa A inconclusiva por input incorreto | DOMAIN-SEMANTIC | atividade, estado e razão |
| VERIFICATION-001 | tentativa B com template correto | DOMAIN-SEMANTIC | atividade que usa o template, estado de domínio e saída gerada |
| VERIFICATION-001 | somente template/instruções e nenhum contexto histórico | DOMAIN-SEMANTIC | `czv:inputContext` e booleano explícito |
| VERIFICATION-001 | resposta integral de Claude preservada no Git | REPRESENTED | entidade gerada, atribuída e referenciada pelo arquivo canônico |
| VERIFICATION-001 | saída chamada `INTENT-001` não canônica | DOMAIN-SEMANTIC | `czv:isCanonicalIntent: false` |
| VERIFICATION-001 | critério avaliado e resultado `PASSA` | DOMAIN-SEMANTIC | `czv:criterion` e `czv:result` |
| VERIFICATION-001 | PASSA não aprova o template | DOMAIN-SEMANTIC | `czv:doesNotApproveTemplate` |
| Ciclo | sequência e fechamento | DOMAIN-SEMANTIC | coleção, `@list` ordenada pelo fluxo documentado e estado `CLOSED` |
| Armazenamento | Git como fonte canônica atual | REPRESENTED | entidade `cz:CanonicalGitStore`, commit, blobs e caminhos dos arquivos |

## Resultado do teste

### 1. Fatos que mapeiam diretamente

- agentes como `prov:Agent`;
- registros, oferta, termos, aceitação, contribuição, template, saída e verificação como `prov:Entity`;
- entrega e tentativas de verificação como `prov:Activity`;
- autoria com `prov:wasAttributedTo`;
- participação em atividades com `prov:wasAssociatedWith` e associações qualificadas;
- uso, geração e derivação com `prov:used`, `prov:generated`, `prov:wasGeneratedBy` e `prov:wasDerivedFrom`;
- arquivos e caminhos preservados no Git canônico.

### 2. Fatos que mapeiam apenas por composição

- Commitment como composição de Intent, oferta, termos, partes, papéis e aceitação explícita;
- escopo, condições, restrições, recompensa, entrega esperada e critério de conclusão como conteúdo dos termos;
- estado `CUMPRIDO / VERIFICADO` como estado de domínio ligado ao conjunto composto;
- Intent como entidade proveniente com campos semânticos de domínio;
- Verification como atividade que usa template e saída, seguida de entidade de resultado;
- a distinção entre uma saída experimental chamada `INTENT-001` e uma INTENT canônica.

### 3. Fatos que perdem semântica

Nenhum fato essencial perde semântica na representação candidata enquanto os literais, os termos namespaced e as referências aos arquivos Git permanecerem juntos.

Uma projeção contendo somente relações PROV-O, sem o pequeno vocabulário de domínio, seria `LOSSY` para proposta, aceitação, escopo, condições, restrições, recompensa, entrega esperada, critério de conclusão e estado do compromisso.

Não há fato essencial classificado como `UNREPRESENTED` neste teste.

### 4. Estado de Commitment

Revisão proposta: `Commitment` deve passar de `EXTEND` para `MAP`.

O ciclo demonstra que seus fatos essenciais podem ser preservados pela composição de entidades, agentes, atividades, atribuições, papéis, derivação e literais JSON-LD namespaced. Não foi demonstrada necessidade de uma nova primitiva de protocolo interoperável.

Esta revisão é resultado provisório de spike, não decisão de schema ou protocolo.

### 5. MISSING demonstrado

Nenhum `MISSING` real foi demonstrado.

Isso não prova completude para ciclos futuros; registra somente o resultado deste ciclo real.

### 6. Menor camada semântica específica ainda necessária

Um vocabulário JSON-LD pequeno e versionável para nomear:

- Intent, Commitment, Contribution e Verification;
- partes e papéis;
- proposta, termos e aceitação;
- escopo, condições, restrições e recompensa;
- entrega esperada e critério de conclusão;
- estado, resultado e condição de canonicidade;
- caminho e papel do registro Git.

Essa camada é vocabulário de representação. Ela não define comportamento de protocolo, transporte, execução, autorização ou armazenamento.

### 7. O que demonstravelmente não precisamos construir

Para representar este ciclo, não foi demonstrada necessidade de:

- infraestrutura proprietária;
- protocolo novo de proveniência;
- transporte novo entre agentes;
- banco de dados novo;
- plataforma nova;
- blockchain;
- IPFS;
- DID/VC;
- OPA;
- CRDT;
- Graphiti;
- Neo4j;
- tokens.

A2A pode ser usado futuramente para interação, ciclo de Task, Context e Artifact, mas não é necessário para preservar retrospectivamente este ciclo no Git.

## Conclusão provisória

O ciclo completo é representável por composição de PROV-O, JSON-LD, vocabulário mínimo de domínio e referências ao Git canônico, sem perda essencial demonstrada.

O resultado revisa a hipótese `Commitment: EXTEND` de TECH-SPIKE-001 para `Commitment: MAP` neste teste. TECH-SPIKE-001 permanece preservado como hipótese anterior.

Nenhuma arquitetura, extensão de schema, implementação A2A ou mudança de protocolo é decidida por este artefato.
