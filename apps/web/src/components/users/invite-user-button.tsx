"use client";

import { useState } from "react";

import { InviteUserModal } from "@/components/users/invite-user-modal";

interface InviteUserButtonProps {
  organizationId: string;
}

export function InviteUserButton({ organizationId }: InviteUserButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        + Invitar Usuario
      </button>
      <InviteUserModal
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
      />
    </>
  );
}
