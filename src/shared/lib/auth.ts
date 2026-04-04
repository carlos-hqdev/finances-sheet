import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  password: {
    minPasswordLength: 6,
  },
  user: {
    additionalFields: {
      displayName: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  // Por enquanto desativado para facilitar o dev, mas configurado
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24, // 1 dia
  },
});
