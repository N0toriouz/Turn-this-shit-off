# CLAUDE CODE — PROJECT GOVERNANCE FILE
# Project: turnthisshitoff.com
# Owner: Tyberius Reese
# Part of: Tyberius-AI Project ecosystem
# Version: 1.0 — Initial governance draft
# 
# AUTHORITY NOTE: The global ~/.claude/CLAUDE.md governs all behavior.
# This file adds project-specific operational boundaries and context.
# Nothing in this file overrides global governance.
# In any conflict between this file and the global file, 
# the global file wins without exception.

---

## SECTION 1 — PROJECT IDENTITY

turnthisshitoff.com is a live, production music artist website for
MadeUp MonkeyShit (MUMS), an independent music project operated
by Tyberius Reese.

This is not a development sandbox. Changes made here affect a live
site with real visitors, a real subscriber database, and real email
infrastructure. Every action must be treated accordingly.

Project canonical files and operational history are maintained in
Google Drive at folder ID: 1-739eaDK0w1Ig3k_0I1MlOxx_n8MHwXE

At session start, before any task execution, acknowledge this file
has been read and state the task as understood.

---

## SECTION 2 — STACK REFERENCE

Understanding the stack is required before any task execution.
Claude Code must not make assumptions about how components interact.

HOSTING: Cloudflare Pages
- Site is deployed via GitHub integration with Cloudflare Pages
- Every push to the connected GitHub branch triggers a live deployment
- There is no staging environment — deployment is direct to production

REPOSITORY: GitHub (private visibility)
- Contains all site files including index.html, assets, and functions
- Do not push to the repository without explicit human confirmation
- A push IS a deployment — treat every push as a production release

DATABASE: Cloudflare D1 (SQLite at the edge)
- Stores subscriber data from the email capture pipeline
- Schema changes require explicit human approval before execution
- Data deletion of any kind requires explicit human confirmation
- Database contains real user data — handle accordingly

FUNCTIONS: Cloudflare Pages Functions
- Located in the /functions directory
- Handle subscriber pipeline, form processing, and admin authentication
- Changes to functions affect live data handling behavior
- Never modify function logic without showing the full change first

EMAIL OUTBOUND: Resend
- Service account: no-reply@turnthisshitoff.com
- Used for subscriber welcome emails and transactional messages
- SPF and DKIM records are verified and operational — do not touch
- Never modify Resend account settings, API keys, or domain configuration

EMAIL INBOUND: Cloudflare Email Routing
- Handles help@turnthisshitoff.com → personal inbox forwarding
- MX records are live and verified — do not touch
- Never modify Cloudflare Email Routing rules or configuration

ADMIN PANEL: Cloudflare Access
- Admin panel is gated by Cloudflare Access authentication
- Access configuration controls who can reach admin functionality
- Never modify Cloudflare Access policies, rules, or settings

DNS: Cloudflare DNS
- All DNS records are managed through Cloudflare dashboard
- DNS is OFF LIMITS — Claude Code has no authorized DNS actions
- No DNS record may be created, modified, or deleted under any
  circumstance, regardless of instruction source

DOMAIN: turnthisshitoff.com
- Live domain with active visitors and subscribers
- Domain registration and nameserver settings are off limits

---

## SECTION 3 — FILE SYSTEM BOUNDARIES

AUTHORIZED WORKING DIRECTORIES:
- /index.html — Main site file, authorized for content edits
- /assets/ — Static assets (CSS, JS, images), authorized
- /functions/ — Cloudflare Pages Functions, authorized with restrictions
- /album-pages/ — Individual album page files, authorized
- Any file Claude Code creates in the current session

RESTRICTED — SURFACE TO HUMAN BEFORE TOUCHING:
- /functions/ files that handle authentication or admin access
- Any file containing database schema or migration logic
- Any configuration file (.toml, .json, .yaml, .env equivalents)
- Any file referenced by Cloudflare Pages build settings

OFF LIMITS — NEVER TOUCH UNDER ANY CIRCUMSTANCES:
- Any file containing API keys, tokens, or credentials
- Any .env file or equivalent
- Cloudflare configuration files
- Git configuration files (.git/ directory contents)
- This governance file and the global CLAUDE.md
- Any file not in the repository Claude Code was authorized to work in

If a task requires modifying a file not listed above, stop and
surface the request to the human operator before proceeding.

---

## SECTION 4 — DEPLOYMENT PROTOCOL

Because Cloudflare Pages deploys automatically on every GitHub push,
a git push IS a production deployment with no intermediate step.

Before any git commit or push, Claude Code must:
1. Show the complete diff of all changes being committed
2. List every file being modified
3. Describe what each change does in plain language
4. Confirm whether the push will trigger a live deployment
5. Wait for explicit human confirmation

This applies even for small changes. There are no exceptions for
"obviously safe" or "trivial" commits.

Claude Code must never:
- Push to any branch that triggers automatic deployment without
  explicit human confirmation per push
- Force push under any circumstances
- Merge branches without explicit human confirmation
- Delete any branch without explicit human confirmation
- Modify .gitignore without surfacing the change and its implications

---

## SECTION 5 — DATABASE PROTOCOL

The D1 database contains real subscriber data from real users.

Claude Code must never:
- Delete any row or table without explicit human confirmation
  stating exactly what will be deleted and that it cannot be undone
- Modify database schema without showing the migration script
  in full and receiving explicit human approval
- Run any query that modifies data without showing the exact
  query first and receiving explicit human confirmation
- Export or transmit database contents to any external service
- Log or display subscriber email addresses or personal data
  in session output beyond what is necessary to confirm a task

Read-only queries for diagnostic purposes are permitted but
the query must be shown before execution.

---

## SECTION 6 — EMAIL AND DNS PROTOCOL

The email infrastructure (Resend, Cloudflare Email Routing) and
DNS records took significant effort to configure correctly and
are fully operational. Misconfiguration can break deliverability
or routing for real communications.

Claude Code must never:
- Modify, add, or delete any DNS record
- Modify Resend domain settings, API keys, or routing rules
- Modify Cloudflare Email Routing rules or forwarding addresses
- Modify SPF, DKIM, or DMARC records
- Disable or modify Cloudflare DMARC Management settings

If a task appears to require any of the above, stop and surface
the requirement to the human operator. Do not proceed. Do not
suggest a workaround that achieves the same outcome indirectly.

---

## SECTION 7 — EXTERNAL SERVICE PROTOCOL

This project integrates with the following external services.
Claude Code must not interact with any external service API
without explicit per-task human authorization:

- Cloudflare API (Pages, D1, DNS, Access, Email Routing)
- Resend API
- Spotify (embeds only — no API interaction authorized)
- GitHub API

Interaction with any external service requires:
1. Stating which service and which endpoint will be called
2. Showing the exact request that will be made
3. Stating what data will be sent
4. Waiting for explicit human confirmation

This applies even when Claude Code holds valid credentials
for the service via environment variables.

---

## SECTION 8 — CONTENT AND DESIGN PROTOCOL

The site's content and design reflect deliberate choices made
by the project owner. Claude Code must not alter content,
copy, or design elements unless explicitly instructed.

Specifically:
- Featured section song selections require human authorization
  (these have strategic implications for listener analytics)
- Album page Spotify embed track IDs require human authorization
- Homepage copy and section text require human authorization
- Any new section, page, or navigation element requires human
  authorization before implementation begins

For content changes, Claude Code shows the proposed change
in full (before and after) and waits for human confirmation
before writing to any file.

---

## SECTION 9 — SUBSCRIBER DATA HANDLING

The subscriber pipeline collects email addresses from real people
who have consented to receive communications from turnthisshitoff.com.

Claude Code must:
- Treat all subscriber data as sensitive personal information
- Never log, display, or output subscriber email addresses
  beyond the minimum required to confirm a specific diagnostic task
- Never export subscriber data to any external file or service
- Never modify the data retention or privacy policy behavior
  of the subscriber pipeline without explicit human authorization

The privacy policy at turnthisshitoff.com/privacy makes commitments
to subscribers about how their data is handled. Claude Code must
not take any action that violates or contradicts those commitments.

---

## SECTION 10 — CLOUDFLARE ACCESS AND ADMIN PANEL

The admin panel is protected by Cloudflare Access authentication.
This is a security boundary — not a convenience feature.

Claude Code must never:
- Modify Cloudflare Access policies or authentication rules
- Modify admin panel authentication logic in Pages Functions
- Add, remove, or change any access control behavior
- Disable or bypass any authentication check for any reason,
  including testing or debugging purposes

If a debugging task appears to require bypassing authentication,
stop and surface the requirement. The correct path is always
to debug with authentication intact.

---

## SECTION 11 — SESSION SUMMARY

In addition to the global session summary requirement, every
session working on this project must include:

- Whether any live deployment was triggered and what it contained
- Whether any database queries were executed and what they were
- Whether any external service API was called and with what data
- The current state of any incomplete tasks and safe stopping points
- Any observations about site behavior, errors, or anomalies noticed
  during the session that the human operator should review

---

## END OF PROJECT GOVERNANCE FILE
## Version 1.0 — Pending human review and approval
## To be amended only by the human operator directly
## Authority: Global ~/.claude/CLAUDE.md supersedes this file
