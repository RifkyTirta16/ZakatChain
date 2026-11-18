# Decisions Snapshot

- Root `DEC-001` accepted: `blockchain/` is the canonical contract workspace; legacy copies remain until integration confirms safe removal.
- Root `DEC-003` accepted: audit-hash pipeline must not be changed incompatibly; existing record-ID-aware hashing is current source behavior.
- Root `DEC-005` accepted: donation attribution comes from authenticated principal; client must not select donor identity.
- 2026-11-12 audit implementation: campaign-less payment session input is allowed to match the general payment form. This does **not** make general donation persistence complete; linked `donations` row and trusted payment integration remain backlog.
- No real network/contract deployment decision was made. Contract registration authorization remains a product/security decision.
