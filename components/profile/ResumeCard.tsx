"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactElement,
  type DragEvent,
} from "react";
import {
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Sparkles,
  Upload,
} from "lucide-react";
import { uploadResume } from "@/actions/profile";
import {
  profileExtractionResultSchema,
  resumeGenerationResultSchema,
  validateResume,
  type ProfileData,
} from "@/lib/profile";

export function ResumeCard({
  hasResume,
  hasUnsavedProfileChanges,
  onExtracted,
}: {
  hasResume: boolean;
  hasUnsavedProfileChanges: boolean;
  onExtracted: (profile: ProfileData) => void;
}): ReactElement {
  const input = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState(hasResume);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const [extracting, startExtraction] = useTransition();
  const [generating, startGeneration] = useTransition();
  const busy = useRef(false);
  const mounted = useRef(false);
  const hasStoredResume = uploaded || hasResume;
  useEffect(() => {
    mounted.current = true;
    return (): void => {
      mounted.current = false;
    };
  }, []);
  function upload(file?: File): void {
    if (!file || busy.current) return;
    busy.current = true;
    setError("");
    setMessage("");
    startTransition(async (): Promise<void> => {
      try {
        const invalid = await validateResume(file);
        if (!mounted.current) return;
        if (invalid) {
          setError(invalid);
          return;
        }
        const data = new FormData();
        data.set("resume", file);
        const result = await uploadResume(data);
        if (!mounted.current) return;
        if (!result.success) {
          setError(result.error ?? "Upload failed. Please try again.");
          return;
        }
        setUploaded(true);
        setMessage("Resume uploaded.");
      } catch {
        if (!mounted.current) return;
        setError("Upload interrupted. Please try again.");
      } finally {
        busy.current = false;
        if (input.current) input.current.value = "";
      }
    });
  }
  function generate(): void {
    if (hasUnsavedProfileChanges) {
      setError("Save your latest profile changes before generating a resume.");
      setMessage("");
      return;
    }
    setError("");
    setMessage("");
    startGeneration(async (): Promise<void> => {
      try {
        const response = await fetch("/api/resume/generate", {
          method: "POST",
        });
        const parsed = resumeGenerationResultSchema.safeParse(
          await response.json(),
        );
        if (!mounted.current) return;
        const result = parsed.success
          ? parsed.data
          : {
              success: false,
              error: "Resume generation failed. Please try again.",
            };
        if (!result.success) {
          setError(result.error ?? "Resume generation failed. Please try again.");
          return;
        }
        setUploaded(true);
        setMessage("Resume generated. You can view or download it now.");
      } catch {
        if (!mounted.current) return;
        setError("Resume generation interrupted. Please try again.");
      }
    });
  }
  function extract(): void {
    setError("");
    setMessage("");
    startExtraction(async (): Promise<void> => {
      try {
        const response = await fetch("/api/resume/extract", {
          method: "POST",
        });
        const parsed = profileExtractionResultSchema.safeParse(
          await response.json(),
        );
        if (!mounted.current) return;
        const result = parsed.success
          ? parsed.data
          : {
              success: false,
              error: "Extraction failed. Please try again.",
            };
        if (!result.success || !result.data) {
          setError(result.error ?? "Extraction failed. Please try again.");
          return;
        }
        onExtracted(result.data);
        setMessage("Profile details extracted. Review and save when ready.");
      } catch {
        if (!mounted.current) return;
        setError("Extraction interrupted. Please try again.");
      }
    });
  }
  function drop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length !== 1) {
      setError("Select one PDF at a time.");
      return;
    }
    upload(event.dataTransfer.files[0]);
  }
  return (
    <section
      aria-label="Resume"
      aria-busy={pending}
      className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
    >
      <h2 className="text-2xl font-bold leading-8 text-text-primary">Resume</h2>
      <div
        onDragOver={(event): void => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(): void => setDragging(false)}
        onDrop={drop}
        className={`mt-8 grid min-h-72 place-items-center rounded-xl border-2 border-dashed bg-surface-secondary px-6 py-10 text-center ${dragging ? "border-accent" : "border-border"}`}
      >
        <div className="grid min-w-0 justify-items-center">
          <span className="grid size-20 place-items-center rounded-full border border-border bg-surface shadow-sm">
            {pending ? (
              <LoaderCircle className="size-9 animate-spin text-accent" />
            ) : (
              <Upload className="size-9 text-accent" />
            )}
          </span>
          <p className="mt-8 text-xl font-bold leading-7 text-text-primary">
            {pending
              ? "Uploading resume..."
              : uploaded
                ? "Replace your resume"
                : "Click to upload or drag and drop"}
          </p>
          <p className="mt-2 text-base leading-6 text-text-secondary">
            PDF only. Maximum file size 5 MB.
          </p>
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Resume PDF"
            className="sr-only"
            tabIndex={-1}
            disabled={pending}
            onChange={(event): void => upload(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={pending}
            onClick={(): void => input.current?.click()}
            className="mt-8 min-h-12 rounded-md border border-border bg-surface px-6 text-base font-bold text-text-dark shadow-sm hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
          >
            Select Resume
          </button>
        </div>
      </div>
      {hasStoredResume ? (
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <a
            href="/api/resume/download?view=1"
            target="_blank"
            rel="noopener noreferrer"
            title="View resume in a new tab"
            className="inline-flex min-h-10 items-center gap-2 rounded-sm text-base font-semibold text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Eye className="size-5" />
            View resume
          </a>
          <a
            href="/api/resume/download"
            className="inline-flex min-h-10 items-center gap-2 rounded-sm text-base font-semibold text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Download className="size-5" />
            Download resume
          </a>
          <button
            type="button"
            disabled={extracting}
            onClick={extract}
            className="inline-flex min-h-10 items-center gap-2 rounded-sm text-base font-semibold text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
          >
            {extracting ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Sparkles className="size-5" />
            )}
            {extracting ? "Extracting..." : "Extract from Resume"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-error">
          {error}
        </p>
      ) : null}
      <p role="status" className="mt-2 text-sm text-success">
        {message}
      </p>
      <div className="mt-8 flex flex-col gap-5 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-medium leading-6 text-text-secondary">
          Need a fresh document?
        </p>
        <button
          type="button"
          disabled={generating}
          onClick={generate}
          title={
            hasUnsavedProfileChanges
              ? "Save your latest profile changes first"
              : "Generate resume from saved profile"
          }
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-accent px-6 py-3 text-base font-bold leading-6 text-accent-foreground shadow-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:opacity-60"
        >
          {generating ? (
            <LoaderCircle className="size-5 shrink-0 animate-spin" />
          ) : (
            <FileText className="size-5 shrink-0" />
          )}
          {generating ? "Generating..." : "Generate Resume from Profile"}
        </button>
      </div>
    </section>
  );
}
