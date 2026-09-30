// SPDX-License-Identifier: MPL-2.0
import { z } from "zod";
import type {
  Person,
  PersonId,
  IdentityCredential,
  ExternalIdentity,
} from "@cz/identity";
import { resolvePerson } from "@cz/identity";
import type { Profile, Experience } from "@cz/presence";
import { reportedExperience } from "@cz/presence";
import type { Cell, Relation, Membership, Role } from "@cz/cells";
import { canAct, type Authority } from "@cz/authority";
import { appendRecord, type InstitutionalRecord } from "@cz/records";
export interface Foundation {
  schema: "cz.foundation.v1";
  person: Person;
  profile: Profile;
  credentials: IdentityCredential[];
  cell: Cell;
  relations: Relation[];
  memberships: Membership[];
  roles: Role[];
  authorities: Authority[];
  experiences: Experience[];
  externalIdentities: ExternalIdentity[];
  records: InstitutionalRecord[];
  receipts: Array<{ key: string; personId: PersonId; command: string }>;
}
const line = z.string().trim().min(1).max(160);
const text = z.string().trim().min(1).max(6000);
const url = z
  .string()
  .url()
  .max(2048)
  .refine((s) => {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Use um endereço HTTPS sem credenciais.");
export const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("experience"),
      title: line,
      description: text,
      occurredOn: z.iso.date(),
    })
    .strict(),
  z
    .object({
      type: z.literal("profile"),
      headline: line,
      bio: z.string().trim().max(3000),
    })
    .strict(),
  z
    .object({ type: z.literal("external_identity"), provider: line, url })
    .strict(),
  z.object({ type: z.literal("intention"), content: text }).strict(),
  z.object({ type: z.literal("cell"), purpose: text }).strict(),
]);
export type Command = z.infer<typeof commandSchema>;
export function seedFoundation(id: () => string, now: string): Foundation {
  const personId = id() as PersonId,
    cellId = id(),
    roleId = id(),
    sourceId = id();
  return {
    schema: "cz.foundation.v1",
    person: { id: personId, name: "Marcos", createdAt: now },
    profile: {
      id: id(),
      personId,
      headline: "Construindo Célula Zero",
      bio: "",
      visibility: { scope: "private", ownerId: personId },
      updatedAt: now,
    },
    credentials: [
      {
        id: id(),
        personId,
        provider: "local-foundation",
        subject: "founder-fixture",
        status: "active",
      },
    ],
    cell: {
      id: cellId,
      name: "Célula Zero",
      purpose: "Operar, desenvolver e governar Célula Zero.",
      createdAt: now,
    },
    roles: [{ id: roleId, cellId, name: "Founder / Steward" }],
    relations: [
      { id: id(), personId, cellId, kind: "founder", sourceRecordId: sourceId },
      { id: id(), personId, cellId, kind: "steward", sourceRecordId: sourceId },
    ],
    memberships: [{ id: id(), personId, cellId, roleId, status: "active" }],
    authorities: [
      { id: id(), roleId, cellId, permissions: ["cell.read", "cell.update"] },
    ],
    experiences: [],
    externalIdentities: [],
    receipts: [],
    records: [
      {
        id: sourceId,
        kind: "OriginalRecord",
        authorId: "system:local-seed",
        createdAt: now,
        visibility: { scope: "cell", cellId },
        purpose: "cell",
        content:
          "Fixture local autorizada pela D052/WP Foundation: Marcos, Person e Founder/Steward da Cell Célula Zero. Não é verificação de identidade externa.",
      },
    ],
  };
}
export function applyCommand(
  state: Foundation,
  actor: PersonId,
  raw: unknown,
  key: string,
  id: () => string,
  now: string,
): Foundation {
  if (actor !== state.person.id) throw new Error("FORBIDDEN");
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(key))
    throw new Error("INVALID_REQUEST_KEY");
  const command = commandSchema.parse(raw);
  const previous = state.receipts.find(
    (r) => r.key === key && r.personId === actor,
  );
  if (previous) {
    if (previous.command !== JSON.stringify(command))
      throw new Error("REQUEST_KEY_CONFLICT");
    return state;
  }
  if (
    command.type === "cell" &&
    !canAct(
      actor,
      state.cell.id,
      "cell.update",
      state.memberships,
      state.authorities,
    )
  )
    throw new Error("FORBIDDEN");
  const next = structuredClone(state),
    recordId = id();
  const content =
    command.type === "intention" ? command.content : JSON.stringify(command);
  next.records = appendRecord(next.records, {
    id: recordId,
    kind: "OriginalRecord",
    purpose: command.type,
    content,
    authorId: actor,
    createdAt: now,
    visibility:
      command.type === "cell"
        ? { scope: "cell", cellId: next.cell.id }
        : { scope: "private", ownerId: actor },
  });
  if (command.type === "experience")
    next.experiences.push(
      reportedExperience(
        {
          id: id(),
          personId: actor,
          title: command.title,
          description: command.description,
          occurredOn: command.occurredOn,
          visibility: { scope: "private", ownerId: actor },
          sourceRecordId: recordId,
        },
        actor,
        now,
      ),
    );
  if (command.type === "profile")
    next.profile = {
      ...next.profile,
      headline: command.headline,
      bio: command.bio,
      updatedAt: now,
    };
  if (command.type === "external_identity") {
    if (
      next.externalIdentities.some(
        (e) => e.provider === command.provider && e.url === command.url,
      )
    )
      throw new Error("IDENTITY_ALREADY_RECORDED");
    next.externalIdentities.push({
      id: id(),
      personId: actor,
      provider: command.provider,
      url: command.url,
      ownership: "unverified",
      sourceRecordId: recordId,
    });
  }
  if (command.type === "cell") next.cell.purpose = command.purpose;
  next.receipts.push({
    key,
    personId: actor,
    command: JSON.stringify(command),
  });
  return next;
}
export function actorFor(
  state: Foundation,
  provider: string,
  subject: string,
): PersonId {
  return resolvePerson(state.credentials, provider, subject);
}
export function projection(state: Foundation, actor: PersonId) {
  if (actor !== state.person.id) throw new Error("FORBIDDEN");
  const member = canAct(
    actor,
    state.cell.id,
    "cell.read",
    state.memberships,
    state.authorities,
  );
  return {
    schema: state.schema,
    person: state.person,
    profile: state.profile,
    experiences: state.experiences,
    externalIdentities: state.externalIdentities,
    cell: member ? state.cell : null,
    relations: member ? state.relations : [],
    roles: member ? state.roles : [],
    canUpdateCell: canAct(
      actor,
      state.cell.id,
      "cell.update",
      state.memberships,
      state.authorities,
    ),
    records: state.records.filter(
      (r) =>
        r.visibility.scope === "public" ||
        (r.visibility.scope === "private" && r.visibility.ownerId === actor) ||
        (r.visibility.scope === "cell" &&
          member &&
          r.visibility.cellId === state.cell.id),
    ),
  };
}
export type FoundationView = ReturnType<typeof projection>;
