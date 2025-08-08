import { cronJobs } from "@convex-dev/cron";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check for upcoming payments",
  { minutes: 1 }, // Run every minute
  internal.payments.checkForUpcomingPayments
);

export default crons;
