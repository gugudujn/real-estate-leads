import "dotenv/config";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

const leadAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string" },
    location: { type: "string" },
    budget: { type: "string" },
    timeline: { type: "string" },
    property_type: { type: "string" },
    financing_status: { type: "string" },
    intent: { type: "string" },
    summary: { type: "string" },
    follow_up_message: { type: "string" },
  },
  required: [
    "type",
    "location",
    "budget",
    "timeline",
    "property_type",
    "financing_status",
    "intent",
    "summary",
    "follow_up_message",
  ],
};

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function maskEmail(value) {
  const normalized = normalizeString(value);
  if (!normalized.includes("@")) return normalized;

  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain) return normalized;

  const visible = localPart.slice(0, 2);
  return `${visible}***@${domain}`;
}

function maskPhone(value) {
  const normalized = normalizeString(value);
  if (!normalized) return "";

  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***-***-${digits.slice(-4)}`;
}

function sanitizeLeadPayloadForLogs(leadPayload) {
  return {
    ...leadPayload,
    email: maskEmail(leadPayload?.email),
    phone: maskPhone(leadPayload?.phone),
  };
}

function normalizeIntent(value) {
  const normalized = normalizeString(value).toLowerCase();

  if (normalized === "hot") return "Hot";
  if (normalized === "warm") return "Warm";
  if (normalized === "cold") return "Cold";
  return "Cold";
}

function buildFallbackFollowUpMessage(leadPayload, summary, type) {
  const name = normalizeString(leadPayload?.name);
  const normalizedType = normalizeString(type).toLowerCase();
  const safeSummary = normalizeString(summary);

  if (safeSummary && name) {
    return `Hi ${name}, thanks for reaching out. Based on what you shared, I can help with the next step and follow up with a plan tailored to your goals.`;
  }

  if (normalizedType) {
    return `Thanks for reaching out. I can help with your ${normalizedType} plans and follow up with clear next steps.`;
  }

  return "";
}

function buildFallbackAnalysis(leadPayload) {
  return {
    type: normalizeString(leadPayload.type || leadPayload.leadType),
    location: normalizeString(leadPayload.location),
    budget: normalizeString(leadPayload.budget || leadPayload.propertyValue),
    timeline: normalizeString(leadPayload.timeline),
    property_type: normalizeString(
      leadPayload.property_type || leadPayload.propertyType,
    ),
    financing_status: normalizeString(
      leadPayload.financing_status || leadPayload.financingStatus,
    ),
    intent: "Cold",
    summary: "",
    follow_up_message: "",
  };
}

function stripJsonCodeFences(value) {
  const normalized = normalizeString(value);
  if (!normalized.startsWith("```")) return normalized;

  return normalized
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function getOutputText(responseJson) {
  if (typeof responseJson?.output_text === "string" && responseJson.output_text) {
    return responseJson.output_text;
  }

  if (!Array.isArray(responseJson?.output)) {
    return "";
  }

  const chunks = [];

  for (const item of responseJson.output) {
    if (!Array.isArray(item?.content)) continue;

    for (const content of item.content) {
      if (typeof content?.text === "string" && content.text) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function parseOpenAIResponseText(outputText) {
  const cleaned = stripJsonCodeFences(outputText);
  return JSON.parse(cleaned);
}

function sanitizeAnalysis(rawAnalysis, leadPayload) {
  const fallback = buildFallbackAnalysis(leadPayload);
  const type = normalizeString(rawAnalysis?.type) || fallback.type;
  const location = normalizeString(rawAnalysis?.location) || fallback.location;
  const budget = normalizeString(rawAnalysis?.budget) || fallback.budget;
  const timeline = normalizeString(rawAnalysis?.timeline) || fallback.timeline;
  const propertyType =
    normalizeString(rawAnalysis?.property_type) || fallback.property_type;
  const financingStatus =
    normalizeString(rawAnalysis?.financing_status) || fallback.financing_status;
  const summary = normalizeString(rawAnalysis?.summary);
  const followUpMessage =
    normalizeString(rawAnalysis?.follow_up_message) ||
    buildFallbackFollowUpMessage(leadPayload, summary, type);

  return {
    type,
    location,
    budget,
    timeline,
    property_type: propertyType,
    financing_status: financingStatus,
    intent: normalizeIntent(rawAnalysis?.intent),
    summary,
    follow_up_message: String(followUpMessage || ""),
  };
}

export async function analyzeLeadWithOpenAI(
  leadPayload,
  submissionPath = "unknown",
) {
  const fallback = buildFallbackAnalysis(leadPayload);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  const sanitizedLeadPayload = sanitizeLeadPayloadForLogs(leadPayload);

  console.log(`[lead-analysis] submission path: ${submissionPath}`);
  console.log("[lead-analysis] sanitized lead payload:", sanitizedLeadPayload);
  console.log(`[lead-analysis] OpenAI model: ${model}`);
  console.log(`[lead-analysis] OPENAI_API_KEY exists: ${Boolean(apiKey)}`);

  if (!apiKey) {
    console.error(
      `[lead-analysis] ${submissionPath} missing OPENAI_API_KEY; using fallback analysis.`,
    );
    console.log("[lead-analysis] normalized analysis:", fallback);

    return {
      ok: false,
      analysis: fallback,
      error: "missing_openai_api_key",
    };
  }

  const requestBody = {
    model,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text:
              'Return strict JSON only with exactly these lowercase keys: {"type":"","location":"","budget":"","timeline":"","property_type":"","financing_status":"","intent":"","summary":"","follow_up_message":""}. Do not include markdown, code fences, or any text before or after the JSON. intent must be exactly one of Hot, Warm, or Cold. follow_up_message must be a friendly professional message to the lead.',
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              submission_path: submissionPath,
              lead: leadPayload,
            }),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "lead_analysis",
        strict: true,
        schema: leadAnalysisSchema,
      },
    },
  };

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[lead-analysis] ${submissionPath} OpenAI request failed with status ${response.status}.`,
      );
      console.error(errorText.slice(0, 500));
      console.log("[lead-analysis] normalized analysis:", fallback);

      return {
        ok: false,
        analysis: fallback,
        error: `openai_http_${response.status}`,
      };
    }

    const responseJson = await response.json();
    const outputText = getOutputText(responseJson);

    console.log("[lead-analysis] raw OpenAI response text:", outputText);

    if (!outputText) {
      console.error(
        `[lead-analysis] ${submissionPath} OpenAI returned no output text.`,
      );
      console.log("[lead-analysis] normalized analysis:", fallback);

      return {
        ok: false,
        analysis: fallback,
        error: "openai_empty_output",
      };
    }

    const parsed = parseOpenAIResponseText(outputText);
    console.log("[lead-analysis] parsed OpenAI JSON:", parsed);

    const analysis = sanitizeAnalysis(parsed, leadPayload);
    console.log("[lead-analysis] normalized analysis:", {
      type: analysis.type,
      summary: analysis.summary,
      intent: analysis.intent,
      follow_up_message: analysis.follow_up_message,
    });

    return {
      ok: true,
      analysis,
      error: "",
    };
  } catch (error) {
    console.error(
      `[lead-analysis] ${submissionPath} OpenAI analysis failed; using fallback analysis.`,
    );
    console.error(error instanceof Error ? error.message : String(error));
    console.log("[lead-analysis] normalized analysis:", fallback);

    return {
      ok: false,
      analysis: fallback,
      error: "openai_exception",
    };
  }
}
