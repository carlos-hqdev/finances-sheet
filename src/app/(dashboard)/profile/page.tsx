"use client";

import { Camera, Loader2, Mail, Shield, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/features/users";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { authClient, useSession } from "@/shared/lib/auth-client";

export default function ProfilePage() {
  const session = useSession();
  const user = session.data?.user;

  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    displayName: "",
    email: "",
    image: "",
    cpf: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Sincroniza os dados do usuário com o estado local quando a sessão carregar
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        displayName: (user as any).displayName || "",
        email: user.email || "",
        image: user.image || "",
        cpf: (user as any).cpf || "",
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Atualizar nome, imagem e displayName via Server Action
      const result = await updateProfile({
        name: profileData.name,
        image: profileData.image,
        displayName: profileData.displayName,
        cpf: profileData.cpf,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // 2. Verificar se o e-mail mudou e atualizar se necessário via authClient
      if (profileData.email !== user?.email) {
        const { error: emailError } = await authClient.changeEmail({
          newEmail: profileData.email,
        });
        if (emailError) {
          throw new Error(emailError.message || "Erro ao atualizar email");
        }
      }

      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As novas senhas não coincidem");
      return;
    }
    setIsLoading(true);

    try {
      const { error } = await authClient.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        revokeOtherSessions: true,
      });

      if (error) throw new Error(error.message);

      toast.success("Senha alterada com sucesso!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsLoading(false);
    }
  };

  if (session.isPending)
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!user)
    return <div className="p-8 text-center">Usuário não autenticado.</div>;

  const displayNameToDisplay =
    profileData.displayName || profileData.name || "Usuário";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {displayNameToDisplay}!
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas informações de conta e segurança.
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
              <CardDescription>
                Atualize seus dados básicos e foto de perfil.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center transition-all group-hover:opacity-80">
                        {profileData.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profileData.image}
                            alt="Avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Camera className="h-6 w-6 text-white drop-shadow-md" />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 flex-1 w-full">
                    <div className="grid gap-2">
                      <Label htmlFor="image">URL do Avatar</Label>
                      <Input
                        id="image"
                        placeholder="https://exemplo.com/foto.jpg"
                        value={profileData.image}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            image: e.target.value,
                          })
                        }
                        className="bg-background/50 border-muted-foreground/20 focus:border-primary"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            name: e.target.value,
                          })
                        }
                        className="bg-background/50 border-muted-foreground/20 focus:border-primary"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="displayName">Nome de Exibição</Label>
                      <Input
                        id="displayName"
                        placeholder="Como quer ser chamado?"
                        value={profileData.displayName}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            displayName: e.target.value,
                          })
                        }
                        className="bg-background/50 border-muted-foreground/20 focus:border-primary"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Se vazio, usaremos seu nome completo:{" "}
                        <strong>{profileData.name}</strong>
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cpf">Documento / CPF</Label>
                      <Input
                        id="cpf"
                        placeholder="___.___.___-__"
                        value={profileData.cpf}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            cpf: e.target.value,
                          })
                        }
                        className="bg-background/50 border-muted-foreground/20 focus:border-primary"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Usado para ajudar o sistema a reconhecer transferências
                        internas em importação de arquivo.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              email: e.target.value,
                            })
                          }
                          className="pl-10 bg-background/50 border-muted-foreground/20 focus:border-primary"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-card/50 px-6 py-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4 max-w-md">
                <div className="grid gap-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                    required
                    className="bg-background/50 border-muted-foreground/20"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                    required
                    className="bg-background/50 border-muted-foreground/20"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    className="bg-background/50 border-muted-foreground/20"
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-card/50 px-6 py-4 flex justify-end">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Atualizar Senha"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
