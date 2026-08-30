"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { PLAN_CONFIG, PlanId } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

const PLAN_IDS: PlanId[] = [
  "ONE_DAY",
  "THREE_DAY",
  "FOUR_DAY",
];

const PLAN_PERKS = [
  "Choose your gender",
  "Choose who you're looking for",
];

export default function PremiumPage() {
  const { data: session, status } =
    useSession();

  const router = useRouter();

  const [scriptLoaded, setScriptLoaded] =
    useState(false);

  const [loadingPlan, setLoadingPlan] =
    useState<PlanId | null>(null);

  const [error, setError] = useState("");

  const [isPremium, setIsPremium] =
    useState(false);

  const [expiresAt, setExpiresAt] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    const script = document.createElement(
      "script"
    );

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    script.onload = () =>
      setScriptLoaded(true);

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => {
        setIsPremium(
          Boolean(data.isPremium)
        );

        setExpiresAt(
          data.expiresAt || null
        );
      });
  }, [status]);

  const handleSubscribe = async (
    plan: PlanId
  ) => {
    setError("");

    if (status !== "authenticated") {
      signIn("google");
      return;
    }

    if (!scriptLoaded || !window.Razorpay) {
      setError(
        "Payment system is still loading, please try again in a moment."
      );

      return;
    }

    setLoadingPlan(plan);

    try {
      const orderRes = await fetch(
        "/api/razorpay/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({ plan }),
        }
      );

      const order =
        await orderRes.json();

      if (!orderRes.ok) {
        setError(
          order.error ||
            "Unable to start checkout."
        );

        return;
      }

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "RandomChat",
        description: `${PLAN_CONFIG[plan].label} Premium`,
        prefill: {
          name: session?.user?.name || "",
          email:
            session?.user?.email || "",
        },
        theme: {
          color: "#2563eb",
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch(
            "/api/razorpay/verify",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                ...response,
                subscriptionId:
                  order.subscriptionId,
              }),
            }
          );

          const verifyData =
            await verifyRes.json();

          if (verifyRes.ok) {
            setIsPremium(true);
            setExpiresAt(
              verifyData.endAt
            );
            setSuccess(true);
          } else {
            setError(
              verifyData.error ||
                "Payment verification failed."
            );
          }
        },
      });

      razorpay.open();
    } catch {
      setError(
        "Something went wrong starting checkout."
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex flex-col text-gray-800 dark:text-gray-100 transition-colors">
      <header className="flex-none bg-white dark:bg-gray-900 shadow-sm py-3 px-4 md:py-4 md:px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => router.push("/")}
          className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity"
        >
          RandomChat
        </button>

        <ThemeToggle />
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
          Premium Plans
        </h1>

        <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
          Choose your gender and who you&apos;re looking for, instead of fully random matching.
        </p>

        {isPremium && (
          <div className="bg-green-50 dark:bg-green-950/40 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-300 rounded-xl p-4 text-center mb-8 font-semibold">
            {success
              ? "🎉 Subscription activated!"
              : "You have an active premium subscription."}{" "}
            {expiresAt && (
              <span className="block text-sm font-normal mt-1">
                Expires{" "}
                {new Date(
                  expiresAt
                ).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {error && (
          <p className="text-center text-red-500 font-medium mb-6">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PLAN_IDS.map((planId) => {
            const plan =
              PLAN_CONFIG[planId];

            return (
              <div
                key={planId}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex flex-col"
              >
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {plan.label}
                </h2>

                <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 my-3">
                  {plan.displayPrice}
                </p>

                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 flex-1 mb-4">
                  {PLAN_PERKS.map((perk) => (
                    <li key={perk}>
                      ✓ {perk}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() =>
                    handleSubscribe(
                      planId
                    )
                  }
                  disabled={
                    loadingPlan === planId
                  }
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl"
                >
                  {loadingPlan === planId
                    ? "Loading..."
                    : status ===
                      "authenticated"
                    ? "Subscribe"
                    : "Sign in to subscribe"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
