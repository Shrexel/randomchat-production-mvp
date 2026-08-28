import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Terms of Service — RandomChat",
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      updated="28 August 2026"
    >
      <p>
        Welcome to RandomChat. These Terms of Service ("Terms") govern your
        access to and use of RandomChat's website and chat services (the
        "Service"). By using the Service, you agree to be bound by these
        Terms. If you do not agree, please do not use the Service.
      </p>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          1. Eligibility
        </h2>

        <p>
          You must be at least 18 years old to use RandomChat. By using the
          Service, you represent and confirm that you meet this age
          requirement. We do not knowingly allow anyone under 18 to use the
          Service, and we may terminate any account or session found to
          violate this rule without notice.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          2. Anonymous Use
        </h2>

        <p>
          RandomChat connects you with other users anonymously. You are not
          required to provide a name, email address, or other identifying
          information to use the Service. A random, non-identifying guest
          identifier is generated and stored in your browser to support
          matching, blocking, and moderation features.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          3. Prohibited Behavior
        </h2>

        <p>You agree that you will not use the Service to:</p>

        <ul className="list-disc ml-6 space-y-1 mt-2">
          <li>Harass, threaten, bully, or abuse another user;</li>
          <li>Share sexual content involving minors, or any content that
            sexualizes, exploits, or endangers a minor;</li>
          <li>Share sexually explicit content without the other person's
            consent, or solicit such content from others;</li>
          <li>Promote hatred or discrimination on the basis of race,
            ethnicity, religion, gender, sexual orientation, disability, or
            similar characteristics;</li>
          <li>Engage in spam, scams, phishing, or attempts to solicit
            money or financial information from other users;</li>
          <li>Share another person's private information without their
            consent ("doxxing");</li>
          <li>Use the Service for any activity that is illegal in your
            jurisdiction;</li>
          <li>Attempt to disrupt, overload, or gain unauthorized access to
            the Service or its infrastructure.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          4. No Guarantee of User Conduct
        </h2>

        <p>
          RandomChat connects you with random, unverified members of the
          public. We do not verify the identity, age, or intentions of any
          user, and we cannot guarantee the behavior or content shared by
          any user you are matched with. You interact with other users
          entirely at your own risk. You are solely responsible for the
          messages you send and the decisions you make while using the
          Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          5. Reporting and Blocking
        </h2>

        <p>
          RandomChat provides tools to block a user you are matched with, so
          you will not be matched with them again, and to report a user for
          violating these Terms or our Community Guidelines. Submitting a
          report ends your current chat and stores the report for review.
          Reports may result in restrictions on the reported user's access
          to the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          6. Termination
        </h2>

        <p>
          We may suspend or terminate your access to the Service at any
          time, without prior notice, if we believe you have violated these
          Terms, our Community Guidelines, or applicable law, or for any
          other reason we consider necessary to protect the Service or its
          users.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          7. Service Availability
        </h2>

        <p>
          RandomChat is provided on an "as is" and "as available" basis. We
          do not guarantee that the Service will be uninterrupted, secure,
          or error-free, and we may modify, suspend, or discontinue the
          Service, in whole or in part, at any time without liability to
          you.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          8. Limitation of Liability
        </h2>

        <p>
          To the fullest extent permitted by law, RandomChat and its
          operators shall not be liable for any indirect, incidental,
          special, or consequential damages arising from your use of, or
          inability to use, the Service, including damages resulting from
          the conduct of other users.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          9. Changes to These Terms
        </h2>

        <p>
          We may update these Terms from time to time. Continued use of the
          Service after changes take effect constitutes acceptance of the
          revised Terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          10. Contact
        </h2>

        <p>
          If you have questions about these Terms, please contact us
          through the details provided on our website.
        </p>
      </section>
    </LegalLayout>
  );
}
