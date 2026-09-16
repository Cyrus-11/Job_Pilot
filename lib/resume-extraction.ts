import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { z } from "zod";

import {
  profileExtractionSchema,
  profileSchema,
  type ProfileData,
} from "@/lib/profile";

const MIN_EXTRACTED_TEXT_LENGTH = 120;
const MAX_PROMPT_TEXT_LENGTH = 24000;
const wrappedProfileSchema = z.object({ profile: z.unknown() });

type OpenAIMessage = {
  content?: string | null;
};
type OpenAIChoice = {
  message?: OpenAIMessage;
};
type OpenAIResponse = {
  choices?: OpenAIChoice[];
};
type ChatCompletionsClient = {
  create(input: {
    model: string;
    response_format: { type: "json_object" };
    temperature: number;
    max_tokens: number;
    messages: { role: "system" | "user"; content: string }[];
  }): Promise<OpenAIResponse>;
};
type OpenAIClient = {
  chat: {
    completions: ChatCompletionsClient;
  };
};

const systemPrompt = `You extract candidate profile data from resume text for JobPilot.
Return ONLY valid JSON matching this exact shape:
{
  "full_name": string,
  "phone": string,
  "location": string,
  "linkedin_url": string,
  "portfolio_url": string,
  "work_authorization": "" | "citizen" | "permanent_resident" | "visa_required",
  "current_title": string,
  "experience_level": "" | "junior" | "mid" | "senior" | "lead",
  "years_experience": number | null,
  "skills": string[],
  "industries": string[],
  "work_experience": [{"company": string, "title": string, "start_date": "YYYY-MM" | "", "end_date": "YYYY-MM" | "", "is_current": boolean, "responsibilities": string}],
  "education": {"degree": string, "field": string, "institution": string, "graduation_year": string},
  "job_titles_seeking": string[],
  "remote_preference": "" | "remote" | "onsite" | "hybrid" | "any",
  "salary_expectation": string,
  "preferred_locations": string[],
  "cover_letter_tone": "" | "formal" | "casual" | "enthusiastic"
}
Rules:
- Use only information present in the resume. Leave unknown strings empty, arrays empty, and years_experience null.
- Normalize dates to YYYY-MM when possible. If a date is only a year, use January of that year.
- Include at most 3 work_experience entries, most recent first.
- Put responsibilities for each role in one readable string, separated by semicolons if needed.
- Do not include email. The app uses the authenticated account email.`;

function createOpenAIClient(): OpenAIClient {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function normalizeModelPayload(value: unknown, email: string): ProfileData {
  const wrapped = wrappedProfileSchema.safeParse(value);
  const candidate = wrapped.success ? wrapped.data.profile : value;
  const extracted = profileExtractionSchema.parse(candidate);
  return profileSchema.parse({ ...extracted, email });
}

export async function extractPdfText(file: Blob): Promise<string> {
  const parser = new PDFParse({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  try {
    const result = await parser.getText();
    return result.text.replace(/\s+/g, " ").trim();
  } finally {
    await parser.destroy();
  }
}

export function assertResumeTextUsable(text: string): void {
  if (text.length < MIN_EXTRACTED_TEXT_LENGTH)
    throw new Error("RESUME_TEXT_TOO_SHORT");
}

export async function extractProfileFromResumeText(
  text: string,
  email: string,
  client: OpenAIClient = createOpenAIClient(),
): Promise<ProfileData> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 800,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Resume text:\n${text.slice(0, MAX_PROMPT_TEXT_LENGTH)}`,
      },
    ],
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("EMPTY_OPENAI_RESPONSE");
  return normalizeModelPayload(JSON.parse(content), email);
}
