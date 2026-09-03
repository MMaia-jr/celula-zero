#!/usr/bin/env node

import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { basename, join, resolve } from "node:path";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim()
      || result.stdout?.trim()
      || `${command} failed`,
    );
  }

  return result.stdout;
}

export function canonicalStateAtBase(repo, base) {
  if (!/^[0-9a-f]{40}$/i.test(String(base ?? ""))) {
    throw new Error("explicit 40-character canonical SHA required");
  }

  const head = run(
    "git",
    ["-C", repo, "rev-parse", "HEAD"],
  ).trim();

  if (head !== base) {
    throw new Error(
      `local HEAD ${head} != canonical base ${base}`,
    );
  }

  return run(
    "git",
    ["-C", repo, "show", `${base}:STATE.md`],
  );
}

export function composeBundle({
  sourceHandoff,
  repo,
  outputRoot,
  timestamp = new Date(),
}) {
  const source = resolve(sourceHandoff);

  const contextFile = join(source, "CONTEXT.json");
  const contextMdFile = join(source, "CONTEXT.md");

  const contextBytes = readFileSync(contextFile);
  const context = JSON.parse(contextBytes);

  const base =
    String(context?.canonical_state?.base ?? "").trim();

  if (!base) {
    throw new Error(
      "CONTEXT.json has no explicit canonical_state.base",
    );
  }

  const canonicalState =
    canonicalStateAtBase(repo, base);

  const stamp =
    timestamp.toISOString().replace(/[:.]/g, "-");

  const output = join(
    resolve(outputRoot),
    `CZ-COMPOSED-HANDOFF-${stamp}`,
  );

  mkdirSync(output, {
    recursive: false,
    mode: 0o700,
  });

  chmodSync(output, 0o700);

  copyFileSync(
    contextFile,
    join(output, "CONTEXT.json"),
  );

  copyFileSync(
    contextMdFile,
    join(output, "CONTEXT.md"),
  );

  chmodSync(
    join(output, "CONTEXT.json"),
    0o600,
  );

  chmodSync(
    join(output, "CONTEXT.md"),
    0o600,
  );

  const canonicalStateFile =
    join(output, "CANONICAL-STATE.md");

  writeFileSync(
    canonicalStateFile,
    canonicalState,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );

  chmodSync(canonicalStateFile, 0o600);

  const contextSha = sha256(contextBytes);
  const canonicalStateSha =
    sha256(Buffer.from(canonicalState));

  const prompt = `# CÉLULA ZERO — EXTERNAL CONTINUITY HANDOFF

You are a fresh external intelligence.

You have no prior chat history.

Your complete input set is exactly these five files:

1. CONTEXT.json
2. CONTEXT.md
3. CANONICAL-STATE.md
4. PROMPT.md
5. MANIFEST.txt

Do not ask the founder to reconstruct project history.

## Authority and temporal rules

CONTEXT.json / CONTEXT.md:
NON-CANONICAL local Room context.

CANONICAL-STATE.md:
Git-canonical STATE.md at exact commit:

${base}

The local Room may legitimately be temporally newer than Git.

If they differ:
- preserve both;
- identify which is canonical;
- identify which is newer local state;
- do not silently merge them.

Historical AI statements are interpretations.
They do not override current canonical state.

Preserve strictly:

Original Record != Interpretation != Claim != Evidence != Verification != Decision.

Local Room state != Git-canonical state.

AI agreement != legitimacy.

Schema validity != semantic validity.

Do not invent Human Direction.

Do not invent project decisions.

CONTEXT.json SHA256:
${contextSha}

CANONICAL-STATE.md SHA256:
${canonicalStateSha}

## Response format

Do NOT return JSON.

Return plain Markdown with exactly:

# CZ EXTERNAL CONTINUITY RESPONSE

## DURABLE BASELINE

## CANONICAL VS LOCAL

## AUTHORITY

## UNCERTAINTIES

## NEXT SAFE MOVE

## LIMITATIONS

Your response is an external AI contribution only.

It is not Human Direction,
Verification,
Decision,
execution,
or canonical state.
`;

  const promptFile =
    join(output, "PROMPT.md");

  writeFileSync(
    promptFile,
    prompt,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );

  chmodSync(promptFile, 0o600);

  const fileEntries = [
    "CONTEXT.json",
    "CONTEXT.md",
    "CANONICAL-STATE.md",
    "PROMPT.md",
  ];

  const manifestLines = [
    "SCHEMA=CZ_COMPOSED_HANDOFF_V1",
    `CANONICAL_BASE_SHA=${base}`,
    `CONTEXT_SHA256=${contextSha}`,
    `CANONICAL_STATE_SHA256=${canonicalStateSha}`,
    `LOCAL_PHASE=${context.cycle?.current_phase ?? "UNKNOWN"}`,
    `LOCAL_STATE=${context.cycle?.state ?? "UNKNOWN"}`,
    `HUMAN_DIRECTION=${context.human_direction?.id ?? "NONE"}`,
    "CLASSIFICATION=NON_CANONICAL_COMPOSED_HANDOFF",
    "UPLOAD_ALL_FILES_IN_DIRECTORY=YES",
    "UPLOAD_FILE_COUNT=5",
    "MODEL_CALL=NO",
    "DB_WRITE=NO",
    "GIT_WRITE=NO",
  ];

  for (const name of fileEntries) {
    const data =
      readFileSync(join(output, name));

    manifestLines.push(
      `FILE_SHA256 ${sha256(data)} ${name}`,
    );
  }

  const manifest =
    manifestLines.join("\n") + "\n";

  const manifestFile =
    join(output, "MANIFEST.txt");

  writeFileSync(
    manifestFile,
    manifest,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );

  chmodSync(manifestFile, 0o600);

  return {
    output,
    base,
    contextSha,
    canonicalStateSha,
  };
}

export function validateMarkdown(text) {
  const required = [
    "# CZ EXTERNAL CONTINUITY RESPONSE",
    "## DURABLE BASELINE",
    "## CANONICAL VS LOCAL",
    "## AUTHORITY",
    "## UNCERTAINTIES",
    "## NEXT SAFE MOVE",
    "## LIMITATIONS",
  ];

  const lines = new Set(
    String(text)
      .split(/\r?\n/)
      .map((line) => line.trim()),
  );

  const missing =
    required.filter((heading) => !lines.has(heading));

  return {
    ok: missing.length === 0,
    missing,
  };
}

export function captureResponse(bundle, text) {
  const directory = resolve(bundle);

  const manifest =
    readFileSync(
      join(directory, "MANIFEST.txt"),
      "utf8",
    );

  if (!manifest.includes(
    "SCHEMA=CZ_COMPOSED_HANDOFF_V1",
  )) {
    throw new Error(
      "target is not a composed handoff bundle",
    );
  }

  const normalized =
    String(text).endsWith("\n")
      ? String(text)
      : `${text}\n`;

  const stamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const output = join(
    directory,
    `EXTERNAL-RESPONSE-${stamp}.md`,
  );

  writeFileSync(
    output,
    normalized,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );

  chmodSync(output, 0o600);

  const hash =
    sha256(Buffer.from(normalized));

  writeFileSync(
    `${output}.sha256`,
    `${hash}\n`,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );

  chmodSync(
    `${output}.sha256`,
    0o600,
  );

  return {
    output,
    hash,
    ...validateMarkdown(normalized),
  };
}

function generate() {
  const repo =
    resolve(process.cwd());

  const outputRoot =
    resolve(
      process.env.CZ_HANDOFF_OUTPUT_ROOT
      || `${process.env.HOME}/Downloads`,
    );

  const handoff =
    run(
      process.execPath,
      [
        join(repo, "scripts", "cz-room.mjs"),
        "--handoff",
      ],
      {
        cwd: repo,
        env: process.env,
      },
    );

  const match =
    handoff.match(
      /^HANDOFF_DIR=(.+)$/m,
    );

  if (!match) {
    throw new Error(
      "Room handoff did not expose HANDOFF_DIR",
    );
  }

  const result =
    composeBundle({
      sourceHandoff: match[1].trim(),
      repo,
      outputRoot,
    });

  console.log(
    `COMPOSED_HANDOFF_DIR=${result.output}`,
  );

  console.log(
    "UPLOAD_ALL_FILES_IN_DIRECTORY=YES",
  );

  console.log(
    "UPLOAD_FILE_COUNT=5",
  );

  console.log(
    `CANONICAL_BASE_SHA=${result.base}`,
  );

  console.log(
    `CONTEXT_SHA256=${result.contextSha}`,
  );

  console.log(
    `CANONICAL_STATE_SHA256=${result.canonicalStateSha}`,
  );

  console.log("MODEL_CALL=NO");
  console.log("GIT_WRITE=NO");

  if (process.platform === "darwin") {
    spawnSync(
      "open",
      [result.output],
      { stdio: "ignore" },
    );

    spawnSync(
      "pbcopy",
      [],
      {
        input:
          "Read all five attached files and execute PROMPT.md exactly. Return only the requested Markdown report.",
        encoding: "utf8",
      },
    );
  }
}

function capture() {
  const index =
    process.argv.indexOf("--capture");

  const bundle =
    process.argv[index + 1];

  if (!bundle) {
    throw new Error(
      "--capture requires bundle directory",
    );
  }

  const input =
    readFileSync(0, "utf8");

  if (!input.trim()) {
    throw new Error(
      "no response received on stdin",
    );
  }

  const result =
    captureResponse(bundle, input);

  console.log(
    `RESPONSE_FILE=${result.output}`,
  );

  console.log(
    `RESPONSE_SHA256=${result.hash}`,
  );

  console.log(
    "ORIGINAL_RESPONSE_PRESERVED=YES",
  );

  if (!result.ok) {
    console.log(
      "MARKDOWN_RESPONSE_VALIDATION=FAIL",
    );

    for (const heading of result.missing) {
      console.log(
        `MISSING=${heading}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    "MARKDOWN_RESPONSE_VALIDATION=PASS",
  );
}

async function main() {
  if (process.argv.includes("--capture")) {
    capture();
    return;
  }

  generate();
}

if (
  import.meta.url
  === `file://${process.argv[1]}`
) {
  main().catch((error) => {
    console.error(
      `COMPOSE_HANDOFF_ERROR=${error.message}`,
    );

    process.exitCode = 1;
  });
}
