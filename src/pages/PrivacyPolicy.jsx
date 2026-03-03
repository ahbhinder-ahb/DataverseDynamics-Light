import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';

const PrivacyPolicy = () => {
  useSEO(seoMetadata["/privacy-policy"]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
          <p className="text-slate-700 mb-8">Last Updated: January 17, 2026</p>

          <div className="prose max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Introduction</h2>
              <p className="text-slate-700">
                At Dataverse Dynamics (Global), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data when you visit our website or use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Information We Collect</h2>
              <p className="text-slate-700 mb-4">We may collect the following types of information:</p>
              <ul className="list-disc pl-6 text-slate-700 space-y-2">
                <li>Personal Identification Information (Name, email address, phone number, etc.) provided voluntarily through our contact forms.</li>
                <li>Company Information provided during consultation requests.</li>
                <li>Technical Data (IP address, browser type, device information) collected automatically when you visit our site.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Use of Your Information</h2>
              <p className="text-slate-700 mb-4">We use the collected information for the following purposes:</p>
              <ul className="list-disc pl-6 text-slate-700 space-y-2">
                <li>To provide and maintain our services.</li>
                <li>To respond to your inquiries and consultation requests.</li>
                <li>To improve our website and user experience.</li>
                <li>To send administrative information, such as updates to our terms and policies.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Disclosure of Your Information</h2>
              <p className="text-slate-700">
                We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners, trusted affiliates, and advertisers for the purposes outlined above.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Security of Your Information</h2>
              <p className="text-slate-700">
                We adopt appropriate data collection, storage, and processing practices and security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information, username, password, transaction information, and data stored on our Site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Us</h2>
              <p className="text-slate-700">
                If you have any questions about this Privacy Policy, the practices of this site, or your dealings with this site, please contact us at: <br />
                <span className="text-blue-600">contact@dataversedynamics.org</span>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;