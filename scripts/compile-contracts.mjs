import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const sourceDirectory = path.resolve("contracts/src");
const artifactDirectory = path.resolve("contracts/artifacts");
const sources = Object.fromEntries(fs.readdirSync(sourceDirectory).filter((file) => file.endsWith(".sol")).map((file) => [file, { content: fs.readFileSync(path.join(sourceDirectory, file), "utf8") }]));
const input = { language: "Solidity", sources, settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } };
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: (importPath) => {
  const dependencyPath = path.resolve("node_modules", importPath);
  if (!fs.existsSync(dependencyPath)) return { error: `Import not found: ${importPath}` };
  return { contents: fs.readFileSync(dependencyPath, "utf8") };
} }));
const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
if (errors.length) throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));
fs.mkdirSync(artifactDirectory, { recursive: true });
for (const contracts of Object.values(output.contracts)) for (const [name, artifact] of Object.entries(contracts)) {
  if (!artifact.evm.bytecode.object) continue;
  fs.writeFileSync(path.join(artifactDirectory, `${name}.json`), JSON.stringify({ abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}` }, null, 2));
}
console.log(`Compiled ${Object.keys(output.contracts).length} Solidity source files.`);
