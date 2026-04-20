interface DB {
  query<T>(sql: string, params: unknown[]): Promise<T[]>;
}

export async function findUserByEmail(db: DB, email: string) {
  return db.query<{ id: string; email: string }>(
    "SELECT id, email FROM users WHERE email = $1 LIMIT 1",
    [email],
  );
}
