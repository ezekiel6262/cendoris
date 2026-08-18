# Demo video script

Target: 90–120 seconds. Screen-record the actual app with a live `GEMINI_API_KEY` set — do not narrate numbers from this script over stale footage, since Gemini's exact figures will vary run to run. The beats below are the structure; read the real numbers off the screen as you record.

Record against `pnpm chain:deploy:xlayer-testnet` if it's live by shoot time, otherwise the local chain is fine for this cut — say "X Layer" on screen, not "localhost," when you narrate.

---

**0:00–0:10 — Cold open, dark Command view**
Voiceover: "Tokenization is producing more investable assets than anyone can track by hand. Cendoris is the intelligence layer that turns a plain objective into a continuously managed, non-custodial position."

**0:10–0:25 — Strategy in plain language**
Type a mandate into the Command view (e.g. "Manage 100,000 USDT. Target 8% return, moderate risk, keep 20% liquid."). Let the "Gemini is recompiling the mandate…" loading state show on screen — it's proof this is a live call, not a canned string. Cut to the compiled constraints.
Voiceover: "You describe the objective. Gemini compiles it into hard numeric guardrails — read them off the screen."

**0:25–0:40 — Portfolio construction**
Click through to Strategy → Decision Review. Show the AI Proposal card with real per-asset rationale text and confidence scores.
Voiceover: "Gemini proposes the portfolio and explains every position. A deterministic policy contract — not the model — decides whether it's allowed."

**0:40–0:50 — On-chain execution**
Connect OKX Wallet, sign vault creation/deposit, sign the execution transaction. Show the transaction receipt (hash, block, gas) appear.
Voiceover: "You sign. This is a real transaction on X Layer — the on-chain risk snapshot matches this exact portfolio, not a placeholder."

**0:50–1:05 — Market shock**
Return to Command, click "Trigger market shock." Show portfolio risk cross the mandate ceiling in real time.
Voiceover: "Now the market moves against the position — and the portfolio's risk genuinely breaches the mandate."

**1:05–1:20 — AI recovery, policy-gated**
Open Recovery Review. Show Gemini's defensive reallocation and rationale, the breach evidence card, and the recovery policy check passing.
Voiceover: "Gemini proposes a defensive rebalance from the live shock data. Policy verifies it independently. Only then do you sign the recovery — on-chain, again."

**1:20–1:35 — Credit underwriting**
Open Credit, select a real-world credit opportunity, let the live underwriting pass run on screen.
Voiceover: "The same intelligence underwrites real-world credit — borrower quality, default probability, a recommended yield band — before any mandate can fund it."

**1:35–1:50 — Market Engine / Exchange OS**
Open Markets. Show Gemini's proposal for the specific hedge this portfolio needs.
Voiceover: "And it identifies markets that don't exist yet — the venue Cendoris would ask Exchange OS to deploy to hedge this exact exposure."

**1:50–2:00 — Close**
Cut to black on the Cendoris wordmark.
Voiceover: "Cendoris. The intelligence layer for programmable capital. Built on X Layer."

---

## Shot list checklist

- [ ] Mandate compile loading state visible (proves live call)
- [ ] Decision Review per-asset rationale text visible and legible
- [ ] Wallet signature prompt visible at least once
- [ ] On-chain transaction receipt (hash/block/gas) visible
- [ ] Risk number crossing the mandate ceiling on screen, not just stated
- [ ] Recovery Review's policy check rows (pass/fail) visible
- [ ] Credit underwriting rationale text visible
- [ ] Market proposal card visible
