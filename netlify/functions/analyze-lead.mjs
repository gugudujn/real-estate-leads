import { analyzeLeadWithOpenAI } from "../../server/analyzeLead.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "method_not_allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const leadPayload = body.leadPayload || {};
    const submissionPath = body.submissionPath || "unknown";

    console.log(
      `[lead-analysis] Netlify function invoked for submission path "${submissionPath}".`,
    );

    const result = await analyzeLeadWithOpenAI(leadPayload, submissionPath);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("[lead-analysis] Invalid function request body.");
    console.error(error instanceof Error ? error.message : String(error));

    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "invalid_request_body",
        analysis: {
          type: "",
          location: "",
          budget: "",
          timeline: "",
          property_type: "",
          financing_status: "",
          intent: "",
          summary: "",
          follow_up_message: "",
        },
      }),
    };
  }
}
