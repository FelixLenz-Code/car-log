#!/usr/bin/env bash
#
# Kilomondo server installer & updater.
#
#   Install (one command):
#     curl -fsSL https://raw.githubusercontent.com/FelixLenz-Code/kilomondo/main/install.sh | bash
#
#   Update an existing install:
#     curl -fsSL https://raw.githubusercontent.com/FelixLenz-Code/kilomondo/main/install.sh | bash -s -- update
#     # ...or, from inside the install directory:
#     ./install.sh update
#
# Other commands: status | logs | uninstall
#
# Environment overrides:
#   KILOMONDO_DIR    install directory            (default: ./kilomondo)
#   KILOMONDO_REF    git ref to install (tag/branch/sha; default: latest release, else main)
#   KILOMONDO_PORT   host port                     (default: 3000)
#   ADMIN_EMAIL   first admin login            (else prompted / admin@example.com)
#   ADMIN_PASSWORD first admin password        (else prompted / generated)
#   ADMIN_NAME    admin display name           (default: Administrator)
#   COOKIE_SECURE "true" behind HTTPS          (default: false)
#   KILOMONDO_FRESH  "1" = on update, wipe data & settings and set up a fresh server
#   KILOMONDO_BUILD  "1" = build the image locally instead of pulling the release image
#
set -euo pipefail

REPO="FelixLenz-Code/kilomondo"

# ---------- pretty output ----------
if [ -t 1 ]; then
  B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; C=$'\033[36m'; N=$'\033[0m'
else
  B=''; G=''; Y=''; R=''; C=''; N=''
fi
info()  { printf '%s\n' "${C}»${N} $*"; }
ok()    { printf '%s\n' "${G}✓${N} $*"; }
warn()  { printf '%s\n' "${Y}!${N} $*" >&2; }
die()   { printf '%s\n' "${R}✗${N} $*" >&2; exit 1; }

# ---------- helpers ----------
have() { command -v "$1" >/dev/null 2>&1; }

require_tools() {
  have curl || die "curl is required."
  have tar  || die "tar is required."
  have docker || die "Docker is required. Install it: https://docs.docker.com/engine/install/"
  docker info >/dev/null 2>&1 || die "Cannot talk to the Docker daemon. Is it running, and is your user in the 'docker' group (or use sudo)?"
}

# Sets COMPOSE to the working compose command ("docker compose" or "docker-compose").
detect_compose() {
  if docker compose version >/dev/null 2>&1; then COMPOSE="docker compose"
  elif have docker-compose; then COMPOSE="docker-compose"
  else die "Docker Compose not found. Install the Docker Compose plugin."; fi
}

# Run compose inside the install dir (so build context '.' and .env resolve there).
compose() { ( cd "$DIR" && $COMPOSE "$@" ); }

# Bring the stack up; on failure, print the common LXC/sysctl hint before bailing.
# Prefers the prebuilt image published with each release (fast); falls back to a
# local build when no matching image can be pulled (non-release ref, an
# architecture without a published image, or offline) or when KILOMONDO_BUILD=1.
compose_up() {
  local build=0
  if [ "${KILOMONDO_BUILD:-0}" = 1 ]; then
    info "KILOMONDO_BUILD=1 — building the image from source."
    build=1
  elif compose pull; then
    ok "Fetched the prebuilt image — no local build needed."
  else
    warn "No prebuilt image for this version/architecture (or offline) — building from source; this can take a few minutes."
    build=1
  fi

  local extra=""
  [ "$build" = 1 ] && extra="--build"
  if ! compose up -d $extra; then
    echo >&2
    warn "Containers failed to start."
    warn "Running Docker inside an unprivileged LXC (e.g. Proxmox)? If you saw"
    warn "  'sysctl net.ipv4.ip_unprivileged_port_start ... permission denied',"
    warn "the container can't set that sysctl. Fix it by either:"
    warn "  • making the LXC privileged with features ${B}nesting=1,keyctl=1${N}, or"
    warn "  • adding to the host's /etc/pve/lxc/<CTID>.conf:"
    warn "      features: nesting=1,keyctl=1"
    warn "      lxc.apparmor.profile: unconfined"
    warn "      lxc.mount.auto: proc:rw sys:rw"
    warn "  then restart the container (pct stop <CTID> && pct start <CTID>)."
    die "See the README ('Running in an LXC container') for details."
  fi
}

gen_secret() { openssl rand -hex 32 2>/dev/null || head -c32 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
gen_password() {
  # strong, .env/compose-safe (alphanumeric only — no $ " \ that would break interpolation)
  ( openssl rand -base64 32 2>/dev/null || head -c32 /dev/urandom | base64 ) | tr -dc 'A-Za-z0-9' | head -c 20
}

# Resolve the ref to install: explicit override, else latest GitHub release, else main.
resolve_ref() {
  if [ -n "${KILOMONDO_REF:-}" ]; then printf '%s' "$KILOMONDO_REF"; return; fi
  local tag
  tag=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null \
        | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' || true)
  [ -n "$tag" ] && printf '%s' "$tag" || printf 'main'
}

# Download REF of the repo and extract its contents into DEST (DEST must exist).
download_into() {
  local ref="$1" dest="$2"
  info "Downloading ${B}$REPO@$ref${N} ..."
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$ref" \
    | tar -xz --strip-components=1 -C "$dest" \
    || die "Download/extract failed for ref '$ref'."
}

# ---------- .env generation ----------
write_env() {
  local dbpass session_secret admin_email admin_pass admin_name cookie_secure app_port
  dbpass=$(gen_password)
  session_secret=$(gen_secret)
  admin_name="${ADMIN_NAME:-Administrator}"
  cookie_secure="${COOKIE_SECURE:-false}"
  app_port="${KILOMONDO_PORT:-3000}"

  # A controlling terminal may be absent (e.g. under `curl | bash` in some
  # shells, or CI): /dev/tty can exist yet fail to open. Probe it once.
  local tty_ok=0
  if { : </dev/tty; } 2>/dev/null; then tty_ok=1; fi

  # Admin email
  admin_email="${ADMIN_EMAIL:-}"
  if [ -z "$admin_email" ] && [ "$tty_ok" = 1 ]; then
    printf '%s' "${B}Admin e-mail${N} [admin@example.com]: " >/dev/tty
    read -r admin_email </dev/tty || true
  fi
  admin_email="${admin_email:-admin@example.com}"

  # Admin password
  admin_pass="${ADMIN_PASSWORD:-}"
  if [ -z "$admin_pass" ] && [ "$tty_ok" = 1 ]; then
    printf '%s' "${B}Admin password${N} [auto-generate]: " >/dev/tty
    read -rs admin_pass </dev/tty || true
    printf '\n' >/dev/tty
  fi
  local generated_pw=0
  if [ -z "$admin_pass" ]; then admin_pass=$(gen_password); generated_pw=1; fi
  case "$admin_pass" in
    *"'"*) warn "Admin password contains a single quote (') — it can't be stored safely in .env; please choose a password without it.";;
  esac

  GENERATED_ADMIN_PW="$admin_pass"; GENERATED_ADMIN_PW_SHOWN="$generated_pw"; ADMIN_EMAIL_FINAL="$admin_email"

  # Build .env from .env.example, replacing only the values of known keys.
  local src="$DIR/.env.example" out="$DIR/.env"
  [ -f "$src" ] || die ".env.example missing in download — aborting."
  # Values are written single-quoted. Docker Compose interpolates env values
  # (e.g. "$$" -> "$", "${X}" -> expansion), which silently corrupts passwords
  # containing '$', '"', '\' or backticks. Single quotes are passed through
  # literally, so the password the seed receives matches what the user entered.
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      DATABASE_URL=*)     printf "DATABASE_URL='postgresql://carlog:%s@db:5432/carlog?schema=public'\n" "$dbpass";;
      POSTGRES_PASSWORD=*) printf "POSTGRES_PASSWORD='%s'\n" "$dbpass";;
      SESSION_SECRET=*)   printf "SESSION_SECRET='%s'\n" "$session_secret";;
      ADMIN_EMAIL=*)      printf "ADMIN_EMAIL='%s'\n" "$admin_email";;
      ADMIN_PASSWORD=*)   printf "ADMIN_PASSWORD='%s'\n" "$admin_pass";;
      ADMIN_NAME=*)       printf "ADMIN_NAME='%s'\n" "$admin_name";;
      COOKIE_SECURE=*)    printf "COOKIE_SECURE='%s'\n" "$cookie_secure";;
      APP_PORT=*)         printf "APP_PORT='%s'\n" "$app_port";;
      *)                  printf '%s\n' "$line";;
    esac
  done < "$src" > "$out"
  chmod 600 "$out"
  ok "Wrote ${B}$out${N} (generated DB password & session secret)."
}

# Append any keys present in .env.example but missing from .env (forward-compat on update).
merge_new_env_keys() {
  local src="$DIR/.env.example" env="$DIR/.env" key added=0
  [ -f "$src" ] && [ -f "$env" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue;; esac
    key="${line%%=*}"
    if ! grep -q "^${key}=" "$env"; then
      printf '%s\n' "$line" >> "$env"
      warn "New setting added to .env with its default: ${B}$key${N} — review it."
      added=1
    fi
  done < "$src"
  [ "$added" = 0 ] || warn "Some new settings used example defaults — edit $env if needed."
}

current_version() { cat "$DIR/.carlog-version" 2>/dev/null || echo "unknown"; }

access_url() {
  local port; port=$(grep -m1 '^APP_PORT=' "$DIR/.env" 2>/dev/null | sed -E 's/APP_PORT="?([^"]*)"?/\1/'); port="${port:-3000}"
  local host; host=$(hostname -I 2>/dev/null | awk '{print $1}'); host="${host:-localhost}"
  printf 'http://%s:%s' "$host" "$port"
}

# ---------- commands ----------
cmd_install() {
  require_tools; detect_compose

  # If Kilomondo is already installed here, a plain install upgrades it instead of
  # bailing out — so the same one-liner both installs and updates. The update
  # path then asks whether to keep your data & settings or start fresh. Use a
  # different KILOMONDO_DIR for a second, independent instance.
  if [ -f "$DIR/docker-compose.yml" ] && [ -f "$DIR/.env" ]; then
    info "Existing install detected in ${B}$DIR${N} — running update instead."
    cmd_update "$@"
    return
  fi

  local ref; ref=$(resolve_ref)
  mkdir -p "$DIR"
  download_into "$ref" "$DIR"
  printf '%s\n' "$ref" > "$DIR/.carlog-version"
  # Tell compose which published image to pull (matches the installed version).
  export KILOMONDO_IMAGE_TAG="$ref"

  info "Configuring ${B}$DIR/.env${N} ..."
  write_env

  info "Starting containers ..."
  compose_up

  echo
  ok "${B}Kilomondo ${ref}${N} is up."
  printf '   %sURL:%s      %s\n' "$B" "$N" "$(access_url)"
  printf '   %sAdmin:%s    %s\n' "$B" "$N" "$ADMIN_EMAIL_FINAL"
  if [ "${GENERATED_ADMIN_PW_SHOWN:-0}" = "1" ]; then
    printf '   %sPassword:%s %s   %s(generated — save it now!)%s\n' "$B" "$N" "$GENERATED_ADMIN_PW" "$Y" "$N"
  fi
  echo
  info "Manage it:  ${B}$0 status${N} · ${B}$0 logs${N} · ${B}$0 update${N}"
  [ "$(grep -m1 '^COOKIE_SECURE=' "$DIR/.env" | grep -c true || true)" = 1 ] || \
    info "Behind HTTPS later? Set ${B}COOKIE_SECURE=true${N} in $DIR/.env and re-run update."
}

# Decide between keeping data/settings or a fresh reset. Sets UPDATE_MODE to
# "keep" or "fresh". Explicit flags/env win; otherwise ask if interactive,
# else fall back to the safe "keep".
choose_update_mode() {
  if [ "${FRESH:-0}" = 1 ]; then UPDATE_MODE=fresh; return; fi
  if [ "${KEEP:-0}" = 1 ];  then UPDATE_MODE=keep;  return; fi
  local tty_ok=0
  if { : </dev/tty; } 2>/dev/null; then tty_ok=1; fi
  if [ "$tty_ok" != 1 ]; then UPDATE_MODE=keep; return; fi
  printf '\n' >/dev/tty
  printf '%s\n' "${B}How do you want to update?${N}" >/dev/tty
  printf '  %s1)%s Keep my data and settings (default)\n' "$B" "$N" >/dev/tty
  printf '  %s2)%s Fresh server — wipe the database AND .env, set up from scratch\n' "$B" "$N" >/dev/tty
  printf '%s' "Choice [1]: " >/dev/tty
  local ans; read -r ans </dev/tty || true
  case "$ans" in 2) UPDATE_MODE=fresh;; *) UPDATE_MODE=keep;; esac
}

# Guard the destructive fresh reset behind an explicit confirmation (skippable
# with --yes / non-interactive only via --yes).
confirm_fresh() {
  [ "${ASSUME_YES:-0}" = 1 ] && return 0
  local tty_ok=0
  if { : </dev/tty; } 2>/dev/null; then tty_ok=1; fi
  [ "$tty_ok" = 1 ] || die "Fresh reset needs confirmation but no terminal is available. Re-run with ${B}--yes${N}."
  warn "Fresh reset will DELETE the database volume (all vehicles, fuel-ups, attachments …) AND ${B}$DIR/.env${N} (admin login, secrets)."
  printf '%s' "${R}Type 'RESET' to confirm:${N} " >/dev/tty
  local c; read -r c </dev/tty || true
  [ "$c" = "RESET" ] || die "Aborted — nothing was deleted."
}

# Wipe data + settings and set up a clean server at $DIR (keeps the directory,
# so the same install location is reused).
cmd_update_fresh() {
  confirm_fresh
  local new; new=$(resolve_ref)
  info "Fresh setup at ${B}$DIR${N} → version ${B}$new${N}."

  info "Stopping containers and removing the database volume ..."
  compose down -v || true

  info "Refreshing code to ${B}$new${N} ..."
  download_into "$new" "$DIR"
  rm -f "$DIR/.env"            # drop old settings so write_env reconfigures cleanly
  printf '%s\n' "$new" > "$DIR/.carlog-version"
  export KILOMONDO_IMAGE_TAG="$new"

  info "Configuring ${B}$DIR/.env${N} ..."
  write_env

  info "Starting containers (migrations & admin seed run automatically) ..."
  compose_up

  echo
  ok "${B}Kilomondo ${new}${N} is up — fresh server."
  printf '   %sURL:%s      %s\n' "$B" "$N" "$(access_url)"
  printf '   %sAdmin:%s    %s\n' "$B" "$N" "$ADMIN_EMAIL_FINAL"
  if [ "${GENERATED_ADMIN_PW_SHOWN:-0}" = "1" ]; then
    printf '   %sPassword:%s %s   %s(generated — save it now!)%s\n' "$B" "$N" "$GENERATED_ADMIN_PW" "$Y" "$N"
  fi
}

cmd_update() {
  require_tools; detect_compose
  [ -f "$DIR/docker-compose.yml" ] || die "No install found in ${B}$DIR${N}. Set KILOMONDO_DIR or run install first."

  # Parse options. --force rebuilds even when up to date; --fresh/--reset wipes
  # data AND settings; --keep forces the keep path; --yes/-y pre-confirms --fresh.
  local force=0
  FRESH=0; KEEP=0; ASSUME_YES=0
  for a in "$@"; do
    case "$a" in
      --force)         force=1;;
      --fresh|--reset) FRESH=1;;
      --keep)          KEEP=1;;
      --yes|-y)        ASSUME_YES=1;;
      *)               warn "Ignoring unknown update option: ${B}$a${N}";;
    esac
  done
  [ "${KILOMONDO_FRESH:-0}" = 1 ] && FRESH=1

  local UPDATE_MODE; choose_update_mode
  if [ "$UPDATE_MODE" = fresh ]; then cmd_update_fresh; return; fi

  # ---- keep mode: preserve data (DB volume) and settings (.env) ----
  local cur new; cur=$(current_version); new=$(resolve_ref)
  info "Installed: ${B}$cur${N}   →   available: ${B}$new${N}"
  if [ "$cur" = "$new" ] && [ "$force" != 1 ]; then
    ok "Already up to date. Use ${B}update --force${N} to rebuild anyway."
    return 0
  fi

  # Preserve the user's .env across the code refresh (.env is not in the repo).
  local tmp; tmp=$(mktemp -d)
  cp "$DIR/.env" "$tmp/.env" 2>/dev/null || die "Existing $DIR/.env not found — refusing to update."

  info "Stopping containers (database volume is kept) ..."
  compose down || true

  info "Refreshing code to ${B}$new${N} ..."
  download_into "$new" "$DIR"
  cp "$tmp/.env" "$DIR/.env"; rm -rf "$tmp"
  printf '%s\n' "$new" > "$DIR/.carlog-version"
  export KILOMONDO_IMAGE_TAG="$new"
  merge_new_env_keys

  info "Starting (migrations run automatically) ..."
  compose_up

  ok "Updated to ${B}$new${N}.  ${C}$(access_url)${N}"
}

cmd_status()    { detect_compose; [ -f "$DIR/docker-compose.yml" ] || die "No install in $DIR."; info "Version: ${B}$(current_version)${N}  ·  ${C}$(access_url)${N}"; compose ps; }
cmd_logs()      { detect_compose; [ -f "$DIR/docker-compose.yml" ] || die "No install in $DIR."; compose logs -f --tail=100; }
cmd_uninstall() {
  detect_compose; [ -f "$DIR/docker-compose.yml" ] || die "No install in $DIR."
  warn "This stops Kilomondo. Add ${B}--purge${N} to also DELETE the database volume (irreversible)."
  if [ "${1:-}" = "--purge" ]; then compose down -v; warn "Database volume removed."; else compose down; fi
  ok "Stopped. Files remain in ${B}$DIR${N} (delete manually if desired)."
}

usage() {
  cat <<EOF
${B}Kilomondo installer${N}

  install              Download the current version and start it (default)
  update [options]     Update an existing install. Without flags it asks whether
                       to keep your data & settings or start fresh.
                         --force   rebuild even if already up to date
                         --keep    keep data & settings (no prompt)
                         --fresh   wipe the database AND .env, set up from scratch
                         --yes     pre-confirm --fresh (for non-interactive use)
  status               Show running containers and version
  logs                 Tail application logs
  uninstall [--purge]  Stop (and with --purge, delete the database volume)

Env: KILOMONDO_DIR, KILOMONDO_REF, KILOMONDO_PORT, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, COOKIE_SECURE, KILOMONDO_FRESH, KILOMONDO_BUILD
EOF
}

# ---------- dispatch ----------
CMD="${1:-install}"; [ $# -gt 0 ] && shift || true

# Resolve install directory. For update/status/logs/uninstall, auto-detect the
# current directory if it already looks like an install.
if [ -n "${KILOMONDO_DIR:-}" ]; then
  DIR="$KILOMONDO_DIR"
elif [ "$CMD" != "install" ] && [ -f "./docker-compose.yml" ] && { [ -f "./.carlog-version" ] || [ -f "./.env" ]; }; then
  DIR="."
else
  DIR="./kilomondo"
fi

case "$CMD" in
  install)            cmd_install "$@" ;;
  update|upgrade)     cmd_update "$@" ;;
  status|ps)          cmd_status ;;
  logs)               cmd_logs ;;
  uninstall|remove)   cmd_uninstall "$@" ;;
  -h|--help|help)     usage ;;
  *)                  warn "Unknown command: $CMD"; usage; exit 1 ;;
esac
