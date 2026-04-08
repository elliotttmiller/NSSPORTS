import { loadSession } from "@/lib/clientAuth";
import { UnauthorizedError } from "@/lib/errors";

export async function getAuthUser(): Promise<string> {
  const session = loadSession();
  if (!session || !session.user || !session.user.id) {
    throw new UnauthorizedError();
  }
  return session.user.id;
}

export async function getAuthUserOptional(): Promise<string | null> {
  const session = loadSession();
  if (!session || !session.user || !session.user.id) return null;
  return session.user.id;
}
