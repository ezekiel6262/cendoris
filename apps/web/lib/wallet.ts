import { BrowserProvider, Contract, parseUnits } from "ethers";
const FACTORY_ABI=["function vaultOf(address) view returns (address)","function createVault() returns (address)"];
const TOKEN_ABI=["function balanceOf(address) view returns (uint256)","function approve(address,uint256) returns (bool)"];
const VAULT_ABI=["function deposit(address,uint256)"];
const STRATEGY_ABI=["function setStrategy(address,(uint64 version,uint16 maxRisk,uint16 minLiquidityBps,uint16 maxAssetExposureBps,uint16 maxSlippageBps,bool automationAllowed,bool active))"];
const ROUTER_ABI=["function executePlan(address,uint64,(address adapter,address token,uint256 amount,bytes data)[],(uint16 risk,uint16 liquidityBps,uint16 largestPositionBps,uint64 expiresAt)) returns (bytes32)"];
const ZERO="0x0000000000000000000000000000000000000000";
type Config={chainId:number;rpcUrl:string;contracts:Record<string,string>};
type Eip1193Provider={request:(request:{method:string;params?:unknown[]})=>Promise<unknown>};
type AnnouncedProvider={info:{name?:string;rdns?:string};provider:Eip1193Provider};
async function config():Promise<Config>{const response=await fetch("/api/execution");const result=await response.json();if(!response.ok||!result.online)throw new Error(result.error??"Protocol unavailable");return result.deployment}
async function injected(preferLocalWallet=false):Promise<Eip1193Provider>{
  const announced:AnnouncedProvider[]=[];
  const onProvider=(event:Event)=>{const detail=(event as CustomEvent<AnnouncedProvider>).detail;if(detail?.provider&&!announced.some(({provider})=>provider===detail.provider))announced.push(detail)};
  window.addEventListener("eip6963:announceProvider",onProvider);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise(resolve=>window.setTimeout(resolve,150));
  window.removeEventListener("eip6963:announceProvider",onProvider);
  const matches=(wallet:string)=>announced.find(({info})=>`${info.rdns} ${info.name}`.toLowerCase().includes(wallet));
  const preferred=(preferLocalWallet?(matches("rabby")??matches("metamask")??matches("okx")):matches("okx"))
    ??matches("rabby")
    ??matches("metamask")
    ??announced[0];
  const wallets=window as Window&{okxwallet?:Eip1193Provider;ethereum?:Eip1193Provider};
  const legacy=preferLocalWallet?(wallets.ethereum??wallets.okxwallet):(wallets.okxwallet??wallets.ethereum);
  const provider=preferred?.provider??legacy;
  if(!provider)throw new Error("Wallet extensions are unavailable in this browser. Open http://localhost:3000 in Chrome or Edge, unlock OKX Wallet or MetaMask, then connect again.");
  return provider;
}
function providerErrorCode(error:any){return Number(error?.code??error?.data?.code??error?.data?.originalError?.code)}
function providerErrorMessage(error:unknown,fallback:string){if(typeof error==="string")return error;if(error&&typeof error==="object"){const value=error as any;return value.shortMessage??value.message??value.reason??value.data?.message??value.data?.originalError?.message??fallback}return fallback}
function isUnknownChainError(error:unknown){const message=providerErrorMessage(error,"").toLowerCase();return providerErrorCode(error)===4902||message.includes("unrecognized chain")||message.includes("unknown chain")||message.includes("chain has not been added")}
const NETWORK_INFO:Record<number,{chainName:string;nativeCurrency:{name:string;symbol:string;decimals:number};blockExplorerUrls?:string[]}>={
  1952:{chainName:"X Layer Testnet",nativeCurrency:{name:"OKB",symbol:"OKB",decimals:18},blockExplorerUrls:["https://www.oklink.com/xlayer-test"]},
  196:{chainName:"X Layer",nativeCurrency:{name:"OKB",symbol:"OKB",decimals:18},blockExplorerUrls:["https://www.oklink.com/xlayer"]},
  31337:{chainName:"Cendoris Local",nativeCurrency:{name:"Local ETH",symbol:"ETH",decimals:18}},
};
async function switchChain(provider:any,next:Config){const chainId=`0x${next.chainId.toString(16)}`;const switchRequest={method:"wallet_switchEthereumChain",params:[{chainId}]};try{await provider.request(switchRequest)}catch(error:any){if(!isUnknownChainError(error))throw new Error(providerErrorMessage(error,"Wallet could not switch networks."));const info=NETWORK_INFO[next.chainId]??NETWORK_INFO[31337];try{await provider.request({method:"wallet_addEthereumChain",params:[{chainId,chainName:info.chainName,rpcUrls:[next.rpcUrl],nativeCurrency:info.nativeCurrency,blockExplorerUrls:info.blockExplorerUrls}]});await provider.request(switchRequest)}catch(addError){throw new Error(providerErrorMessage(addError,`Wallet could not add or switch to ${info.chainName}.`))}}}
export async function connectCendorisWallet(){const next=await config();const localRpc=/^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/i.test(next.rpcUrl);const source=await injected(localRpc);await switchChain(source,next);const provider=new BrowserProvider(source);try{await provider.send("eth_requestAccounts",[]);const signer=await provider.getSigner();return{account:await signer.getAddress(),config:next,provider,signer}}catch(error){throw new Error(providerErrorMessage(error,"Wallet connection failed."))}}
export async function provisionWalletVault(mandate:any,progress:(message:string)=>void){const session=await connectCendorisWallet();const{account,config,signer}=session;const factory=new Contract(config.contracts.vaultFactory,FACTORY_ABI,signer);let vault:string=await factory.vaultOf(account);if(vault===ZERO){progress("Creating your wallet-owned vault…");await(await factory.createVault()).wait();vault=await factory.vaultOf(account)}progress("Checking wallet funding…");const faucetPath=config.chainId===31337?"/api/local/faucet":"/api/testnet/faucet";const faucet=await fetch(faucetPath,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({account})});if(!faucet.ok){const result=await faucet.json();throw new Error(result.error??"Test USDT funding failed. If your wallet has no testnet OKB for gas, claim some at web3.okx.com/xlayer/faucet first.")};const amount=parseUnits(String(mandate.capital),6);const token=new Contract(config.contracts.usdt,TOKEN_ABI,signer);const vaultContract=new Contract(vault,VAULT_ABI,signer);const walletBalance:bigint=await token.balanceOf(account);const vaultBalance:bigint=await token.balanceOf(vault);if(vaultBalance<amount){const needed=amount-vaultBalance;if(walletBalance<needed)throw new Error("Wallet does not hold enough allowlisted USDT.");progress("Approving the vault deposit…");await(await token.approve(vault,needed)).wait();progress("Depositing into your vault…");await(await vaultContract.deposit(config.contracts.usdt,needed)).wait()}progress("Approving your Capital Strategy…");const strategies=new Contract(config.contracts.strategyRegistry,STRATEGY_ABI,signer);await(await strategies.setStrategy(vault,[0,mandate.maxRisk,mandate.minLiquidity*100,mandate.maxAssetExposure*100,100,false,true])).wait();progress("Strategy active");return{...session,vault}}
export async function executeWalletPlan(portfolio:any,capital:number){const session=await connectCendorisWallet();const preparation=await fetch("/api/execution",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({owner:session.account,portfolio,capital})});const plan=await preparation.json();if(!preparation.ok)throw new Error(plan.error??"Risk attestation failed.");const router=new Contract(plan.router,ROUTER_ABI,session.signer);const transaction=await router.executePlan(plan.vault,plan.deadline,plan.actions,plan.snapshot);const receipt=await transaction.wait();return{planId:plan.planHash,transactionHash:receipt.hash,blockNumber:receipt.blockNumber,gasUsed:receipt.gasUsed.toString(),valueMoved:plan.valueMoved,chainId:session.config.chainId,status:"EXECUTED"}}
