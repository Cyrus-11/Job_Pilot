import { z } from "zod";

const text = z
  .string()
  .trim()
  .max(200, "Use 200 characters or fewer.")
  .default("");
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a valid month.")
  .or(z.literal(""));
const link = z
  .string()
  .trim()
  .max(2048)
  .refine((value: string): boolean => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Enter an http or https URL.")
  .default("");
const tags = z
  .array(z.string().trim().min(1).max(100))
  .max(30)
  .transform((values: string[]): string[] =>
    values.filter(
      (value: string, index: number): boolean =>
        values.findIndex(
          (other: string): boolean =>
            other.toLowerCase() === value.toLowerCase(),
        ) === index,
    ),
  )
  .default([]);

export const workExperienceSchema = z
  .object({
    company: text,
    title: text,
    start_date: month.default(""),
    end_date: month.default(""),
    is_current: z.boolean().default(false),
    responsibilities: z.string().trim().max(5000).default(""),
  })
  .transform((role) => ({
    ...role,
    end_date: role.is_current ? "" : role.end_date,
  }))
  .refine(
    (role): boolean =>
      !role.start_date || !role.end_date || role.end_date >= role.start_date,
    { message: "End date must be after the start date.", path: ["end_date"] },
  );

export const profileSchema = z.object({
  full_name: text,
  email: z.string().trim().email().or(z.literal("")),
  phone: z.string().trim().max(40).default(""),
  location: text,
  linkedin_url: link,
  portfolio_url: link,
  work_authorization: z
    .enum(["", "citizen", "permanent_resident", "visa_required"])
    .default(""),
  current_title: text,
  experience_level: z.enum(["", "junior", "mid", "senior", "lead"]).default(""),
  years_experience: z.number().int().min(0).max(80).nullable().default(null),
  skills: tags,
  industries: tags,
  work_experience: z.array(workExperienceSchema).max(3).default([]),
  education: z
    .object({
      degree: text,
      field: text,
      institution: text,
      graduation_year: z
        .string()
        .regex(/^(19|20|21)\d{2}$/, "Enter a four-digit year.")
        .or(z.literal(""))
        .default(""),
    })
    .default({ degree: "", field: "", institution: "", graduation_year: "" }),
  job_titles_seeking: tags,
  remote_preference: z
    .enum(["", "remote", "onsite", "hybrid", "any"])
    .default(""),
  salary_expectation: text,
  preferred_locations: tags,
  cover_letter_tone: z
    .enum(["", "formal", "casual", "enthusiastic"])
    .default(""),
});

export type ProfileData = z.infer<typeof profileSchema>;
export type WorkExperience = z.infer<typeof workExperienceSchema>;
export type Completion = {
  is_complete: boolean;
  completion_percentage: number;
  missing_fields: string[];
};
export type ProfileActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  completion?: Completion;
  resumeUploaded?: boolean;
};
export type ProfileExtractionResult = {
  success: boolean;
  data?: ProfileData;
  error?: string;
};
export type ResumeGenerationResult = {
  success: boolean;
  data?: { resumeUrl: string };
  error?: string;
};

export const profileExtractionSchema = profileSchema.omit({ email: true });
export const profileExtractionResultSchema = z.object({
  success: z.boolean(),
  data: profileSchema.optional(),
  error: z.string().optional(),
});
export const resumeGenerationResultSchema = z.object({
  success: z.boolean(),
  data: z.object({ resumeUrl: z.string() }).optional(),
  error: z.string().optional(),
});

export function emptyProfile(email: string, name: string = ""): ProfileData {
  return profileSchema.parse({ email, full_name: name });
}

export function calculateCompletion(profile: ProfileData): Completion {
  const requirements: [string, boolean][] = [
    ["Full name", Boolean(profile.full_name.trim())],
    ["Email", Boolean(profile.email.trim())],
    ["Location", Boolean(profile.location.trim())],
    ["Current/recent job title", Boolean(profile.current_title.trim())],
    ["Experience level", Boolean(profile.experience_level)],
    ["Years of experience", profile.years_experience !== null],
    ["Skills", profile.skills.length > 0],
    ["Job titles seeking", profile.job_titles_seeking.length > 0],
    ["Remote preference", Boolean(profile.remote_preference)],
    ["Work authorization", Boolean(profile.work_authorization)],
  ];
  const missing_fields = requirements
    .filter(([, filled]): boolean => !filled)
    .map(([label]): string => label);
  return {
    missing_fields,
    is_complete: missing_fields.length === 0,
    completion_percentage: Math.round(
      ((requirements.length - missing_fields.length) / requirements.length) *
        100,
    ),
  };
}

export function profileFromRow(
  row: Record<string, unknown> | null,
  email: string,
  name: string = "",
): ProfileData {
  if (!row) return emptyProfile(email, name);
  const values = Object.fromEntries(
    Object.entries(row).filter(([, value]): boolean => value !== null),
  );
  return profileSchema.parse({ ...values, email });
}

export function profileToRow(profile: ProfileData): Record<string, unknown> {
  return {
    ...profile,
    experience_level: profile.experience_level || null,
    work_authorization: profile.work_authorization || null,
    remote_preference: profile.remote_preference || null,
    cover_letter_tone: profile.cover_letter_tone || null,
    ...calculateCompletion(profile),
  };
}

export const PROFILE_COLUMNS =
  "full_name,email,phone,location,linkedin_url,portfolio_url,work_authorization,current_title,experience_level,years_experience,skills,industries,work_experience,education,job_titles_seeking,remote_preference,salary_expectation,preferred_locations,cover_letter_tone,resume_pdf_key,is_complete,completion_percentage,missing_fields";
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export async function validateResume(file: unknown): Promise<string | null> {
  if (!(file instanceof File) || !file.size) return "Select a PDF to upload.";
  if (file.size > MAX_RESUME_BYTES) return "Your PDF must be 5 MB or smaller.";
  if (
    !file.name.toLowerCase().endsWith(".pdf") ||
    (file.type && file.type !== "application/pdf")
  )
    return "Please select a PDF file.";
  const signature = new TextDecoder().decode(
    await file.slice(0, 5).arrayBuffer(),
  );
  return signature === "%PDF-" ? null : "This file is not a valid PDF.";
}
