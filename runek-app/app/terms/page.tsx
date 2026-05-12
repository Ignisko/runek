export default function TermsOfService() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>Terms of Service</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Last updated: May 2026</p>
        
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>1. Acceptance of Terms</h2>
          <p style={{ lineHeight: 1.6, color: "var(--text-secondary)" }}>
            By accessing or using the Runek service ("the App"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>2. Description of Service</h2>
          <p style={{ lineHeight: 1.6, color: "var(--text-secondary)" }}>
            Runek is a personal career tracking tool that allows users to track job applications. The service is provided "as is" and "as available" without warranties of any kind, either express or implied.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>3. User Responsibilities</h2>
          <p style={{ lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: 12 }}>
            You are solely responsible for:
          </p>
          <ul style={{ lineHeight: 1.6, color: "var(--text-secondary)", paddingLeft: 20 }}>
            <li>Maintaining the confidentiality of your account credentials.</li>
            <li>All activities that occur under your account.</li>
            <li>Ensuring that the data you input does not violate the intellectual property rights of third parties.</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>4. Termination</h2>
          <p style={{ lineHeight: 1.6, color: "var(--text-secondary)" }}>
            We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
        </section>

        <a href="/" style={{ color: "var(--blue-core)", textDecoration: "none", fontWeight: 600, display: "inline-block", marginTop: 24 }}>
          &larr; Back to Dashboard
        </a>
      </div>
    </div>
  );
}
