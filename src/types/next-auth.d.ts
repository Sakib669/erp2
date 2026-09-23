import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    activeBranchId?: string | null;
    roles?: string[];
    permissions?: string[];
    branches?: Array<{
      id: string;
      name: string;
      code: string;
      isDefault: boolean;
    }>;
  }

  interface Session {
    user: {
      id: string;
      activeBranchId?: string | null;
      roles: string[];
      permissions: string[];
      branches: Array<{
        id: string;
        name: string;
        code: string;
        isDefault: boolean;
      }>;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    activeBranchId?: string | null;
    roles?: string[];
    permissions?: string[];
    branches?: Array<{
      id: string;
      name: string;
      code: string;
      isDefault: boolean;
    }>;
  }
}
