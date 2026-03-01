import { EMAIL_FROM, resend } from "./client";

interface WrReceiptNotificationParams {
  agencyEmail: string;
  agencyName: string;
  trackingNumber: string;
  wrNumber: string;
  consigneeName: string | null;
  weightLb: number | null;
  isDamaged: boolean;
  damageDescription: string | null;
}

export async function sendWrReceiptNotification({
  agencyEmail,
  agencyName,
  trackingNumber,
  wrNumber,
  consigneeName,
  weightLb,
  isDamaged,
  damageDescription,
}: WrReceiptNotificationParams): Promise<void> {
  const subject = isDamaged
    ? `⚠️ Paquete recibido CON DAÑO — ${trackingNumber}`
    : `Paquete recibido — ${trackingNumber}`;

  const weightText = weightLb ? `${weightLb.toFixed(2)} lb` : "N/A";
  const recipientText = consigneeName ?? "Sin asignar";

  let body = `Estimado/a ${agencyName},

Se recibió el siguiente paquete en bodega:

• Guía: ${trackingNumber}
• WR#: ${wrNumber}
• Destinatario: ${recipientText}
• Peso facturable: ${weightText}`;

  if (isDamaged) {
    body += `

⚠️ ALERTA DE DAÑO
${damageDescription ?? "Sin descripción"}

Por favor revise las fotos adjuntas en el sistema.`;
  }

  body += `

— no-wms`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: agencyEmail,
      subject,
      text: body,
    });
  } catch (error) {
    // Log but don't throw — email failure shouldn't block WR creation
    console.error("Failed to send WR receipt notification:", error);
  }
}
