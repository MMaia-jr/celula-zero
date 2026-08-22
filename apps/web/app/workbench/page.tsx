import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  acceptProposalAction,
  attachArtifactAction,
  createOpportunityAction,
  issueVerificationAction,
  recordClaimAction,
  registerEvidenceAction,
  registerProjectAgentAction,
  requestVerificationAction,
  submitContributionAction,
  submitProposalAction,
} from "@/app/workbench/actions";
import {
  getWorkbenchData,
  type WorkbenchActor,
  type WorkbenchOpportunityState,
  type WorkbenchProject,
} from "@/lib/data/workbench";

interface WorkbenchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const stateLabel: Record<WorkbenchOpportunityState, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberta",
  CLOSED: "Fechada",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function actorName(project: WorkbenchProject, actorId: string) {
  return project.actors.find((actor) => actor.id === actorId)?.name ?? actorId;
}

function commandFields(prefix: string) {
  return (
    <>
      <input type="hidden" name="commandId" value={randomUUID()} />
      <input
        type="hidden"
        name="idempotencyKey"
        value={`${prefix}-${randomUUID()}`}
      />
    </>
  );
}

function projectFields(project: WorkbenchProject) {
  return (
    <>
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="projectSlug" value={project.slug} />
    </>
  );
}

function ActorTag({ actor }: { actor: WorkbenchActor }) {
  return (
    <span className="source-tag">
      {actor.name} · {actor.kind}
      {actor.controlled ? " · controlado" : ""}
    </span>
  );
}

export default async function WorkbenchPage({ searchParams }: WorkbenchPageProps) {
  const data = await getWorkbenchData();
  if (data.status === "ANONYMOUS") redirect("/login");

  const params = await searchParams;
  const error = first(params.error);
  const ok = first(params.ok);

  return (
    <main className="section-shell">
      <div className="breadcrumb">
        <Link href="/">Início</Link><span aria-hidden="true">/</span><span>Operar</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">OPERATING-LOOP-MVP · dogfood interno</p>
          <h1>Operar a Célula Zero</h1>
          <p>
            Uma única superfície para atravessar Opportunity → Proposal → Commitment
            → Contribution → Artifact → Claim/Evidence → Verification, preservando
            autoridade e atribuição no backend já existente.
          </p>
        </div>
      </header>

      {data.status === "UNAVAILABLE" ? (
        <section className="content-block">
          <h2>Backend local indisponível</h2>
          <p>Configure a stack Supabase antes de tentar operar o workbench.</p>
        </section>
      ) : null}

      {error ? (
        <p className="form-message form-error" role="alert">
          A ação não foi concluída ({error}). Nenhum sucesso foi presumido.
        </p>
      ) : null}

      {ok ? (
        <p className="form-message" role="status">
          Estado persistido: {ok}.
        </p>
      ) : null}

      {data.status === "READY" && data.projects.length === 0 ? (
        <section className="content-block">
          <p className="mini-label">Nenhum projeto operável ainda</p>
          <h2>Crie o projeto real usado para construir a própria Célula Zero.</h2>
          <Link className="button button-primary" href="/projects/new">
            Criar projeto operacional
          </Link>
        </section>
      ) : null}

      {data.status === "READY" ? data.projects.map((project) => {
        const controlledAgents = project.actors.filter(
          (actor) => actor.kind === "AI_AGENT" && actor.controlled,
        );

        return (
          <section className="content-block" key={project.id}>
            <div className="project-label-row">
              <span className="source-tag">{project.sourceLabel}</span>
              <span>{project.stage}</span>
            </div>
            <h2>{project.title}</h2>
            <p>
              <Link href={`/projects/${project.slug}`}>Ver página do projeto</Link>
            </p>

            <div className="project-actions">
              <a
                className="button button-secondary"
                href={`/workbench/export?project=${project.slug}&format=md`}
              >
                Exportar ciclo Markdown
              </a>
              <a
                className="button button-secondary"
                href={`/workbench/export?project=${project.slug}&format=json`}
              >
                Exportar ciclo JSON
              </a>
            </div>

            <div className="divider" />
            <p className="mini-label">Atores atribuíveis</p>
            <div className="project-label-row">
              {project.actors.map((actor) => (
                <ActorTag actor={actor} key={actor.id} />
              ))}
            </div>

            <details className="side-block">
              <summary><strong>Registrar agente contribuinte</strong></summary>
              <p>
                Isto registra identidade e atribuição. Não conecta API, não executa IA
                e não concede autonomia financeira.
              </p>
              <form className="project-form" action={registerProjectAgentAction}>
                {projectFields(project)}
                {commandFields("operating-agent")}
                <label>
                  <span>Nome do agente</span>
                  <input
                    name="name"
                    minLength={2}
                    maxLength={120}
                    placeholder="Ex.: ChatGPT, Codex, Qwen local"
                    required
                  />
                </label>
                <label>
                  <span>Operador humano</span>
                  <input
                    name="operatorLabel"
                    minLength={2}
                    maxLength={160}
                    placeholder="Ex.: Operado pelo fundador via ChatGPT Plus"
                    required
                  />
                </label>
                <button className="button button-primary" type="submit">
                  Registrar como CONTRIBUTOR
                </button>
              </form>
            </details>

            <div className="divider" />
            <p className="mini-label">Ciclo operacional</p>

            {project.opportunities.length ? project.opportunities.map((opportunity) => {
              const proposals = project.proposals.filter(
                (proposal) => proposal.opportunityId === opportunity.id,
              );

              return (
                <article className="side-block" key={opportunity.id}>
                  <div className="project-label-row">
                    <strong>{stateLabel[opportunity.state]}</strong>
                    <span>{opportunity.visibility}</span>
                    <span>owner: {actorName(project, opportunity.ownerActorId)}</span>
                  </div>
                  <h3>{opportunity.title}</h3>
                  <p>{opportunity.statement}</p>
                  <dl>
                    <div><dt>Condições</dt><dd>{opportunity.conditions}</dd></div>
                    <div><dt>Resultado esperado</dt><dd>{opportunity.expectedResult}</dd></div>
                    <div><dt>Capacidade</dt><dd>{opportunity.capacity}</dd></div>
                  </dl>

                  {opportunity.state === "OPEN" ? (
                    controlledAgents.length ? (
                      <details>
                        <summary><strong>Submeter Proposal atribuída</strong></summary>
                        <form className="project-form" action={submitProposalAction}>
                          {projectFields(project)}
                          {commandFields("operating-proposal")}
                          <input type="hidden" name="opportunityId" value={opportunity.id} />
                          <label>
                            <span>Agente proponente</span>
                            <select name="actorId" required defaultValue={controlledAgents[0]?.id}>
                              {controlledAgents.map((actor) => (
                                <option value={actor.id} key={actor.id}>{actor.name}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Proposta</span>
                            <textarea
                              name="statement"
                              rows={3}
                              minLength={10}
                              maxLength={4000}
                              required
                              defaultValue={`Proponho executar a oportunidade "${opportunity.title}" sob atribuição explícita e escopo limitado.`}
                            />
                          </label>
                          <label>
                            <span>Condições</span>
                            <textarea
                              name="conditions"
                              rows={3}
                              minLength={3}
                              maxLength={4000}
                              required
                              defaultValue={opportunity.conditions}
                            />
                          </label>
                          <label>
                            <span>Entrega esperada</span>
                            <textarea
                              name="expectedDelivery"
                              rows={3}
                              minLength={3}
                              maxLength={2000}
                              required
                              defaultValue={opportunity.expectedResult}
                            />
                          </label>
                          <label>
                            <span>Expectativa econômica</span>
                            <input
                              name="rewardExpectation"
                              minLength={2}
                              maxLength={1000}
                              required
                              defaultValue="Sem direito econômico; colaboração no piloto interno."
                            />
                          </label>
                          <button className="button button-primary" type="submit">
                            Registrar Proposal
                          </button>
                        </form>
                      </details>
                    ) : (
                      <p>
                        Registre primeiro um AI_AGENT atribuível. O steward não recebe
                        `proposal.submit` e self-acceptance continua proibido.
                      </p>
                    )
                  ) : null}

                  {proposals.map((proposal) => {
                    const commitment = project.commitments.find(
                      (item) => item.proposalId === proposal.id,
                    );
                    const proposer = project.actors.find(
                      (actor) => actor.id === proposal.proposerActorId,
                    );

                    return (
                      <section className="content-block" key={proposal.id}>
                        <div className="project-label-row">
                          <strong>Proposal · {proposal.state}</strong>
                          {proposer ? <ActorTag actor={proposer} /> : null}
                        </div>
                        <p>{proposal.statement}</p>
                        <dl>
                          <div><dt>Condições</dt><dd>{proposal.conditions}</dd></div>
                          <div><dt>Entrega</dt><dd>{proposal.expectedDelivery}</dd></div>
                          <div><dt>Economia</dt><dd>{proposal.rewardExpectation}</dd></div>
                        </dl>

                        {proposal.state === "SUBMITTED" ? (
                          <form className="project-form" action={acceptProposalAction}>
                            {projectFields(project)}
                            {commandFields("operating-accept")}
                            <input type="hidden" name="proposalId" value={proposal.id} />
                            <input
                              type="hidden"
                              name="opportunityVersion"
                              value={opportunity.currentVersion}
                            />
                            <input
                              type="hidden"
                              name="proposalVersion"
                              value={proposal.currentVersion}
                            />
                            <input
                              type="hidden"
                              name="expectedOpportunityMaterialVersion"
                              value={opportunity.materialVersion}
                            />
                            <input
                              type="hidden"
                              name="expectedProposalMaterialVersion"
                              value={proposal.materialVersion}
                            />
                            <label>
                              <span>Decisão humana</span>
                              <input
                                name="reason"
                                minLength={3}
                                maxLength={1000}
                                required
                                defaultValue="Escopo, condições e atribuição aceitos explicitamente."
                              />
                            </label>
                            <button className="button button-primary" type="submit">
                              Aceitar e criar Commitment
                            </button>
                          </form>
                        ) : null}

                        {commitment ? (
                          <section className="side-block">
                            <p className="mini-label">Commitment</p>
                            <p>
                              <strong>{actorName(project, commitment.proposerActorId)}</strong>
                              {" → aceito por "}
                              <strong>{actorName(project, commitment.acceptedByActorId)}</strong>
                            </p>

                            {project.contributions
                              .filter((item) => item.commitmentId === commitment.id)
                              .map((contribution) => {
                                const contributionArtifacts = project.artifacts.filter(
                                  (item) => item.contributionId === contribution.id,
                                );

                                return (
                                  <section className="content-block" key={contribution.id}>
                                    <p className="mini-label">Contribution</p>
                                    <p>{contribution.description}</p>
                                    <p><strong>Limitações:</strong> {contribution.limitations}</p>

                                    {contributionArtifacts.map((artifact) => {
                                      const artifactClaims = project.claims.filter(
                                        (claim) =>
                                          claim.subjectType === "ARTIFACT" &&
                                          claim.subjectId === artifact.id,
                                      );

                                      return (
                                        <section className="side-block" key={artifact.id}>
                                          <p className="mini-label">Artifact · {artifact.kind}</p>
                                          <p><code>{artifact.uri}</code></p>
                                          <p><code>{artifact.digest}</code></p>

                                          {artifactClaims.map((claim) => {
                                            const links = project.evidenceLinks.filter(
                                              (link) => link.claimId === claim.id,
                                            );
                                            const claimEvidence = links
                                              .map((link) => ({
                                                link,
                                                item: project.evidenceItems.find(
                                                  (item) => item.id === link.evidenceItemId,
                                                ),
                                              }))
                                              .filter(({ item }) => Boolean(item));
                                            const requests = project.verificationRequests.filter(
                                              (request) => request.claimId === claim.id,
                                            );

                                            return (
                                              <section className="content-block" key={claim.id}>
                                                <p className="mini-label">Claim · {claim.state}</p>
                                                <p>{claim.statement}</p>
                                                <p><strong>Escopo:</strong> {claim.scopeDescription}</p>

                                                {claimEvidence.map(({ link, item }) => item ? (
                                                  <div className="side-block" key={item.id}>
                                                    <strong>Evidence · {link.relation}</strong>
                                                    <p>{item.description}</p>
                                                    <small>{item.limitations}</small>
                                                  </div>
                                                ) : null)}

                                                {!claimEvidence.length ? (
                                                  <form
                                                    className="project-form"
                                                    action={registerEvidenceAction}
                                                  >
                                                    {projectFields(project)}
                                                    {commandFields("operating-evidence")}
                                                    <input
                                                      type="hidden"
                                                      name="actorId"
                                                      value={claim.authorActorId}
                                                    />
                                                    <input type="hidden" name="claimId" value={claim.id} />
                                                    <input
                                                      type="hidden"
                                                      name="sourceArtifactId"
                                                      value={artifact.id}
                                                    />
                                                    <input type="hidden" name="relation" value="SUPPORTS" />
                                                    <label>
                                                      <span>Uso deste artefato como evidência</span>
                                                      <textarea
                                                        name="description"
                                                        rows={3}
                                                        minLength={10}
                                                        maxLength={4000}
                                                        required
                                                        defaultValue="Este artefato é usado como fonte documental para avaliar o claim no escopo declarado."
                                                      />
                                                    </label>
                                                    <label>
                                                      <span>Limitações da evidência</span>
                                                      <textarea
                                                        name="limitations"
                                                        rows={2}
                                                        minLength={2}
                                                        maxLength={2000}
                                                        required
                                                        defaultValue="A existência do artefato não prova utilidade externa, adoção, escala ou outcome."
                                                      />
                                                    </label>
                                                    <button className="button button-primary" type="submit">
                                                      Registrar Evidence
                                                    </button>
                                                  </form>
                                                ) : null}

                                                {claimEvidence.length && requests.length === 0 ? (
                                                  <form
                                                    className="project-form"
                                                    action={requestVerificationAction}
                                                  >
                                                    {projectFields(project)}
                                                    {commandFields("operating-verification-request")}
                                                    <input type="hidden" name="claimId" value={claim.id} />
                                                    <input
                                                      type="hidden"
                                                      name="expectedMethod"
                                                      value="manual-review"
                                                    />
                                                    <label>
                                                      <span>Critério de revisão</span>
                                                      <textarea
                                                        name="criteria"
                                                        rows={3}
                                                        minLength={10}
                                                        maxLength={4000}
                                                        required
                                                        defaultValue="Verificar se o artefato e a evidência sustentam o claim declarado dentro do escopo e das limitações registradas."
                                                      />
                                                    </label>
                                                    <button className="button button-primary" type="submit">
                                                      Solicitar Verification
                                                    </button>
                                                  </form>
                                                ) : null}

                                                {requests.map((request) => {
                                                  const verification = project.verifications.find(
                                                    (item) => item.requestId === request.id,
                                                  );
                                                  return (
                                                    <section className="side-block" key={request.id}>
                                                      <div className="project-label-row">
                                                        <strong>Verification Request · {request.state}</strong>
                                                        <span>{request.independence}</span>
                                                      </div>
                                                      <p>{request.criteria}</p>
                                                      {request.conflictCodes.length ? (
                                                        <p>
                                                          <strong>Conflitos:</strong>{" "}
                                                          {request.conflictCodes.join(", ")}
                                                        </p>
                                                      ) : null}

                                                      {request.state === "OPEN" && claimEvidence.length ? (
                                                        <form
                                                          className="project-form"
                                                          action={issueVerificationAction}
                                                        >
                                                          {projectFields(project)}
                                                          {commandFields("operating-verification")}
                                                          <input
                                                            type="hidden"
                                                            name="requestId"
                                                            value={request.id}
                                                          />
                                                          <input
                                                            type="hidden"
                                                            name="method"
                                                            value={request.expectedMethod}
                                                          />
                                                          {claimEvidence.map(({ item }) => item ? (
                                                            <input
                                                              key={item.id}
                                                              type="hidden"
                                                              name="evidenceItemId"
                                                              value={item.id}
                                                            />
                                                          ) : null)}
                                                          <label>
                                                            <span>Classificação</span>
                                                            <select name="classification" defaultValue="PARTIAL">
                                                              <option>PASS</option>
                                                              <option>FAIL</option>
                                                              <option>PARTIAL</option>
                                                              <option>INCONCLUSIVE</option>
                                                            </select>
                                                          </label>
                                                          <label>
                                                            <span>Achados</span>
                                                            <textarea
                                                              name="findings"
                                                              rows={4}
                                                              minLength={10}
                                                              maxLength={4000}
                                                              required
                                                              placeholder="O que foi efetivamente observado?"
                                                            />
                                                          </label>
                                                          <label>
                                                            <span>Limitações da revisão</span>
                                                            <textarea
                                                              name="limitations"
                                                              rows={3}
                                                              minLength={2}
                                                              maxLength={2000}
                                                              required
                                                              defaultValue="Revisão interna do piloto; não demonstra independência externa, adoção ou outcome."
                                                            />
                                                          </label>
                                                          <button className="button button-primary" type="submit">
                                                            Emitir Verification
                                                          </button>
                                                        </form>
                                                      ) : null}

                                                      {verification ? (
                                                        <div className="content-block">
                                                          <p className="mini-label">
                                                            Verification · {verification.classification}
                                                          </p>
                                                          <p>{verification.findings}</p>
                                                          <p>
                                                            <strong>Independência:</strong>{" "}
                                                            {verification.independence}
                                                          </p>
                                                          <p>
                                                            <strong>Limitações:</strong>{" "}
                                                            {verification.limitations}
                                                          </p>
                                                        </div>
                                                      ) : null}
                                                    </section>
                                                  );
                                                })}
                                              </section>
                                            );
                                          })}

                                          {artifactClaims.length === 0 ? (
                                            <form className="project-form" action={recordClaimAction}>
                                              {projectFields(project)}
                                              {commandFields("operating-claim")}
                                              <input
                                                type="hidden"
                                                name="actorId"
                                                value={artifact.createdByActorId}
                                              />
                                              <input type="hidden" name="subjectType" value="ARTIFACT" />
                                              <input type="hidden" name="subjectId" value={artifact.id} />
                                              <label>
                                                <span>Claim sobre o artefato</span>
                                                <textarea
                                                  name="statement"
                                                  rows={3}
                                                  minLength={10}
                                                  maxLength={4000}
                                                  required
                                                  defaultValue="O artefato registrado corresponde à entrega declarada neste commitment dentro do escopo especificado."
                                                />
                                              </label>
                                              <label>
                                                <span>Escopo do claim</span>
                                                <textarea
                                                  name="scopeDescription"
                                                  rows={2}
                                                  minLength={3}
                                                  maxLength={2000}
                                                  required
                                                  defaultValue="Claim limitado à existência, autoria e correspondência do artefato com a entrega declarada."
                                                />
                                              </label>
                                              <button className="button button-primary" type="submit">
                                                Registrar Claim
                                              </button>
                                            </form>
                                          ) : null}
                                        </section>
                                      );
                                    })}

                                    <details>
                                      <summary><strong>Anexar Artifact</strong></summary>
                                      <form className="project-form" action={attachArtifactAction}>
                                        {projectFields(project)}
                                        {commandFields("operating-artifact")}
                                        <input
                                          type="hidden"
                                          name="actorId"
                                          value={contribution.authorActorId}
                                        />
                                        <input
                                          type="hidden"
                                          name="contributionId"
                                          value={contribution.id}
                                        />
                                        <label>
                                          <span>Tipo</span>
                                          <select name="kind" defaultValue="CODE">
                                            <option>CODE</option>
                                            <option>DOCUMENT</option>
                                            <option>FILE</option>
                                            <option>LINK</option>
                                            <option>PACKAGE</option>
                                            <option>MEDIA</option>
                                          </select>
                                        </label>
                                        <label>
                                          <span>URI</span>
                                          <input
                                            name="uri"
                                            minLength={3}
                                            maxLength={2000}
                                            placeholder="https://github.com/.../commit/..."
                                            required
                                          />
                                        </label>
                                        <label>
                                          <span>SHA-256 do conteúdo</span>
                                          <input
                                            name="digest"
                                            pattern="[0-9a-f]{64}"
                                            minLength={64}
                                            maxLength={64}
                                            required
                                          />
                                        </label>
                                        <label>
                                          <span>Media type</span>
                                          <input name="mediaType" defaultValue="text/plain" required />
                                        </label>
                                        <label>
                                          <span>Tamanho em bytes (opcional)</span>
                                          <input name="sizeBytes" type="number" min={0} />
                                        </label>
                                        <input
                                          type="hidden"
                                          name="retentionClass"
                                          value="EXTERNAL_REFERENCE"
                                        />
                                        <button className="button button-primary" type="submit">
                                          Anexar metadata imutável
                                        </button>
                                      </form>
                                    </details>
                                  </section>
                                );
                              })}

                            {project.contributions.filter(
                              (item) => item.commitmentId === commitment.id,
                            ).length === 0 ? (
                              <form
                                className="project-form"
                                action={submitContributionAction}
                              >
                                {projectFields(project)}
                                {commandFields("operating-contribution")}
                                <input
                                  type="hidden"
                                  name="actorId"
                                  value={commitment.proposerActorId}
                                />
                                <input
                                  type="hidden"
                                  name="commitmentId"
                                  value={commitment.id}
                                />
                                <label>
                                  <span>Contribuição executada</span>
                                  <textarea
                                    name="description"
                                    rows={4}
                                    minLength={10}
                                    maxLength={4000}
                                    required
                                    placeholder="Descreva o trabalho realmente executado e o que foi entregue."
                                  />
                                </label>
                                <label>
                                  <span>Limitações conhecidas</span>
                                  <textarea
                                    name="limitations"
                                    rows={3}
                                    minLength={2}
                                    maxLength={2000}
                                    required
                                    defaultValue="Execução não implica evidência, verificação ou outcome; limitada ao escopo do commitment."
                                  />
                                </label>
                                <button className="button button-primary" type="submit">
                                  Registrar Contribution
                                </button>
                              </form>
                            ) : null}
                          </section>
                        ) : null}
                      </section>
                    );
                  })}
                </article>
              );
            }) : (
              <p>Nenhuma oportunidade registrada neste projeto.</p>
            )}

            <details className="side-block">
              <summary><strong>Nova Opportunity</strong></summary>
              <form className="project-form" action={createOpportunityAction}>
                {projectFields(project)}
                {commandFields("operating-opportunity")}
                <label>
                  <span>Título da oportunidade</span>
                  <input name="title" minLength={4} maxLength={160} required />
                </label>
                <label>
                  <span>Problema ou necessidade</span>
                  <textarea name="statement" rows={4} minLength={10} maxLength={4000} required />
                </label>
                <label>
                  <span>Condições</span>
                  <textarea name="conditions" rows={4} minLength={3} maxLength={4000} required />
                </label>
                <label>
                  <span>Resultado esperado</span>
                  <textarea name="expectedResult" rows={4} minLength={3} maxLength={2000} required />
                </label>
                <label>
                  <span>Capacidade</span>
                  <input name="capacity" type="number" min={1} max={100} defaultValue={1} required />
                </label>
                <label className="checkbox-label">
                  <input name="publishNow" type="checkbox" defaultChecked />
                  <span>
                    <strong>Publicar após criar</strong>
                    <small>Publicação continua sendo comando separado no B1.</small>
                  </span>
                </label>
                <button className="button button-primary" type="submit">
                  Criar Opportunity
                </button>
              </form>
            </details>

            <div className="divider" />
            <p className="mini-label">Trajetória operacional B1/B2</p>
            {project.events.length ? (
              <ol>
                {project.events.map((event) => (
                  <li key={event.id}>
                    <strong>{event.eventType}</strong>
                    {" · "}
                    {event.aggregateType}
                    {" · "}
                    {actorName(project, event.actorId)}
                    {" · "}
                    <small>{event.occurredAt}</small>
                  </li>
                ))}
              </ol>
            ) : (
              <p>Nenhum evento operacional B1/B2 projetado ainda.</p>
            )}
          </section>
        );
      }) : null}
    </main>
  );
}
