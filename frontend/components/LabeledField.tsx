import React from "react";
import styles from "./console.module.css";

type LabeledFieldProps = {
  label: string;
  htmlFor?: string;
  helpText?: string;
  errorText?: string;
  children: React.ReactNode;
};

export function LabeledField({
  label,
  htmlFor,
  helpText,
  errorText,
  children
}: LabeledFieldProps) {
  return (
    <div className={styles.fieldBlock}>
      <label className={styles.fieldLabel} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {helpText && <p className={styles.helpText}>{helpText}</p>}
      {errorText && <p className={styles.errorText}>{errorText}</p>}
    </div>
  );
}
