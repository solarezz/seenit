import type { User } from "@prisma/client";

// Безопасное представление пользователя для клиента (без BigInt tgId и приватных полей).
export function publicUser(u: Pick<User, "id" | "username" | "name" | "avatarUrl">) {
  return { id: u.id, username: u.username, name: u.name, avatarUrl: u.avatarUrl };
}
