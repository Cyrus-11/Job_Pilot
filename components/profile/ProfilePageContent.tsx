"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactElement,
} from "react";
import { LoaderCircle, Plus, Save, Trash2 } from "lucide-react";

import { saveProfile } from "@/actions/profile";
import {
  calculateCompletion,
  type ProfileData,
  type ProfileActionResult,
  type WorkExperience,
} from "@/lib/profile";
import { ProfileCompletion } from "@/components/profile/ProfileCompletion";
import { ProfileField } from "@/components/profile/ProfileField";
import { ProfileTags } from "@/components/profile/ProfileTags";
import { ResumeCard } from "@/components/profile/ResumeCard";

type Props = { initialProfile: ProfileData; hasResume: boolean };
const authorization = [
  ["citizen", "Citizen"],
  ["permanent_resident", "Permanent resident"],
  ["visa_required", "Visa required"],
] as const;
const levels = [
  ["junior", "Junior"],
  ["mid", "Mid-level"],
  ["senior", "Senior"],
  ["lead", "Lead"],
] as const;
const remote = [
  ["any", "Any"],
  ["remote", "Remote"],
  ["onsite", "On-site"],
  ["hybrid", "Hybrid"],
] as const;
const degrees = [
  ["High School", "High School"],
  ["Associate", "Associate"],
  ["Bachelor", "Bachelor"],
  ["Master", "Master"],
  ["Doctorate", "Doctorate"],
  ["Other", "Other"],
] as const;

export function ProfilePageContent({
  initialProfile,
  hasResume,
}: Props): ReactElement {
  const [profile, setProfile] = useState(initialProfile);
  const [completion, setCompletion] = useState(
    calculateCompletion(initialProfile),
  );
  const [result, setResult] = useState<ProfileActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [titles, setTitles] = useState(
    initialProfile.job_titles_seeking.join(", "),
  );
  const [locations, setLocations] = useState(
    initialProfile.preferred_locations.join(", "),
  );
  const [dirty, setDirty] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return (): void => {
      mounted.current = false;
    };
  }, []);

  function change<K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K],
  ): void {
    setProfile((previous: ProfileData): ProfileData => ({
      ...previous,
      [key]: value,
    }));
    setDirty(true);
    setResult(null);
  }
  function applyExtracted(extracted: ProfileData): void {
    setProfile((previous: ProfileData): ProfileData => ({
      ...extracted,
      email: previous.email,
    }));
    setTitles(extracted.job_titles_seeking.join(", "));
    setLocations(extracted.preferred_locations.join(", "));
    setDirty(true);
    setResult(null);
  }
  function editRole(index: number, patch: Partial<WorkExperience>): void {
    change(
      "work_experience",
      profile.work_experience.map(
        (role: WorkExperience, position: number): WorkExperience =>
          position === index ? { ...role, ...patch } : role,
      ),
    );
  }
  function field(
    key: keyof ProfileData,
    label: string,
    options?: readonly (readonly [string, string])[],
    type: string = "text",
    placeholder?: string,
  ): ReactElement {
    return (
      <ProfileField
        name={key}
        label={label}
        value={String(profile[key] ?? "")}
        options={options}
        type={type}
        placeholder={placeholder}
        disabled={key === "email"}
        error={result?.fieldErrors?.[key]}
        onChange={(value: string): void =>
          change(
            key,
            key === "years_experience"
              ? value === ""
                ? null
                : Number(value)
              : value,
          )
        }
      />
    );
  }
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setResult(null);
    const split = (value: string): string[] =>
      value
        .split(",")
        .map((item: string): string => item.trim())
        .filter(Boolean);
    const values = {
      ...profile,
      job_titles_seeking: split(titles),
      preferred_locations: split(locations),
    };
    startTransition(async (): Promise<void> => {
      try {
        const saved = await saveProfile(values);
        if (!mounted.current) return;
        setResult(saved);
        if (saved.success && saved.completion) {
          setCompletion(saved.completion);
          setDirty(false);
        }
        if (saved.fieldErrors)
          document.getElementById(Object.keys(saved.fieldErrors)[0])?.focus();
      } catch {
        if (!mounted.current) return;
        setResult({
          success: false,
          error:
            "Save interrupted. Your edits are still here. Please try again.",
        });
      }
    });
  }
  return (
    <div className="mx-auto w-full max-w-[936px] space-y-8">
      <ProfileCompletion completion={completion} />
      <ResumeCard
        hasResume={hasResume}
        hasUnsavedProfileChanges={dirty}
        onExtracted={applyExtracted}
      />
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold leading-8 text-text-primary">
          Profile Information
        </h2>
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="mt-8 border-t border-border pt-12"
        >
          <fieldset disabled={pending} className="min-w-0 space-y-12">
            <section>
              <h2 className="mb-8 text-xl font-bold text-text-primary">
                Personal Info
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                {field("full_name", "Full Name")}
                {field("email", "Email")}
                {field(
                  "phone",
                  "Phone Number (Optional)",
                  undefined,
                  "tel",
                  "+1 (555) 000-0000",
                )}
                {field(
                  "location",
                  "Location",
                  undefined,
                  "text",
                  "City, Country",
                )}
                {field(
                  "linkedin_url",
                  "LinkedIn URL (Optional)",
                  undefined,
                  "url",
                )}
                {field(
                  "portfolio_url",
                  "Portfolio / GitHub (Optional)",
                  undefined,
                  "url",
                )}
                {field(
                  "work_authorization",
                  "Work Authorization",
                  authorization,
                )}
              </div>
            </section>
            <section className="border-t border-border pt-12">
              <h2 className="mb-8 text-xl font-bold text-text-primary">
                Professional Info
              </h2>
              <div className="grid gap-6">
                {field("current_title", "Current/Recent Job Title")}
                <div className="grid gap-6 md:grid-cols-2">
                  {field("experience_level", "Experience Level", levels)}
                  {field(
                    "years_experience",
                    "Years of Experience",
                    undefined,
                    "number",
                  )}
                </div>
                <ProfileTags
                  name="skills"
                  label="Skills"
                  values={profile.skills}
                  onChange={(values: string[]): void =>
                    change("skills", values)
                  }
                  error={result?.fieldErrors?.skills}
                />
                <ProfileTags
                  name="industries"
                  label="Industries Worked In (Optional)"
                  values={profile.industries}
                  onChange={(values: string[]): void =>
                    change("industries", values)
                  }
                  error={result?.fieldErrors?.industries}
                />
              </div>
            </section>
            <section className="border-t border-border pt-12">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-text-primary">
                  Work Experience
                </h2>
                <button
                  type="button"
                  disabled={profile.work_experience.length >= 3}
                  onClick={(): void =>
                    change("work_experience", [
                      ...profile.work_experience,
                      {
                        company: "",
                        title: "",
                        start_date: "",
                        end_date: "",
                        is_current: false,
                        responsibilities: "",
                      },
                    ])
                  }
                  className="inline-flex min-h-10 items-center gap-2 rounded-sm font-bold text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
                >
                  <Plus className="size-4" />
                  Add role
                </button>
              </div>
              {profile.work_experience.length === 0 ? (
                <p className="text-base text-text-muted">
                  No work experience added.
                </p>
              ) : null}
              <div className="space-y-8">
                {profile.work_experience.map(
                  (role: WorkExperience, index: number): ReactElement => (
                    <div
                      key={index}
                      className="border-l-2 border-border pl-4 sm:pl-6"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="font-semibold text-text-primary">
                          Role {index + 1}
                        </h3>
                        <button
                          type="button"
                          title={`Remove role ${index + 1}`}
                          aria-label={`Remove role ${index + 1}`}
                          onClick={(): void =>
                            change(
                              "work_experience",
                              profile.work_experience.filter(
                                (_, position: number): boolean =>
                                  position !== index,
                              ),
                            )
                          }
                          className="grid size-10 place-items-center rounded-md text-text-secondary hover:bg-surface-secondary hover:text-error focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      </div>
                      <div className="grid gap-6 md:grid-cols-2">
                        <ProfileField
                          name={`work_experience.${index}.company`}
                          label="Company Name"
                          value={role.company}
                          onChange={(value: string): void =>
                            editRole(index, { company: value })
                          }
                          error={
                            result?.fieldErrors?.[
                              `work_experience.${index}.company`
                            ]
                          }
                        />
                        <ProfileField
                          name={`work_experience.${index}.title`}
                          label="Job Title"
                          value={role.title}
                          onChange={(value: string): void =>
                            editRole(index, { title: value })
                          }
                          error={
                            result?.fieldErrors?.[
                              `work_experience.${index}.title`
                            ]
                          }
                        />
                        <ProfileField
                          name={`work_experience.${index}.start_date`}
                          label="Start Date"
                          type="month"
                          value={role.start_date}
                          onChange={(value: string): void =>
                            editRole(index, { start_date: value })
                          }
                          error={
                            result?.fieldErrors?.[
                              `work_experience.${index}.start_date`
                            ]
                          }
                        />
                        <ProfileField
                          name={`work_experience.${index}.end_date`}
                          label="End Date"
                          type="month"
                          value={role.is_current ? "" : role.end_date}
                          disabled={role.is_current}
                          onChange={(value: string): void =>
                            editRole(index, { end_date: value })
                          }
                          error={
                            result?.fieldErrors?.[
                              `work_experience.${index}.end_date`
                            ]
                          }
                        />
                      </div>
                      <label className="my-5 inline-flex items-center gap-2 text-sm font-semibold text-text-dark">
                        <input
                          type="checkbox"
                          checked={role.is_current}
                          onChange={(event): void =>
                            editRole(index, {
                              is_current: event.target.checked,
                              end_date: event.target.checked
                                ? ""
                                : role.end_date,
                            })
                          }
                          className="size-4 accent-accent"
                        />
                        Currently working here
                      </label>
                      <ProfileField
                        name={`work_experience.${index}.responsibilities`}
                        label="Key Responsibilities"
                        value={role.responsibilities}
                        onChange={(value: string): void =>
                          editRole(index, { responsibilities: value })
                        }
                        multiline
                        error={
                          result?.fieldErrors?.[
                            `work_experience.${index}.responsibilities`
                          ]
                        }
                      />
                    </div>
                  ),
                )}
              </div>
            </section>
            <section className="border-t border-border pt-12">
              <h2 className="mb-8 text-xl font-bold text-text-primary">
                Education (Optional)
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                {(
                  [
                    ["degree", "Highest Degree"],
                    ["field", "Field of Study"],
                    ["institution", "Institution Name"],
                    ["graduation_year", "Graduation Year"],
                  ] as const
                ).map(([key, label]): ReactElement => (
                  <ProfileField
                    key={key}
                    name={`education.${key}`}
                    label={label}
                    value={profile.education[key]}
                    options={key === "degree" ? degrees : undefined}
                    onChange={(value: string): void =>
                      change("education", {
                        ...profile.education,
                        [key]: value,
                      })
                    }
                    error={result?.fieldErrors?.[`education.${key}`]}
                  />
                ))}
              </div>
            </section>
            <section className="border-t border-border pt-12">
              <h2 className="mb-8 text-xl font-bold text-text-primary">
                Job Preferences
              </h2>
              <div className="grid gap-6">
                <ProfileField
                  name="job_titles_seeking"
                  label="Job Titles Seeking"
                  value={titles}
                  placeholder="Frontend Engineer, React Developer"
                  onChange={(value: string): void => {
                    setTitles(value);
                    setDirty(true);
                    setResult(null);
                  }}
                  error={result?.fieldErrors?.job_titles_seeking}
                />
                <div className="grid gap-6 md:grid-cols-2">
                  {field("remote_preference", "Remote Preference", remote)}
                  {field(
                    "salary_expectation",
                    "Salary Expectation (Optional)",
                    undefined,
                    "text",
                    "E.g. $120k+",
                  )}
                </div>
                <ProfileField
                  name="preferred_locations"
                  label="Preferred Locations (Optional)"
                  value={locations}
                  placeholder="New York, London"
                  onChange={(value: string): void => {
                    setLocations(value);
                    setDirty(true);
                    setResult(null);
                  }}
                  error={result?.fieldErrors?.preferred_locations}
                />
              </div>
            </section>
            <div className="border-t border-border pt-8">
              {result?.error ? (
                <p
                  role="alert"
                  className="mb-4 rounded-md border border-error px-3 py-2 text-sm text-error"
                >
                  {result.error}
                </p>
              ) : null}
              <p role="status" className="mb-4 text-sm text-text-secondary">
                {result?.success
                  ? "Profile saved."
                  : dirty
                    ? "Unsaved changes"
                    : ""}
              </p>
              <button
                type="submit"
                className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-accent px-6 py-3 text-base font-bold text-accent-foreground shadow-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:opacity-60"
              >
                {pending ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <Save className="size-5" />
                )}
                {pending ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </div>
  );
}
