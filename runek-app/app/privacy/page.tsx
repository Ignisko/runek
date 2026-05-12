export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>Privacy Policy</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Last updated: May 2026</p>
        
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>1. Information We Collect</h2>
          <p style={{ lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: 12 }}>
            Runek collects information that you provide directly to us, such as when you create an account or track job applications. This includes:
          </p>
          <ul style={{ lineHeight: 1.6, color: "var(--text-secondary)", paddingLeft: 20 }}>
            <li>Your email address and Google Profile information (if authenticated via Google).</li>
            <li>Job application data you choose to save (company names, roles, URLs, and notes).</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>2. How We Use Your Information</h2>
          <p style={{ lineHeight: 1.6, color: "var(--text-secondary)" }}>
            We use the information we collect to provide, maintain, and improve our services, as well as to sync your application data seamlessly across your devices using Google Firebase infrastructure. We use your data solely for the purpose of powering your personal dashboard.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>3. Data Security and Sharing</h2>
          <p style={{ lineHeight: 1.6, color: "var(--text-secondary)" }}>
            Your data is securely stored within Google Cloud Platform (Firebase). We do not sell, rent, or share your personal data with third-party advertisers or data brokers under any circumstances.
          </p>
        </section>

        <a href="/" style={{ color: "var(--blue-core)", textDecoration: "none", fontWeight: 600, display: "inline-block", marginTop: 24 }}>
          &larr; Back to Dashboard
        </a>
      </div>
    </div>
  );
}
