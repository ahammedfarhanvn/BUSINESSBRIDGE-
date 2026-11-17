import { NextResponse } from "next/server";
import { checkSupabaseConnection } from "@/lib/supabase/check-connection";

export async function GET() {
  const status = await checkSupabaseConnection();
  return NextResponse.json(status);
}
