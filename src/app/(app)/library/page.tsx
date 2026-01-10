// src/app/(app)/library/page.tsx

import { redirect } from "next/navigation";

/**
 * Temporary stub for the Library route.
 *
 * We no longer render a standalone Library page.
 * Instead we immediately redirect to /readiness,
 * where the library / saved content is integrated.
 */
export default function LibraryPage() {
  redirect("/readiness");
}
