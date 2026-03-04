import styles from "./console.module.css";

type ApiKeyPanelProps = {
  apiConfigured: boolean;
};

export function ApiKeyPanel({ apiConfigured }: ApiKeyPanelProps) {
  return (
    <section className={styles.card}>
      <h2>Connection</h2>
      {apiConfigured ? (
        <p className={styles.successText} role="status">
          Secure API access is configured for this session.
        </p>
      ) : (
        <p className={styles.errorText} role="alert">
          API key is missing. Set <code>NEXT_PUBLIC_API_KEY</code> in{" "}
          <code>frontend/.env.local</code>.
        </p>
      )}
    </section>
  );
}
