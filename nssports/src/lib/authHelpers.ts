import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/apiResponse";

/**
 * Get the authenticated user from the session.
 * Returns the user ID if authenticated, or throws an unauthorized error.
 */
export async function getAuthUser(): Promise<string> {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    throw new Error("Unauthorized");
  }

  return session.user.id;
}

/**
 * Get the authenticated user from the session, or return null if not authenticated.
 * Use this for optional authentication.
 */
export async function getAuthUserOptional(): Promise<string | null> {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return null;
  }

  return session.user.id;
}
