import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "@auth/core/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      theme?: string;
      mfaRequired?: boolean;
      mfaVerified?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role?: string;
    theme?: string;
    mfaRequired?: boolean;
    mfaVerified?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role?: string;
    theme?: string;
    mfaRequired?: boolean;
    mfaVerified?: boolean;
  }
}
