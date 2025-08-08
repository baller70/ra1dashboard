import { cron } from "convex/server";
import { mutation } from "./_generated/server";

// Schedule the job to run every hour
export const hourly = cron("update statuses", "0 * * * *", "payments:updatePaymentStatuses");

