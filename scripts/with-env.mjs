// Carga .env.local (si existe) y ejecuta el comando recibido. En Docker no hay .env.local y es un no-op.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const file = process.env.ENV_FILE ?? ".env.local";
if (existsSync(file)) process.loadEnvFile(file);

const [cmd, ...args] = process.argv.slice(2);
const result = spawnSync(cmd, args, { stdio: "inherit", shell: true, env: process.env });
process.exit(result.status ?? 1);
