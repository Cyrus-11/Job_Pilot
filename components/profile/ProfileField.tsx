import type { ChangeEvent, ReactElement } from "react";

type Props = {
  label: string;
  name: string;
  value: string;
  onChange?: (value: string) => void;
  options?: readonly (readonly [string, string])[];
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  multiline?: boolean;
};

export function ProfileField({
  label,
  name,
  value,
  onChange,
  options,
  type = "text",
  placeholder,
  disabled,
  error,
  multiline,
}: Props): ReactElement {
  const common = {
    id: name,
    name,
    value,
    disabled,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${name}-error` : undefined,
    onChange: (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ): void => onChange?.(event.target.value),
    className:
      "min-h-12 min-w-0 w-full rounded-md border border-border bg-surface px-4 py-3 text-base font-medium leading-6 text-text-primary shadow-sm placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-surface-secondary disabled:text-text-muted",
  };
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-bold uppercase leading-4 text-text-secondary"
      >
        {label}
      </label>
      {options ? (
        <select {...common}>
          <option value="">Select</option>
          {options.map(([key, text]): ReactElement => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea {...common} rows={4} maxLength={5000} />
      ) : (
        <input
          {...common}
          type={type}
          placeholder={placeholder}
          min={type === "number" ? 0 : undefined}
          max={type === "number" ? 80 : undefined}
          maxLength={type === "url" ? 2048 : 200}
        />
      )}
      {error ? (
        <p id={`${name}-error`} className="mt-2 text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
