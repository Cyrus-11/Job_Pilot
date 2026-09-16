import OpenAI from "openai";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { z } from "zod";

import type { ProfileData, WorkExperience } from "@/lib/profile";

const MAX_PROFILE_PROMPT_LENGTH = 18000;

const generatedWorkSchema = z.object({
  company: z.string().trim().max(200),
  title: z.string().trim().max(200),
  start_date: z.string().trim().max(20).default(""),
  end_date: z.string().trim().max(20).default(""),
  is_current: z.boolean().default(false),
  bullets: z.array(z.string().trim().min(1).max(220)).max(5).default([]),
});

export const generatedResumeSchema = z.object({
  headline: z.string().trim().min(1).max(140),
  professional_summary: z.string().trim().min(1).max(700),
  skills: z.array(z.string().trim().min(1).max(80)).max(18).default([]),
  work_experience: z.array(generatedWorkSchema).max(3).default([]),
});

export type GeneratedResume = z.infer<typeof generatedResumeSchema>;

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

const styles = StyleSheet.create({
  page: {
    padding: 34,
    fontFamily: "Helvetica",
    color: "black",
    fontSize: 10,
    lineHeight: 1.35,
  },
  header: {
    marginBottom: 14,
    textAlign: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headline: {
    fontSize: 11,
    marginBottom: 5,
  },
  contact: {
    fontSize: 9,
    color: "dimgray",
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  text: {
    fontSize: 10,
  },
  muted: {
    color: "dimgray",
  },
  role: {
    marginBottom: 7,
  },
  roleTitle: {
    fontSize: 10,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bullet: {
    width: 10,
  },
  bulletText: {
    flexGrow: 1,
  },
});

function createOpenAIClient(): OpenAIClient {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function clean(values: string[]): string[] {
  return values
    .map((value: string): string => value.trim())
    .filter(Boolean)
    .slice(0, 18);
}

function formatDateRange(role: Pick<WorkExperience, "start_date" | "end_date" | "is_current">): string {
  const start = role.start_date || "";
  const end = role.is_current ? "Present" : role.end_date || "";
  return [start, end].filter(Boolean).join(" - ");
}

function contactLine(profile: ProfileData): string {
  return clean([
    profile.email,
    profile.phone,
    profile.location,
    profile.linkedin_url,
    profile.portfolio_url,
  ]).join(" | ");
}

function normalizeModelPayload(value: unknown, profile: ProfileData): GeneratedResume {
  const parsed = generatedResumeSchema.parse(value);
  return {
    headline: parsed.headline || profile.current_title || "Professional Resume",
    professional_summary: parsed.professional_summary,
    skills: parsed.skills.length > 0 ? parsed.skills : profile.skills,
    work_experience:
      parsed.work_experience.length > 0
        ? parsed.work_experience
        : profile.work_experience.map((role: WorkExperience) => ({
            company: role.company,
            title: role.title,
            start_date: role.start_date,
            end_date: role.end_date,
            is_current: role.is_current,
            bullets: role.responsibilities
              .split(";")
              .map((item: string): string => item.trim())
              .filter(Boolean)
              .slice(0, 5),
          })),
  };
}

export async function generateResumeContent(
  profile: ProfileData,
  client: OpenAIClient = createOpenAIClient(),
): Promise<GeneratedResume> {
  const systemPrompt = `You create concise professional resume content for JobPilot.
Return ONLY valid JSON matching this exact shape:
{
  "headline": string,
  "professional_summary": string,
  "skills": string[],
  "work_experience": [{"company": string, "title": string, "start_date": string, "end_date": string, "is_current": boolean, "bullets": string[]}]
}
Rules:
- Use only the candidate profile provided. Do not invent employers, dates, degrees, skills, certifications, metrics, or tools.
- Keep the summary to 2-3 polished sentences.
- Rewrite each role into 3-5 strong resume bullets using concrete action verbs.
- Preserve the role order, company names, titles, dates, and current-role status.
- Keep language professional, direct, and truthful.`;
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 1000,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Candidate profile JSON:\n${JSON.stringify(profile).slice(
          0,
          MAX_PROFILE_PROMPT_LENGTH,
        )}`,
      },
    ],
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("EMPTY_OPENAI_RESPONSE");
  return normalizeModelPayload(JSON.parse(content), profile);
}

function ResumePdf({
  profile,
  resume,
}: {
  profile: ProfileData;
  resume: GeneratedResume;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{profile.full_name || "Resume"}</Text>
          <Text style={styles.headline}>{resume.headline}</Text>
          <Text style={styles.contact}>{contactLine(profile)}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Summary</Text>
          <Text style={styles.text}>{resume.professional_summary}</Text>
        </View>
        {resume.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.text}>{clean(resume.skills).join(" | ")}</Text>
          </View>
        ) : null}
        {resume.work_experience.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {resume.work_experience.map((role, index) => (
              <View key={`${role.company}-${role.title}-${index}`} style={styles.role}>
                <View style={styles.row}>
                  <Text style={styles.roleTitle}>
                    {role.title}
                    {role.company ? `, ${role.company}` : ""}
                  </Text>
                  <Text style={styles.muted}>{formatDateRange(role)}</Text>
                </View>
                {role.bullets.map((bullet, bulletIndex) => (
                  <View key={`${bullet}-${bulletIndex}`} style={styles.bulletRow}>
                    <Text style={styles.bullet}>-</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}
        {profile.education.degree ||
        profile.education.field ||
        profile.education.institution ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            <Text style={styles.text}>
              {clean([
                [profile.education.degree, profile.education.field]
                  .filter(Boolean)
                  .join(", "),
                profile.education.institution,
                profile.education.graduation_year,
              ]).join(" | ")}
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderResumePdfBuffer(
  profile: ProfileData,
  resume: GeneratedResume,
): Promise<Buffer> {
  return renderToBuffer(<ResumePdf profile={profile} resume={resume} />);
}
