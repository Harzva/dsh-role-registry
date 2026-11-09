import {
  ROLE_REGISTRY_SERVICE,
  GROUPX_ROLE_REGISTRY_SERVICE,
  ROLE_PROTOCOL_LIMITS,
  ROLES_API_PATH,
  ROLES_API_ROLES_PATH
} from "./types.js";
import { createRoleRegistry, RoleRegistry } from "./registry.js";
import {
  normalizeRoleContribution,
  normalizeRoleRef,
  isRoleRef,
  isRoleContribution,
  roleRefKey,
  containsSensitiveRoleText
} from "./normalize.js";
const name = "harzva-dsh-role-registry";
function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(payload);
}
function isLoopback(req) {
  const address = req.socket?.remoteAddress ?? "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin === void 0) return true;
  if (host === void 0) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
function apply(ctx) {
  const registry = createRoleRegistry();
  ctx.provide(ROLE_REGISTRY_SERVICE, registry);
  ctx.provide(GROUPX_ROLE_REGISTRY_SERVICE, registry);
  if (typeof ctx.inject === "function") {
    try {
      ctx.inject(["webServer"], (wctx) => {
        const server = typeof wctx.get === "function" ? wctx.get("webServer") : void 0;
        if (server === void 0 || typeof server.register !== "function") return;
        const handler = (req, res) => {
          const url = new URL(req.url ?? "/", "http://local");
          if (url.pathname !== ROLES_API_ROLES_PATH) {
            writeJson(res, 404, { ok: false, error: "not-found" });
            return;
          }
          if (req.method !== "GET") {
            writeJson(res, 405, { ok: false, error: "method-not-allowed" });
            return;
          }
          if (!isLoopback(req) || !sameOrigin(req)) {
            writeJson(res, 403, { ok: false, error: "local-same-origin-required" });
            return;
          }
          writeJson(res, 200, { ok: true, roles: registry.snapshot() });
        };
        wctx.effect?.(
          () => server.register({ kind: "exact", path: ROLES_API_ROLES_PATH, handler }),
          "dsh-role-registry: neutral read channel"
        );
      });
    } catch (cause) {
      ctx.logger?.warn?.("[role-registry] neutral read channel skipped: %o", cause);
    }
  }
}
export {
  GROUPX_ROLE_REGISTRY_SERVICE,
  ROLES_API_PATH,
  ROLES_API_ROLES_PATH,
  ROLE_PROTOCOL_LIMITS,
  ROLE_REGISTRY_SERVICE,
  RoleRegistry,
  apply,
  containsSensitiveRoleText,
  createRoleRegistry,
  isRoleContribution,
  isRoleRef,
  name,
  normalizeRoleContribution,
  normalizeRoleRef,
  roleRefKey
};
