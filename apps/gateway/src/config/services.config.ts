export interface ServiceRoute {
  prefix: string;
  envKey: string;
  public?: boolean;
}

export const serviceRoutes: ServiceRoute[] = [
  { prefix: 'auth', envKey: 'AUTH_SERVICE_URL', public: true },
  { prefix: 'users', envKey: 'USERS_SERVICE_URL' },
  { prefix: 'storage', envKey: 'STORAGE_SERVICE_URL' },
  { prefix: 'notifications', envKey: 'NOTIFICATIONS_SERVICE_URL' },
  { prefix: 'reports', envKey: 'REPORTS_SERVICE_URL' },
  { prefix: 'classroom', envKey: 'CLASSROOM_SERVICE_URL' },
  { prefix: 'analytics', envKey: 'ANALYTICS_SERVICE_URL' },
  { prefix: 'ai', envKey: 'AI_SERVICE_URL' },
  { prefix: 'accessibility', envKey: 'ACCESSIBILITY_SERVICE_URL' },
];
