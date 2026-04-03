export interface TicketSLAConfig {
  priority: "low" | "medium" | "high" | "urgent";
  responseTimeHours: number;
  resolutionTimeHours: number;
}

const SLA_CONFIGS: Record<string, TicketSLAConfig> = {
  low: { priority: "low", responseTimeHours: 48, resolutionTimeHours: 120 },
  medium: {
    priority: "medium",
    responseTimeHours: 24,
    resolutionTimeHours: 72,
  },
  high: { priority: "high", responseTimeHours: 8, resolutionTimeHours: 24 },
  urgent: { priority: "urgent", responseTimeHours: 1, resolutionTimeHours: 8 },
};

export function getSLAConfig(priority: string): TicketSLAConfig {
  return SLA_CONFIGS[priority] || SLA_CONFIGS.medium;
}

export function isSLABreached(
  createdAt: Date,
  resolvedAt: Date | null,
  priority: string,
): boolean {
  const config = getSLAConfig(priority);
  const now = new Date();
  const elapsedHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (resolvedAt) {
    const resolutionHours =
      (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return resolutionHours > config.resolutionTimeHours;
  }

  return elapsedHours > config.resolutionTimeHours;
}
