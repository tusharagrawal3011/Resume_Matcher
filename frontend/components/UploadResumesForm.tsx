import { ChangeEvent, FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { LabeledField } from "./LabeledField";
import styles from "./console.module.css";
import { UploadSubmitPayload, UploadSubmitResult } from "./types";

type UploadResumesFormProps = {
  disabled: boolean;
  loading: boolean;
  onSubmit: (payload: UploadSubmitPayload) => Promise<UploadSubmitResult>;
  onQueued: (result: UploadSubmitResult) => void;
};

const MAX_RESUMES_PER_UPLOAD = 50;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadResumesForm({
  disabled,
  loading,
  onSubmit,
  onQueued
}: UploadResumesFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [roleType, setRoleType] = useState("backend");
  const [yearsOfExperience, setYearsOfExperience] = useState(3);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(["Node.js", "Redis", "MongoDB"]);
  const [error, setError] = useState<string | null>(null);
  const [fileSelectionWarning, setFileSelectionWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const yearsError =
    Number.isFinite(yearsOfExperience) && yearsOfExperience >= 0 && yearsOfExperience <= 50
      ? null
      : "Enter a value between 0 and 50.";

  const canSubmit =
    !disabled && !loading && files.length > 0 && roleType.trim().length > 0 && !yearsError;

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    if (selected.length === 0) {
      return;
    }

    const pdfFiles = selected.filter((file) => file.type === "application/pdf");
    let ignoredByLimit = 0;

    setFiles((previous) => {
      const merged = [...previous];

      for (const file of pdfFiles) {
        const alreadyExists = merged.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        );
        if (alreadyExists) continue;

        if (merged.length >= MAX_RESUMES_PER_UPLOAD) {
          ignoredByLimit += 1;
          continue;
        }
        merged.push(file);
      }

      return merged;
    });

    const skippedByType = selected.length - pdfFiles.length;
    if (skippedByType > 0 && ignoredByLimit > 0) {
      setFileSelectionWarning(
        `${skippedByType} non-PDF file(s) and ${ignoredByLimit} extra file(s) were skipped.`
      );
    } else if (skippedByType > 0) {
      setFileSelectionWarning(`${skippedByType} non-PDF file(s) were skipped.`);
    } else if (ignoredByLimit > 0) {
      setFileSelectionWarning(
        `Upload limit reached (${MAX_RESUMES_PER_UPLOAD}). Extra files were skipped.`
      );
    } else {
      setFileSelectionWarning(null);
    }

    event.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  }

  function clearAllFiles() {
    if (files.length === 0) return;
    if (!window.confirm("Clear all selected resume files?")) return;
    setFiles([]);
  }

  function addSkill(raw: string) {
    const normalized = raw.trim();
    if (!normalized) return;
    if (skills.includes(normalized)) return;
    setSkills((prev) => [...prev, normalized]);
  }

  function onSkillsKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkill(skillInput);
      setSkillInput("");
    }
    if (event.key === "Backspace" && !skillInput && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError("Please complete required fields before queueing upload.");
      return;
    }

    try {
      const result = await onSubmit({
        files,
        form: {
          roleType,
          yearsOfExperience: clamp(yearsOfExperience, 0, 50),
          skills
        }
      });
      onQueued(result);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Upload failed.";
      setError(message);
    }
  }

  return (
    <section className={styles.card}>
      <h2>Upload Resumes</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <LabeledField
          label="Resume Files (PDF)"
          htmlFor="resume-files"
          helpText={`Choose one or more resumes. Max ${MAX_RESUMES_PER_UPLOAD} files per upload.`}
          errorText={!files.length ? "At least one PDF is required." : undefined}
        >
          <div className={styles.filePickerRow}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={triggerFilePicker}
              disabled={disabled || loading || files.length >= MAX_RESUMES_PER_UPLOAD}
            >
              {files.length >= MAX_RESUMES_PER_UPLOAD ? "Limit reached" : "Choose resumes"}
            </button>
            <span className={styles.filePickerMeta}>
              {files.length}/{MAX_RESUMES_PER_UPLOAD} selected
            </span>
          </div>
          <input
            id="resume-files"
            ref={fileInputRef}
            className={styles.fileInputHidden}
            type="file"
            multiple
            accept="application/pdf"
            onChange={onFileChange}
            disabled={disabled || loading}
          />
        </LabeledField>
        {fileSelectionWarning && <p className={styles.errorText}>{fileSelectionWarning}</p>}

        {files.length > 0 && (
          <div className={styles.filePanel}>
            <div className={styles.filePanelHeader}>
              <p>
                {files.length} file(s), {formatBytes(totalSize)}
              </p>
              <button type="button" className={styles.ghostButton} onClick={clearAllFiles}>
                Clear all
              </button>
            </div>
            <ul className={styles.fileList}>
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className={styles.fileRow}>
                  <span>
                    {file.name} <small>({formatBytes(file.size)})</small>
                  </span>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.twoCol}>
          <LabeledField
            label="Role Type"
            htmlFor="role-type"
            helpText="Candidate role focus for this upload."
            errorText={!roleType.trim() ? "Role type is required." : undefined}
          >
            <select
              id="role-type"
              className={styles.select}
              value={roleType}
              onChange={(event) => setRoleType(event.target.value)}
              disabled={disabled || loading}
            >
              <option value="backend">Backend</option>
              <option value="frontend">Frontend</option>
              <option value="fullstack">Fullstack</option>
              <option value="data">Data</option>
              <option value="devops">DevOps</option>
            </select>
          </LabeledField>

          <LabeledField
            label="Years of Experience"
            htmlFor="years-of-experience"
            helpText="Minimum experience required for this role."
            errorText={yearsError ?? undefined}
          >
            <input
              id="years-of-experience"
              className={styles.input}
              type="number"
              min={0}
              max={50}
              value={yearsOfExperience}
              onChange={(event) => setYearsOfExperience(clamp(Number(event.target.value), 0, 50))}
              disabled={disabled || loading}
            />
          </LabeledField>
        </div>

        <LabeledField
          label="Skills"
          htmlFor="skills-input"
          helpText="Press Enter or comma to add skill tags."
          errorText={skills.length === 0 ? "Add at least one skill." : undefined}
        >
          <div className={styles.skillInputWrap}>
            {skills.map((skill) => (
              <span key={skill} className={styles.skillChip}>
                {skill}
                <button
                  type="button"
                  aria-label={`Remove ${skill}`}
                  onClick={() => setSkills((prev) => prev.filter((item) => item !== skill))}
                >
                  x
                </button>
              </span>
            ))}
            <input
              id="skills-input"
              className={styles.skillInput}
              value={skillInput}
              onChange={(event) => setSkillInput(event.target.value)}
              onKeyDown={onSkillsKeyDown}
              placeholder="Type skill and press Enter"
              disabled={disabled || loading}
            />
          </div>
        </LabeledField>

        {error && <p className={styles.errorText}>{error}</p>}

        <button className={styles.primaryButton} type="submit" disabled={!canSubmit}>
          {loading ? "Queueing upload..." : "Queue Ingestion Job"}
        </button>
      </form>
    </section>
  );
}
