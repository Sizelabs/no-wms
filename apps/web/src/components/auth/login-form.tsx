"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { login } from "@/lib/actions/auth";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}

export function LoginForm({
  labels,
  forgotPasswordHref,
}: {
  labels: { email: string; password: string; login: string; forgotPassword: string };
  forgotPasswordHref: string;
}) {
  const [error, formAction] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const result = await login(formData);
      return result ?? null;
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          {labels.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          {labels.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
      </div>

      <div className="text-right">
        <a
          href={forgotPasswordHref}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {labels.forgotPassword}
        </a>
      </div>

      <SubmitButton label={labels.login} />
    </form>
  );
}
