import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Privacy Policy — RandomChat",
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="28 August 2026"
    >
      <p>
        This Privacy Policy explains what information RandomChat collects,
        how it is used, and how it is protected. RandomChat is designed to
        be used anonymously, and we intentionally collect as little
        information as possible.
      </p>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          1. Anonymous Guest Identifier
        </h2>

        <p>
          When you first visit RandomChat, a random identifier (a "guest
          ID") is generated in your browser and stored using your browser's
          local storage. This identifier is not linked to your name, email
          address, or any other personal information. It is used to:
        </p>

        <ul className="list-disc ml-6 space-y-1 mt-2">
          <li>Match you with other users for chat;</li>
          <li>Remember users you have blocked, so you are not matched
            with them again;</li>
          <li>Associate reports you submit, or reports submitted about
            you, with an account for moderation purposes.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          2. Local Storage and Cookies
        </h2>

        <p>
          RandomChat uses your browser's local storage to remember your
          guest ID and your theme preference (light or dark mode) between
          visits. We do not use advertising or third-party tracking
          cookies.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          3. Chat Messages
        </h2>

        <p>
          Messages you send during a chat are relayed directly between you
          and the stranger you are matched with, for the purpose of that
          conversation. We do not store the content of chat messages in our
          database.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          4. Reports and Blocks
        </h2>

        <p>
          When you submit a report, we store the reporting guest ID, the
          reported guest ID, the reason selected, and any additional
          details you choose to provide. When you block another user, we
          store a record linking the two guest IDs so that you are not
          matched with each other again. This data is used solely for
          moderation and safety purposes.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          5. Network and IP Information
        </h2>

        <p>
          Like any website, our hosting and infrastructure providers
          process technical information such as your IP address as part of
          normal network operation. We use approximate location
          information, derived from your IP address, to power optional
          features such as country-based matching. We do not store your
          IP address or precise location in our own database.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          6. Data Storage and Third-Party Providers
        </h2>

        <p>
          Guest identifiers, blocks, and reports are stored in a managed
          PostgreSQL database operated by a third-party hosting provider.
          Our application servers are also hosted with third-party
          infrastructure providers. These providers may process technical
          data (such as connection metadata) as part of delivering their
          hosting services to us, under their own privacy and security
          practices.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          7. How We Protect Your Data
        </h2>

        <p>
          We limit the data we collect to what is necessary for matching,
          blocking, and moderation. Database connections use encrypted
          connections, and access to moderation data (reports and blocks)
          is restricted. However, no method of electronic storage or
          transmission is completely secure, and we cannot guarantee
          absolute security.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          8. Children's Privacy
        </h2>

        <p>
          RandomChat is not intended for use by anyone under 18 years of
          age, and we do not knowingly collect information from minors.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          9. Changes to This Policy
        </h2>

        <p>
          We may update this Privacy Policy from time to time. Continued
          use of the Service after changes take effect constitutes
          acceptance of the revised policy.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          10. Contact
        </h2>

        <p>
          If you have questions about this Privacy Policy, please contact
          us through the details provided on our website.
        </p>
      </section>
    </LegalLayout>
  );
}
