"use client";

import { useState, type ReactElement, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

type Props = {
  name: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
};

export function ProfileTags({
  name,
  label,
  values,
  onChange,
  error,
}: Props): ReactElement {
  const [draft, setDraft] = useState("");
  function add(): void {
    const value = draft.trim();
    if (!value || values.length >= 30) return;
    if (
      !values.some(
        (existing: string): boolean =>
          existing.toLowerCase() === value.toLowerCase(),
      )
    )
      onChange([...values, value]);
    setDraft("");
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    }
  }
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-bold uppercase leading-4 text-text-secondary"
      >
        {label}
      </label>
      <div className="flex gap-3">
        <input
          id={name}
          value={draft}
          maxLength={100}
          onChange={(event): void => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          placeholder={values.length >= 30 ? "Maximum 30 items" : "Add an item"}
          disabled={values.length >= 30}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className="min-h-12 min-w-0 flex-1 rounded-md border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || values.length >= 30}
          aria-label={`Add to ${label}`}
          title={`Add to ${label}`}
          className="grid size-12 shrink-0 place-items-center rounded-md bg-surface-secondary text-text-dark hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
        >
          <Plus className="size-5" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {values.map((value: string): ReactElement => (
          <span
            key={value}
            className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-md border border-border bg-surface-secondary py-1 pl-3 pr-1 text-base font-semibold text-text-primary"
          >
            <span className="min-w-0 break-words">{value}</span>
            <button
              type="button"
              onClick={(): void =>
                onChange(
                  values.filter((item: string): boolean => item !== value),
                )
              }
              aria-label={`Remove ${value}`}
              title={`Remove ${value}`}
              className="grid size-8 shrink-0 place-items-center rounded-sm text-text-secondary hover:text-error focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X className="size-4" />
            </button>
          </span>
        ))}
      </div>
      {error ? (
        <p id={`${name}-error`} className="mt-2 text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
