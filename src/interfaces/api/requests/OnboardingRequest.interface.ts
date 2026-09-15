import type { NewTenantRequest } from "./NewTenantRequest.interface";
import type { OnboardingBranch } from "../onboarding/OnboardingBranch.interface";
import type { OnboardingSubscription } from "../onboarding/OnboardingSubscription.interface";
import type { OnboardingUser } from "../onboarding/OnboardingUser.interface";

export interface OnboardingRequest extends NewTenantRequest {
  branch?: OnboardingBranch;
  user: OnboardingUser;
  subscription: OnboardingSubscription;
}
