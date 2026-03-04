import styles from "./console.module.css";

export type ToastItem = {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
};

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className={styles.toastStack} aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${
            toast.kind === "success"
              ? styles.toastSuccess
              : toast.kind === "error"
                ? styles.toastError
                : styles.toastInfo
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
