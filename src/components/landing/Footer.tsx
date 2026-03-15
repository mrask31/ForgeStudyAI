'use client'

import { Sparkles, ArrowRight } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative w-full bg-card/40 border-t border-border/30 backdrop-blur">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* CTA Section */}
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">
            Ready to Transform Your Child's Learning?
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start your 7-day free trial today. No credit card required.
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-primary/50 hover:scale-105 active:scale-95">
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Footer content */}
        <div className="border-t border-border/30">
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <span className="text-white font-bold text-lg">ForgeStudy</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  AI tutoring for grades 6–12, powered by real homework and COPPA compliance.
                </p>
              </div>

              {/* Product */}
              <div>
                <h4 className="text-white font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Demo</a></li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-white font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="text-white font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">COPPA Info</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
                </ul>
              </div>
            </div>

            {/* Bottom */}
            <div className="border-t border-border/30 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">
                © 2024 ForgeStudy. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <a href="#" className="hover:text-primary transition-colors">Twitter</a>
                <a href="#" className="hover:text-primary transition-colors">LinkedIn</a>
                <a href="#" className="hover:text-primary transition-colors">Discord</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
