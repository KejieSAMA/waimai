import { app } from "./app";
import { config } from "./config";
import { db } from "./db";
import { expireUnpaid } from "./modules/orders/service";
const server = app.listen(config.port, config.host, () =>
  process.stdout.write(`API http://${config.host}:${config.port}\n`),
);
let expiring = false;
async function sweep() {
  if (expiring) return;
  expiring = true;
  try {
    await expireUnpaid();
  } catch (error) {
    process.stderr.write(String(error) + "\n");
  } finally {
    expiring = false;
  }
}
void sweep();
const cleanup = setInterval(() => void sweep(), 60000);
function shutdown() {
  clearInterval(cleanup);
  server.close(() => {
    void db.$disconnect().then(() => process.exit(0));
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
