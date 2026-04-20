interface User {
  session?: { token: string };
  name: string;
}

export function getToken(user: User | null): string {
  if (!user) return "";
  return user.session?.token ?? "";
}
