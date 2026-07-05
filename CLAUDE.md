# turnthisshitoff.com — Project Orientation
# Read this before beginning any task in this repository.
# Governance rules are in .claude/CLAUDE.md and ~/.claude/CLAUDE.md.
# When in doubt, governance files take precedence over anything here.

---

## WHAT THIS PROJECT IS

turnthisshitoff.com is the official artist website for MadeUp MonkeyShit
(MUMS), an independent cross-genre music project by Tyberius Reese.

The site serves three primary functions:
1. Introduce new listeners to the catalog and direct them to streaming
2. Capture email subscribers for direct artist-to-fan communication
3. Provide a persistent web presence that reflects the artist's voice

The brand voice is casual, dry, self-aware, and humor-forward.
Copy on this site sounds like a person talking — not marketing language.
When writing or editing any text for this site, match that register.

---

## TECH STACK — PLAIN TERMS

The site is a static HTML/CSS/JS front end deployed through Cloudflare
Pages via GitHub. There is no traditional backend server. Dynamic
functionality (subscriber capture, admin panel) is handled by
Cloudflare Pages Functions — serverless functions that run at the edge.

DEPLOYMENT CHAIN:
Local file edit → GitHub push → Cloudflare Pages auto-deploys → live site
There is no intermediate staging step. A push is a live deployment.

DATA LAYER:
Cloudflare D1 — a SQLite database running at the edge.
Stores subscriber email addresses and signup metadata.

EMAIL:
Resend handles outbound transactional email (welcome messages to
new subscribers) from no-reply@turnthisshitoff.com.
Cloudflare Email Routing forwards help@turnthisshitoff.com to
the owner's personal inbox.

AUTHENTICATION:
The admin panel is protected by Cloudflare Access.
Authentication is handled at the Cloudflare layer before
requests reach any site files or functions.

DOMAIN AND DNS:
Domain is turnthisshitoff.com.
DNS is managed entirely through Cloudflare.
All DNS records (MX, TXT, CNAME, A) are live and verified.

---

## FILE STRUCTURE

/index.html
  Main site file. Contains all primary page sections:
  - Navigation
  - Hero/header section
  - Featured section (3 Spotify embeds — curated by save rate signal)
  - Discography section (links to individual album pages)
  - Subscriber capture form
  - Footer with links including legal/contact page

/assets/
  Static assets — CSS, JavaScript, images.
  CSS handles layout, typography, and responsive behavior.
  JS handles form submission to the subscriber pipeline function.

/functions/
  Cloudflare Pages Functions (serverless).
  Handles: subscriber form processing, D1 database writes,
  Resend email triggers, and admin panel authentication logic.
  Functions run at Cloudflare's edge on every relevant request.

/album-pages/
  Individual pages for each MUMS album.
  Each page contains: album art, Spotify embed for the full album,
  platform buttons (Spotify, Apple Music, etc.), and track listings.
  Currently six album pages built and wired into the homepage.
  All embeds use Spotify iframe embed format.

/privacy-policy/ (or equivalent)
  Privacy policy page. Makes specific commitments to subscribers
  about data handling. Must not be altered without owner review.

---

## SPOTIFY EMBED FORMAT

All music players on the site use Spotify's iframe embed format:

<iframe 
  src="https://open.spotify.com/embed/track/[TRACK_ID]?utm_source=generator"
  width="100%" 
  height="352" 
  frameBorder="0" 
  allowfullscreen="" 
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
  loading="lazy">
</iframe>

For album embeds, replace /track/ with /album/ and use the album ID.
Track IDs and album IDs come from Spotify share links — the string
between the last slash and the question mark.
The ?si= parameter at the end of shared URLs is session-specific
and should be dropped. Use only the clean ID with ?utm_source=generator.

---

## FEATURED SECTION — CONTEXT

The Featured section on the homepage displays three Spotify track embeds.
Song selection for this section is strategic — not arbitrary.

Current featured tracks are selected based on Spotify save rate
(saves divided by streams), which is the primary signal for listener
resonance. Changes to this section require owner authorization and
should be accompanied by the save rate data that justifies the change.

The section copy reads: "Start Here — Apparently, people really like
these for some reason." This text is intentional and should not be
altered without explicit instruction.

---

## SUBSCRIBER PIPELINE — HOW IT WORKS

1. Visitor submits email via the homepage form
2. A Pages Function receives the form POST
3. The function validates the submission and writes to D1
4. The function triggers Resend to send a welcome email
5. The subscriber record is stored with email and signup timestamp

The admin panel allows the owner to view subscriber data.
Access is gated by Cloudflare Access authentication.

---

---

## DATABASE LAYER — THREE SEPARATE D1 INSTANCES

There are three distinct D1 databases bound to this project.
Each serves a different purpose. Using the wrong one in a function
will cause silent failures or wrong data.

SONGS_DB — song performance statistics
  Table: song_stats
  Contains: per-song platform metrics, DistroKid columns, country data,
  Spotify URLs, album assignment (album_id foreign key to ALBUMS_DB)

ALBUMS_DB — album catalog
  Table: albums
  Contains: album name, art number, release date, active status

CONTENT_DB — display roster
  Table: songs
  Contains: song display entries used by the public site
  (table_name, song_name, stream_count, art_number, release_date,
  spotify_url, spotify_embed_url)
  This is separate from song_stats — it is the public-facing song list,
  not the analytics store.

---

## DISTROKID INTEGRATION — COLUMN REFERENCE

song_stats in SONGS_DB contains 11 DistroKid columns added via migration:

  dk_tiktok, dk_instagram, dk_facebook, dk_spotify,
  dk_apple, dk_amazon, dk_tidal,
  dk_youtube_views, dk_youtube_music, dk_other,
  dk_total (sum of all ten above, computed server-side on write)

dk_total is never stored by the client — admin-song-stats.js computes
it via dkValues() and writes it. Never accept dk_total from the request body.

Viral Spread = dk_platform_field − compiled_platform_field
This is display-only in the admin panel. It is never stored.

---

## ADMIN PANEL

Location: admin/index.html
Single self-contained HTML file. All admin UI, logic, and API calls
are in this one file.

Authentication: Cloudflare Access gates the /admin/ route before
any request reaches the file or functions.

All admin API calls use the apiFetch() helper, which attaches the
X-Admin-Token header (matched against env.ADMIN_TOKEN on the server).
Every admin function must validate this token before processing.

Pattern for all admin functions:
  const token = request.headers.get('X-Admin-Token');
  if (!token || token !== env.ADMIN_TOKEN) {
    return json({ success: false, message: 'Unauthorized' }, 401);
  }

---

## FUNCTIONS INVENTORY

All files live in /functions/. Current function list:

  track-stats.js            Public endpoint. Returns song stats by album_id,
                            album_name, or song name. Returns
                            Math.max(dk_total, compiled_streams) as
                            total_streams. Read-only. No auth required.

  admin-song-stats.js       Admin write endpoint (POST). Handles add, edit,
                            delete for song_stats records. Computes dk_total
                            server-side. Requires X-Admin-Token.

  admin-song-stats-query.js Admin read endpoint (GET). Returns song_stats
                            rows by album_id (list) or id (get). Uses
                            SELECT * — all dk_* columns return automatically.
                            Requires X-Admin-Token.

  admin-albums-query.js     Admin read endpoint (GET). Returns album list
                            with aggregated totals (total_streams,
                            dk_total_streams, total_likes, total_shares,
                            total_saves, song_count) computed in JS from
                            song_stats rows. Requires X-Admin-Token.

  admin-songs.js            Admin write endpoint (POST). Handles add, edit,
                            delete for CONTENT_DB songs table (display roster).
                            art_number defaults to 0, never null.
                            Requires X-Admin-Token.

When adding new functions, follow the existing pattern:
named export onRequestGet or onRequestPost, token check first,
json() helper at the bottom of the file.

---

## CONVENTIONS

HTML: Semantic, readable, no unnecessary nesting.
CSS: Organized by section, variables for repeated values.
JS: Minimal — only what the form and any interactive elements require.
Copy: Written in the owner's voice — casual, direct, no marketing speak.
Commits: Descriptive messages stating exactly what changed and why.
File names: Lowercase, hyphenated, descriptive.

---

## ALBUMS IN THE CATALOG

Current MUMS releases wired into the site:
- Pick a Struggle
- Still Cooking
- Melted Ice Cream (most recent, highest streaming momentum as of 2026)
- [Additional albums — verify current list from index.html]

Melted Ice Cream is the current priority release.
Today is Monday (on Melted Ice Cream) was released June 12, 2026.

---

## CONTACT AND LEGAL

help@turnthisshitoff.com is the public-facing contact address.
It is listed on the legal page and intended for legal or formal
inquiries. It is expected to receive spam — this is anticipated
and acceptable. The address forwards to the owner's personal inbox
via Cloudflare Email Routing.

---

## WHO TO ASK

All decisions about content, design, strategy, and feature direction
go through the project owner — Tyberius Reese.
Claude Code executes. It does not decide.
When a task requires a judgment call not covered by existing
instructions, stop and surface the question. Do not improvise.

---

## Embedded Player Stream Display Rule
The 🎵 stream count displayed in all embedded 
Spotify player stats bars uses:

Math.max(dk_total, compiled_streams)

Always display whichever value is greater. 
Never display a number lower than what has been 
compiled from directly observable platform data.
This ensures correct display during periods of 
incomplete DistroKid reporting AND after full 
reports are available.

---

## Token-Saving Scratchpad Protocol

All code updates are written to the scratchpad folder located at 
.claude/scratchpad/ in the local drive. The scratchpad maintains 
a folder tree identical to the GitHub repo, with matching files.

Workflow:
1. Code rewrites updated .txt, .js, .html, or .py files in the scratchpad
2. Code does NOT print updated code directly to the chat screen
3. Owner retrieves updated files from scratchpad
4. Owner copies and pastes rewritten code into identical files 
   in the GitHub repo
5. Owner pushes to GitHub — owner is the filter between 
   scratchpad and repo at all times

This method conserves tokens and keeps the owner as the 
review gate between what Code writes and what goes live.
New Claude Code sessions should follow this protocol by default 
unless explicitly told otherwise for a specific task.

## END OF ORIENTATION DOCUMENT
## Version 1.0 — Pending human review and approval
## This document should be updated whenever the stack or
## file structure changes significantly.
