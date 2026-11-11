import { Router } from "express";
import { z } from "zod";
import { handler } from "../../http";
import * as users from "./service";
export function registerUserUsers(user: Router) {
  user.get(
    "/addresses",
    handler(async (req) => users.listAddresses(req.actor!.id)),
  );
  user.post(
    "/addresses",
    handler(async (req) =>
      users.saveAddress(req.actor!.id, undefined, req.body),
    ),
  );
  user.put(
    "/addresses/:id",
    handler(async (req) =>
      users.saveAddress(req.actor!.id, req.params.id, req.body),
    ),
  );
  user.delete(
    "/addresses/:id",
    handler(async (req) => users.deleteAddress(req.actor!.id, req.params.id)),
  );
  user.put(
    "/addresses",
    handler(async (req) =>
      users.saveAddress(req.actor!.id, z.string().parse(req.body.id), req.body),
    ),
  );
  user.delete(
    "/addresses",
    handler(async (req) =>
      users.deleteAddress(req.actor!.id, z.string().parse(req.body.id)),
    ),
  );
}
