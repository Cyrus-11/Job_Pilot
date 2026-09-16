import type { ReactElement } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import type { Completion } from "@/lib/profile";

export function ProfileCompletion({
  completion,
}: {
  completion: Completion;
}): ReactElement {
  const complete = completion.is_complete;
  return (
    <section
      aria-label="Profile completion"
      className={`rounded-xl border bg-surface p-6 shadow-sm sm:p-8 ${complete ? "border-success/20" : "border-error/20"}`}
    >
      <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            {complete ? (
              <CircleCheck className="size-6 shrink-0 text-success" />
            ) : (
              <CircleAlert className="size-6 shrink-0 text-error" />
            )}
            <h1 className="text-2xl font-bold leading-8 text-text-primary">
              {complete ? "Profile complete" : "Profile needs attention"}
            </h1>
          </div>
          <p className="text-base font-medium leading-7 text-text-dark">
            {complete
              ? "You're ready to find your next opportunity."
              : "Complete your profile for more relevant job matches."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {completion.missing_fields.map((field: string): ReactElement => (
              <span
                key={field}
                className="rounded-sm bg-error/5 px-3 py-2 text-sm font-bold uppercase text-error"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
        <div
          role="progressbar"
          aria-label="Saved profile completion"
          aria-valuenow={completion.completion_percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative grid size-40 place-items-center justify-self-center"
        >
          <svg
            aria-hidden="true"
            className={`absolute inset-0 size-40 -rotate-90 ${complete ? "text-success" : "text-error"}`}
            viewBox="0 0 120 120"
          >
            <circle
              className="text-border"
              cx="60"
              cy="60"
              r="47"
              pathLength="100"
              stroke="currentColor"
              strokeWidth="14"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r="47"
              pathLength="100"
              stroke="currentColor"
              strokeWidth="14"
              fill="none"
              strokeLinecap={
                completion.completion_percentage ? "round" : "butt"
              }
              strokeDasharray={`${completion.completion_percentage} 100`}
            />
          </svg>
          <span className="text-4xl font-bold text-text-primary">
            {completion.completion_percentage}%
          </span>
        </div>
      </div>
    </section>
  );
}
