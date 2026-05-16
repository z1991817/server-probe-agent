import type { AuthUser, LoginRequestBody, UserRole } from "@server-probe/shared";
import type { H3Event } from "h3";
import {
  deleteCookie,
  getCookie,
  getHeader,
  readBody,
  setCookie
} from "h3";
import { createHmac, timingSafeEqual } from "node:crypto";

import { raise } from "./response";

const SESSION_COOKIE_NAME = "server_probe_session";

interface AuthRuntimeConfig {
  adminUsername: string;
  adminPassword: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
}

interface SessionPayload {
  user: AuthUser;
  expiresAt: string;
}

export async function readLoginBody(event: H3Event): Promise<LoginRequestBody> {
  const body = await readBody<Partial<LoginRequestBody>>(event);
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    raise({
      code: "INVALID_LOGIN_PAYLOAD",
      message: "用户名和密码不能为空",
      statusCode: 400,
      statusMessage: "Bad Request"
    });
  }

  return { username, password };
}

export function verifyBuiltInUser(
  event: H3Event,
  credentials: LoginRequestBody
): AuthUser | null {
  const authConfig = getAuthConfig(event);
  const usernameMatches = safeCompare(
    credentials.username,
    authConfig.adminUsername
  );
  const passwordMatches = safeCompare(
    credentials.password,
    authConfig.adminPassword
  );

  if (!usernameMatches || !passwordMatches) {
    return null;
  }

  return {
    id: "builtin-admin",
    username: authConfig.adminUsername,
    role: "admin"
  };
}

export function setSessionCookie(event: H3Event, user: AuthUser): string {
  const authConfig = getAuthConfig(event);
  const expiresAt = new Date(
    Date.now() + authConfig.sessionTtlSeconds * 1000
  ).toISOString();
  const token = signSession({ user, expiresAt }, authConfig.sessionSecret);

  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(event),
    path: "/",
    maxAge: authConfig.sessionTtlSeconds
  });

  return expiresAt;
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: "/"
  });
}

export function getCurrentUser(event: H3Event): AuthUser | null {
  const token = getCookie(event, SESSION_COOKIE_NAME);

  if (!token) {
    return null;
  }

  const payload = verifySession(token, getAuthConfig(event).sessionSecret);

  if (!payload) {
    return null;
  }

  if (Date.parse(payload.expiresAt) <= Date.now()) {
    return null;
  }

  return payload.user;
}

export function requireAuth(event: H3Event): AuthUser {
  const user = getCurrentUser(event);

  if (!user) {
    raise({
      code: "UNAUTHORIZED",
      message: "请先登录",
      statusCode: 401,
      statusMessage: "Unauthorized"
    });
  }

  return user;
}

export function requireRole(event: H3Event, allowedRoles: UserRole[]): AuthUser {
  const user = requireAuth(event);

  if (!allowedRoles.includes(user.role)) {
    raise({
      code: "FORBIDDEN",
      message: "权限不足",
      statusCode: 403,
      statusMessage: "Forbidden"
    });
  }

  return user;
}

function getAuthConfig(event: H3Event): AuthRuntimeConfig {
  const runtimeConfigCandidate = event.context["nitro"] as
    | { runtimeConfig?: unknown }
    | undefined;
  const runtimeConfig = runtimeConfigCandidate?.runtimeConfig as
    | { auth?: unknown }
    | undefined;
  const authConfig = runtimeConfig?.auth as AuthRuntimeConfig | undefined;

  return {
    adminUsername: authConfig?.adminUsername ?? "admin",
    adminPassword: authConfig?.adminPassword ?? "admin123456",
    sessionSecret: authConfig?.sessionSecret ?? "dev-only-change-me-session-secret",
    sessionTtlSeconds: authConfig?.sessionTtlSeconds ?? 86400
  };
}

function signSession(payload: SessionPayload, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = createSignature(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

function verifySession(token: string, secret: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(encodedPayload, secret);

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as SessionPayload;
  } catch {
    return null;
  }
}

function createSignature(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isSecureRequest(event: H3Event): boolean {
  return getHeader(event, "x-forwarded-proto") === "https";
}
