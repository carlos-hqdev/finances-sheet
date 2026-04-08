"use server";

import { auth } from "@/shared/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  name?: string;
  image?: string;
  displayName?: string;
  cpf?: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Não autorizado", status: 401 };
    }

    // Usando a API de servidor do Better Auth para atualizar o usuário
    // Isso tem permissão total sobre os fields definidos em additionalFields
    const result = await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: data.name,
        image: data.image,
        displayName: data.displayName,
        cpf: data.cpf,
      },
    });

    revalidatePath("/profile");
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erro na Server Action updateProfile:", error);
    return { 
      error: error.message || "Erro interno ao atualizar perfil", 
      status: 500 
    };
  }
}
