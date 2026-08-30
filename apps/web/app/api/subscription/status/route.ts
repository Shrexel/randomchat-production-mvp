import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();

  const googleId = (
    session?.user as
      | { googleId?: string }
      | undefined
  )?.googleId;

  if (!googleId) {
    return NextResponse.json({
      isPremium: false,
    });
  }

  const profile =
    await prisma.profile.findUnique({
      where: { googleId },
    });

  if (!profile) {
    return NextResponse.json({
      isPremium: false,
    });
  }

  const activeSubscription =
    await prisma.subscription.findFirst({
      where: {
        profileId: profile.id,
        status: "ACTIVE",
        endAt: { gt: new Date() },
      },
      orderBy: { endAt: "desc" },
    });

  return NextResponse.json({
    isPremium: Boolean(
      activeSubscription
    ),
    expiresAt:
      activeSubscription?.endAt ?? null,
  });
}
