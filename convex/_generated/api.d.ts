/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as actualCleanup from "../actualCleanup.js";
import type * as aiRecommendations from "../aiRecommendations.js";
import type * as assessments from "../assessments.js";
import type * as backgroundJobs from "../backgroundJobs.js";
import type * as cleanupTestData from "../cleanupTestData.js";
import type * as comprehensiveCleanup from "../comprehensiveCleanup.js";
import type * as contracts from "../contracts.js";
import type * as dashboard from "../dashboard.js";
import type * as dataCleanup from "../dataCleanup.js";
import type * as debug from "../debug.js";
import type * as emailReminders from "../emailReminders.js";
import type * as leagueFeeReminders from "../leagueFeeReminders.js";
import type * as leagueFees from "../leagueFees.js";
import type * as liveCounters from "../liveCounters.js";
import type * as messageLogs from "../messageLogs.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as nukeDashboardData from "../nukeDashboardData.js";
import type * as parents from "../parents.js";
import type * as paymentInstallments from "../paymentInstallments.js";
import type * as payment_plans from "../payment_plans.js";
import type * as payments from "../payments.js";
import type * as players from "../players.js";
import type * as scheduledMessages from "../scheduledMessages.js";
import type * as seasons from "../seasons.js";
import type * as systemSettings from "../systemSettings.js";
import type * as teams from "../teams.js";
import type * as templates from "../templates.js";
import type * as totalCleanup from "../totalCleanup.js";
import type * as totalDataPurge from "../totalDataPurge.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  actualCleanup: typeof actualCleanup;
  aiRecommendations: typeof aiRecommendations;
  assessments: typeof assessments;
  backgroundJobs: typeof backgroundJobs;
  cleanupTestData: typeof cleanupTestData;
  comprehensiveCleanup: typeof comprehensiveCleanup;
  contracts: typeof contracts;
  dashboard: typeof dashboard;
  dataCleanup: typeof dataCleanup;
  debug: typeof debug;
  emailReminders: typeof emailReminders;
  leagueFeeReminders: typeof leagueFeeReminders;
  leagueFees: typeof leagueFees;
  liveCounters: typeof liveCounters;
  messageLogs: typeof messageLogs;
  migrations: typeof migrations;
  notifications: typeof notifications;
  nukeDashboardData: typeof nukeDashboardData;
  parents: typeof parents;
  paymentInstallments: typeof paymentInstallments;
  payment_plans: typeof payment_plans;
  payments: typeof payments;
  players: typeof players;
  scheduledMessages: typeof scheduledMessages;
  seasons: typeof seasons;
  systemSettings: typeof systemSettings;
  teams: typeof teams;
  templates: typeof templates;
  totalCleanup: typeof totalCleanup;
  totalDataPurge: typeof totalDataPurge;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
