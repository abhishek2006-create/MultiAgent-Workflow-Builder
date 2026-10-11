import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";

@Injectable()
export class GoogleStrategy extends PassportStrategy(
  Strategy,
  "google",
) {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:3001/api/auth/google/callback",
      scope: ["profile", "email"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const email =
      profile.emails?.[0]?.value;

    if (!email) {
      return done(
        new Error(
          "Google account does not provide an email address.",
        ),
        false,
      );
    }

    return done(null, {
      provider: "google",
      subject: profile.id,
      email,
      name: profile.displayName,
      avatar:
        profile.photos?.[0]?.value,
    });
  }
}
