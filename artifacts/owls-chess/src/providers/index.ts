// Provider registry. The app reads providers from here. Swap the registry to
// run hosted, restricted, or future server-backed deployments — the rest of
// the app does not change.

import {
  loadSettings,
  saveSettings,
  auditService,
  localStorageProvider,
  localDatabaseProvider,
  localAuthProvider,
  localFileProvider,
  localPuzzleSourceProvider,
} from "./local";
import type { ProviderRegistry, AppSettings } from "./types";

export function getProviders(): ProviderRegistry {
  const settings = loadSettings();
  // For now there is only one implementation per interface (local). Selection
  // by deploymentMode + provider IDs hooks in here when a hosted backend ships
  // (Phase 6+). RESTRICTED mode flips allowExternalCalls off and forces local.
  return {
    settings,
    storage: localStorageProvider,
    database: localDatabaseProvider,
    auth: localAuthProvider,
    file: localFileProvider,
    puzzleSource: localPuzzleSourceProvider,
    audit: auditService,
  };
}

export function updateSettings(patch: Partial<AppSettings>) {
  const current = loadSettings();
  const next = { ...current, ...patch, featureFlags: { ...current.featureFlags, ...(patch.featureFlags ?? {}) } };
  // Restricted mode safety: force allowExternalCalls off and local providers
  if (next.deploymentMode === "restricted") {
    next.allowExternalCalls = false;
    next.storageProviderId = "local";
    next.databaseProviderId = "local";
    next.authProviderId = "local";
    next.fileProviderId = "local";
    next.puzzleSourceProviderId = "local";
  }
  saveSettings(next);
  auditService.log({
    actorUserId: "local-admin",
    actionType: "settings.updated",
    targetType: "settings",
    details: { patch },
  });
  return next;
}

export { saveSettings, loadSettings, auditService };
