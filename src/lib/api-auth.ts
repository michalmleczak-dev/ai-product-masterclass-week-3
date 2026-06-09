import { NextResponse } from "next/server";

export interface AuthOk {
  ok: true;
  accessToken: string;
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
