import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/apiResponse";
import { UnauthorizedError } from "@/lib/errors";

/**
 * Get the authenticated user from the session.
 * Returns the user ID if authenticated, or throws UnauthorizedError.
 */
export async function getAuthUser(): Promise<string> {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    throw new UnauthorizedError();
  }

  return session.user.id;
}

/**
 * Get the authenticated user from the session, or return null if not authenticated.
 */
export async function getAuthUserOptional(): Promise<string | null> {
  const session = await auth();

  if (!session || !session.user || !session.user.id) return null;

  return session.user.id;
}
