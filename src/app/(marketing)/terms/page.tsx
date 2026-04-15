import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Pulse",
  description: "Terms of Service for Pulse - YouTube subscription manager",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>
        <p className="mb-4 text-sm text-muted-foreground">Last updated: April 15, 2026</p>
        
        <div className="prose prose-neutral dark:prose-invert">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Pulse, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use the service.
          </p>
          
          <h2>2. Description of Service</h2>
          <p>
            Pulse is a YouTube subscription management and organization service. The service 
            provides tools for categorizing, analyzing, and organizing your YouTube subscriptions.
          </p>
          
          <h2>3. User Accounts</h2>
          <p>
            To use Pulse, you must sign in with your Google account, which will provide us with 
            access to your YouTube subscription data. You are responsible for maintaining the 
            confidentiality of your account and for all activities that occur under your account.
          </p>
          
          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any part of the service</li>
            <li>Interfere with or disrupt the service or servers</li>
            <li>Use automated systems to access the service without permission</li>
            <li>Resell or commercially exploit the service</li>
          </ul>
          
          <h2>5. Intellectual Property</h2>
          <p>
            The service and its original content, features, and functionality are owned by Pulse 
            and are protected by international copyright, trademark, and other intellectual 
            property laws.
          </p>
          
          <h2>6. User Content</h2>
          <p>
            You retain ownership of any data you provide to Pulse. By using the service, you 
            grant us a limited license to use your content solely for providing and improving 
            the service.
          </p>
          
          <h2>7. Third-Party Services</h2>
          <p>
            Pulse uses YouTube API services. Your use of Pulse is also subject to YouTube's 
            Terms of Service and Privacy Policy.
          </p>
          
          <h2>8. Termination</h2>
          <p>
            We may terminate or suspend your access to the service immediately, without prior 
            notice, for any reason, including breach of these Terms of Service.
          </p>
          
          <h2>9. Limitation of Liability</h2>
          <p>
            In no event shall Pulse be liable for any indirect, incidental, special, consequential, 
            or punitive damages resulting from your use or inability to use the service.
          </p>
          
          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of 
            significant changes by posting a notice on our website.
          </p>
          
          <h2>11. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the 
            United States, without regard to its conflict of law provisions.
          </p>
          
          <h2>12. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:<br />
            legal@pulse-app.io
          </p>
        </div>
      </div>
    </div>
  );
}
