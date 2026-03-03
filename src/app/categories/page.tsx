import { CategoryDialog } from "@/features/categories/components/category-dialog";
import { CategoryActions } from "@/features/categories/components/category-actions";
import { prisma } from "@/shared/lib/db";
import { DashboardLayout } from "@/shared/widgets/dashboard-overview/dashboard-layout";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  // Fetch the first user to assign categories to. Logic should be updated when auth is fully in place.
  const user = await prisma.user.findFirst();

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Categorias
          </h2>
          <p className="text-muted-foreground">
            Organize suas transações por categorias personalizadas.
          </p>
        </div>
        {user && <CategoryDialog userId={user.id} />}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            Nenhuma categoria encontrada.
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: cat.color ? `${cat.color}20` : "#3f3f4620",
                  color: cat.color || "#a1a1aa",
                }}
              >
                {cat.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-medium text-card-foreground">{cat.name}</h3>
              </div>

              {user && (
                <div className="ml-auto">
                  <CategoryActions category={cat} userId={user.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
