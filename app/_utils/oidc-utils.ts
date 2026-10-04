export const checkClaims = (
  allowedClaimValues: string | undefined,
  availableClaimValues: unknown
): boolean => {
  let available: string[] = [];
  if (Array.isArray(availableClaimValues)) {
    available = availableClaimValues;
  } else if (typeof availableClaimValues === "string") {
    available = availableClaimValues.split(/[\s,]+/).filter(Boolean);
  }

  const filteredAllowedClaimValues: string[] = (allowedClaimValues || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  return (
    filteredAllowedClaimValues.length > 0 &&
    filteredAllowedClaimValues.some((g) => available.includes(g))
  );
};

export const isOidcAccessRestricted = (): boolean =>
  !!(process.env.OIDC_USER_GROUPS || process.env.OIDC_USER_ROLES);

export const isOidcUserAllowed = (claims: Record<string, unknown>): boolean => {
  if (!isOidcAccessRestricted()) return true;

  return (
    checkClaims(process.env.OIDC_USER_GROUPS, claims.groups) ||
    checkClaims(process.env.OIDC_USER_ROLES, claims.roles)
  );
};

export const OIDC_UNAUTHORIZED_MESSAGE =
  "Your account is not in a group or role allowed to sign in";
