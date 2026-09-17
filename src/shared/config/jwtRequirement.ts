export const JwtRequirement = {
  _Unknown: 'unknown',
  _NotRequired: 'not_required',
  _Required: 'required',
} as const;

export type JwtRequirementValue = (typeof JwtRequirement)[keyof typeof JwtRequirement];

export function jwtRequirementFromBoolean(value: boolean | null | undefined): JwtRequirementValue {
  if (value === true) return JwtRequirement._Required;
  if (value === false) return JwtRequirement._NotRequired;
  return JwtRequirement._Unknown;
}

export function isJwtRequirementValue(value: unknown): value is JwtRequirementValue {
  return (
    value === JwtRequirement._Unknown ||
    value === JwtRequirement._NotRequired ||
    value === JwtRequirement._Required
  );
}
