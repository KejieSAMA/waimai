import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import type { Role } from "@waimai/shared";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assert(
  condition: unknown,
  status: number,
  message: string,
): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
export type AuthRequest = Request & {
  actor?: { id: string; role: Role };
  storeId?: string;
  sessionId?: string;
  sessionVersion?: number;
  mustChangePassword?: boolean;
};
export function handler(
  fn: (req: AuthRequest, res: Response) => Promise<unknown>,
): RequestHandler {
  return (req, res, next: NextFunction) => {
    Promise.resolve(fn(req, res))
      .then((data) => {
        if (!res.headersSent) res.json({ code: 0, message: "ok", data });
      })
      .catch(next);
  };
}
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().max(100).optional(),
  status: z.string().max(30).optional(),
});
export function pagination(query: unknown) {
  const p = paginationSchema.parse(query);
  return { ...p, skip: (p.page - 1) * p.pageSize, take: p.pageSize };
}
export const pageResult = <T>(
  list: T[],
  total: number,
  p: { page: number; pageSize: number },
) => ({ list, total, page: p.page, pageSize: p.pageSize });
export const reasonSchema = z.object({
  reason: z.string().trim().min(1, "请填写原因").max(500),
});
export function shanghaiDay(now = new Date()) {
  const shifted = new Date(now.getTime() + 8 * 3600000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) -
      8 * 3600000,
  );
}
