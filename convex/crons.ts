import { cronJobs } from "convex/server";
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
  internal.payments.processDuePayments
);

export default crons;
