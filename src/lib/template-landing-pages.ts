export type TemplateLandingConfig = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  intro: string;
  supportingCopy: string;
  categorySlugs: string[];
  tagSlugs: string[];
  query?: string;
  sort?: "newest" | "popular" | "rating";
  price?: "free" | "paid";
  audience: string[];
};

export const TEMPLATE_LANDING_PAGES: TemplateLandingConfig[] = [
  {
    slug: "cbt-thought-record",
    title: "CBT Thought Record Templates",
    metaTitle: "CBT Thought Record Templates for Therapists",
    metaDescription:
      "Explore CBT thought record templates, worksheets, and clinician-designed tools for cognitive restructuring and session work.",
    eyebrow: "CBT templates",
    intro:
      "Find practical CBT thought record templates that help clients notice patterns, challenge unhelpful thoughts, and build more balanced responses.",
    supportingCopy:
      "This page focuses on structured tools that fit therapy sessions, homework, and psychoeducation workflows.",
    categorySlugs: ["therapy-worksheets", "templates-and-frameworks"],
    tagSlugs: ["cbt", "worksheet", "template"],
    query: "thought record",
    sort: "rating",
    audience: ["Psychologists", "Counsellors", "Mental health clinicians"],
  },
  {
    slug: "behavioural-activation",
    title: "Behavioural Activation Worksheets and Templates",
    metaTitle: "Behavioural Activation Worksheets and Planner Templates",
    metaDescription:
      "Browse behavioural activation templates, worksheets, and therapy tools for scheduling, momentum, and values-based action.",
    eyebrow: "Action-focused tools",
    intro:
      "Discover behavioural activation resources that make planning, follow-through, and low-pressure re-engagement easier in real practice.",
    supportingCopy:
      "These listings are suited to session planning, client handouts, and structured between-session tasks.",
    categorySlugs: ["behavioural-activation", "therapy-worksheets"],
    tagSlugs: ["behavioural-activation", "worksheet", "template"],
    sort: "popular",
    audience: ["Psychologists", "Therapists", "Coaches"],
  },
  {
    slug: "ndis-report-template",
    title: "NDIS Report Templates",
    metaTitle: "NDIS Report Templates for Allied Health and Psychology",
    metaDescription:
      "Browse NDIS report templates, wording packs, and report-writing tools for functional evidence, recommendations, and clearer documentation.",
    eyebrow: "NDIS reporting",
    intro:
      "Access NDIS report templates built to reduce admin drag while helping clinicians present clearer evidence, recommendations, and functional impact.",
    supportingCopy:
      "This landing page highlights practical report-writing resources used by psychology and allied health teams.",
    categorySlugs: ["ndis-resources", "report-templates"],
    tagSlugs: ["ndis", "template", "report-writing"],
    query: "report template",
    sort: "popular",
    audience: ["Psychologists", "Occupational therapists", "Speech pathologists"],
  },
  {
    slug: "case-formulation",
    title: "Case Formulation Templates",
    metaTitle: "Case Formulation Templates and Clinical Frameworks",
    metaDescription:
      "Explore case formulation templates, worksheets, and clinician tools for assessment synthesis, treatment planning, and feedback sessions.",
    eyebrow: "Formulation tools",
    intro:
      "Browse case formulation templates that support clearer conceptualisation, collaborative feedback, and more consistent treatment planning.",
    supportingCopy:
      "These resources lean toward practical frameworks clinicians can adapt across presentations and settings.",
    categorySlugs: ["feedback-and-formulation", "templates-and-frameworks"],
    tagSlugs: ["case-formulation", "template"],
    sort: "rating",
    audience: ["Clinical psychologists", "Provisional psychologists", "Allied health clinicians"],
  },
  {
    slug: "psychology-templates",
    title: "Psychology Templates",
    metaTitle: "Psychology Templates for Clinical Practice",
    metaDescription:
      "Find psychology templates for reports, worksheets, forms, psychoeducation, and clinician workflows on PsychVault.",
    eyebrow: "Practice-ready templates",
    intro:
      "Explore a broad collection of psychology templates built for assessment, therapy, documentation, and everyday practice operations.",
    supportingCopy:
      "This page is a high-intent starting point for clinicians looking for editable, practical resources.",
    categorySlugs: ["psychology-resources", "templates-and-frameworks", "report-templates"],
    tagSlugs: ["psychology", "template"],
    sort: "popular",
    audience: ["Psychologists", "Private practice teams", "Provisional psychologists"],
  },
  {
    slug: "therapy-worksheets-free",
    title: "Free Therapy Worksheets",
    metaTitle: "Free Therapy Worksheets for Mental Health Practice",
    metaDescription:
      "Browse free therapy worksheets for clinicians, including CBT, behavioural activation, psychoeducation, and emotional regulation tools.",
    eyebrow: "Free downloads",
    intro:
      "Find free therapy worksheets that help you trial practical tools before committing to a larger resource library.",
    supportingCopy:
      "These listings prioritise accessible, ready-to-use downloads across common therapy themes.",
    categorySlugs: ["therapy-worksheets"],
    tagSlugs: ["worksheet"],
    query: "therapy",
    sort: "rating",
    price: "free",
    audience: ["Psychologists", "Students", "Private practitioners"],
  },
  {
    slug: "therapy-worksheets",
    title: "Therapy Worksheets",
    metaTitle: "Therapy Worksheets for Counselling and Psychology",
    metaDescription:
      "Explore therapy worksheets for emotional regulation, CBT, behaviour change, formulation, and client homework.",
    eyebrow: "Worksheet library",
    intro:
      "Browse therapy worksheets designed to support sessions, homework, psychoeducation, and structured clinical conversations.",
    supportingCopy:
      "This page collects clinician-designed tools for everyday therapeutic work across adult, child, and family contexts.",
    categorySlugs: ["therapy-worksheets"],
    tagSlugs: ["worksheet"],
    sort: "popular",
    audience: ["Psychologists", "Counsellors", "Social workers"],
  },
  {
    slug: "psychoeducation-handouts",
    title: "Psychoeducation Handouts",
    metaTitle: "Psychoeducation Handouts for Clinicians",
    metaDescription:
      "Find psychoeducation handouts for anxiety, trauma, emotional regulation, neurodiversity, and everyday clinical practice.",
    eyebrow: "Client education",
    intro:
      "Discover psychoeducation handouts that help clients understand concepts quickly without flattening nuance or clinical tone.",
    supportingCopy:
      "These resources work well for session teaching, take-home reinforcement, and onboarding into treatment models.",
    categorySlugs: ["psychoeducation", "parent-handouts"],
    tagSlugs: ["handout"],
    sort: "rating",
    audience: ["Psychologists", "Therapists", "Allied health clinicians"],
  },
  {
    slug: "emotional-regulation-worksheets",
    title: "Emotional Regulation Worksheets",
    metaTitle: "Emotional Regulation Worksheets and Handouts",
    metaDescription:
      "Browse emotional regulation worksheets, handouts, and clinician tools for coping skills, nervous-system support, and self-awareness.",
    eyebrow: "Regulation support",
    intro:
      "Find emotional regulation worksheets that support identification, pacing, coping skills, and more reflective self-management.",
    supportingCopy:
      "This landing page prioritises practical tools for neurodiversity-affirming and trauma-aware practice.",
    categorySlugs: ["emotional-regulation-tools", "therapy-worksheets"],
    tagSlugs: ["emotional-regulation", "worksheet"],
    sort: "rating",
    audience: ["Psychologists", "School counsellors", "Occupational therapists"],
  },
  {
    slug: "progress-note-template",
    title: "Progress Note Templates",
    metaTitle: "Progress Note Templates for Clinicians",
    metaDescription:
      "Explore progress note templates, session note formats, and documentation tools for clinicians and private practices.",
    eyebrow: "Documentation systems",
    intro:
      "Browse progress note templates designed to make documentation faster, clearer, and easier to repeat across busy caseloads.",
    supportingCopy:
      "Ideal for clinicians who want cleaner note structure without losing clinical depth or flexibility.",
    categorySlugs: ["progress-notes-and-session-records", "clinical-documentation"],
    tagSlugs: ["progress-notes", "session-notes", "template"],
    sort: "popular",
    audience: ["Psychologists", "Allied health teams", "Private practice owners"],
  },
  {
    slug: "intake-form-template",
    title: "Intake Form Templates",
    metaTitle: "Intake Form Templates for Psychology and Allied Health",
    metaDescription:
      "Find intake form templates, consent forms, and onboarding documents for clinicians, private practices, and allied health teams.",
    eyebrow: "Client onboarding",
    intro:
      "Explore intake form templates that improve onboarding, consent, and information gathering without sounding generic or overly corporate.",
    supportingCopy:
      "This page brings together practical admin templates for first appointments and new-client workflows.",
    categorySlugs: ["informed-consent-and-intake", "admin-templates-and-forms"],
    tagSlugs: ["intake-form", "consent-form", "template"],
    sort: "popular",
    audience: ["Private practices", "Practice managers", "Clinicians"],
  },
  {
    slug: "mental-health-treatment-plan",
    title: "Mental Health Treatment Plan Templates",
    metaTitle: "Mental Health Treatment Plan Templates and Goal Plans",
    metaDescription:
      "Browse treatment plan templates, goal-setting tools, and structured planning resources for therapy and mental health practice.",
    eyebrow: "Treatment planning",
    intro:
      "Find treatment plan templates that support clearer goals, collaborative direction, and more consistent follow-through across care plans.",
    supportingCopy:
      "These resources are especially useful for clinicians who want stronger structure around interventions and review points.",
    categorySlugs: ["goal-setting-and-intervention-plans", "templates-and-frameworks"],
    tagSlugs: ["treatment-plan", "goal-setting", "template"],
    sort: "rating",
    audience: ["Psychologists", "Mental health clinicians", "Allied health teams"],
  },
];

export const TEMPLATE_LANDING_PAGE_MAP = new Map(
  TEMPLATE_LANDING_PAGES.map((page) => [page.slug, page])
);

export function getTemplateLandingPage(slug: string) {
  return TEMPLATE_LANDING_PAGE_MAP.get(slug);
}
