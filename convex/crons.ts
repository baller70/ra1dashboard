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

export default crons;
