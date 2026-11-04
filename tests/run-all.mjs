import { spawnSync } from "node:child_process";

// Ejecuta ambas suites aunque la primera falle: el objetivo de la entrega es
// registrar todos los resultados, no detenerse en el primer caso fallido.
function runNode(args) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  return result.status ?? 1;
}

function runShell(command) {
  // Sin arreglo de argumentos para evitar el aviso DEP0190 de Node.
  const result = spawnSync(command, { stdio: "inherit", shell: true });
  return result.status ?? 1;
}

const apiStatus = runNode([
  "--test",
  "--test-reporter=spec",
  "tests/api/cp.test.mjs",
]);

const e2eStatus = runShell("npm --prefix tests run test:e2e");

console.log(
  `\nResumen: API ${apiStatus === 0 ? "OK" : "con fallos"}, ` +
    `E2E ${e2eStatus === 0 ? "OK" : "con fallos"}.`
);

process.exitCode = apiStatus !== 0 || e2eStatus !== 0 ? 1 : 0;
