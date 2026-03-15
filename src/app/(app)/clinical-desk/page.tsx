import { redirect } from 'next/navigation'

// Legacy redirect: /clinical-desk to /tutor
export default function ClinicalDeskPage() {
  redirect('/tutor')
}
