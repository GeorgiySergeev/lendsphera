export type ComplianceProfile = {
  requiredKeys: string[];
  disallowedPhrases: RegExp[];
  disclaimer: string;
};

const DEFAULT_PROFILE: ComplianceProfile = {
  requiredKeys: ["medical_disclaimer"],
  disallowedPhrases: [
    /guaranteed\s+cure/gi,
    /no\s+side\s+effects/gi,
    /works\s+instantly/gi
  ],
  disclaimer:
    "This page is marketing content and does not replace medical advice. Consult a licensed professional before use."
};

const PROFILE_BY_GEO: Record<string, ComplianceProfile> = {
  US: {
    ...DEFAULT_PROFILE,
    disallowedPhrases: [
      ...DEFAULT_PROFILE.disallowedPhrases,
      /fda\s+approved\s+if\s+not\s+true/gi
    ]
  },
  DE: {
    ...DEFAULT_PROFILE,
    requiredKeys: ["medical_disclaimer", "results_may_vary"]
  },
  FR: {
    ...DEFAULT_PROFILE,
    requiredKeys: ["medical_disclaimer", "sponsored_content"]
  }
};

export function getComplianceProfileByGeo(
  geoCode: string | null | undefined
): ComplianceProfile {
  if (!geoCode) {
    return DEFAULT_PROFILE;
  }

  return PROFILE_BY_GEO[geoCode.toUpperCase()] ?? DEFAULT_PROFILE;
}
