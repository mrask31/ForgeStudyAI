import { redirect } from 'next/navigation'

// Redirect /clinical-desk to /tutor
export default function ClinicalDeskPage() {
  redirect('/tutor')
}
