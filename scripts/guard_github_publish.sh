#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."

info() {
  echo -e "\033[1;34m>>> $1\033[0m"
}

warn() {
  echo -e "\033[1;33m>>> WARNING: $1\033[0m"
}

error() {
  echo -e "\033[1;31m>>> ERROR: $1\033[0m"
}

is_blocked_path() {
  local file="$1"
  case "${file}" in
    .env|.env.*|*.pem|*.key|*.p12|*.pfx|*.crt|deployment/leaftab-backend.env|server/users.db|server/sessions.db)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

contains_secret_like_content() {
  local content="$1"
  # Common secret patterns (private keys, cloud tokens, API keys)
  if printf '%s' "${content}" | grep -E -q -- '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'; then
    return 0
  fi
  if printf '%s' "${content}" | grep -E -q -- 'ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{20,}'; then
    return 0
  fi
  return 1
}

contains_non_placeholder_env_secret() {
  local content="$1"
  local suspicious_line
  suspicious_line="$(
    printf '%s\n' "${content}" | awk '
      BEGIN {
        n = split("JWT_SECRET SESSION_SECRET ADMIN_API_KEY GOOGLE_OAUTH_CLIENT_SECRET GITHUB_TOKEN", keys, " ")
        for (i = 1; i <= n; i++) keyset[keys[i]] = 1
      }
      /^[[:space:]]*[A-Z0-9_]+[[:space:]]*=/ {
        line = $0
        sub(/^[[:space:]]*/, "", line)
        split(line, pair, "=")
        key = pair[1]
        gsub(/[[:space:]]+$/, "", key)
        if (!(key in keyset)) next

        value = line
        sub(/^[^=]*=[[:space:]]*/, "", value)
        gsub(/^["'\''"]|["'\''"]$/, "", value)
        gsub(/[[:space:]]+$/, "", value)

        if (value == "" || value == "change-this-in-production" || value == "change-this-admin-key") next
        if (value ~ /^\$\{?[A-Z0-9_]+\}?$/) next
        print $0
        exit
      }
    '
  )"

  if [ -n "${suspicious_line}" ]; then
    echo "${suspicious_line}"
    return 0
  fi
  return 1
}

info "Checking staged changes for sensitive data..."

staged_files="$(git diff --cached --name-only --diff-filter=ACMR)"
if [ -z "${staged_files}" ]; then
  warn "No staged files. Nothing to check."
  exit 0
fi

has_error="false"

while IFS= read -r file; do
  [ -n "${file}" ] || continue

  if is_blocked_path "${file}"; then
    error "Blocked sensitive path staged: ${file}"
    has_error="true"
    continue
  fi

  if ! git cat-file -e ":${file}" 2>/dev/null; then
    continue
  fi

  # Skip binary files
  if ! git show ":${file}" | LC_ALL=C grep -q '[[:print:][:space:]]'; then
    continue
  fi

  content="$(git show ":${file}")"

  if contains_secret_like_content "${content}"; then
    error "Secret-like content detected in staged file: ${file}"
    has_error="true"
    continue
  fi

  if suspicious_env_line="$(contains_non_placeholder_env_secret "${content}")"; then
    error "Potential non-placeholder secret in ${file}: ${suspicious_env_line}"
    has_error="true"
    continue
  fi
done <<< "${staged_files}"

if [ "${has_error}" = "true" ]; then
  error "Publish guard failed. Please remove/redact sensitive data before pushing to GitHub."
  exit 1
fi

info "Publish guard passed. No obvious sensitive data found in staged changes."
