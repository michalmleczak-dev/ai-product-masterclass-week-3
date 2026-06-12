import { NextResponse } from "next/server";

import { makeUserClient } from "@/lib/supabase-server";

export interface AuthOk {
  ok: true;
  accessToken: string;
}

export interface VerifiedAuthOk {
  ok: true;
  accessToken: string;
  userId: string;
}

export interface AuthErr {
  ok: false;
  response: NextResponse;
}

export function requireAuth(request: Request): AuthOk | AuthErr {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      ),
    };
  }
  return { ok: true, accessToken: token };
}

/**
 * Like requireAuth, but also verifies the token against Supabase Auth and
 * resolves the user's id. Use on routes that spend money (AI calls) before
 * any database query would otherwise reject a forged token.
 */
export async function requireVerifiedAuth(
  request: Request
): Promise<VerifiedAuthOk | AuthErr> {
  const auth = requireAuth(request);
  if (!auth.ok) return auth;

  const sb = makeUserClient(auth.accessToken);
  const { data, error } = await sb.auth.getUser(auth.accessToken);
  if (error || !data?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid or expired access token" },
        { status: 401 }
      ),
    };
  }
  return { ok: true, accessToken: auth.accessToken, userId: data.user.id };
}
