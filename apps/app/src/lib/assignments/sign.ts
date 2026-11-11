import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ASSIGNMENT_BUCKET } from "./files";

/**
 * URL firmada (5 min) del archivo de una entrega, o null. Con `studentId` (docente) es la de ese
 * alumno; sin él, la de la persona que llama. La entrega se lee con RLS y el archivo con la
 * política de Storage: si no tiene permiso, no hay URL.
 */
export async function signSubmissionFile(assignmentId: string, studentId: string | null): Promise<string | null> {
  const supabase = await createClient();
  let query = supabase.from("assignment_submissions").select("file_path, file_name").eq("assignment_id", assignmentId).not("file_path", "is", null);
  if (studentId) query = query.eq("student_id", studentId);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data?.file_path) return null;
  const signed = await supabase.storage.from(ASSIGNMENT_BUCKET).createSignedUrl(data.file_path, 300, { download: data.file_name ?? true });
  return signed.error ? null : signed.data.signedUrl;
}
