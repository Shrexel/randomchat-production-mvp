"use client";

import { useState } from "react";

export type GenderOption =
  | "MALE"
  | "FEMALE"
  | "OTHER";

export type LookingForOption =
  | "RANDOM"
  | GenderOption;

const GENDER_OPTIONS: {
  value: GenderOption;
  label: string;
}[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  {
    value: "OTHER",
    label: "Other / LGBTQ+",
  },
];

const LOOKING_FOR_OPTIONS: {
  value: LookingForOption;
  label: string;
}[] = [
  { value: "RANDOM", label: "Random" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  {
    value: "OTHER",
    label: "Other / LGBTQ+",
  },
];

export default function GenderModal({
  onConfirm,
}: {
  onConfirm: (data: {
    gender: GenderOption;
    lookingFor: LookingForOption;
  }) => void;
}) {
  const [gender, setGender] =
    useState<GenderOption | null>(null);

  const [lookingFor, setLookingFor] =
    useState<LookingForOption | null>(
      null
    );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          ✨ Premium Matching
        </h3>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Tell us a bit about yourself for this session.
        </p>

        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Your Gender
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                setGender(opt.value)
              }
              className={
                gender === opt.value
                  ? "bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Looking For
        </p>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {LOOKING_FOR_OPTIONS.map(
            (opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  setLookingFor(opt.value)
                }
                className={
                  lookingFor === opt.value
                    ? "bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                }
              >
                {opt.label}
              </button>
            )
          )}
        </div>

        <button
          disabled={
            !gender || !lookingFor
          }
          onClick={() =>
            gender &&
            lookingFor &&
            onConfirm({
              gender,
              lookingFor,
            })
          }
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl"
        >
          Start Matching
        </button>
      </div>
    </div>
  );
}
