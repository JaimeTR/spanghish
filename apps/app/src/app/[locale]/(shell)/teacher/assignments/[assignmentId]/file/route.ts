import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/routing";
import { signSubmissionFile } from "@/lib/assignments/sign";
import { isUuid } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";

/** Descarga del archivo de la entrega de un alumno (`?student=<id>`): URL firmada de 5 minutos. */
export async function GET(request: Request, { params }: { params: Promise<{ locale: string; assignmentId: string }> }) {
  const { locale, assignmentId } = await params;
  const student = new URL(request.url).searchParams.get("student");
  if (!isLocale(locale) || !isUuid(assignmentId) || !student || !isUuid(student)) return new Response(null, { status: 404 });
  await requireArea(locale, "teacher");
  const url = await signSubmissionFile(assignmentId, student);
  if (!url) return new Response(null, { status: 404 });
  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "private, no-store" } });
}
