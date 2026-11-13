import { app } from "./app";
import { config } from "./config";
import { db } from "./db";
import { expireUnpaid } from "./modules/orders/service";
import { cleanupVisits } from "./modules/traffic/service";
import { PAYMENT_SWEEP_MS, TRAFFIC_RULES } from "./rules";
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
const cleanup = setInterval(() => void sweep(), PAYMENT_SWEEP_MS);
let cleaning = false;
async function cleanTraffic() {
  if (cleaning) return;
  cleaning = true;
  try {
    await cleanupVisits();
  } catch (error) {
    process.stderr.write(String(error) + "\n");
  } finally {
    cleaning = false;
  }
}
void cleanTraffic();
const trafficCleanup = setInterval(
  () => void cleanTraffic(),
  TRAFFIC_RULES.cleanupMs,
);
function shutdown() {
  clearInterval(cleanup);
  clearInterval(trafficCleanup);
  server.close(() => {
    void db.$disconnect().then(() => process.exit(0));
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
