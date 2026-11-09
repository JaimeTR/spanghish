import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/forms";

/**
 * Resultado de una acción de formulario. Las dos regiones existen siempre (vacías
 * en reposo) para que los lectores de pantalla anuncien los cambios.
 */
export function FormStatus({ state }: { state: ActionState }) {
  const t = useTranslations();
  let alert: string | null = null;
  if (state.status === "error") alert = t(`errors.domain.${state.error}`);
  if (state.status === "invalid") alert = t("forms.invalid");

  return (
    <>
      <div role="alert" className="text-sm font-semibold text-danger empty:hidden">
        {alert}
      </div>
      <div role="status" className="text-sm text-text empty:hidden">
        {state.status === "ok" ? t("forms.saved") : null}
      </div>
    </>
  );
}
