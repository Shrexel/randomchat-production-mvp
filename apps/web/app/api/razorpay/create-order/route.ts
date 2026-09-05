import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getRazorpay } from "@/lib/razorpay";
import { PLAN_CONFIG, PlanId } from "@/lib/plans";

const bodySchema = z.object({
  plan: z.enum([
    "ONE_DAY",
    "THREE_DAY",
    "FOUR_DAY",
  ]),
});

export async function POST(
  request: Request
) {
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

  if (!profile) {
    return NextResponse.json(
      {
        error:
          "Please complete your profile first.",
      },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(
    await request.json()
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan selected." },
      { status: 400 }
    );
  }

  const plan = parsed.data.plan as PlanId;
  const config = PLAN_CONFIG[plan];

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: config.amountPaise,
    currency: "INR",
    // Razorpay receipt strings have a short length limit.
    receipt: `rc_${Date.now()}`,
  });

  const subscription =
    await prisma.subscription.create({
      data: {
        profileId: profile.id,
        plan,
        amount: config.amountPaise,
        status: "PENDING",
        razorpayOrderId: order.id,
      },
    });

  return NextResponse.json({
    orderId: order.id,
    amount: config.amountPaise,
    currency: "INR",
    subscriptionId: subscription.id,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
