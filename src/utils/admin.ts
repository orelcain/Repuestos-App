type EnvLike = {
  VITE_ADMIN_EMAILS?: string;
};

const DEFAULT_ADMIN_EMAILS = ['orelcain@hotmail.com'];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const readAdminEmailsFromEnv = (): string[] => {
  const env = (import.meta as any)?.env as EnvLike | undefined;
  const raw = String(env?.VITE_ADMIN_EMAILS ?? '').trim();
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeEmail);

  return list.length ? list : DEFAULT_ADMIN_EMAILS;
};

export const isAdminEmail = (email?: string | null): boolean => {
  const e = normalizeEmail(String(email ?? ''));
  if (!e) return false;
  const allow = readAdminEmailsFromEnv();
  return allow.includes(e);
};
