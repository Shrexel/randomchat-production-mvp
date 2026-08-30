import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  dob: z.string(), // ISO date string, e.g. "2000-05-14"
  guestId: z.string().min(1).max(100).optional(),
});

function calculateAge(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();

  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() &&
      now.getDate() >= dob.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

export async function GET() {
  const session = await auth();

  const googleId = (
    session?.user as
      | { googleId?: string }
      | undefined
  )?.googleId;

  if (!googleId) {
    return NextResponse.json(
      { error: "Not signed in" },
      { status: 401 }
    );
  }

  const profile =
    await prisma.profile.findUnique({
      where: { googleId },
    });

  return NextResponse.json({ profile });
}

export async function POST(
  request: Request
) {
  const session = await auth();

  const googleId = (
    session?.user as
      | { googleId?: string }
      | undefined
  )?.googleId;

  const email = session?.user?.email;

  if (!googleId || !email) {
    return NextResponse.json(
      { error: "Not signed in" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed =
    profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile data" },
      { status: 400 }
    );
  }

  const dob = new Date(parsed.data.dob);

  if (Number.isNaN(dob.getTime())) {
    return NextResponse.json(
      { error: "Invalid date of birth" },
      { status: 400 }
    );
  }

  const age = calculateAge(dob);

  if (age < 18) {
    return NextResponse.json(
      {
        error:
          "You must be 18 or older to use RandomChat.",
      },
      { status: 403 }
    );
  }

  // Link (or create) the anonymous Guest row this browser was
  // already using, so existing blocks/reports carry over.
  if (parsed.data.guestId) {
    await prisma.guest.upsert({
      where: { id: parsed.data.guestId },
      update: {},
      create: { id: parsed.data.guestId },
    });
  }

  const profile = await prisma.profile.upsert({
    where: { googleId },
    update: {
      name: parsed.data.name,
      dob,
      guestId: parsed.data.guestId,
    },
    create: {
      googleId,
      email,
      name: parsed.data.name,
      dob,
      guestId: parsed.data.guestId,
    },
  });

  return NextResponse.json({ profile });
}
