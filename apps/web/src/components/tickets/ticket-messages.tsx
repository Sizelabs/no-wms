"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { addTicketMessage } from "@/lib/actions/tickets";

interface Message {
  id: string;
  content: string;
  created_at: string;
  author: { full_name: string } | null;
}

interface TicketMessagesProps {
  ticketId: string;
  messages: Message[];
  canReply: boolean;
}

export function TicketMessages({ ticketId, messages, canReply }: TicketMessagesProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("ticket_id", ticketId);

    startTransition(async () => {
      const result = await addTicketMessage(formData);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Mensaje enviado", "success");
        formRef.current?.reset();
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Mensajes</h3>

      {/* Message thread */}
      <div className="space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="rounded-lg border bg-gray-50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-900">
                {msg.author?.full_name ?? "Usuario"}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(msg.created_at).toLocaleString("es")}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{msg.content}</p>
          </div>
        ))}
        {!messages.length && (
          <p className="py-4 text-center text-xs text-gray-400">No hay mensajes</p>
        )}
      </div>

      {/* Reply form */}
      {canReply && (
        <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            name="content"
            required
            rows={2}
            placeholder="Escribir mensaje..."
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="self-end rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      )}
    </div>
  );
}
