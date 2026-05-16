import { PrismaClient } from "@prisma/client";
import type { H3Event } from "h3";
import { dirname, isAbsolute, resolve } from "node:path";
import { mkdirSync } from "node:fs";

interface DatabaseRuntimeConfig {
  databaseUrl?: string;
}

let prisma: PrismaClient | null = null;
let prismaDatabaseUrl: string | null = null;

export function usePrisma(event?: H3Event): PrismaClient {
  const databaseUrl = resolveDatabaseUrl(event);

  if (prisma && prismaDatabaseUrl === databaseUrl) {
    return prisma;
  }

  ensureSqliteDirectory(databaseUrl);

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
  prismaDatabaseUrl = databaseUrl;

  return prisma;
}

export function resolveDatabaseUrl(event?: H3Event): string {
  const runtimeConfig = event ? getRuntimeConfigFromEvent(event) : undefined;
  const configuredUrl =
    process.env["DATABASE_URL"] ??
    runtimeConfig?.databaseUrl ??
    "file:../../data/server-probe.sqlite";

  return normalizeSqliteDatabaseUrl(configuredUrl);
}

function normalizeSqliteDatabaseUrl(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith("file:")) {
    return toFileDatabaseUrl(trimmedValue);
  }

  const target = trimmedValue.slice("file:".length);

  if (target === ":memory:") {
    return trimmedValue;
  }

  const [pathPart, queryPart] = splitSqliteFileTarget(target);

  if (isAbsolute(pathPart)) {
    return `file:${toPrismaPath(pathPart)}${queryPart}`;
  }

  return `file:${toPrismaPath(resolve(process.cwd(), pathPart))}${queryPart}`;
}

function toFileDatabaseUrl(filePath: string): string {
  const absolutePath = isAbsolute(filePath)
    ? filePath
    : resolve(process.cwd(), filePath);

  return `file:${toPrismaPath(absolutePath)}`;
}

function ensureSqliteDirectory(databaseUrl: string): void {
  if (!databaseUrl.startsWith("file:")) {
    return;
  }

  const target = databaseUrl.slice("file:".length);

  if (target === ":memory:") {
    return;
  }

  const [pathPart] = splitSqliteFileTarget(target);
  mkdirSync(dirname(pathPart), { recursive: true });
}

function splitSqliteFileTarget(target: string): [pathPart: string, queryPart: string] {
  const queryIndex = target.indexOf("?");

  if (queryIndex === -1) {
    return [target, ""];
  }

  return [target.slice(0, queryIndex), target.slice(queryIndex)];
}

function toPrismaPath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

function getRuntimeConfigFromEvent(event: H3Event): DatabaseRuntimeConfig | undefined {
  const runtimeConfigCandidate = event.context["nitro"] as
    | { runtimeConfig?: unknown }
    | undefined;

  if (
    runtimeConfigCandidate &&
    typeof runtimeConfigCandidate.runtimeConfig === "object" &&
    runtimeConfigCandidate.runtimeConfig !== null &&
    "databaseUrl" in runtimeConfigCandidate.runtimeConfig
  ) {
    return runtimeConfigCandidate.runtimeConfig as DatabaseRuntimeConfig;
  }

  return undefined;
}
