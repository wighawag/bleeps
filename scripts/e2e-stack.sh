#!/bin/bash
# Dev helper: bring up the e2e stack ONCE (node + deploy + build) so Playwright
# can be re-run against it repeatedly. Measuring a flaky suite needs many runs,
# and paying the full compile/deploy/build each time makes that unaffordable.
#
# Not used by CI: scripts/run-e2e-tests.sh remains the single official entry
# point. This only exists to iterate on the suite itself.
#
#   scripts/e2e-stack.sh up      # start node, deploy, build
#   scripts/e2e-stack.sh test N  # run playwright N times, report pass rate
#   scripts/e2e-stack.sh down    # stop the node this script started
set -e

TEST_MNEMONIC="test test test test test test test test test test test junk"
export MNEMONIC="$TEST_MNEMONIC"
export MNEMONIC_localhost="$TEST_MNEMONIC"

RPC_PORT="${E2E_RPC_PORT:-8546}"
RPC_URL="http://127.0.0.1:${RPC_PORT}"
export E2E_RPC_PORT="$RPC_PORT"
export E2E_RPC_URL="$RPC_URL"
export ETH_NODE_URI_localhost="$RPC_URL"
export PUBLIC_NODE_URL="$RPC_URL"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="/tmp/bleeps-e2e-stack.pgid"
NODE_LOG="/tmp/bleeps-e2e-stack-node.log"

# Bounded on purpose: an unbounded probe turns the readiness loop below into an
# indefinite hang instead of a 30s failure. See run-e2e-tests.sh.
node_is_up() {
	curl -s --connect-timeout 2 --max-time 5 -X POST "$RPC_URL" -H "Content-Type: application/json" \
		-d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' >/dev/null 2>&1
}

case "$1" in
up)
	if node_is_up; then
		echo "node already up on $RPC_URL"
	else
		cd "$ROOT_DIR/contracts"
		setsid pnpm run node:local --port "$RPC_PORT" >"$NODE_LOG" 2>&1 &
		NODE_PID=$!
		OWN_PGID="$(ps -o pgid= -p $$ | tr -d ' ')"
		for _ in 1 2 3 4 5; do
			PGID="$(ps -o pgid= -p "$NODE_PID" 2>/dev/null | tr -d ' ')"
			[ -n "$PGID" ] && break
			sleep 0.2
		done
		if [ -z "$PGID" ] || [ "$PGID" = "$OWN_PGID" ]; then
			echo "refusing to record a process group equal to our own" >&2
			exit 1
		fi
		echo "$PGID" >"$PID_FILE"
		for i in $(seq 1 30); do
			node_is_up && break
			[ "$i" -eq 30 ] && {
				echo "node failed to start, see $NODE_LOG"
				tail -20 "$NODE_LOG"
				exit 1
			}
			sleep 1
		done
		echo "node up on $RPC_URL (pgid $PGID, log $NODE_LOG)"
	fi

	cd "$ROOT_DIR/contracts"
	pnpm compile
	pnpm run deploy localhost --skip-prompts
	pnpm export localhost --ts ../web/src/lib/deployments.ts
	cd "$ROOT_DIR/web"
	PUBLIC_WALLET_HOST= PUBLIC_EXECUTION_MODE= pnpm build localhost
	echo "stack ready"
	;;
build)
	# Rebuild the web app only (after a src change), reusing the running chain.
	cd "$ROOT_DIR/web"
	PUBLIC_WALLET_HOST= PUBLIC_EXECUTION_MODE= pnpm build localhost
	;;
test)
	RUNS="${2:-1}"
	cd "$ROOT_DIR/web"
	pass=0
	for i in $(seq 1 "$RUNS"); do
		echo "===== run $i/$RUNS"
		if pnpm exec playwright test --reporter=line >"/tmp/bleeps-e2e-run-$i.log" 2>&1; then
			pass=$((pass + 1))
			echo "PASS  $(grep -E '[0-9]+ passed' "/tmp/bleeps-e2e-run-$i.log" | tail -1)"
		else
			echo "FAIL  $(grep -E '[0-9]+ (failed|passed)' "/tmp/bleeps-e2e-run-$i.log" | tail -1)"
			grep -E '^\s+[0-9]+\) ' "/tmp/bleeps-e2e-run-$i.log" | head -10 || true
		fi
	done
	echo "===== pass rate: $pass/$RUNS"
	;;
down)
	if [ -f "$PID_FILE" ]; then
		PGID="$(cat "$PID_FILE")"
		OWN_PGID="$(ps -o pgid= -p $$ | tr -d ' ')"
		if [ -n "$PGID" ] && [ "$PGID" != "$OWN_PGID" ]; then
			kill -- "-$PGID" 2>/dev/null || true
			sleep 1
			kill -9 -- "-$PGID" 2>/dev/null || true
			echo "stopped pgid $PGID"
		fi
		rm -f "$PID_FILE"
	else
		echo "no stack recorded"
	fi
	;;
*)
	echo "usage: $0 {up|build|test [N]|down}"
	exit 1
	;;
esac
