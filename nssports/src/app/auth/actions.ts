/**
 * Authentication Client Actions (replaced server actions for static export)
 */
import { signIn as clientSignIn, register as clientRegister } from "@/lib/clientAuth";

export type LoginState = {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

export type RegisterState = {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

export async function loginAction(
  prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  
  if (!username || username.length < 3) {
    return { success: false, errors: { username: ["Username must be at least 3 characters"] } };
  }
  if (!password || password.length < 6) {
    return { success: false, errors: { password: ["Password must be at least 6 characters"] } };
  }

  const result = await clientSignIn(username, password);
  if (!result.success) {
    return { success: false, error: result.error || "Invalid credentials" };
  }
  return { success: true, message: "Login successful!" };
}

export async function registerAction(
  prevState: RegisterState | null,
  formData: FormData
): Promise<RegisterState> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!username || username.length < 3) {
    return { success: false, errors: { username: ["Username must be at least 3 characters"] } };
  }
  if (!password || password.length < 6) {
    return { success: false, errors: { password: ["Password must be at least 6 characters"] } };
  }

  const result = await clientRegister(username, password, name || undefined);
  if (!result.success) {
    return { success: false, error: result.error || "Registration failed" };
  }
  return { success: true, message: "Account created successfully!" };
}
