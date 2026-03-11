export function isWordPressUser(email: string | null | undefined): boolean {
  const allowed = process.env.WP_ALLOWED_USER_EMAIL;
  if (!allowed || !email) return false;
  return email === allowed;
}
