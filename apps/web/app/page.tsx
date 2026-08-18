"use client";
import "./sections.css";
import { useEffect, useMemo, useState } from "react";
import { connectCendorisWallet, executeWalletPlan, provisionWalletVault } from "../lib/wallet";
import { Activity, ArrowUpRight, BookOpen, BrainCircuit, Check, ChevronRight, CircleDollarSign, Command, Landmark, Loader2, Network, Play, RefreshCw, ShieldCheck, SlidersHorizontal, TrendingUp, Wallet, X } from "lucide-react";

const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const NETWORK_LABEL:Record<string,string>={"1952":"X Layer Testnet","196":"X Layer","31337":"Local EVM"};
const networkLabel=NETWORK_LABEL[process.env.NEXT_PUBLIC_CHAIN_ID??""]??"Unconfigured network";
const navigation=[[Command,"Command"],[SlidersHorizontal,"Strategy"],[Activity,"Portfolio"],[BrainCircuit,"Intelligence"],[Landmark,"Credit"],[RefreshCw,"Automations"],[Network,"Markets"]] as const;
const DATA_SOURCES:Record<string,string>={usdt:"Pegged, 1:1 USD",ustb:"U.S. Treasury Fiscal Data API — average marketable Treasury Notes rate",nvdax:"Yahoo Finance — live NVDA quote; risk from trailing 1-month realized volatility",trade:"NY Fed SOFR + underwritten spread (Cendoris-originated credit)",solar:"NY Fed SOFR + underwritten spread (Cendoris-originated credit)"};
const views:Record<string,{kicker:string;title:string;copy:string;stats:[string,string][];items:[string,string][]}>= {
  Architecture:{kicker:"SYSTEM DESIGN",title:"Intelligence is separated from authority.",copy:"AI proposes structured actions. Deterministic policy validates them. The execution router alone can instruct non-custodial vaults.",stats:[["5","Core engines"],["5","Smart contracts"],["1","Policy boundary"]],items:[["Intelligence → Risk","Evidence becomes measurable exposure"],["Capital → Policy","Every proposal is deterministically checked"],["Execution → X Layer","Only approved actions reach settlement"]]}
};

export default function Home(){
  const[phase,setPhase]=useState(0);const[section,setSection]=useState("Command");const[walletAccount,setWalletAccount]=useState("");const[walletStatus,setWalletStatus]=useState("");const[walletError,setWalletError]=useState("");const[receipt,setReceipt]=useState<any>(null);
  const[text,setText]=useState("Manage 100,000 USDT. Target 8% return, risk ceiling around 40, maintain at least 20% liquidity, no single asset over 35%.");
  const[data,setData]=useState<any>(null);const[loadingDemo,setLoadingDemo]=useState(true);const[demoError,setDemoError]=useState("");
  const[loadingRecovery,setLoadingRecovery]=useState(false);const[recoveryError,setRecoveryError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setLoadingDemo(true);setDemoError("");
      try{
        const response=await fetch("/api/demo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text}),signal:controller.signal});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error??"Cendoris could not compile this strategy.");
        if(!controller.signal.aborted){setData(result);setPhase(0);setLoadingDemo(false)}
      }catch(error){if((error as any)?.name!=="AbortError"){setDemoError(error instanceof Error?error.message:"Cendoris could not compile this strategy.");setLoadingDemo(false)}}
    },text===  "Manage 100,000 USDT. Target 8% return, risk ceiling around 40, maintain at least 20% liquidity, no single asset over 35%."?0:600);
    return()=>{controller.abort();clearTimeout(timer)}
  },[text]);
  const portfolio=useMemo(()=>!data?null:phase<2?data.initial:phase===2?data.shocked:data.rebalanced,[data,phase]);
  const triggerShock=async()=>{
    if(!data||loadingRecovery)return;
    setLoadingRecovery(true);setRecoveryError("");
    try{
      const response=await fetch("/api/demo/recovery",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mandate:data.mandate,assets:data.assets,initial:data.initial,auditStartCount:data.audit.length})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error??"Cendoris could not compute a recovery plan.");
      setData((prev:any)=>({...prev,...result,audit:[...prev.audit,...result.audit]}));
      setPhase(2);
    }catch(error){setRecoveryError(error instanceof Error?error.message:"Cendoris could not compute a recovery plan.")}
    finally{setLoadingRecovery(false)}
  };
  const connect=async()=>{setWalletError("");setWalletStatus("Connecting wallet…");try{const session=await connectCendorisWallet();setWalletAccount(session.account);setWalletStatus("Wallet connected")}catch(error){setWalletStatus("");setWalletError(error instanceof Error?error.message:typeof error==="string"?error:"Wallet connection failed")}};
  const activate=async()=>{setWalletError("");try{const session=await provisionWalletVault(data.mandate,setWalletStatus);setWalletAccount(session.account);setSection("Decision review")}catch(error){setWalletStatus("");setWalletError(error instanceof Error?error.message:"Vault setup failed")}};
  const execute=async()=>{const nextReceipt=await executeWalletPlan(data.initial,data.mandate.capital);setReceipt(nextReceipt);setPhase(1);setSection("Command");return nextReceipt};
  const executeRecovery=async()=>{const nextReceipt=await executeWalletPlan(data.rebalanced,data.mandate.capital);setReceipt(nextReceipt);setPhase(3);setSection("Command");return nextReceipt};
  if(!data)return <div className="app"><main style={{gridColumn:"1/-1",display:"grid",placeItems:"center",height:"100vh"}}>{demoError?<span style={{color:"var(--red)",fontSize:12}}>{demoError}</span>:<span style={{display:"flex",gap:10,alignItems:"center",color:"var(--muted)",fontSize:12}}><Loader2 size={16} className="spin"/>Cendoris is compiling your strategy…</span>}</main></div>;
  return <div className="app"><aside><div className="brand"><span>C</span><b>CENDORIS</b></div><nav>{navigation.map(([Icon,label])=><button className={section===label?"active":""} aria-current={section===label?"page":undefined} onClick={()=>setSection(label)} key={label}><Icon size={17}/>{label}</button>)}</nav><div className="rail"><div><i/><span>{networkLabel}<br/><small>Wallet-signed</small></span></div><button onClick={()=>setSection("Architecture")}><BookOpen size={15}/>Architecture</button></div></aside>
  <main><header><div><p>{section.toUpperCase()}</p><h1>{section==="Command"?"Good morning, Operator.":section}</h1></div><button className="wallet" onClick={connect}><Wallet size={16}/>{walletAccount?`${walletAccount.slice(0,6)}…${walletAccount.slice(-4)}`:"Connect wallet"}</button></header>{(walletStatus||walletError)&&<div className={`walletnotice ${walletError?"error":""}`}>{walletError||walletStatus}</div>}
  {section==="Command"?<CommandView phase={phase} setPhase={setPhase} text={text} setText={setText} data={data} portfolio={portfolio} open={setSection} receipt={receipt} loadingDemo={loadingDemo} triggerShock={triggerShock} loadingRecovery={loadingRecovery} recoveryError={recoveryError}/>:section==="Strategy"?<StrategyView text={text} setText={setText} data={data} onApprove={activate}/>:section==="Decision review"?<DecisionReview data={data} onBack={()=>setSection("Strategy")} onExecute={execute}/>:section==="Recovery review"?<RecoveryReview data={data} onBack={()=>setSection("Command")} onExecute={executeRecovery}/>:section==="Credit"?<CreditView/>:section==="Markets"?<MarketsView data={data}/>:section==="Portfolio"?<PortfolioView data={data} portfolio={portfolio}/>:section==="Intelligence"?<IntelligenceView data={data}/>:section==="Automations"?<AutomationsView data={data}/>:<SectionView section={section} open={setSection}/>}</main></div>
}

function CommandView({phase,setPhase,text,setText,data,portfolio,open,receipt,loadingDemo,triggerShock,loadingRecovery,recoveryError}:any){const risk=portfolio.risk;const status=phase===2?"ACTION REQUIRED":"WITHIN STRATEGY";return <>
  {receipt&&<div className="chainreceipt"><span><i/>LOCAL EVM · CHAIN {receipt.chainId}</span><b>{receipt.status} · {receipt.valueMoved} USDT moved</b><code>{receipt.transactionHash.slice(0,18)}…</code><small>Block {receipt.blockNumber} · {receipt.gasUsed} gas</small></div>}
  <section className="metrics"><Metric label="Capital under intelligence" value={money(data.mandate.capital)} delta="Active strategy"/><Metric label="Expected return" value={`${portfolio.expectedReturn}%`} delta="Net annualized"/><Metric label="Portfolio risk" value={`${risk} / 100`} delta={phase===2?"Above mandate ceiling":`Policy maximum ${data.mandate.maxRisk}`} warn={phase===2}/><Metric label="Available liquidity" value={`${portfolio.liquidity}%`} delta={`Minimum ${data.mandate.minLiquidity}%`}/></section>
  <section className="grid"><div className="card mandate"><div className="cardtop"><div><span className="eyebrow">ACTIVE CAPITAL STRATEGY</span><h2>Capital, governed by your intent.</h2></div><span className={`badge ${phase===2?"bad":""}`}>{status}</span></div><textarea value={text} onChange={(e:any)=>setText(e.target.value)} aria-label="Capital strategy"/>{loadingDemo&&<p className="note" style={{marginBottom:8}}><Loader2 size={11} className="spin"/> Gemini is recompiling the mandate…</p>}<div className="constraints"><span>Target <b>{data.mandate.targetReturn}%</b></span><span>Risk ceiling <b>{data.mandate.maxRisk}</b></span><span>Min. liquid <b>{data.mandate.minLiquidity}%</b></span><span>Max. position <b>{data.mandate.maxAssetExposure}%</b></span></div><button className="primary" onClick={()=>phase===0?open("Strategy"):setPhase(Math.max(1,phase))}><BrainCircuit size={16}/>{phase===0?"Review & activate strategy":"Strategy active"}<ChevronRight size={16}/></button></div>
  <div className="card allocation"><div className="cardtop"><div><span className="eyebrow">LIVE ALLOCATION</span><h2>{phase===2?"Risk threshold breached":"Portfolio construction"}</h2></div><button className="icon" aria-label="Open portfolio" onClick={()=>open("Portfolio")}><ArrowUpRight size={17}/></button></div><div className="bar">{portfolio.allocations.map((a:any,i:number)=><i key={a.assetId} style={{width:`${a.weight}%`}} className={`c${i}`}/>)}</div><div className="holdings">{portfolio.allocations.map((a:any,i:number)=><div key={a.assetId}><i className={`dot c${i}`}/><span><b>{a.symbol}</b><small>{data.assets.find((x:any)=>x.id===a.assetId)?.name}</small></span><strong>{a.weight}%<small>{money(a.amount)}</small></strong></div>)}</div></div>
  <div className="card control"><div className="cardtop"><div><span className="eyebrow">DECISION CONTROL</span><h2>Intelligence has no custody.</h2></div><ShieldCheck size={22}/></div><div className="pipeline">{[[BrainCircuit,"AI proposes","Structured ActionPlan"],[ShieldCheck,"Policy validates","Deterministic constraints"],[CircleDollarSign,"Execution acts","Non-custodial router"]].map(([Icon,a,b],i)=><div key={String(a)}><span><Icon size={17}/></span><p><b>{String(a)}</b><small>{String(b)}</small></p>{i<2&&<ChevronRight size={15}/>}</div>)}</div><p className="note">Every recommendation is generated by Gemini, policy-checked and recorded before value can move.</p></div>
  <div className="card event"><span className="eyebrow">AUTOMATION SCENARIO</span><div className="shock"><div><TrendingUp size={20}/><span><b>NVDAx market shock</b><small>What-if stress test, applied to today's real NVDA price</small></span></div><strong>-18.0%</strong></div><div className="riskline"><span>Portfolio risk</span><b>{phase<2?(data.shocked?`${data.initial.risk} → ${data.shocked.risk}`:`${data.initial.risk} → ?`):`${data.shocked.risk} → ${data.rebalanced.risk}`}</b></div>{recoveryError&&<p className="executionerror" style={{margin:"10px 0 0"}}>{recoveryError}</p>}<button className={phase===2?"danger":"secondary"} onClick={()=>phase<2?triggerShock():phase===2?open("Recovery review"):undefined} disabled={phase===0||phase===3||loadingRecovery}>{loadingRecovery?<><Loader2 size={15} className="spin"/>Computing recovery plan…</>:phase<2?<><Play size={15}/>Trigger market shock</>:phase===2?<><RefreshCw size={15}/>Review recovery plan</>:<><Check size={15}/>Portfolio restored</>}</button></div>
  </section>
  <section className="lower"><div className="card audit"><div className="cardtop"><div><span className="eyebrow">AUDIT TRAIL</span><h2>Decision lineage</h2></div><span className="live"><i/>LIVE</span></div>{data.audit.slice(0,phase===0?1:phase===1?3:phase===2?5:8).reverse().map((e:any)=><div className="auditrow" key={e.id}><span className={`actor ${e.actor.toLowerCase()}`}>{e.actor[0]}</span><p><b>{e.summary}</b><small>{e.id} · {e.actor}</small></p><em className={e.status.toLowerCase()}>{e.status}</em></div>)}</div><div className="card horizon"><span className="eyebrow">CENDORIS NETWORK</span><h2>One intelligence layer.<br/>Every capital market.</h2><p>Credit underwriting, capital structuring, self-healing portfolios and Exchange OS market proposals share the same mandate and policy rails.</p><div className="tiles"><span><b>4</b>Live Gemini decisions</span><span><b>3</b>Live data sources</span><span><b>{data.audit.length}</b>Audited actions</span></div><button onClick={()=>open("Architecture")}>Explore the full architecture <ArrowUpRight size={15}/></button></div></section>
  </>}

function RecoveryReview({data,onBack,onExecute}:{data:any;onBack:()=>void;onExecute:()=>Promise<any>}){
  const[executing,setExecuting]=useState(false);const[executionError,setExecutionError]=useState("");
  const execute=async()=>{setExecuting(true);setExecutionError("");try{await onExecute()}catch(error){setExecutionError(error instanceof Error?error.message:"Execution failed");setExecuting(false)}};
  const recoveryChecks=[
    [`Portfolio risk ${data.rebalanced.risk} / ${data.mandate.maxRisk}`,data.rebalanced.risk<=data.mandate.maxRisk],
    [`Liquidity ${data.rebalanced.liquidity}% / ${data.mandate.minLiquidity}% minimum`,data.rebalanced.liquidity>=data.mandate.minLiquidity],
    [`Largest position ${Math.max(...data.rebalanced.allocations.map((a:any)=>a.weight))}% / ${data.mandate.maxAssetExposure}% maximum`,Math.max(...data.rebalanced.allocations.map((a:any)=>a.weight))<=data.mandate.maxAssetExposure],
    [`Rebalance ${data.rebalancePolicy.valid?"restores":"does not yet restore"} full mandate compliance`,data.rebalancePolicy.valid]
  ] as const;
  return <section className="recoveryreview">
    <div className="recoveryhero"><button className="reviewback" onClick={onBack}>← Return to breach</button><span className="eyebrow">RECOVERY REVIEW</span><h2>Restore the strategy without surrendering control.</h2><p>The automation worker detected a policy breach. Gemini proposed this defensive rebalance from the live mandate and shocked market data — policy and execution remain independent.</p><div className="breachstrip"><span><small>Market event</small><b>NVDAx −18%</b></span><ChevronRight size={16}/><span className="breach"><small>Risk breach</small><b>{data.shocked.risk} / {data.mandate.maxRisk}</b></span><ChevronRight size={16}/><span className="restored"><small>Proposed recovery</small><b>{data.rebalanced.risk} / {data.mandate.maxRisk}</b></span></div></div>
    <div className="recoveryallocation"><div className="cardtop"><div><span className="eyebrow">AI RECOVERY PLAN</span><h2>Defensive reallocation</h2></div><span className="badge">GEMINI</span></div><div className="changerows">{data.rebalanced.allocations.map((next:any)=>{const before=data.initial.allocations.find((item:any)=>item.assetId===next.assetId);const change=+(next.weight-before.weight).toFixed(1);return <div key={next.assetId}><b>{next.symbol}</b><span>{before.weight}%</span><ChevronRight size={13}/><strong>{next.weight}%</strong><em className={change<0?"reduce":change>0?"increase":"flat"}>{change>0?"+":""}{change}%</em></div>})}</div><p className="recoveryreason"><BrainCircuit size={17}/><span><b>Why this plan</b><small>{data.rebalanced.reasoning??"Reduce correlated equity exposure; increase liquid reserves, treasury carry and senior secured credit."}</small></span></p></div>
    <div className="breachevidence"><span className="eyebrow">BREACH EVIDENCE</span><h2>Policy stopped autonomous execution.</h2><div className="evidencebox"><span><X size={15}/></span><p><b>{data.shockPolicy.violations[0]??`Risk ${data.shocked.risk} exceeds strategy maximum ${data.mandate.maxRisk}`}</b><small>POLICY-002 · deterministic rejection · recorded by automation worker</small></p><em>BLOCKED</em></div><p>The worker may detect and propose, but it cannot weaken a guardrail or move capital around a failed policy decision.</p></div>
    <div className="recoverypolicy"><div className="cardtop"><div><span className="eyebrow">RECOVERY POLICY CHECK</span><h2>{data.rebalancePolicy.valid?"Proposed portfolio is compliant":"Proposed portfolio still needs review"}</h2></div><ShieldCheck size={22}/></div><div className="checkrows">{recoveryChecks.map(([label,passed])=><div key={label}><span className={passed?"checkpass":"checkfail"}>{passed?<Check size={13}/>:<X size={13}/>}</span><b>{label}</b><em>{passed?"PASS":"FAIL"}</em></div>)}</div></div>
    <div className="recoveryexecute"><div><span className="eyebrow">EXECUTION PREVIEW</span><h2>{data.rebalanced.allocations.length} policy-approved X Layer actions</h2><p>Rebalance to the Gemini-proposed weights, bound to the risk attestation, strategy version, deadline and current vault nonce.</p></div><div className="actionchips">{data.rebalanced.allocations.map((a:any)=><span key={a.assetId}>{a.symbol} {a.weight}%</span>)}</div><div className="custodyline"><Wallet size={17}/><span><b>Authorization boundary</b><small>Simulated execution occurs only after this recovery plan is approved.</small></span></div>{executionError&&<p className="executionerror">{executionError}</p>}<button className="primary" onClick={execute} disabled={executing||!data.rebalancePolicy.valid}><RefreshCw size={16}/>{executing?"Waiting for wallet confirmation…":"Authorize recovery execution"}</button></div>
  </section>
}

function DecisionReview({data,onBack,onExecute}:{data:any;onBack:()=>void;onExecute:()=>Promise<any>}){
  const[executing,setExecuting]=useState(false);const[executionError,setExecutionError]=useState("");
  const execute=async()=>{setExecuting(true);setExecutionError("");try{await onExecute()}catch(error){setExecutionError(error instanceof Error?error.message:"Execution failed");setExecuting(false)}};
  const largest=Math.max(...data.initial.allocations.map((a:any)=>a.weight));
  const equityWeight=data.initial.allocations.filter((a:any)=>a.symbol.endsWith("x")).reduce((s:number,a:any)=>s+a.weight,0);
  const checks=[
    [`Portfolio risk ${data.initial.risk} / ${data.mandate.maxRisk}`,data.initial.risk<=data.mandate.maxRisk],
    [`Liquidity ${data.initial.liquidity}% / ${data.mandate.minLiquidity}% minimum`,data.initial.liquidity>=data.mandate.minLiquidity],
    [`Largest position ${largest}% / ${data.mandate.maxAssetExposure}% maximum`,largest<=data.mandate.maxAssetExposure],
    [`Equity exposure ${equityWeight}% / ${data.mandate.maxEquityExposure}% maximum`,equityWeight<=data.mandate.maxEquityExposure]
  ] as const;
  return <section className="decisionreview">
    <div className="reviewsummary"><button className="reviewback" onClick={onBack}>← Edit strategy</button><span className="eyebrow">DECISION REVIEW</span><h2>Review the proposal before value moves.</h2><p>Cendoris has converted your strategy into a portfolio proposal. Gemini explains the choices; deterministic policy independently decides whether they are allowed.</p><div className="reviewmetrics"><span><small>Expected return</small><b>{data.initial.expectedReturn}%</b></span><span><small>Portfolio risk</small><b>{data.initial.risk} / 100</b></span><span><small>Available liquidity</small><b>{data.initial.liquidity}%</b></span></div></div>
    <div className="proposalcard"><div className="cardtop"><div><span className="eyebrow">AI PROPOSAL</span><h2>Portfolio allocation</h2></div><span className="badge">GEMINI</span></div><div className="proposalrows">{data.initial.allocations.map((allocation:any)=><div key={allocation.assetId}><span className="proposalasset"><b>{allocation.symbol}</b><small>{money(allocation.amount)} · {allocation.weight}%</small></span><span className="proposalreason"><small>{allocation.rationale??"Strategy-aligned exposure"}</small><em>{allocation.confidence?`${Math.round(allocation.confidence)}% confidence`:""}</em></span></div>)}</div></div>
    <div className="policycard"><div className="cardtop"><div><span className="eyebrow">DETERMINISTIC POLICY</span><h2>{data.initialPolicy.valid?"Every guardrail passed":"A guardrail failed"}</h2></div><ShieldCheck size={23}/></div><div className="checkrows">{checks.map(([label,passed])=><div key={label}><span className={passed?"checkpass":"checkfail"}>{passed?<Check size={13}/>:<X size={13}/>}</span><b>{label}</b><em>{passed?"PASS":"FAIL"}</em></div>)}</div><p className="policyhash">POLICY-001 · reproducible · no AI override</p></div>
    <div className="executioncard"><div><span className="eyebrow">EXECUTION PREVIEW</span><h2>{data.initial.allocations.length} wallet-signed on-chain actions</h2><p>Your wallet submits the exact plan bound to the risk attestation, strategy version, deadline and current vault nonce.</p></div><div className="executionroute"><span>Your wallet</span><ChevronRight size={14}/><span>Cendoris Vault</span><ChevronRight size={14}/><span>Allowlisted adapters</span></div><div className="custodyline"><Wallet size={17}/><span><b>Your signature is required</b><small>The attestation service can publish risk data, but it cannot call the router as your vault owner.</small></span></div>{executionError&&<p className="executionerror">{executionError}</p>}<button className="primary" onClick={execute} disabled={executing||!data.initialPolicy.valid}><Wallet size={16}/>{executing?"Waiting for wallet confirmation…":"Review & sign transaction"}</button></div>
  </section>
}

function StrategyView({text,setText,data,onApprove}:{text:string;setText:(value:string)=>void;data:any;onApprove:()=>void}){
  const presets=[
    ["Balanced income","Manage 100,000 USDT. Target 8% return, risk ceiling around 40, maintain at least 20% liquidity, no single asset over 35%."],
    ["Capital preservation","Manage 100,000 USDT. Prioritize capital preservation, target 5% return, maintain at least 40% liquidity, no single asset over 20%."],
    ["Growth","Manage 100,000 USDT. Target 12% return, accept higher risk, maintain at least 15% liquidity, no single asset over 35%."]
  ];
  return <section className="strategyview">
    <div className="strategyintro"><span className="eyebrow">CAPITAL STRATEGY BUILDER</span><h2>Tell Cendoris what your capital should achieve.</h2><p>Use plain language. Gemini translates your goals into structured guardrails for you to review. Nothing moves until you approve.</p><div className="presets">{presets.map(([label,value])=><button key={label} onClick={()=>setText(value)}>{label}</button>)}</div><textarea value={text} onChange={e=>setText(e.target.value)} aria-label="Describe your capital strategy"/></div>
    <div className="strategyreview"><div className="cardtop"><div><span className="eyebrow">STRUCTURED GUARDRAILS</span><h2>Review before activation</h2></div><span className="badge">READY</span></div><div className="guardrails"><span><small>Capital</small><b>{money(data.mandate.capital)}</b></span><span><small>Return objective</small><b>{data.mandate.targetReturn}% annually</b></span><span><small>Risk ceiling</small><b>{data.mandate.maxRisk} / 100</b></span><span><small>Liquidity floor</small><b>{data.mandate.minLiquidity}% minimum</b></span><span><small>Position limit</small><b>{data.mandate.maxAssetExposure}% maximum</b></span></div>{data.mandate.rationale&&<p className="note" style={{marginTop:10}}>{data.mandate.rationale}</p>}<div className="approvalnote"><ShieldCheck size={18}/><p><b>You stay in control</b><small>Gemini proposes a portfolio. Deterministic policy checks every action. Your wallet authorizes execution.</small></p></div><button className="primary" onClick={onApprove}><Check size={16}/>Approve strategy & build portfolio</button></div>
    <div className="strategyflow"><span><b>1</b><small>Describe goals</small></span><i/><span><b>2</b><small>Review guardrails</small></span><i/><span><b>3</b><small>Approve strategy</small></span><i/><span><b>4</b><small>Build portfolio</small></span></div>
  </section>
}

function CreditView(){
  const[opportunities,setOpportunities]=useState<any[]>([]);const[selected,setSelected]=useState<string>("");const[analysis,setAnalysis]=useState<any>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState("");
  useEffect(()=>{fetch("/api/credit").then(r=>r.json()).then(d=>setOpportunities(d.opportunities??[]))},[]);
  const run=async(id:string)=>{setSelected(id);setAnalysis(null);setLoading(true);setError("");try{const response=await fetch("/api/credit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({opportunityId:id})});const result=await response.json();if(!response.ok)throw new Error(result.error??"Underwriting failed.");setAnalysis(result.analysis)}catch(e){setError(e instanceof Error?e.message:"Underwriting failed.")}finally{setLoading(false)}};
  const opportunity=opportunities.find(o=>o.id===selected);
  return <section className="sectionview">
    <div className="sectionhero"><span className="eyebrow">PRIVATE MARKETS</span><h2>Underwrite real-world credit with Gemini.</h2><p>Select a credit opportunity. Cendoris runs a live underwriting pass — borrower and originator quality, default probability, expected loss and a recommended yield band — before any capital can be routed into it.</p>
      {opportunity&&<div style={{marginTop:26}}>
        <div className="cardtop"><div><span className="eyebrow">{opportunity.sector} · {opportunity.region}</span><h2>{opportunity.name}</h2></div><span className="badge">{money(opportunity.principal)}</span></div>
        <p className="note" style={{margin:"12px 0 18px"}}>{opportunity.description}</p>
        {loading&&<p className="note"><Loader2 size={11} className="spin"/> Gemini is underwriting {opportunity.name}…</p>}
        {error&&<p className="executionerror">{error}</p>}
        {analysis&&<>
          <div className="checkrows">
            <div><span className="checkpass"><Check size={13}/></span><b>Borrower quality</b><em>{analysis.borrowerQuality} / 100</em></div>
            <div><span className="checkpass"><Check size={13}/></span><b>Originator quality</b><em>{analysis.originatorQuality} / 100</em></div>
            <div><span className={analysis.defaultProbability>5?"checkfail":"checkpass"}>{analysis.defaultProbability>5?<X size={13}/>:<Check size={13}/>}</span><b>Default probability</b><em>{analysis.defaultProbability}%</em></div>
            <div><span className="checkpass"><Check size={13}/></span><b>Expected loss</b><em>{analysis.expectedLoss}%</em></div>
            <div><span className="checkpass"><Check size={13}/></span><b>Liquidity risk</b><em>{analysis.liquidityRisk}</em></div>
            <div><span className="checkpass"><Check size={13}/></span><b>Cendoris score</b><em>{analysis.cendorisScore} / 100</em></div>
            <div><span className="checkpass"><Check size={13}/></span><b>Recommended yield</b><em>{analysis.recommendedYieldMin}–{analysis.recommendedYieldMax}%</em></div>
            <div><span className="checkpass"><Check size={13}/></span><b>Max mandate allocation</b><em>{analysis.maxAllocationPct}%</em></div>
          </div>
          <p className="recoveryreason" style={{marginTop:16}}><BrainCircuit size={17}/><span><b>Underwriting rationale</b><small>{analysis.rationale}</small></span></p>
        </>}
      </div>}
    </div>
    <div className="sectionlist">{opportunities.map(o=><button key={o.id} onClick={()=>run(o.id)} style={selected===o.id?{borderColor:"#8da69a",background:"#eef4f0"}:undefined}><span><b>{o.name}</b><small>{o.sector} · {money(o.principal)} · {o.termDays}d term</small></span><ArrowUpRight size={17}/></button>)}<button className="backcommand" onClick={()=>window.scrollTo(0,0)}><Landmark size={16}/>Select an opportunity to underwrite</button></div>
  </section>
}

function MarketsView({data}:{data:any}){
  const[proposal,setProposal]=useState<any>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState("");
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true);setError("");
      try{const response=await fetch("/api/markets",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({portfolio:data.initial,assets:data.assets})});const result=await response.json();if(!response.ok)throw new Error(result.error??"Market discovery failed.");if(!cancelled)setProposal(result.proposal)}
      catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Market discovery failed.")}
      finally{if(!cancelled)setLoading(false)}
    })();
    return()=>{cancelled=true}
  },[data]);
  return <section className="sectionview">
    <div className="sectionhero">
      <span className="eyebrow">EXCHANGE OS</span>
      <h2>The market Cendoris would ask Exchange OS to deploy.</h2>
      <p>Gemini reads this portfolio's live correlation and concentration risk and proposes the single highest-value missing market. Exchange OS lets any staked deployer launch a permissionless spot, perpetual or outcome venue on X Layer (XIP-Exchange OS) with shared matching, margin and settlement — this is a proposal Cendoris would submit to that flow, not a live deployment.</p>
      {loading&&<p className="note" style={{marginTop:20}}><Loader2 size={11} className="spin"/> Scanning the portfolio for unhedged risk…</p>}
      {error&&<p className="executionerror" style={{marginTop:20}}>{error}</p>}
      {proposal&&<div style={{marginTop:26}}>
        <div className="cardtop"><div><span className="eyebrow">{proposal.marketType.toUpperCase()} · {proposal.oracle}</span><h2>{proposal.name}</h2></div><span className="badge">{Math.round(proposal.demandScore)}/100 DEMAND</span></div>
        <p className="note" style={{margin:"12px 0 18px"}}>{proposal.purpose}</p>
        <div className="checkrows">
          <div><span className="checkpass"><Check size={13}/></span><b>Underlying</b><em>{proposal.underlying}</em></div>
          <div><span className="checkpass"><Check size={13}/></span><b>Initial margin</b><em>{proposal.initialMarginPct}%</em></div>
          <div><span className="checkpass"><Check size={13}/></span><b>Maintenance margin</b><em>{proposal.maintenanceMarginPct}%</em></div>
          <div><span className="checkpass"><Check size={13}/></span><b>Est. addressable demand</b><em>{money(proposal.estimatedAddressableDemand)}</em></div>
        </div>
        <p className="recoveryreason" style={{marginTop:16}}><BrainCircuit size={17}/><span><b>Why this market</b><small>{proposal.rationale}</small></span></p>
      </div>}
    </div>
    <div className="sectionlist">
      <button disabled style={{cursor:"default"}}><span><b>Deployment path</b><small>Stake OKB in the X Layer Staking Contract, then launch a venue under XIP-Exchange OS.</small></span></button>
      <button disabled style={{cursor:"default"}}><span><b>Shared infrastructure</b><small>Matching, margin and settlement run at the protocol layer alongside every other Exchange OS venue.</small></span></button>
      <button disabled style={{cursor:"default"}}><span><b>Unified margin</b><small>Collateral moves across spot, perpetual and outcome markets on one account.</small></span></button>
    </div>
  </section>
}

function PortfolioView({data,portfolio}:{data:any;portfolio:any}){
  return <section className="sectionview">
    <div className="sectionhero">
      <span className="eyebrow">CAPITAL OVERVIEW</span>
      <h2>Every exposure, real numbers.</h2>
      <p>The current mandate's live portfolio, priced off the same real market data the allocation engine used to build it — not a static snapshot.</p>
      <div className="sectionstats">
        <span><b>{money(data.mandate.capital)}</b><small>Capital under intelligence</small></span>
        <span><b>{portfolio.expectedReturn}%</b><small>Expected return</small></span>
        <span><b>{portfolio.risk} / 100</b><small>Portfolio risk</small></span>
      </div>
      <div className="bar" style={{marginTop:30}}>{portfolio.allocations.map((a:any,i:number)=><i key={a.assetId} style={{width:`${a.weight}%`}} className={`c${i}`}/>)}</div>
      <div className="holdings" style={{marginTop:16}}>{portfolio.allocations.map((a:any,i:number)=>{const asset=data.assets.find((x:any)=>x.id===a.assetId);return <div key={a.assetId}><i className={`dot c${i}`}/><span><b>{a.symbol}</b><small>{asset?.name} · {money(asset?.price??0)}/unit</small></span><strong>{a.weight}%<small>{money(a.amount)}</small></strong></div>})}</div>
    </div>
    <div className="sectionlist">
      {portfolio.allocations.map((a:any)=><button key={a.assetId} disabled style={{cursor:"default"}}><span><b>{a.symbol}</b><small>{a.rationale??"Strategy-aligned exposure"}</small></span></button>)}
    </div>
  </section>
}

function IntelligenceView({data}:{data:any}){
  return <section className="sectionview">
    <div className="sectionhero">
      <span className="eyebrow">SIGNAL ENGINE</span>
      <h2>Real market data, not a fixture.</h2>
      <p>Every price and rate below comes from a live public source, fetched fresh — cached 5 minutes at a time — not a fixed table.</p>
      <div className="sectionstats">
        <span><b>{data.assets.length}</b><small>Assets priced live</small></span>
        <span><b>3</b><small>Independent public data sources</small></span>
        <span><b>5 min</b><small>Cache window</small></span>
      </div>
    </div>
    <div className="sectionlist">
      {data.assets.map((a:any)=><button key={a.id} disabled style={{cursor:"default"}}><span><b>{a.symbol} · {money(a.price)}</b><small>{a.apy}% apy · risk {a.risk} · {DATA_SOURCES[a.id]}</small></span></button>)}
    </div>
  </section>
}

function AutomationsView({data}:{data:any}){
  const counts=data.audit.reduce((acc:Record<string,number>,e:any)=>{acc[e.status]=(acc[e.status]??0)+1;return acc},{});
  return <section className="sectionview">
    <div className="sectionhero">
      <span className="eyebrow">POLICY-CONTROLLED</span>
      <h2>Continuous action inside hard boundaries.</h2>
      <p>A worker monitors the position and can propose a recovery, but every action, proposed or executed, passes through the same deterministic policy check.</p>
      <div className="sectionstats">
        <span><b>{counts.PROPOSED??0}</b><small>Proposed by AI</small></span>
        <span><b>{counts.APPROVED??0}</b><small>Policy-approved</small></span>
        <span><b>{counts.REJECTED??0}</b><small>Policy-rejected</small></span>
      </div>
    </div>
    <div className="sectionlist">
      <button disabled style={{cursor:"default"}}><span><b>Risk ceiling</b><small>Rebalance when risk exceeds {data.mandate.maxRisk} — this mandate's own limit, not a fixed number</small></span></button>
      <button disabled style={{cursor:"default"}}><span><b>Liquidity floor</b><small>Maintain at least {data.mandate.minLiquidity}% liquid</small></span></button>
      <button disabled style={{cursor:"default"}}><span><b>Concentration</b><small>No asset above {data.mandate.maxAssetExposure}%</small></span></button>
      <button disabled style={{cursor:"default"}}><span><b>Automation flags</b><small>Monitor {data.mandate.automation.monitor?"on":"off"} · Rebalance {data.mandate.automation.rebalance?"on":"off"} · Reinvest {data.mandate.automation.reinvest?"on":"off"}</small></span></button>
    </div>
  </section>
}

function SectionView({section,open}:{section:string;open:(value:string)=>void}){const view=views[section]??views.Portfolio;return <section className="sectionview"><div className="sectionhero"><span className="eyebrow">{view.kicker}</span><h2>{view.title}</h2><p>{view.copy}</p><div className="sectionstats">{view.stats.map(([value,label])=><span key={label}><b>{value}</b><small>{label}</small></span>)}</div></div><div className="sectionlist">{view.items.map(([title,detail])=><button key={title}><span><b>{title}</b><small>{detail}</small></span><ArrowUpRight size={17}/></button>)}</div><button className="backcommand" onClick={()=>open("Command")}><Command size={16}/>Return to Capital Command</button></section>}
function Metric({label,value,delta,warn=false}:{label:string;value:string;delta:string;warn?:boolean}){return <div><span>{label}</span><b className={warn?"red":""}>{value}</b><small>{delta}</small></div>}
