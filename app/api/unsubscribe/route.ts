import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("business_id");
    const email = searchParams.get("email");

    if (!businessId || !email) {
        return NextResponse.redirect(new URL("/unsubscribe/error", req.url));
    }

    const admin = getAdminClient() as any;

    await admin.from("email_unsubscribes").upsert(
        { business_id: businessId, email: email.toLowerCase().trim() },
        { onConflict: "business_id,email" }
    );

    return NextResponse.redirect(new URL(`/unsubscribe/success`, req.url));
}
