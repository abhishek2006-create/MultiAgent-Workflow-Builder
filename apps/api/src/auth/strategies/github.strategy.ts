import { oauthCallbackUrl } from "../oauth-urls";
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile  } from "passport-github2";
import { VerifyCallback } from "passport-google-oauth20";

@Injectable()
export class GithubStrategy extends PassportStrategy(
  Strategy,
  "github",
) {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: oauthCallbackUrl("github"),
      scope: ["user:email"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email =
      profile.emails?.find(
        (item) => item.value,
      )?.value;

    if (!email) {
      return done(
        new Error(
          "GitHub account does not provide an email address.",
        ),
        false,
      );
    }

    return done(null, {
      provider: "github",
      subject: profile.id,
      email,
      name:
        profile.displayName ||
        profile.username,
      avatar:
        profile.photos?.[0]?.value,
    });
  }
}
