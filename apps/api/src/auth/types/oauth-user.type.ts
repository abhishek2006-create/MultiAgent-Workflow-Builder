export interface OAuthUser {
  provider: "google" | "github";
  subject: string;
  email: string;
  name?: string;
  avatar?: string;
}