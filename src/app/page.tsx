import Hero from '@/components/landing/Hero'
import { MagicMoment } from '@/components/landing/MagicMoment'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { HomeworkPhotoDrop } from '@/components/landing/HomeworkPhotoDrop'
import { ParentTrust } from '@/components/landing/ParentTrust'
import { Pricing } from '@/components/landing/Pricing'
import { Footer } from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <main className="min-h-screen w-full bg-background overflow-x-hidden">
      <Hero />
      <MagicMoment />
      <HowItWorks />
      <HomeworkPhotoDrop />
      <ParentTrust />
      <Pricing />
      <Footer />
    </main>
  )
}
