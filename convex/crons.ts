import { cronJobs } from "@convex-dev/cron";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const crons = cronJobs();

crons.interval(
  "check for upcoming payments",
  { minutes: 1 }, // Run every minute
  internal.payments.checkForUpcomingPayments
);

crons.interval(
  "process due payments",
  { minutes: 1 }, // Run every minute
  internal.payments.processDuePayments,
  { stripe: new Stripe(process.env.STRIPE_SECRET_KEY!) }
);

// Process league fee reminders every hour
crons.interval(
  "process-league-fee-reminders",
  { minutes: 60 }, // Run every hour
  internal.leagueFeeReminders.processPendingReminders
);

// Update overdue league fee status daily at 9 AM EST
crons.daily(
  "update-overdue-league-fees",
  { hourUTC: 14, minuteUTC: 0 }, // 9 AM EST (UTC-5) = 14 UTC
  internal.leagueFees.updateOverdueStatus
);

export default crons;
