import { HealthDisclaimer } from '../../../components/disclaimer/HealthDisclaimer';

export const metadata = {
  title: 'DMCA Takedown Requests',
  description: 'DMCA contact and 48-hour response SLA.',
};

export default function DmcaPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold font-[family-name:var(--font-newsreader)] mb-4">
        DMCA Takedown Requests
      </h1>
      <p className="text-base leading-relaxed mb-4">
        We respect the rights of content creators. If you believe content on this site infringes
        your copyright, please contact us.
      </p>
      <ul className="text-base leading-relaxed mb-6 space-y-2">
        <li>
          <strong>Email:</strong> dmca@&lt;chosen-domain&gt; (alias delivered via project email —
          final domain set pre-launch)
        </li>
        <li>
          <strong>Response SLA:</strong> 48 hours from receipt during business days.
        </li>
      </ul>
      <h2 className="text-lg font-semibold font-[family-name:var(--font-newsreader)] mb-2">
        Required information
      </h2>
      <ul className="text-base leading-relaxed list-disc ml-6 space-y-1 mb-6">
        <li>Identification of the copyrighted work.</li>
        <li>Identification of the URL(s) of the allegedly infringing content.</li>
        <li>Your contact information.</li>
        <li>A statement of good-faith belief.</li>
        <li>A statement of accuracy under penalty of perjury.</li>
        <li>Your physical or electronic signature.</li>
      </ul>
      <p className="text-sm text-[color:var(--color-ink-3)] mb-8">
        Counter-notice procedure: see 17 U.S.C. § 512(g).
      </p>
      <HealthDisclaimer variant="page" />
    </main>
  );
}
