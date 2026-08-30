import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PLAN_CONFIG, PlanId } from "@/lib/plans";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  subscriptionId: z.string().min(1),
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

  const parsed = bodySchema.safeParse(
    await request.json()
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid verification payload." },
      { status: 400 }
    );
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    subscriptionId,
  } = parsed.data;

  const secret =
    process.env.RAZORPAY_KEY_SECRET || "";

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(
      `${razorpay_order_id}|${razorpay_payment_id}`
    )
    .digest("hex");

  if (
    expectedSignature !== razorpay_signature
  ) {
    return NextResponse.json(
      { error: "Payment verification failed." },
      { status: 400 }
    );
  }

  const subscription =
    await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { profile: true },
    });

  if (
    !subscription ||
    subscription.profile.googleId !== googleId ||
    subscription.razorpayOrderId !==
      razorpay_order_id
  ) {
    return NextResponse.json(
      { error: "Subscription mismatch." },
      { status: 400 }
    );
  }

  const plan =
    subscription.plan as PlanId;

  const days = PLAN_CONFIG[plan].days;
  const startAt = new Date();

  const endAt = new Date(
    startAt.getTime() +
      days * 24 * 60 * 60 * 1000
  );

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "ACTIVE",
      razorpayPaymentId: razorpay_payment_id,
      startAt,
      endAt,
    },
  });

  return NextResponse.json({
    success: true,
    endAt,
  });
}
