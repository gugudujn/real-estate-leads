import React, { useEffect, useMemo, useRef, useState } from "react";
import { House, MapPinned, PhoneCall } from "lucide-react";
import heroImage from "./assets/hero.png";
import agentPhoto from "./assets/abdul.JPG";
import { agentProfile } from "./config/agentProfile";
import { requestLeadAnalysis } from "./services/leadAnalysis";

const WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/27287146/ujq273d/";

const buyerBudgetOptions = [
  "Under $250k",
  "$250k - $400k",
  "$400k - $600k",
  "$600k - $900k",
  "$900k+",
];

const sellerValueOptions = [
  "Under $300k",
  "$300k - $500k",
  "$500k - $750k",
  "$750k - $1M",
  "$1M+",
];

const timelineOptions = [
  "0-30 days",
  "1-3 months",
  "3-6 months",
  "Just exploring",
];

const buyerPropertyOptions = [
  "Single-family",
  "Condo",
  "Townhome",
  "Land",
  "Investment property",
];

const sellerPropertyOptions = [
  "Single-family",
  "Condo",
  "Townhome",
  "Land",
  "Multi-family",
];

const financingOptions = [
  "Pre-approved",
  "Cash buyer",
  "Need financing",
  "Not sure yet",
];

const quickFormTimelineOptions = [
  "0–30 days",
  "1-3 months",
  "3-6 months",
  "Just browsing",
];

const quickFormPropertyTypeOptions = [
  "Single-family home",
  "Condo",
  "Townhouse",
  "Land",
  "Investment property",
  "Other",
];

const quickFormTestLeads = [
  {
    name: "Seller Lead One",
    email: "sellerleadone@example.com",
    phone: "904-555-0198",
    leadType: "Selling",
    location: "St. Johns, FL 32259",
    budget: "$650k estimated value",
    timeline: "0–30 days",
    propertyType: "Single-family home",
    notes:
      "I am thinking about selling in the next 60 days and want pricing guidance plus a smart strategy for listing.",
  },
  {
    name: "Buyer Lead One",
    email: "buyerleadone@example.com",
    phone: "904-555-0144",
    leadType: "Buying",
    location: "Jacksonville, FL",
    budget: "$450k–$550k",
    timeline: "1-3 months",
    propertyType: "Single-family home",
    notes:
      "We are looking for a family home near good schools and want to understand what we can afford before starting tours.",
  },
  {
    name: "Investor Lead One",
    email: "investorleadone@example.com",
    phone: "904-555-0182",
    leadType: "Buying",
    location: "St. Augustine, FL",
    budget: "$300k–$450k",
    timeline: "3-6 months",
    propertyType: "Investment property",
    notes:
      "I am exploring a rental or short-term rental investment and would like help comparing neighborhoods and expected returns.",
  },
  {
    name: "Condo Seller Lead",
    email: "condoseller@example.com",
    phone: "904-555-0127",
    leadType: "Selling",
    location: "St. Augustine Beach, FL",
    budget: "$525k estimated value",
    timeline: "1-3 months",
    propertyType: "Condo",
    notes:
      "I own a condo near the beach and may sell this year if pricing is strong. I would like a market estimate and selling plan.",
  },
  {
    name: "Browsing Buyer Lead",
    email: "browsingbuyer@example.com",
    phone: "904-555-0166",
    leadType: "Buying",
    location: "Nocatee, FL",
    budget: "$600k–$750k",
    timeline: "Just browsing",
    propertyType: "Townhouse",
    notes:
      "We are casually exploring options and want to learn what is available in Nocatee before making a decision.",
  },
];

function getIntentLevel(timeline) {
  if (timeline === "0-30 days") return "Hot";
  if (timeline === "1-3 months") return "Warm";
  return "Cold";
}

function buildSummary(data) {
  const role = data.leadType || "Unknown";
  const location = data.location || "unknown area";
  const timeline = data.timeline || "unclear timeline";
  const propertyType = data.propertyType || "unspecified property";
  const price = data.budget || data.propertyValue || "no price shared";

  if (role === "Buyer") {
    return `${data.name || "Lead"} is a buyer looking in ${location} for a ${propertyType.toLowerCase()} around ${price} with a ${timeline.toLowerCase()} timeline.`;
  }

  if (role === "Seller") {
    return `${data.name || "Lead"} is a seller in ${location} with a ${propertyType.toLowerCase()} estimated around ${price} and a ${timeline.toLowerCase()} timeline.`;
  }

  return `${data.name || "Lead"} submitted a real estate inquiry in ${location} with ${timeline.toLowerCase()} timing.`;
}

function generateFollowUp(data) {
  if (data.leadType === "Buyer") {
    return `Hi ${data.name || "there"}, thanks for reaching out. I’d be happy to help with your home search in ${data.location || "your target area"}. I can send you a few strong options and next steps. What’s the best time for a quick call?`;
  }

  if (data.leadType === "Seller") {
    return `Hi ${data.name || "there"}, thanks for reaching out. I’d be glad to help with your property in ${data.location || "your area"}. I can put together a quick pricing and selling strategy overview. What’s the best time for a quick call?`;
  }

  return `Hi ${data.name || "there"}, thanks for reaching out. I’d be happy to learn more about your real estate goals and help with next steps. What’s the best time for a quick call?`;
}

function normalizeDisplayValue(key, value) {
  if (key === "leadType" && value === "Unknown") return "Just exploring";
  return value;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getFieldError(key, rawValue) {
  const value = (rawValue || "").trim();

  if (key === "name" && !value) {
    return "Please enter your name.";
  }

  if (key === "email") {
    if (!value) return "Please enter your email.";
    if (!isValidEmail(value)) return "Please enter a valid email address.";
  }

  return "";
}

function mergeLeadPayloadWithAnalysis(basePayload, analysis) {
  const intent = (analysis?.intent || "").trim();
  const summary = (analysis?.summary || "").trim();
  const followUpMessage = String(analysis?.follow_up_message || "").trim();
  const normalizedType = (analysis?.type || basePayload.type || "").trim();
  const normalizedLocation = (analysis?.location || basePayload.location || "").trim();
  const normalizedBudget = (analysis?.budget || basePayload.budget || "").trim();
  const normalizedTimeline = (analysis?.timeline || basePayload.timeline || "").trim();
  const normalizedPropertyType = (
    analysis?.property_type ||
    basePayload.property_type ||
    basePayload.propertyType ||
    ""
  ).trim();
  const normalizedFinancingStatus = (
    analysis?.financing_status ||
    basePayload.financing_status ||
    basePayload.financingStatus ||
    ""
  ).trim();

  return {
    ...basePayload,
    type: normalizedType,
    location: normalizedLocation,
    budget: normalizedBudget,
    timeline: normalizedTimeline,
    propertyType: normalizedPropertyType,
    property_type: normalizedPropertyType,
    financingStatus: normalizedFinancingStatus,
    financing_status: normalizedFinancingStatus,
    intent,
    Intent: intent,
    summary,
    Summary: summary,
    follow_up_message: followUpMessage,
    "Follow Up Message": followUpMessage,
  };
}

function App() {
  const agentName = agentProfile?.name || "Your Name";
  const agentTitle = agentProfile?.title || "Real Estate Advisor";
  const agentPhone = agentProfile?.phone || "XXX-XXX-XXXX";
  const agentEmail = agentProfile?.email || "your@email.com";
  const agentHeadline =
    agentProfile?.headline ||
    "Talk to a Local Expert Who Understands Your Market";
  const agentDescription =
    agentProfile?.description ||
    "Get clear guidance from a local expert who understands your market, timing, and next steps.";
  const agentCtaText = agentProfile?.ctaText || "Get Your Plan";
  const agentTrustLine =
    agentProfile?.trustLine || "Local insights • Fast response • No pressure";
  const agentPhotoAlt = agentProfile?.photoAlt || agentName;

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const messagesEndRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  const [backupForm, setBackupForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    leadType: "",
    budget: "",
    timeline: "",
    propertyType: "",
    notes: "",
  });
  const [backupSubmitting, setBackupSubmitting] = useState(false);
  const [backupSubmitted, setBackupSubmitted] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [backupFieldErrors, setBackupFieldErrors] = useState({});
  const [testLeadIndex, setTestLeadIndex] = useState(0);
  const [assistantFieldError, setAssistantFieldError] = useState("");

  const [data, setData] = useState({
    leadType: "",
    location: "",
    budget: "",
    propertyValue: "",
    timeline: "",
    propertyType: "",
    financingStatus: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
    intent: "",
    summary: "",
    followUpMessage: "",
    source: "Website Floating Assistant",
    pageUrl: window.location.href,
    submittedAt: "",
  });

  const steps = useMemo(() => {
    const list = [
      {
        key: "leadType",
        prompt: "Hi — are you looking to buy, sell, or just explore right now?",
        helper: "Choose the option that best fits where you are today.",
        quickReplies: ["Buyer", "Seller", "Just exploring"],
        placeholder: "Buyer, Seller, or Just exploring",
      },
      {
        key: "location",
        prompt: "Which area are you most interested in?",
        helper: "A city, neighborhood, or ZIP code is perfect.",
        placeholder: "Jacksonville, St. Augustine, 32256...",
      },
      {
        key: data.leadType === "Seller" ? "propertyValue" : "budget",
        prompt:
          data.leadType === "Seller"
            ? "What do you think the property might be worth?"
            : "What price range feels comfortable for you?",
        helper: "A range is perfectly fine.",
        quickReplies:
          data.leadType === "Seller" ? sellerValueOptions : buyerBudgetOptions,
        placeholder:
          data.leadType === "Seller" ? "Estimated value" : "Budget range",
      },
      {
        key: "timeline",
        prompt: "How soon are you hoping to make a move?",
        helper: "This helps me guide you toward the right next step.",
        quickReplies: timelineOptions,
        placeholder: "0-30 days, 1-3 months, 3-6 months...",
      },
      {
        key: "propertyType",
        prompt: "What type of property are you focused on?",
        helper: "Choose the closest fit.",
        quickReplies:
          data.leadType === "Seller"
            ? sellerPropertyOptions
            : buyerPropertyOptions,
        placeholder: "Single-family, Condo, Townhome...",
      },
    ];

    if (data.leadType === "Buyer") {
      list.push({
        key: "financingStatus",
        prompt: "How are you thinking about financing?",
        helper: "No pressure — this just helps with next steps.",
        quickReplies: financingOptions,
        placeholder: "Pre-approved, Cash buyer, Need financing...",
      });
    }

    list.push(
      {
        key: "name",
        prompt: "What’s the best name to use for follow-up?",
        helper: "I’ll use this when I reach back out.",
        placeholder: "Your name",
      },
      {
        key: "email",
        prompt: "What’s the best email for sending next steps?",
        helper: "I’ll send options, guidance, or strategy notes there.",
        placeholder: "you@example.com",
      },
      {
        key: "phone",
        prompt:
          "What’s the best phone number if a quick call or text makes sense?",
        helper: "Optional, but helpful for a faster response.",
        placeholder: "Phone number",
        optional: true,
      },
      {
        key: "notes",
        prompt: "Anything else you’d like me to know?",
        helper: "Optional — goals, questions, timing, must-haves, or concerns.",
        placeholder: "Anything else you'd like me to know",
        optional: true,
      },
    );

    return list.map((step) => {
      if (step.key === "name") {
        return {
          ...step,
          prompt: "Who should I prepare these next steps for?",
          helper:
            "I'll keep the follow-up personal and relevant to your goals.",
        };
      }

      if (step.key === "email") {
        return {
          ...step,
          prompt: "What's the best email for your tailored next steps?",
          helper:
            "I'll send useful options, pricing insight, or strategy notes there.",
        };
      }

      if (step.key === "phone") {
        return {
          ...step,
          prompt:
            "What's the best phone number if a quick call or text would help?",
          helper: "Optional - helpful if you'd like faster answers.",
        };
      }

      if (step.key === "notes") {
        return {
          ...step,
          prompt: "Anything I should include in your recommendations?",
          helper: "Optional - must-haves, timing, concerns, or questions.",
        };
      }

      return step;
    });
  }, [data.leadType]);

  const currentStep = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const isMobile = viewportWidth <= 768;
  const isTabletOrSmaller = viewportWidth <= 960;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [stepIndex, submitted, isAssistantOpen, chatStarted, chatSessionKey]);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const conversationMessages = useMemo(() => {
    const msgs = [];

    msgs.push({
      role: "assistant",
      text: "Hi — I’m here to help with buying, selling, or just exploring your options.",
      helper:
        "Answer a few quick questions and I’ll help you with the next step.",
    });

    msgs[0] = {
      role: "assistant",
      text: "Hi there - I'm here to help you make a confident next move, whether you're buying, selling, or just exploring.",
      helper:
        "Share a few details and I'll point you toward the most useful next step.",
    };

    if (!isAssistantOpen || !chatStarted) return msgs;

    for (let i = 0; i <= Math.min(stepIndex, steps.length - 1); i += 1) {
      const step = steps[i];
      msgs.push({
        role: "assistant",
        text: step.prompt,
        helper: step.helper,
      });

      if (data[step.key]) {
        msgs.push({
          role: "user",
          text: normalizeDisplayValue(step.key, data[step.key]),
        });
      }
    }

    if (submitted) {
      msgs.push({
        role: "assistant",
        text: `Thanks, ${data.name || "there"}. I’ve received your information and someone will follow up with you soon.`,
      });
    }

    if (submitted) {
      msgs[msgs.length - 1] = {
        role: "assistant",
        text: `Thanks, ${data.name || "there"}. I've got what I need to prepare useful next steps, and someone will follow up with you soon.`,
      };
    }

    return msgs;
  }, [
    isAssistantOpen,
    chatStarted,
    stepIndex,
    steps,
    data,
    submitted,
    chatSessionKey,
  ]);

  function updateField(key, value) {
    setAssistantFieldError((prev) => (currentStep.key === key ? "" : prev));
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function commitAnswer(rawValue) {
    const key = currentStep.key;
    const value =
      key === "leadType" && rawValue === "Just exploring"
        ? "Unknown"
        : rawValue;
    updateField(key, value);

    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    }
  }

  function handleQuickReply(value) {
    commitAnswer(value);
  }

  function handleCurrentInputSubmit(e) {
    e.preventDefault();
    const value = (data[currentStep.key] || "").trim();
    const fieldError = getFieldError(currentStep.key, value);

    if (fieldError) {
      setAssistantFieldError(fieldError);
      return;
    }

    setAssistantFieldError("");

    if (!value) {
      if (currentStep.optional) {
        if (stepIndex < steps.length - 1) {
          setStepIndex((prev) => prev + 1);
        } else {
          submitLead();
        }
      }
      return;
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      submitLead();
    }
  }

  function goBackOneStep() {
    if (stepIndex > 0) {
      setSubmitted(false);
      setError("");
      setStepIndex((prev) => prev - 1);
    }
  }

  async function submitLead() {
    const nameError = getFieldError("name", data.name);
    const emailError = getFieldError("email", data.email);

    if (nameError || emailError) {
      setAssistantFieldError(nameError || emailError);
      return;
    }

    setError("");
    setSubmitting(true);

    const payload = {
      leadType: data.leadType || "",
      type: data.leadType || "",
      location: data.location || "",
      budget: data.budget || "",
      propertyValue: data.propertyValue || "",
      timeline: data.timeline || "",
      propertyType: data.propertyType || "",
      property_type: data.propertyType || "",
      financingStatus: data.financingStatus || "",
      financing_status: data.financingStatus || "",
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      notes: data.notes || "",
      message: data.notes || "",
      source: data.source || "",
      pageUrl: data.pageUrl || window.location.href,
      submittedAt: new Date().toISOString(),
    };

    try {
      const analysisResult = await requestLeadAnalysis(payload, "get_my_plan");
      const finalPayload = mergeLeadPayloadWithAnalysis(
        payload,
        analysisResult.analysis,
      );

      console.log(
        `[lead-analysis] get_my_plan analysis ${analysisResult.ok ? "succeeded" : "fell back"}; intent="${finalPayload.intent}"`,
      );

      if (import.meta.env.DEV) {
        console.log("Webhook raw lead payload:", finalPayload);
      }

      console.log(
        "[lead-analysis] get_my_plan final payload keys:",
        Object.keys(finalPayload),
      );
      console.log(
        '[lead-analysis] get_my_plan final intent:',
        finalPayload.intent,
      );
      console.log(
        '[lead-analysis] get_my_plan final follow_up_message:',
        finalPayload.follow_up_message,
      );
      console.log(
        '[lead-analysis] get_my_plan destination action:',
        "WEBHOOK_URL fetch",
      );

      await fetch(WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalPayload),
      });

      setData((prev) => ({
        ...prev,
        ...finalPayload,
        summary: finalPayload.summary || buildSummary(payload),
        intent: finalPayload.intent || "",
        followUpMessage: finalPayload.follow_up_message || "",
      }));
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(
        "Something went wrong while sending your information. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateBackupField(key, value) {
    setBackupFieldErrors((prev) => ({ ...prev, [key]: "" }));
    setBackupForm((prev) => ({ ...prev, [key]: value }));
  }

  function fillTestLead() {
    const nextLead = quickFormTestLeads[testLeadIndex % quickFormTestLeads.length];

    setBackupSubmitted(false);
    setBackupError("");
    setBackupFieldErrors({});
    setBackupForm({ ...nextLead });
    setTestLeadIndex((prev) => (prev + 1) % quickFormTestLeads.length);

    if (import.meta.env.DEV) {
      console.log("Loaded test lead:", nextLead.email, nextLead);
    }
  }

  function validateBackupForm() {
    const nextErrors = {
      name: getFieldError("name", backupForm.name),
      email: getFieldError("email", backupForm.email),
      phone: !(backupForm.phone || "").trim()
        ? "Please enter your phone number."
        : "",
      location: !(backupForm.location || "").trim()
        ? "Please enter your city or ZIP code."
        : "",
      leadType: !(backupForm.leadType || "").trim()
        ? "Please enter whether you are buying, selling, or browsing."
        : "",
      timeline: !(backupForm.timeline || "").trim()
        ? "Please choose your timeline."
        : "",
      propertyType: !(backupForm.propertyType || "").trim()
        ? "Please choose a property type."
        : "",
    };

    setBackupFieldErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  }

  async function submitBackupForm(e) {
    e.preventDefault();
    setBackupError("");
    if (!validateBackupForm()) return;
    setBackupSubmitting(true);
    setBackupSubmitted(false);

    const payload = {
      leadType: backupForm.leadType || "Unknown",
      type: backupForm.leadType || "Unknown",
      location: backupForm.location || "",
      budget: (backupForm.budget || "").trim(),
      propertyValue: "",
      timeline: backupForm.timeline || "",
      propertyType: backupForm.propertyType || "",
      property_type: backupForm.propertyType || "",
      financingStatus: "",
      financing_status: "",
      name: backupForm.name || "",
      email: backupForm.email || "",
      phone: backupForm.phone || "",
      notes: backupForm.notes || "",
      message: backupForm.notes || "",
      source: "Website Quick Form",
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
    };

    try {
      const analysisResult = await requestLeadAnalysis(payload, "quick_form");
      const finalPayload = mergeLeadPayloadWithAnalysis(
        payload,
        analysisResult.analysis,
      );

      console.log(
        `[lead-analysis] quick_form analysis ${analysisResult.ok ? "succeeded" : "fell back"}; intent="${finalPayload.intent}"`,
      );

      if (import.meta.env.DEV) {
        console.log("Webhook raw lead payload:", finalPayload);
      }

      console.log(
        "[lead-analysis] quick_form final payload keys:",
        Object.keys(finalPayload),
      );
      console.log(
        '[lead-analysis] quick_form final intent:',
        finalPayload.intent,
      );
      console.log(
        '[lead-analysis] quick_form final follow_up_message:',
        finalPayload.follow_up_message,
      );
      console.log(
        '[lead-analysis] quick_form destination action:',
        "WEBHOOK_URL fetch",
      );

      await fetch(WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalPayload),
      });

      setBackupSubmitted(true);
      setBackupForm({
        name: "",
        email: "",
        phone: "",
        location: "",
        leadType: "",
        budget: "",
        timeline: "",
        propertyType: "",
        notes: "",
      });
      setBackupFieldErrors({});
    } catch (err) {
      console.error(err);
      setBackupError(
        "Something went wrong while sending your information. Please try again.",
      );
    } finally {
      setBackupSubmitting(false);
    }
  }

  function restartConversation() {
    setStepIndex(0);
    setSubmitting(false);
    setSubmitted(false);
    setError("");
    setAssistantFieldError("");
    setChatStarted(false);
    setChatSessionKey((prev) => prev + 1);

    setData({
      leadType: "",
      location: "",
      budget: "",
      propertyValue: "",
      timeline: "",
      propertyType: "",
      financingStatus: "",
      name: "",
      email: "",
      phone: "",
      notes: "",
      intent: "",
      summary: "",
      followUpMessage: "",
      source: "Website Floating Assistant",
      pageUrl: window.location.href,
      submittedAt: "",
    });
  }

  return (
    <div style={styles.page}>
      <section
        style={{
          ...styles.heroSection,
          ...(isTabletOrSmaller ? styles.heroSectionTablet : {}),
          ...(isMobile ? styles.heroSectionMobile : {}),
        }}
      >
        <div style={styles.heroText}>
          <div style={styles.badge}>Local real estate guidance made simple</div>
          <h1
            style={{
              ...styles.heroTitle,
              ...(isTabletOrSmaller ? styles.heroTitleTablet : {}),
              ...(isMobile ? styles.heroTitleMobile : {}),
            }}
          >
            Get a clear 60-second plan to buy, sell, or move forward with
            confidence.
          </h1>
          <p
            style={{
              ...styles.heroSubtitle,
              ...(isMobile ? styles.heroSubtitleMobile : {}),
            }}
          >
            Get a simpler, more personal way to take the next step in your real
            estate journey. Ask questions, explore your options, and connect
            when you’re ready.
          </p>

          <div style={styles.heroButtons}>
            <button
              style={{
                ...styles.primaryButton,
                ...styles.primaryButtonHero,
                ...(isMobile ? styles.primaryButtonMobile : {}),
              }}
              onClick={() => {
                setIsAssistantOpen(true);
                setChatStarted(false);
              }}
            >
              Get My 60-Second Plan
            </button>
            <a href="#backup-form" style={styles.linkButtonSecondary}>
              Or use the quick form
            </a>
          </div>

          <div
            style={{
              ...styles.trustRow,
              ...(isMobile ? styles.trustRowMobile : {}),
            }}
          >
            <div style={styles.trustPill}>Free guidance</div>
            <div style={styles.trustPill}>No spam</div>
            <div style={styles.trustPill}>Local expert follow-up</div>
          </div>

          <p style={styles.reassuranceText}>
            Takes less than a minute. No calls unless you want one.
          </p>

          <div
            style={{
              ...styles.featureGrid,
              ...(isMobile ? styles.featureGridMobile : {}),
            }}
          >
            <div style={styles.featureCard}>
              <div style={styles.featureTitleRow}>
                <div style={styles.featureIconBadge}>
                  <House size={18} strokeWidth={2.2} />
                </div>
                <strong>Personal guidance</strong>
              </div>
              <p style={styles.featureText}>
                Get help based on your goals, timeline, and location.
              </p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureTitleRow}>
                <div style={styles.featureIconBadge}>
                  <MapPinned size={18} strokeWidth={2.2} />
                </div>
                <strong>Simple next steps</strong>
              </div>
              <p style={styles.featureText}>
                Whether you’re buying or selling, we’ll guide you one step at a
                time.
              </p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureTitleRow}>
                <div style={styles.featureIconBadge}>
                  <PhoneCall size={18} strokeWidth={2.2} />
                </div>
                <strong>Fast follow-up</strong>
              </div>
              <p style={styles.featureText}>
                Get a quick, thoughtful response so you can move forward with
                more clarity.
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.heroPanel,
            ...(isMobile ? styles.heroPanelMobile : {}),
          }}
        >
          <p style={styles.heroPanelLabel}>A simple first step</p>
          <h2
            style={{
              ...styles.heroPanelTitle,
              ...(isMobile ? styles.heroPanelTitleMobile : {}),
            }}
          >
            Friendly guidance without the overwhelm.
          </h2>
          <div style={styles.heroVisual}>
            <div style={styles.heroVisualTop}>
              <div style={styles.heroVisualIconWrap}>
                <House size={28} strokeWidth={2.2} />
              </div>
              <div>
                <div style={styles.heroVisualEyebrow}>
                  Personalized real estate plan
                </div>
                <div style={styles.heroVisualTitle}>
                  Simple guidance for buyers, sellers, and explorers
                </div>
              </div>
            </div>
            <div style={styles.heroVisualChips}>
              <span style={styles.heroVisualChip}>Buy</span>
              <span style={styles.heroVisualChip}>Sell</span>
              <span style={styles.heroVisualChip}>Explore</span>
            </div>
          </div>
          <div style={styles.heroPanelList}>
            <div style={styles.heroPanelItem}>
              Help for buyers, sellers, and people still exploring
            </div>
            <div style={styles.heroPanelItem}>
              A guided conversation tailored to your goals
            </div>
            <div style={styles.heroPanelItem}>
              Clear next steps based on your timing and priorities
            </div>
            <div style={styles.heroPanelItem}>
              Easy connection when you’re ready to move forward
            </div>
          </div>
        </div>
      </section>

      {/* Agent Trust Section START */}
      <section style={styles.section}>
        <div
          style={{
            ...styles.infoCard,
            maxWidth: "720px",
            margin: "0 auto",
            textAlign: "center",
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
          }}
        >
          <img
            src={agentPhoto}
            alt={agentPhotoAlt}
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              objectFit: "cover",
              display: "block",
              margin: "0 auto 16px",
              border: "2px solid #fff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
          <h2
            style={{
              ...styles.sectionTitle,
              ...(isMobile ? styles.sectionTitleMobile : {}),
              marginBottom: "12px",
            }}
          >
            {agentHeadline}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: "bold",
              color: "#0f172a",
            }}
          >
            {agentName}
          </p>
          <p
            style={{
              ...styles.sectionSubtitle,
              ...(isMobile ? styles.sectionSubtitleMobile : {}),
              margin: "8px auto 0",
            }}
          >
            {agentTitle}
          </p>
          <p style={{ ...styles.infoText, marginTop: "14px" }}>
            {agentDescription}
          </p>
          <p style={{ ...styles.infoText, marginTop: "14px" }}>
            Call/Text: {agentPhone}
          </p>
          <p style={{ ...styles.infoText, marginTop: "4px" }}>
            Email: {agentEmail}
          </p>
          <div style={{ marginTop: "18px" }}>
            <a
              href="#backup-form"
              style={{
                ...styles.primaryButton,
                ...(isMobile ? styles.primaryButtonMobile : {}),
                display: "inline-block",
                textDecoration: "none",
              }}
            >
              {agentCtaText}
            </a>
          </div>
          <p
            style={{
              ...styles.infoText,
              fontSize: "13px",
              marginTop: "14px",
              color: "#64748b",
            }}
          >
            {agentTrustLine}
          </p>
          <p
            style={{
              ...styles.infoText,
              display: "none",
              fontSize: "13px",
              marginTop: "14px",
              color: "#64748b",
            }}
          >
            Local market insights • Fast response • No pressure
          </p>
        </div>
      </section>
      {/* Agent Trust Section END */}

      <section
        style={{
          ...styles.sectionLight,
          ...(isMobile ? styles.sectionLightMobile : {}),
        }}
      >
        <div
          style={{
            ...styles.infoGrid,
            ...(isMobile ? styles.infoGridMobile : {}),
          }}
        >
          <div style={styles.infoCard}>
            <h3>Less pressure, more clarity</h3>
            <p style={styles.infoText}>
              Explore your options at your own pace and get help when you want
              it.
            </p>
          </div>
          <div style={styles.infoCard}>
            <h3>Guidance that fits your goals</h3>
            <p style={styles.infoText}>
              Your next step should match your timeline, budget, and priorities.
            </p>
          </div>
          <div style={styles.infoCard}>
            <h3>Easy to start</h3>
            <p style={styles.infoText}>
              Use the assistant or the quick form below — whichever feels
              easiest for you.
            </p>
          </div>
        </div>
      </section>

      <section id="backup-form" style={styles.section}>
        <div
          style={{
            ...styles.backupCard,
            ...(isMobile ? styles.backupCardMobile : {}),
          }}
        >
          <h2
            style={{
              ...styles.sectionTitle,
              ...(isMobile ? styles.sectionTitleMobile : {}),
            }}
          >
            Prefer the quick form?
          </h2>
          <p
            style={{
              ...styles.sectionSubtitle,
              ...(isMobile ? styles.sectionSubtitleMobile : {}),
            }}
          >
            Short on time? Fill this out in under a minute and we will send the
            right next step without making things complicated.
          </p>

          <form
            onSubmit={submitBackupForm}
            style={{
              ...styles.backupGrid,
              ...(isMobile ? styles.backupGridMobile : {}),
            }}
          >
            {import.meta.env.DEV ? (
              <button
                type="button"
                style={{
                  ...styles.secondaryButton,
                  gridColumn: "1 / -1",
                  justifySelf: "start",
                }}
                onClick={fillTestLead}
              >
                Fill Test Lead
              </button>
            ) : null}
            <div style={styles.fieldWrap}>
              <input
                style={{
                  ...styles.input,
                  ...(isMobile ? styles.inputMobile : {}),
                }}
                type="text"
                placeholder="Full name"
                value={backupForm.name}
                onChange={(e) => updateBackupField("name", e.target.value)}
              />
              {backupFieldErrors.name ? (
                <p style={styles.fieldError}>{backupFieldErrors.name}</p>
              ) : null}
            </div>
            <div style={styles.fieldWrap}>
              <input
                style={{
                  ...styles.input,
                  ...(isMobile ? styles.inputMobile : {}),
                }}
                type="email"
                placeholder="Email address"
                value={backupForm.email}
                onChange={(e) => updateBackupField("email", e.target.value)}
              />
              {backupFieldErrors.email ? (
                <p style={styles.fieldError}>{backupFieldErrors.email}</p>
              ) : null}
            </div>
            <div style={styles.fieldWrap}>
              <input
                style={{
                  ...styles.input,
                  ...(isMobile ? styles.inputMobile : {}),
                }}
                type="text"
                placeholder="Phone number"
                value={backupForm.phone}
                onChange={(e) => updateBackupField("phone", e.target.value)}
              />
              {backupFieldErrors.phone ? (
                <p style={styles.fieldError}>{backupFieldErrors.phone}</p>
              ) : null}
            </div>
            <div style={styles.fieldWrap}>
              <input
                style={{
                  ...styles.input,
                  ...(isMobile ? styles.inputMobile : {}),
                }}
                type="text"
                placeholder="City or ZIP code"
                value={backupForm.location}
                onChange={(e) => updateBackupField("location", e.target.value)}
              />
              {backupFieldErrors.location ? (
                <p style={styles.fieldError}>{backupFieldErrors.location}</p>
              ) : null}
            </div>
            <div style={{ ...styles.fieldWrap, gridColumn: "1 / -1" }}>
              <input
                style={{
                  ...styles.input,
                  ...(isMobile ? styles.inputMobile : {}),
                }}
                type="text"
                placeholder="Are you buying, selling, or just exploring?"
                value={backupForm.leadType}
                onChange={(e) => updateBackupField("leadType", e.target.value)}
              />
              {backupFieldErrors.leadType ? (
                <p style={styles.fieldError}>{backupFieldErrors.leadType}</p>
              ) : null}
            </div>
            <input
              style={{
                ...styles.input,
                ...(isMobile ? styles.inputMobile : {}),
              }}
              type="text"
              placeholder="Budget (e.g. $400k-$600k or $650k estimated value)"
              value={backupForm.budget}
              onChange={(e) => updateBackupField("budget", e.target.value)}
            />
            <div style={styles.fieldWrap}>
              <select
                style={{
                  ...styles.input,
                  ...(isMobile ? styles.inputMobile : {}),
                }}
                value={backupForm.timeline}
                onChange={(e) => updateBackupField("timeline", e.target.value)}
              >
                <option value="">Select timeline</option>
                {quickFormTimelineOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {backupFieldErrors.timeline ? (
                <p style={styles.fieldError}>{backupFieldErrors.timeline}</p>
              ) : null}
            </div>
            <div style={{ ...styles.fieldWrap, gridColumn: "1 / -1" }}>
              <select
                style={{
                  ...styles.input,
                  ...(isMobile ? styles.inputMobile : {}),
                }}
                value={backupForm.propertyType}
                onChange={(e) =>
                  updateBackupField("propertyType", e.target.value)
                }
              >
                <option value="">Select property type</option>
                {quickFormPropertyTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {backupFieldErrors.propertyType ? (
                <p style={styles.fieldError}>
                  {backupFieldErrors.propertyType}
                </p>
              ) : null}
            </div>
            <textarea
              style={{
                ...styles.textarea,
                ...(isMobile ? styles.inputMobile : {}),
                gridColumn: "1 / -1",
              }}
              rows={4}
              placeholder="Tell us a little about what you need"
              value={backupForm.notes}
              onChange={(e) => updateBackupField("notes", e.target.value)}
            />
            <button
              type="submit"
              style={{
                ...styles.primaryButton,
                ...(isMobile ? styles.primaryButtonMobile : {}),
                gridColumn: "1 / -1",
              }}
              disabled={backupSubmitting}
            >
              {backupSubmitting ? "Submitting..." : "Submit"}
            </button>

            {backupSubmitted ? (
              <p style={{ ...styles.successNote, gridColumn: "1 / -1" }}>
                Thanks — your information was sent successfully.
              </p>
            ) : null}

            {backupError ? (
              <p style={{ ...styles.errorTextInline, gridColumn: "1 / -1" }}>
                {backupError}
              </p>
            ) : null}
          </form>
        </div>
      </section>

      {isAssistantOpen ? (
        <div
          style={{
            ...styles.assistantPanel,
            ...(isMobile ? styles.assistantPanelMobile : {}),
          }}
        >
          <div
            style={{
              ...styles.assistantHeader,
              ...(isMobile ? styles.assistantHeaderMobile : {}),
            }}
          >
            <div>
              <div style={styles.assistantTitle}>Start here</div>
              <div
                style={{
                  ...styles.assistantSubTitle,
                  ...(isMobile ? styles.assistantSubTitleMobile : {}),
                }}
              >
                {submitted
                  ? "Request received"
                  : chatStarted
                    ? `Progress ${progress}%`
                    : "Ready when you are"}
              </div>
              {!chatStarted ? (
                <div style={styles.assistantIntroText}>
                  Fast, no-pressure guidance designed to give you a useful next
                  step in about 60 seconds.
                </div>
              ) : null}
            </div>
            <div style={styles.assistantHeaderActions}>
              <button
                style={styles.headerGhostButton}
                onClick={restartConversation}
              >
                Reset
              </button>
              <button
                style={styles.headerCloseButton}
                onClick={() => setIsAssistantOpen(false)}
              >
                ×
              </button>
            </div>
          </div>

          <div
            key={chatSessionKey}
            style={{
              ...styles.assistantMessages,
              ...(isMobile ? styles.assistantMessagesMobile : {}),
            }}
          >
            {conversationMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.text}`}
                style={
                  message.role === "assistant"
                    ? styles.assistantRow
                    : styles.userRow
                }
              >
                <div
                  style={
                    message.role === "assistant"
                      ? {
                          ...styles.assistantBubble,
                          ...(isMobile ? styles.messageBubbleMobile : {}),
                        }
                      : {
                          ...styles.userBubble,
                          ...(isMobile ? styles.messageBubbleMobile : {}),
                        }
                  }
                >
                  {message.text}
                  {message.helper ? (
                    <div style={styles.helperText}>{message.helper}</div>
                  ) : null}
                </div>
              </div>
            ))}

            {submitted ? (
              <div style={styles.assistantRow}>
                <div
                  style={{
                    ...styles.assistantBubble,
                    ...(isMobile ? styles.messageBubbleMobile : {}),
                  }}
                >
                  <strong>What you shared</strong>
                  <div style={styles.summaryText}>{data.summary}</div>
                </div>
              </div>
            ) : null}

            {!chatStarted ? (
              <div style={styles.assistantRow}>
                <div
                  style={{
                    ...styles.assistantBubble,
                    ...(isMobile ? styles.messageBubbleMobile : {}),
                  }}
                >
                  When you’re ready, tap begin and I’ll guide you step by step.
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {error ? <p style={styles.errorText}>{error}</p> : null}

          {!chatStarted ? (
            <div style={styles.assistantDoneArea}>
              <button
                style={{
                  ...styles.primaryButton,
                  ...(isMobile ? styles.primaryButtonMobile : {}),
                }}
                onClick={() => {
                  setChatStarted(true);
                  setStepIndex(0);
                }}
              >
                Begin
              </button>
            </div>
          ) : !submitted ? (
            <form
              onSubmit={handleCurrentInputSubmit}
              style={{
                ...styles.assistantComposer,
                ...(isMobile ? styles.assistantComposerMobile : {}),
              }}
            >
              {currentStep.quickReplies?.length ? (
                <div style={styles.quickReplyGrid}>
                  {currentStep.quickReplies.map((option) => (
                    <button
                      key={option}
                      type="button"
                      style={styles.quickReplyButton}
                      onClick={() => handleQuickReply(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}

              <div
                style={{
                  ...styles.composerRow,
                  ...(isMobile ? styles.composerRowMobile : {}),
                }}
              >
                <input
                  style={{
                    ...styles.chatInput,
                    ...(isMobile ? styles.chatInputMobile : {}),
                  }}
                  type={currentStep.key === "email" ? "email" : "text"}
                  placeholder={currentStep.placeholder}
                  value={data[currentStep.key] || ""}
                  onChange={(e) => updateField(currentStep.key, e.target.value)}
                />
                <button
                  type="submit"
                  style={{
                    ...styles.sendButton,
                    ...(isMobile ? styles.sendButtonMobile : {}),
                  }}
                  disabled={submitting}
                >
                  {stepIndex === steps.length - 1
                    ? submitting
                      ? "Sending..."
                      : "Finish"
                    : "Send"}
                </button>
              </div>

              {assistantFieldError ? (
                <p style={styles.fieldError}>{assistantFieldError}</p>
              ) : null}

              <div style={styles.assistantFooterRow}>
                <button
                  type="button"
                  style={{
                    ...styles.secondaryButton,
                    opacity: stepIndex === 0 ? 0.5 : 1,
                  }}
                  disabled={stepIndex === 0}
                  onClick={goBackOneStep}
                >
                  Back
                </button>
                {currentStep.optional ? (
                  <button
                    type="button"
                    style={styles.skipButton}
                    onClick={() => {
                      if (stepIndex < steps.length - 1)
                        setStepIndex((prev) => prev + 1);
                      else submitLead();
                    }}
                  >
                    Skip this
                  </button>
                ) : (
                  <span style={styles.navHint}>
                    A simple guided way to get started.
                  </span>
                )}
              </div>
            </form>
          ) : (
            <div style={styles.assistantDoneArea}>
              <button
                style={{
                  ...styles.primaryButton,
                  ...(isMobile ? styles.primaryButtonMobile : {}),
                }}
                onClick={restartConversation}
              >
                Start over
              </button>
            </div>
          )}
        </div>
      ) : null}

      {!isAssistantOpen ? (
        <button
          style={{
            ...styles.floatingLauncher,
            ...(isMobile ? styles.floatingLauncherMobile : {}),
          }}
          onClick={() => {
            setIsAssistantOpen(true);
            setChatStarted(false);
          }}
        >
          <span style={styles.launcherIcon}>💬</span>
          <span>Get My Plan</span>
        </button>
      ) : null}
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    minHeight: "100vh",
    position: "relative",
  },
  heroSection: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "48px 20px",
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: "28px",
  },
  heroSectionTablet: {
    gridTemplateColumns: "1fr",
  },
  heroSectionMobile: {
    padding: "32px 16px",
    gap: "20px",
  },
  heroText: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#e2e8f0",
    color: "#334155",
    padding: "10px 16px",
    borderRadius: "999px",
    fontSize: "14px",
    width: "fit-content",
  },
  heroTitle: {
    fontSize: "48px",
    lineHeight: 1.1,
    margin: 0,
  },
  heroTitleTablet: {
    fontSize: "40px",
  },
  heroTitleMobile: {
    fontSize: "32px",
  },
  heroSubtitle: {
    fontSize: "18px",
    lineHeight: 1.7,
    color: "#475569",
    margin: 0,
    maxWidth: "700px",
  },
  heroSubtitleMobile: {
    fontSize: "16px",
    lineHeight: 1.6,
  },
  heroButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  linkButtonSecondary: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    textDecoration: "none",
    padding: "14px 20px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontWeight: "bold",
  },
  trustRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
  trustRowMobile: {
    gap: "8px",
  },
  trustPill: {
    backgroundColor: "#ffffff",
    color: "#334155",
    border: "1px solid #dbe4ff",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: "bold",
  },
  reassuranceText: {
    margin: 0,
    color: "#0f172a",
    fontSize: "14px",
    lineHeight: 1.6,
    fontWeight: "bold",
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "14px",
    marginTop: "8px",
  },
  featureGridMobile: {
    gridTemplateColumns: "1fr",
  },
  featureCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px",
  },
  featureTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  featureIconBadge: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    marginTop: "8px",
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  heroPanel: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    borderRadius: "24px",
    padding: "28px",
    alignSelf: "stretch",
  },
  heroVisual: {
    marginBottom: "20px",
    padding: "18px",
    borderRadius: "18px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  heroVisualTop: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  heroVisualIconWrap: {
    width: "54px",
    height: "54px",
    borderRadius: "16px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroVisualEyebrow: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#cbd5e1",
    marginBottom: "4px",
  },
  heroVisualTitle: {
    fontSize: "15px",
    lineHeight: 1.5,
    color: "#ffffff",
    fontWeight: "bold",
  },
  heroVisualChips: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "14px",
  },
  heroVisualChip: {
    padding: "7px 10px",
    borderRadius: "999px",
    backgroundColor: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: "12px",
    color: "#e2e8f0",
  },
  heroPanelMobile: {
    padding: "22px",
  },
  heroPanelLabel: {
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#cbd5e1",
    fontSize: "12px",
  },
  heroPanelTitle: {
    fontSize: "32px",
    marginTop: "12px",
    marginBottom: "20px",
    color: "#ffffff",
  },
  heroPanelTitleMobile: {
    fontSize: "24px",
  },
  heroPanelList: {
    display: "grid",
    gap: "12px",
  },
  heroPanelItem: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: "14px",
    borderRadius: "14px",
  },
  section: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "32px 20px 56px",
  },
  sectionLight: {
    backgroundColor: "#ffffff",
    padding: "56px 20px",
  },
  sectionLightMobile: {
    padding: "36px 16px",
  },
  sectionTitle: {
    fontSize: "32px",
    marginBottom: "10px",
  },
  sectionTitleMobile: {
    fontSize: "26px",
  },
  sectionSubtitle: {
    fontSize: "16px",
    color: "#475569",
    lineHeight: 1.7,
    maxWidth: "800px",
  },
  sectionSubtitleMobile: {
    fontSize: "15px",
    lineHeight: 1.6,
  },
  infoGrid: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "18px",
  },
  infoGridMobile: {
    gridTemplateColumns: "1fr",
  },
  infoCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
  },
  infoText: {
    color: "#475569",
    lineHeight: 1.7,
    marginTop: "10px",
  },
  backupCard: {
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    padding: "28px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  },
  backupCardMobile: {
    padding: "22px",
    borderRadius: "20px",
  },
  backupGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "20px",
  },
  backupGridMobile: {
    gridTemplateColumns: "1fr",
  },
  fieldWrap: {
    display: "grid",
    gap: "6px",
  },
  fieldError: {
    margin: 0,
    color: "#dc2626",
    fontSize: "13px",
    lineHeight: 1.4,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
  },
  inputMobile: {
    fontSize: "14px",
    padding: "12px 14px",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    resize: "vertical",
  },
  primaryButton: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 18px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "15px",
  },
  primaryButtonHero: {
    background: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)",
    boxShadow: "0 18px 38px rgba(220, 38, 38, 0.28)",
    padding: "16px 24px",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  primaryButtonMobile: {
    width: "100%",
    fontSize: "14px",
    padding: "13px 16px",
  },
  successNote: {
    color: "#166534",
    margin: 0,
    fontSize: "14px",
  },
  errorTextInline: {
    color: "#dc2626",
    margin: 0,
    fontSize: "14px",
  },
  floatingLauncher: {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    zIndex: 1000,
    background: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "999px",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 16px 34px rgba(220, 38, 38, 0.3)",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "15px",
  },
  floatingLauncherMobile: {
    right: "16px",
    left: "16px",
    bottom: "16px",
    width: "calc(100vw - 32px)",
    justifyContent: "center",
    padding: "13px 16px",
    fontSize: "14px",
  },
  launcherIcon: {
    fontSize: "18px",
  },
  assistantPanel: {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    width: "420px",
    height: "720px",
    maxHeight: "calc(100vh - 48px)",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "24px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
    zIndex: 1001,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  assistantPanelMobile: {
    right: "12px",
    bottom: "12px",
    width: "calc(100vw - 24px)",
    height: "calc(100dvh - 24px)",
    maxHeight: "calc(100dvh - 24px)",
    borderRadius: "20px",
  },
  assistantHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "18px 20px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    flexShrink: 0,
  },
  assistantHeaderMobile: {
    padding: "16px",
  },
  assistantTitle: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  assistantSubTitle: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#64748b",
  },
  assistantSubTitleMobile: {
    fontSize: "12px",
  },
  assistantIntroText: {
    marginTop: "8px",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.5,
    maxWidth: "240px",
  },
  assistantHeaderActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  headerGhostButton: {
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "13px",
  },
  headerCloseButton: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    width: "34px",
    height: "34px",
    borderRadius: "999px",
    cursor: "pointer",
    fontSize: "20px",
    lineHeight: 1,
  },
  assistantMessages: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "20px",
    display: "grid",
    gap: "14px",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  assistantMessagesMobile: {
    padding: "16px",
  },
  assistantComposer: {
    borderTop: "1px solid #e2e8f0",
    padding: "16px 20px",
    backgroundColor: "#ffffff",
    flexShrink: 0,
  },
  assistantComposerMobile: {
    padding: "16px",
  },
  assistantFooterRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginTop: "12px",
    flexWrap: "wrap",
  },
  assistantDoneArea: {
    borderTop: "1px solid #e2e8f0",
    padding: "16px 20px",
    backgroundColor: "#ffffff",
    flexShrink: 0,
  },
  assistantRow: {
    display: "flex",
    justifyContent: "flex-start",
  },
  userRow: {
    display: "flex",
    justifyContent: "flex-end",
  },
  assistantBubble: {
    backgroundColor: "#eef2ff",
    color: "#0f172a",
    padding: "14px 16px",
    borderRadius: "18px 18px 18px 6px",
    maxWidth: "78%",
    lineHeight: 1.6,
    border: "1px solid #dbe4ff",
  },
  userBubble: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    padding: "14px 16px",
    borderRadius: "18px 18px 6px 18px",
    maxWidth: "78%",
    lineHeight: 1.6,
  },
  messageBubbleMobile: {
    maxWidth: "88%",
    fontSize: "14px",
  },
  helperText: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "8px",
  },
  summaryText: {
    marginTop: "8px",
    color: "#334155",
    lineHeight: 1.6,
  },
  quickReplyGrid: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  quickReplyButton: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
  },
  composerRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
  },
  composerRowMobile: {
    gridTemplateColumns: "1fr",
  },
  chatInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
  },
  chatInputMobile: {
    fontSize: "14px",
    padding: "12px 14px",
  },
  sendButton: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "14px",
    padding: "0 18px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "15px",
  },
  sendButtonMobile: {
    minHeight: "44px",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "10px 14px",
    fontWeight: "bold",
    fontSize: "14px",
  },
  skipButton: {
    background: "transparent",
    color: "#475569",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textDecoration: "underline",
  },
  navHint: {
    color: "#94a3b8",
    fontSize: "12px",
  },
  errorText: {
    color: "#dc2626",
    padding: "8px 20px 0",
    margin: 0,
  },
};

export default App;
