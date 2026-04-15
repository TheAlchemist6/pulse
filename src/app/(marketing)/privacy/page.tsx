import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Pulse",
  description: "Privacy Policy for Pulse - YouTube subscription manager",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>
        <p className="mb-4 text-sm text-muted-foreground">Last updated: April 15, 2026</p>
        
        <div className="prose prose-neutral dark:prose-invert">
          <h2>1. Information We Collect</h2>
          <p>
            Pulse collects information you provide directly to us, including:
          </p>
          <ul>
            <li>Your YouTube channel information (channel ID, name, avatar, subscriber count)</li>
            <li>Your YouTube subscriptions and viewing preferences</li>
            <li>Category assignments for your subscriptions</li>
            <li>Account settings and preferences</li>
          </ul>
          
          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide and maintain the Pulse service</li>
            <li>Sync and organize your YouTube subscriptions</li>
            <li>Generate insights about your viewing habits</li>
            <li>Improve and personalize your experience</li>
          </ul>
          
          <h2>3. Information Sharing</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to third parties. 
            Your data is used solely for providing the Pulse service.
          </p>
          
          <h2>4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information. 
            OAuth tokens are encrypted at rest.
          </p>
          
          <h2>5. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide services. 
            You may request deletion of your account and associated data at any time.
          </p>
          
          <h2>6. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data. Contact us at 
            privacy@pulse-app.io for any data-related requests.
          </p>
          
          <h2>7. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. No tracking or 
            advertising cookies are used.
          </p>
          
          <h2>8. Children's Privacy</h2>
          <p>
            Pulse is not intended for users under 13 years of age. We do not knowingly collect 
            information from children under 13.
          </p>
          
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes 
            by posting the new policy on this page and updating the "Last updated" date.
          </p>
          
          <h2>10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:<br />
            privacy@pulse-app.io
          </p>
        </div>
      </div>
    </div>
  );
}
