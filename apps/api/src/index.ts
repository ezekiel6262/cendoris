import{runDemo}from"@cendoris/automation";console.log(JSON.stringify(await runDemo(process.argv.slice(2).join(" ")||undefined),null,2));
