import type { CoordinationHistory } from "@/lib/data/history";

type ProvNode = Record<string, unknown>;

function ref(id: string) {
  return { "@id": id };
}

function idFor(origin: string, kind: string, id: string) {
  return `${origin.replace(/\/$/, "")}/prov/${kind}/${id}`;
}

export function toProvJsonLd(history: CoordinationHistory, origin: string) {
  const graph: ProvNode[] = [];
  const actorNodes = new Map<string, ProvNode>();

  for (const actor of history.actors) {
    const id = idFor(origin, "agent", actor.actor_id);
    const node: ProvNode = {
      "@id": id,
      "@type": "prov:Agent",
      "prov:label": actor.name,
      "cz:actorId": actor.actor_id,
    };
    if (actor.handle) node["cz:publicHandle"] = actor.handle;
    actorNodes.set(actor.actor_id, node);
  }

  for (const request of history.verification_requests) {
    const reviewer = actorNodes.get(request.reviewer_actor_id);
    if (reviewer) {
      const existing = reviewer["prov:actedOnBehalfOf"];
      const stewardRef = ref(idFor(origin, "agent", request.requester_actor_id));
      reviewer["prov:actedOnBehalfOf"] = existing
        ? Array.isArray(existing)
          ? [...existing, stewardRef]
          : [existing, stewardRef]
        : stewardRef;
      reviewer["cz:delegationScope"] = "verification.issue / PROJECT";
    }
  }

  graph.push(...actorNodes.values());

  const needId = history.need ? idFor(origin, "entity", history.need.id) : null;
  if (history.need) {
    graph.push({
      "@id": needId,
      "@type": ["prov:Entity", "cz:Need"],
      "prov:wasAttributedTo": ref(idFor(origin, "agent", history.need.owner_actor_id)),
      "prov:generatedAtTime": history.need.created_at,
    });
  }

  const opportunityId = idFor(origin, "entity", history.opportunity.id);
  graph.push({
    "@id": opportunityId,
    "@type": ["prov:Entity", "as:Offer"],
    ...(needId ? { "prov:wasDerivedFrom": ref(needId) } : {}),
    "prov:wasAttributedTo": ref(idFor(origin, "agent", history.opportunity.owner_actor_id)),
    "prov:generatedAtTime": history.opportunity.created_at,
    "cz:version": history.opportunity.version,
  });

  const proposalId = idFor(origin, "entity", history.proposal.id);
  graph.push({
    "@id": proposalId,
    "@type": ["prov:Entity", "as:Offer"],
    "prov:wasDerivedFrom": ref(opportunityId),
    "prov:wasAttributedTo": ref(idFor(origin, "agent", history.proposal.proposer_actor_id)),
    "prov:generatedAtTime": history.proposal.created_at,
    "cz:version": history.proposal.version,
  });

  const commitmentId = idFor(origin, "entity", history.commitment.id);
  graph.push({
    "@id": commitmentId,
    "@type": "prov:Entity",
    "prov:wasDerivedFrom": [ref(opportunityId), ref(proposalId)],
    "prov:wasAttributedTo": [
      ref(idFor(origin, "agent", history.commitment.proposer_actor_id)),
      ref(idFor(origin, "agent", history.commitment.accepted_by_actor_id)),
    ],
    "prov:generatedAtTime": history.commitment.created_at,
    "cz:domainType": "Commitment",
  });

  for (const contribution of history.contributions) {
    graph.push({
      "@id": idFor(origin, "activity", contribution.id),
      "@type": "prov:Activity",
      "prov:wasAssociatedWith": ref(idFor(origin, "agent", contribution.author_actor_id)),
      "prov:used": ref(commitmentId),
      "prov:startedAtTime": contribution.submitted_at,
      "cz:domainType": "Contribution",
    });
  }

  for (const artifact of history.artifacts) {
    graph.push({
      "@id": idFor(origin, "entity", artifact.id),
      "@type": "prov:Entity",
      "prov:wasGeneratedBy": ref(idFor(origin, "activity", artifact.contribution_id)),
      "prov:wasAttributedTo": ref(idFor(origin, "agent", artifact.created_by_actor_id)),
      "prov:generatedAtTime": artifact.created_at,
      "cz:domainType": "Artifact",
      "cz:digestAlgorithm": artifact.digest_algorithm,
      "cz:digest": artifact.digest,
      "cz:mediaType": artifact.media_type,
    });
  }

  for (const claim of history.claims) {
    graph.push({
      "@id": idFor(origin, "entity", claim.id),
      "@type": ["prov:Entity", "cz:Claim"],
      "prov:wasAttributedTo": ref(idFor(origin, "agent", claim.author_actor_id)),
      "prov:wasDerivedFrom": ref(idFor(origin, "entity", claim.subject_id)),
      "prov:generatedAtTime": claim.created_at,
      "cz:subjectType": claim.subject_type,
    });
  }

  for (const evidence of history.evidence) {
    graph.push({
      "@id": idFor(origin, "entity", evidence.id),
      "@type": "prov:Entity",
      "prov:wasDerivedFrom": ref(idFor(origin, "entity", evidence.source_artifact_id)),
      "prov:wasAttributedTo": ref(idFor(origin, "agent", evidence.custodian_actor_id)),
      "prov:generatedAtTime": evidence.created_at,
      "cz:domainType": "Evidence",
      "cz:relationToClaim": evidence.relation,
      "cz:claim": ref(idFor(origin, "entity", evidence.claim_id)),
      "cz:digestAlgorithm": evidence.digest_algorithm,
      "cz:digest": evidence.digest,
    });
  }

  for (const verification of history.verifications) {
    const activityId = idFor(origin, "activity", verification.id);
    const resultId = idFor(origin, "entity", verification.id);
    graph.push({
      "@id": activityId,
      "@type": "prov:Activity",
      "prov:wasAssociatedWith": ref(idFor(origin, "agent", verification.verifier_actor_id)),
      "prov:used": verification.evidence_item_ids.map((id) =>
        ref(idFor(origin, "entity", id)),
      ),
      "prov:endedAtTime": verification.created_at,
      "cz:domainType": "VerificationActivity",
      "cz:method": verification.method,
      "cz:independence": verification.independence,
    });
    graph.push({
      "@id": resultId,
      "@type": ["prov:Entity", "cz:Verification"],
      "prov:wasGeneratedBy": ref(activityId),
      "prov:wasDerivedFrom": ref(idFor(origin, "entity", verification.claim_id)),
      "prov:generatedAtTime": verification.created_at,
      "cz:classification": verification.classification,
    });
  }

  for (const decision of history.decisions) {
    const activityId = idFor(origin, "activity", `decision-${decision.id}`);
    const entityId = idFor(origin, "entity", decision.id);
    graph.push({
      "@id": activityId,
      "@type": "prov:Activity",
      "prov:wasAssociatedWith": ref(idFor(origin, "agent", decision.deciding_actor_id)),
      "prov:used": decision.verification_ids.map((id) =>
        ref(idFor(origin, "entity", id)),
      ),
      "prov:endedAtTime": decision.created_at,
      "cz:domainType": "DecisionActivity",
      "cz:authorityBasis": decision.authority_basis,
    });
    graph.push({
      "@id": entityId,
      "@type": ["prov:Entity", "cz:Decision"],
      "prov:wasGeneratedBy": ref(activityId),
      "prov:wasDerivedFrom": ref(idFor(origin, "entity", decision.claim_id)),
      "prov:wasAttributedTo": ref(idFor(origin, "agent", decision.deciding_actor_id)),
      "prov:generatedAtTime": decision.created_at,
      "cz:disposition": decision.disposition,
    });
  }

  for (const outcome of history.outcomes) {
    graph.push({
      "@id": idFor(origin, "entity", outcome.id),
      "@type": "prov:Entity",
      "prov:wasDerivedFrom": ref(idFor(origin, "entity", outcome.decision_id)),
      "prov:wasAttributedTo": ref(idFor(origin, "agent", outcome.reporter_actor_id)),
      "prov:generatedAtTime": outcome.created_at,
      "cz:domainType": "Outcome",
      "cz:classification": outcome.classification,
      ...(outcome.observed_at ? { "cz:observedAt": outcome.observed_at } : {}),
    });
  }

  return {
    "@context": {
      prov: "http://www.w3.org/ns/prov#",
      as: "https://www.w3.org/ns/activitystreams#",
      cz: "https://celulazero.org/ns#",
    },
    "@graph": graph,
    "cz:projectionNotice":
      "Derived PROV-O JSON-LD projection. Provenance does not establish truth, legitimacy, utility, adoption or reputation.",
  };
}
