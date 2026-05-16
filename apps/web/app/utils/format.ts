export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }
  return `${value.toFixed(digits)}%`;
}

export function clampPercent(value: number | null): number {
  if (value === null || Number.isNaN(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 100) {
    return 100;
  }
  return value;
}

export function formatLoad(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }
  return value.toFixed(digits);
}

export function formatBytes(value: number | null): string {
  if (value === null || Number.isNaN(value) || value < 0) {
    return "--";
  }
  if (value === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const normalized = value / 1024 ** unitIndex;
  const digits = normalized >= 100 ? 0 : normalized >= 10 ? 1 : 2;

  return `${normalized.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "--";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(parsedDate);
}
