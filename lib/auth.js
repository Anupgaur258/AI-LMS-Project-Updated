import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Returns { email, name } of the signed-in user or null.
export async function getSessionUser() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
  if (!user || !email) return null;
  const name =
    user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || email.split("@")[0];
  return { email, name };
}

export const unauthorized = () =>
  NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

export const FREE_COURSE_LIMIT = Number(process.env.NEXT_PUBLIC_FREE_COURSE_LIMIT || 5);
