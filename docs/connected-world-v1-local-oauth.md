# Connected World V1 — local OAuth setup

This setup applies only to the local Genesis Alpha at `http://127.0.0.1:3088/`.
The callbacks do not use Vercel, production domains, or the Huly Workbench.
Provider grants remain separate from CZ authority; CZ has no GitHub merge,
deployment, Gmail-send-without-confirmation, destructive Linear, or destructive
Calendar action path.

## Callback URLs

- GitHub App user-authorization callback: `http://127.0.0.1:3088/api/connections/github/callback`
- Linear OAuth callback: `http://127.0.0.1:3088/api/connections/linear/callback`
- Google Web application redirect URI: `http://127.0.0.1:3088/api/connections/google/callback`

## GitHub App

Create a private GitHub App owned by `MMaia-jr`; enable user authorization during
installation, and set the callback above. Request repository permissions only:

- Metadata: read-only (GitHub requires this).
- Contents: read-only.
- Issues: read and write.
- Pull requests: read and write.
- Checks: read-only.

Do not request administration, secrets, environments, deployments, Actions,
workflow mutation, branch protection, or contents write. Install it only on
`MMaia-jr/celula-zero`, selecting that repository only. GitHub's PR write scope
can technically enable provider actions beyond CZ policy; the CZ Action Gateway
does not expose merge. The short-lived user token returned during installation
is used to verify account/installation ownership, then revoked; ongoing API
calls use short-lived installation tokens scoped to this one repository.

Non-secret local configuration names:

```text
CZ_GITHUB_APP_CLIENT_ID=
CZ_GITHUB_APP_ID=
CZ_GITHUB_APP_SLUG=
```

Store the generated GitHub App client secret and private key in macOS Keychain
as generic passwords under service `Célula Zero Genesis Alpha Connected World`,
accounts `github:client-secret` and `github:app-private-key` respectively.

## Linear OAuth application

Create a private OAuth application and set the callback above. Use these scopes:
`read`, `write`, `issues:create`, `comments:create`; do not request `admin`.
Linear currently uses `write` for issue updates, which is broader than this CZ
slice. CZ exposes only authorized, non-destructive issue/comment actions.

Non-secret local configuration name: `CZ_LINEAR_CLIENT_ID`.
Store its client secret in the same Keychain service with account
`linear:client-secret`.

## Google OAuth application

Create a local-testing Web application, add the redirect URI above, enable the
Gmail, Drive, and Calendar APIs, configure the OAuth consent screen for testing,
and add Marcos as a test user. Request only:

- `openid`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.compose`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
- `https://www.googleapis.com/auth/calendar.events.owned`

Google classifies Gmail read and compose as restricted scopes. `gmail.compose`
also technically permits sending; CZ keeps send behind fresh explicit Human
confirmation. Calendar's provider grant can permit deletion, but CZ will not
expose destructive Calendar actions. Drive access remains read-only.

Non-secret local configuration name: `CZ_GOOGLE_CLIENT_ID`.
Store its client secret in the same Keychain service with account
`google:client-secret`.

Do not put client secrets, private keys, authorization codes, access tokens, or
refresh tokens in `.env.local`, Git, SQLite, browser storage, model context, or
logs. The local `.env.local` file should contain only the public client IDs and
GitHub App ID/slug. OAuth access and refresh tokens are written only to Keychain.

Connection readback is bounded: GitHub reads the selected repository and up to
10 open issues and PRs; Linear reads up to 10 teams/cycles and 20 projects/issues;
Google reads account identity, up to 10 Drive metadata rows, subscribed calendar
metadata, and Gmail profile metadata. No Gmail messages or Drive file bodies are
copied into Foundation state during connection.
