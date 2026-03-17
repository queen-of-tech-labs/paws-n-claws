import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const lastUpdated = 'March 17, 2026';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white transition p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Privacy Policy</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Intro */}
        <div>
          <p className="text-slate-400 text-sm">Last updated: {lastUpdated}</p>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Royalty Tech Labs ("we," "our," or "us") operates the Paws &amp; Claws Companion
            mobile and web application (the "App"). This Privacy Policy explains how we
            collect, use, store, and protect your information when you use our App. By
            using Paws &amp; Claws, you agree to the practices described in this policy.
          </p>
        </div>

        <Section title="1. Information We Collect">
          <SubSection title="Account Information">
            When you create an account, we collect your email address and, if you sign
            in with Google, your Google profile name and profile photo. We use this
            information solely to identify your account and personalize your experience.
          </SubSection>

          <SubSection title="Pet Information">
            You may choose to enter information about your pets including names, species,
            breed, date of birth, photos, weight, health records, vaccination history,
            medications, care logs, and appointment history. This information is stored
            securely and used only to provide you with the App's features.
          </SubSection>

          <SubSection title="Location Information">
            With your permission, we access your device's location to help you find
            nearby veterinarians and animal rescue organizations. We do not store your
            precise location on our servers. Location is only used in the moment you
            request a local search and is not tracked over time.
          </SubSection>

          <SubSection title="Payment Information">
            Premium subscriptions and in-app purchases are processed by Stripe, Inc.
            We do not store your credit card numbers, bank account details, or other
            financial information on our servers. Stripe handles all payment processing
            and is subject to its own privacy policy at stripe.com/privacy. We receive
            only a transaction confirmation and your subscription status.
          </SubSection>

          <SubSection title="Push Notification Tokens">
            If you enable push notifications, your device generates a notification token
            that is shared with OneSignal, our push notification provider. This token
            is used only to deliver reminders and alerts you have configured. We do not
            use it for advertising or share it with third parties for marketing purposes.
          </SubSection>

          <SubSection title="User-Generated Content">
            Content you submit to community features — including forum posts, replies,
            and any content you mark as public — may be visible to other users. Please
            do not include sensitive personal information in public posts. Care logs,
            health records, and pet profiles are private to your account only.
          </SubSection>

          <SubSection title="Usage Information">
            We may collect basic technical information such as device type, operating
            system version, app version, and general usage patterns to help us improve
            the App. This data is anonymized and not linked to your personal identity.
          </SubSection>
        </Section>

        <Section title="2. How We Use Your Information">
          <p className="text-slate-300 leading-relaxed">We use the information we collect to:</p>
          <ul className="mt-3 space-y-2 text-slate-300">
            {[
              'Create and manage your account',
              'Provide, operate, and improve the App and its features',
              'Send you reminders, notifications, and alerts you have configured',
              'Process premium subscription payments through Stripe',
              'Help you find nearby veterinarians and animal rescue organizations',
              'Enable community features such as forums and discussions',
              'Respond to your support requests and feedback',
              'Ensure the security and integrity of the App',
              'Comply with legal obligations',
            ].map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-slate-300 leading-relaxed">
            We do not sell your personal information. We do not use your data for
            advertising purposes. We do not share your pet information, health records,
            or personal details with third parties for their marketing or commercial use.
          </p>
        </Section>

        <Section title="3. Data Storage and Security">
          <p className="text-slate-300 leading-relaxed">
            Your data is stored securely using Google Firebase, which provides
            industry-standard encryption in transit and at rest. Access to your data
            is restricted to your account only, enforced by Firebase Security Rules.
          </p>
          <p className="mt-3 text-slate-300 leading-relaxed">
            Photos you upload are stored in Firebase Cloud Storage. Health records,
            care logs, and other structured data are stored in Firebase Firestore.
            We take reasonable technical and organizational measures to protect your
            information against unauthorized access, loss, or misuse.
          </p>
          <p className="mt-3 text-slate-300 leading-relaxed">
            While we work hard to protect your data, no method of electronic storage
            or transmission is 100% secure. We encourage you to use a strong password
            and to contact us immediately if you suspect unauthorized access to your account.
          </p>
        </Section>

        <Section title="4. Third-Party Services">
          <p className="text-slate-300 leading-relaxed">
            Paws &amp; Claws uses the following third-party services, each subject to
            their own privacy policies:
          </p>
          <div className="mt-4 space-y-3">
            {[
              { name: 'Google Firebase', purpose: 'Authentication, database, and file storage', url: 'firebase.google.com/support/privacy' },
              { name: 'Stripe', purpose: 'Payment processing for premium subscriptions', url: 'stripe.com/privacy' },
              { name: 'OneSignal', purpose: 'Push notification delivery', url: 'onesignal.com/privacy_policy' },
              { name: 'Google Maps / Places API', purpose: 'Vet and rescue location search', url: 'policies.google.com/privacy' },
            ].map((svc, i) => (
              <div key={i} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <p className="font-medium text-white">{svc.name}</p>
                <p className="text-sm text-slate-400 mt-1">{svc.purpose}</p>
                <p className="text-xs text-blue-400 mt-1">{svc.url}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="5. Data Retention">
          <p className="text-slate-300 leading-relaxed">
            We retain your data for as long as your account is active. If you delete
            your account, your personal information, pet profiles, health records, and
            care logs will be permanently deleted from our systems within 30 days.
            Anonymized, aggregated data may be retained for analytical purposes.
          </p>
          <p className="mt-3 text-slate-300 leading-relaxed">
            Community content such as forum posts may remain visible after account
            deletion in anonymized form unless you request removal before deleting
            your account.
          </p>
        </Section>

        <Section title="6. Your Rights and Choices">
          <p className="text-slate-300 leading-relaxed">You have the right to:</p>
          <ul className="mt-3 space-y-2 text-slate-300">
            {[
              'Access the personal information we hold about you',
              'Correct inaccurate or incomplete information in your account',
              'Delete your account and all associated data',
              'Opt out of push notifications at any time through your device settings or in-app notification preferences',
              'Request a copy of your data by contacting us',
            ].map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-slate-300 leading-relaxed">
            To delete your account, go to <strong className="text-white">Account → Delete Account</strong> within
            the App, or contact us at the email below.
          </p>
        </Section>

        <Section title="7. Children's Privacy">
          <p className="text-slate-300 leading-relaxed">
            Paws &amp; Claws is not directed to children under the age of 13. We do not
            knowingly collect personal information from children under 13. If you believe
            a child under 13 has provided us with personal information, please contact
            us and we will delete it promptly.
          </p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p className="text-slate-300 leading-relaxed">
            We may update this Privacy Policy from time to time. When we make significant
            changes, we will notify you through the App or by email. The "Last updated"
            date at the top of this page reflects when the policy was last revised.
            Continued use of the App after changes are posted constitutes your acceptance
            of the updated policy.
          </p>
        </Section>

        <Section title="9. Contact Us">
          <p className="text-slate-300 leading-relaxed">
            If you have questions, concerns, or requests regarding this Privacy Policy
            or how we handle your data, please contact us:
          </p>
          <div className="mt-4 bg-slate-900 rounded-lg p-4 border border-slate-800">
            <p className="font-medium text-white">Royalty Tech Labs</p>
            <p className="text-sm text-slate-400 mt-1">Developer of Paws &amp; Claws Companion</p>
            <p className="text-sm text-blue-400 mt-2">queen@royaltytechlabs.com</p>
          </div>
        </Section>

        <div className="pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            © 2026 Royalty Tech Labs. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
        {title}
      </h2>
      <div>{children}</div>
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-blue-400 mb-1">{title}</h3>
      <p className="text-slate-300 leading-relaxed text-sm">{children}</p>
    </div>
  );
}
