# Security invariants

The current contract tests enforce these baseline invariants:

- A non-owner cannot withdraw from a vault.
- A wallet cannot create more than one canonical vault.
- A plan without a published risk attestation cannot execute.
- A risk report is bound to chain, policy manager, vault, nonce, plan hash, metrics, and expiry.
- A plan whose risk exceeds the wallet-approved strategy cannot execute even when its report is published.
- A consumed nonce prevents replay.
- A disabled adapter cannot move funds.
- The router increments the nonce before external adapter calls; a reverted call reverts the nonce as well.
- Token approvals are scoped to one adapter action and reset to zero afterward.
- Only an explicitly allowlisted asset can enter through the standard deposit path.

Before any public deployment, add invariant fuzzing, malicious-token and malicious-adapter suites, oracle quorum/rotation, timelocked registry administration, incident pausing, formal withdrawal-liveness checks, and an independent audit.
