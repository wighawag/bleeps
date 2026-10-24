#!/usr/bin/env bash
# Run a compose command with whichever container runtime this machine has.
#
#   dev/compose.sh -f dev/docker-compose-subgraph.yml up
#
# Resolution order:
#   1. $COMPOSE, if set, verbatim (e.g. COMPOSE="podman compose",
#      COMPOSE="podman-compose", COMPOSE="nerdctl compose"). Explicit wins.
#   2. `docker compose`, if a `docker` binary exists.
#   3. `podman compose`, if a `podman` binary exists. It needs a compose
#      provider on PATH (the `docker-compose` binary, or `podman-compose`), and
#      runs it against the rootless podman socket, so no Docker daemon is needed.
#
# Docker is preferred over podman when both exist only because that was the
# historical behaviour of these scripts; set COMPOSE to override.
set -euo pipefail

if [ -n "${COMPOSE:-}" ]; then
	# Word-split on purpose: COMPOSE is a command plus its subcommand.
	# shellcheck disable=SC2086
	exec $COMPOSE "$@"
elif command -v docker >/dev/null 2>&1; then
	exec docker compose "$@"
elif command -v podman >/dev/null 2>&1; then
	exec podman compose "$@"
else
	echo "compose.sh: no container runtime found. Install docker (with compose) or podman (with docker-compose or podman-compose), or set COMPOSE to your compose command." >&2
	exit 127
fi
