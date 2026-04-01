import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE_NAME = "admanagement_session";

export async function getServerSessionToken() {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? "";
}

export async function requireAuthOrRedirect() {
  const token = await getServerSessionToken();
  if (!token) {
    redirect("/login");
  }
  return token;
}
