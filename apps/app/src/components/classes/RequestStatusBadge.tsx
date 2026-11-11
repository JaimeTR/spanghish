import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/admin/PageHeader";

const TONES = { pending: "warning", approved: "success", declined: "muted", cancelled: "muted" } as const;

/** Insignia del estado de un cambio de clase (texto siempre visible, además del color). */
export function RequestStatusBadge({ status }: { status: keyof typeof TONES }) {
  const t = useTranslations("classes.requests");
  return <StatusBadge tone={TONES[status]}>{t(`status.${status}`)}</StatusBadge>;
}
