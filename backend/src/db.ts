import "./config";
import { PrismaClient } from "@prisma/client";
export const db = new PrismaClient({
  transactionOptions: {
    isolationLevel: "Serializable",
    maxWait: 5000,
    timeout: 10000,
  },
});
