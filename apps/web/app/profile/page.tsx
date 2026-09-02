"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function ProfilePage() {
  const { data: session, status } =
    useSession();

  const router = useRouter();

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setName(data.profile.name || "");

          setDob(
            data.profile.dob
              ? String(
                  data.profile.dob
                ).slice(0, 10)
              : ""
          );
        } else if (session?.user?.name) {
          setName(session.user.name);
        }
      })
      .finally(() => setLoading(false));
  }, [status, session]);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const guestId =
      typeof window !== "undefined"
        ? localStorage.getItem(
            "randomchat_guest_id"
          )
        : null;

    try {
      const res = await fetch(
        "/api/profile",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            dob,
            guestId: guestId || undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Something went wrong."
        );

        return;
      }

      setSaved(true);
    } catch {
      setError(
        "Unable to save your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (
    status === "loading" ||
    loading
  ) {
    return (
      <main className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Loading...
        </p>
      </main>
    );
  }

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

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-gray-100">
            Your Profile
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            RandomChat requires you to be 18
            or older. Your date of birth is
            never shown to other users.
          </p>

          {saved ? (
            <div className="text-center py-6">
              <p className="text-green-600 dark:text-green-400 font-semibold mb-4">
                Profile saved!
              </p>

              <button
                onClick={() =>
                  router.push("/premium")
                }
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl w-full"
              >
                View Premium Plans
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>

                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  className="w-full border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth
                </label>

                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) =>
                    setDob(e.target.value)
                  }
                  className="w-full border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 font-medium">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl"
              >
                {saving
                  ? "Saving..."
                  : "Save Profile"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
