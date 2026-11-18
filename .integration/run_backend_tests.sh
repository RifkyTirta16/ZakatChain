#!/usr/bin/env bash
set -uo pipefail
cd /home/jarvis/ZakatChain/backend || exit 1
echo "== backend unit tests =="
node --import tsx --test blockchain/tests/database.test.ts blockchain/tests/paymentWebhook.test.ts
echo "BACKEND_TEST_EXIT=$?"
