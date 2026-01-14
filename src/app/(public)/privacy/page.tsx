export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-semibold text-slate-900 mb-4">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: December 15, 2024</p>
        
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              This Privacy Policy describes how MJR Intelligence Group LLC ("we," "our," or "us") collects, uses, and protects your personal information when you use ForgeStudy Platform, our AI-powered study companion for Grades 3–12 students.
            </p>
            <p className="text-slate-600 leading-relaxed">
              By using ForgeStudy Platform, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Parent Account Information</h3>
                <p className="text-slate-600 leading-relaxed">
                  When you create a parent account, we collect your email address and password (stored securely using industry-standard encryption). Parents manage student profiles and have full control over their children's data.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Student Profile Information</h3>
                <p className="text-slate-600 leading-relaxed">
                  For each student profile (Grades 3–12), we collect grade level and learning preferences. Student data is used solely to support personalized learning experiences and is managed by the parent account holder.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Educational Content</h3>
                <p className="text-slate-600 leading-relaxed">
                  You may upload educational materials (PDFs, notes, slides) to student profiles. This content is stored securely and is only accessible to the parent account and used to provide personalized tutoring support.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Learning Data</h3>
                <p className="text-slate-600 leading-relaxed">
                  We collect information about how students interact with ForgeStudy Platform, including chat conversations, study sessions, and progress data. This data is used exclusively to support learning, personalize the educational experience, and help students build understanding—never for marketing or advertising purposes.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Technical Data</h3>
                <p className="text-slate-600 leading-relaxed">
                  We automatically collect certain technical information, including IP address, browser type, device information, and usage timestamps to ensure service security and functionality.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We use student and parent data <strong>only to support learning</strong>. Specifically, we use information to:
            </p>
            <ul className="space-y-2 text-slate-600 leading-relaxed">
              <li>• Provide personalized AI-powered tutoring and step-by-step explanations for Grades 3–12 students</li>
              <li>• Generate learning content tailored to each student's grade level and coursework</li>
              <li>• Track progress and help students build confidence and independence</li>
              <li>• Enable parent account management of multiple student profiles (up to 4 students per family account)</li>
              <li>• Communicate with parents about account management, service updates, and support requests</li>
              <li>• Improve our educational algorithms to better support student learning</li>
              <li>• Ensure platform security and prevent unauthorized access</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-4">
              <strong>We do not use student data for advertising, marketing, or any purpose other than supporting their learning experience.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. AI Processing Disclosure</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              ForgeStudy Platform uses artificial intelligence (AI) to provide personalized tutoring and guided help. Your conversations, uploaded materials, and study data may be processed by AI systems to:
            </p>
            <ul className="space-y-2 text-slate-600 leading-relaxed mb-4">
              <li>• Generate educational responses and explanations</li>
              <li>• Analyze your learning patterns and identify areas for improvement</li>
              <li>• Create personalized study recommendations</li>
              <li>• Improve our AI models through training and refinement</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>Third-Party AI Provider:</strong> We use OpenAI's API services (including GPT-4 and related models) to power our AI tutoring features. When students interact with ForgeStudy Platform, their messages, uploaded materials, and learning data are shared with OpenAI solely to generate educational responses and support learning. OpenAI's use of your data is governed by their privacy policy and data processing terms. For more information, please review OpenAI's Privacy Policy at <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 hover:underline">openai.com/privacy</a>.
            </p>
            <p className="text-slate-600 leading-relaxed">
              We implement appropriate safeguards and contractual protections to protect your data during AI processing, but you acknowledge that data shared with third-party AI providers is subject to their privacy practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Data Storage and Security</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We use secure cloud infrastructure (Supabase) to store your data. All data is encrypted in transit and at rest using industry-standard encryption protocols. We implement industry-standard security measures including:
            </p>
            <ul className="space-y-2 text-slate-600 leading-relaxed mb-4">
              <li>• End-to-end encryption for data in transit (HTTPS/TLS)</li>
              <li>• Encryption at rest for stored data</li>
              <li>• Secure authentication and access controls</li>
              <li>• Regular security audits and monitoring</li>
              <li>• Compliance with education privacy standards (FERPA/COPPA)</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>Data Breach Notification:</strong> In the event of a data breach that compromises your personal information, we will notify affected users and relevant authorities as required by applicable law, typically within 72 hours of becoming aware of the breach. Notifications will be sent to the email address associated with your parent account and may include information about the nature of the breach and steps you can take to protect yourself.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Data Sharing and Disclosure</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>We do not sell your personal information or student data.</strong> We may share data only in the following limited circumstances:
            </p>
            <ul className="space-y-2 text-slate-600 leading-relaxed">
              <li>• <strong>Service Providers:</strong> With trusted third-party service providers who assist in operating our service (e.g., cloud hosting, AI processing, payment processing), subject to strict confidentiality obligations and data protection agreements</li>
              <li>• <strong>Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
              <li>• <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with advance notice to users</li>
              <li>• <strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-4">
              Student data is never shared with advertisers, data brokers, or third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Your Rights and Choices</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              As a parent account holder, you have full control over your account and your children's student profiles. You have the right to:
            </p>
            <ul className="space-y-2 text-slate-600 leading-relaxed">
              <li>• Access and review all personal information and student data associated with your account</li>
              <li>• Correct inaccurate or incomplete information for any student profile</li>
              <li>• Delete individual student profiles or your entire account and all associated data</li>
              <li>• Export student data in a portable format</li>
              <li>• Manage multiple student profiles (up to 4) from one parent account</li>
              <li>• Request information about how student data is being used</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-4">
              To exercise these rights, please contact us at <a href="mailto:support@forgestudy.com" className="text-teal-600 hover:text-teal-700 hover:underline">support@forgestudy.com</a>. We will respond to your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Age Requirement and Parent-Managed Accounts</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              ForgeStudy Platform is designed for Grades 3–12 students. All accounts are parent-managed, meaning:
            </p>
            <ul className="space-y-2 text-slate-600 leading-relaxed mb-4">
              <li>• Parents create and manage the primary account</li>
              <li>• Parents create and control student profiles for their children (Grades 3–12)</li>
              <li>• Parents have full visibility and control over student data and learning activity</li>
              <li>• Students access the platform through profiles managed by their parent account</li>
            </ul>
            <p className="text-slate-600 leading-relaxed">
              For students under 13, we comply with COPPA requirements. Parental consent is required when creating student profiles. If we become aware that we have collected information from a user under 13 without proper parental consent, we will take immediate steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Educational Use Only</h2>
            <p className="text-slate-600 leading-relaxed">
              ForgeStudy Platform is designed for educational purposes only. It is not a substitute for professional instruction, classroom learning, or academic support. The AI-generated content is intended to support learning and should be used as a supplemental study tool aligned with your coursework.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide services. If you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal, regulatory, or legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">12. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-slate-600 leading-relaxed mt-2">
              <strong>MJR Intelligence Group LLC</strong><br />
              Email: <a href="mailto:support@forgestudy.com" className="text-teal-600 hover:text-teal-700 hover:underline">support@forgestudy.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
