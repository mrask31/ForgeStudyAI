import { redirect } from 'next/navigation'

// Redirect /library/saved to /readiness (Dashboard) since Library is now integrated into Dashboard
export default function LibrarySavedPage() {
  redirect('/readiness')
}
