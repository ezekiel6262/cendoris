export type AssetClass = "LIQUIDITY" | "TREASURY_RWA" | "TOKENIZED_EQUITY" | "PRIVATE_CREDIT";
export type Asset = { id:string; symbol:string; name:string; assetClass:AssetClass; apy:number; risk:number; liquidity:number; price:number };
export type Mandate = { id:string; owner:string; capital:number; targetReturn:number; maxRisk:number; minLiquidity:number; maxAssetExposure:number; maxEquityExposure:number; maxCreditExposure:number; permissions:{trade:boolean;lend:boolean;hedge:boolean;rebalance:boolean}; automation:{monitor:boolean;rebalance:boolean;reinvest:boolean}; rationale?:string };
export type Allocation = { assetId:string; symbol:string; weight:number; amount:number; risk:number; expectedReturn:number; rationale?:string; confidence?:number };
export type Portfolio = { allocations:Allocation[]; risk:number; expectedReturn:number; liquidity:number; reasoning?:string };
export type PolicyResult = { valid:boolean; violations:string[] };
export type AuditEvent = { id:string; at:string; type:string; actor:"AI"|"POLICY"|"EXECUTION"|"WORKER"; summary:string; status:"PROPOSED"|"APPROVED"|"REJECTED"|"EXECUTED"; data?:unknown };
export type DemoResult = { mandate:Mandate; assets:Asset[]; initial:Portfolio; initialPolicy:PolicyResult; shocked:Portfolio; shockPolicy:PolicyResult; rebalanced:Portfolio; rebalancePolicy:PolicyResult; audit:AuditEvent[] };

