"use client";

import Link from "next/link";

interface ReportCardProps {
  title: string;
  description: string;
  href: string;
}

export function ReportCard({ title, description, href }: ReportCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-lg border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </Link>
  );
}
