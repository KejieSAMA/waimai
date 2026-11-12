import { Router } from "express";
import { handler } from "../../http";
import * as accounts from "./service";
export function registerAdminAccounts(admin: Router) {
  admin.get(
    "/accounts",
    handler(async (req) => accounts.list(req.query)),
  );
  admin.get(
    "/accounts/:id",
    handler(async (req) => accounts.detail(req.params.id)),
  );
  admin.get(
    "/accounts/:id/audit",
    handler(async (req) => {
      return accounts.audit(req.params.id);
    }),
  );
  admin.post(
    "/accounts",
    handler(async (req) => accounts.create(req.body, req.actor!)),
  );
  admin.put(
    "/accounts/:id",
    handler(async (req) =>
      accounts.update(req.params.id, "edit", req.body, req.actor!),
    ),
  );
  for (const action of ["roles", "status", "password"])
    admin.put(
      `/accounts/:id/${action}`,
      handler(async (req) =>
        accounts.update(req.params.id, action, req.body, req.actor!),
      ),
    );
}
