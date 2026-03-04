import styles from "./console.module.css";

type StatusMetricProps = {
  label: string;
  value: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
};

export function StatusMetric({
  label,
  value,
  variant = "default"
}: StatusMetricProps) {
  return (
    <div className={`${styles.metricCard} ${styles[`metric_${variant}`]}`}>
      <dt className={styles.metricLabel}>{label}</dt>
      <dd className={styles.metricValue}>{value}</dd>
    </div>
  );
}
