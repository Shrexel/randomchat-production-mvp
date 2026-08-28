import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Community Guidelines — RandomChat",
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalLayout
      title="Community Guidelines"
      updated="28 August 2026"
    >
      <p>
        RandomChat connects you with strangers from around the world. These
        guidelines exist to keep that experience safe and respectful for
        everyone. Violating these guidelines may result in being blocked
        by other users, reported, or restricted from the Service.
      </p>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          You must be 18 or older
        </h2>

        <p>
          RandomChat is an adult platform. You must be at least 18 years
          old to use it, and you may not use it to interact with anyone you
          know or believe to be a minor.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          Be respectful
        </h2>

        <p>
          Treat the person you're chatting with the way you'd want to be
          treated. Disagreements happen, but insults, threats, and
          deliberate cruelty are not welcome here.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          No harassment or bullying
        </h2>

        <p>
          Do not repeatedly target, intimidate, or demean another user. If
          someone asks you to stop a conversation or a behavior, respect
          that.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          No sexual exploitation
        </h2>

        <p>
          Content that sexualizes minors is never allowed, under any
          circumstance, and will be reported to the relevant authorities.
          Sharing sexually explicit content with someone who hasn't
          consented to it, or pressuring someone into sexual conversation,
          is also prohibited.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          No illegal activity
        </h2>

        <p>
          Do not use RandomChat to plan, promote, or engage in any activity
          that is illegal in your jurisdiction.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          No hate speech
        </h2>

        <p>
          Content that attacks or demeans people based on race, ethnicity,
          nationality, religion, gender, sexual orientation, or disability
          is not tolerated.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          No spam or scams
        </h2>

        <p>
          Do not use RandomChat to advertise products or services, spread
          links to unrelated websites, or attempt to solicit money,
          cryptocurrency, gift cards, or financial information from other
          users.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          Don't share private information
        </h2>

        <p>
          Do not ask for, share, or publish another person's private
          information — including their real name, address, phone number,
          or social media accounts — without their consent.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          Use the tools available to you
        </h2>

        <p>
          If a chat makes you uncomfortable, you can click <strong>Next</strong>{" "}
          to leave at any time, <strong>Block</strong> a user so you're never
          matched with them again, or <strong>Report</strong> a user so our
          team can review their behavior.
        </p>
      </section>
    </LegalLayout>
  );
}
