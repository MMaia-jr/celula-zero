# CHAT-TO-GITHUB-WRITE-001 — PROBE

Date: 2026-08-18

## Original human authorization

> AUTORIZO CHAT-TO-GITHUB-WRITE-001

## Purpose

This is a fixed one-shot probe for CHAT-TO-GITHUB-WRITE-001.

It tests whether an explicitly authorized operation can be transported from a GPT Action through the local bridge into the canonical GitHub workflow without the human manually operating Git.

## Allowed operation

The bridge may perform only the predefined sequence:

branch → fixed artifact → validation → commit → push → pull request → validation → merge

for this probe.

## Safety constraints

- repository fixed to MMaia-jr/celula-zero;
- no direct write to main;
- no force push;
- no arbitrary shell command supplied by the GPT;
- no arbitrary file path supplied by the GPT;
- no arbitrary artifact content supplied by the GPT;
- exactly one expected changed file;
- git diff --cached --check required;
- PR file list checked before merge;
- stop on unexpected state or conflict;
- secrets must not be written to the repository.

## Epistemic status

This artifact is a PROBE, not the experiment result.

Its presence does not by itself establish PASS, VERIFIED, replication, external usefulness, adoption, or scalability.

The experiment result must be determined from the observed execution.
