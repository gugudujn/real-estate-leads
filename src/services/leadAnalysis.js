const LEAD_ANALYSIS_ENDPOINT = "/api/analyze-lead";

const emptyAnalysis = {
  type: "",
  location: "",
  budget: "",
  timeline: "",
  property_type: "",
  financing_status: "",
  intent: "",
  summary: "",
  follow_up_message: "",
};

export async function requestLeadAnalysis(leadPayload, submissionPath) {
  try {
    const response = await fetch(LEAD_ANALYSIS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leadPayload,
        submissionPath,
      }),
    });

    if (!response.ok) {
      throw new Error(`Lead analysis request failed with ${response.status}`);
    }

    const result = await response.json();

    return {
      ok: Boolean(result?.ok),
      analysis: {
        ...emptyAnalysis,
        ...(result?.analysis || {}),
      },
      error: result?.error || "",
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[lead-analysis] Client helper fallback", error);
    }

    return {
      ok: false,
      analysis: emptyAnalysis,
      error: "lead_analysis_unavailable",
    };
  }
}
