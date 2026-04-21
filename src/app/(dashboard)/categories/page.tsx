import { Tag } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CategoryActions, CategoryDialog } from "@/features/categories";
import { iconMap } from "@/features/categories/components/icon-picker";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/db";

const typeLabels: Record<string, string> = {
  EXPENSE: "Despesas",
  INCOME: "Receitas",
  INVESTMENT: "Investimentos",
  TRANSFER: "Transferências",
};

const _typeColors: Record<string, string> = {
  EXPENSE: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
  INCOME:
    "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30",
  INVESTMENT:
    "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30",
  TRANSFER:
    "border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30",
};

export default async function CategoriesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/sign-in");
  }

  const userId = session.user.id;

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const groupedCategories = categories.reduce(
    (acc, cat) => {
      const type = cat.type || "EXPENSE";
      if (!acc[type]) acc[type] = [];
      acc[type].push(cat);
      return acc;
    },
    {} as Record<string, typeof categories>,
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Categorias
          </h2>
          <p className="text-muted-foreground">
            Organize suas transações por categorias personalizadas.
          </p>
        </div>
        {userId && <CategoryDialog userId={userId} />}
      </div>

      {Object.entries(typeLabels).map(([type, label]) => {
        const typeCategories = groupedCategories[type] || [];

        return (
          <div key={type} className="mb-8">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {label}
              <span className="text-sm text-muted-foreground font-normal">
                ({typeCategories.length})
              </span>
            </h3>

            {typeCategories.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                Nenhuma categoria de {label.toLowerCase()}.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {typeCategories.map((cat) => {
                  const iconName =
                    cat.icon && iconMap[cat.icon] ? cat.icon : "Tag";
                  const IconComponent = iconMap[iconName] || Tag;

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
                    >
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{
                          backgroundColor: cat.color
                            ? `${cat.color}20`
                            : "#3f3f4620",
                          color: cat.color || "#a1a1aa",
                        }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-card-foreground">
                          {cat.name}
                        </h3>
                      </div>

                      {userId && (
                        <div className="ml-auto">
                          <CategoryActions category={cat} userId={userId} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
