"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftRight,
  Briefcase,
  ChevronDown,
  ShoppingCart,
  Tag,
  TrendingUp,
} from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  createCategory,
  updateCategory,
} from "@/features/categories/actions/category-actions";
import {
  type CategoryType,
  createCategorySchema,
} from "@/features/categories/schemas";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { availableIcons, iconMap } from "./icon-picker";

const formSchema = createCategorySchema;

type CategoryFormValues = {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
};

const typeConfig: Record<
  CategoryType,
  { label: string; icon: React.ComponentType<any>; color: string }
> = {
  EXPENSE: { label: "Despesa", icon: ShoppingCart, color: "#ef4444" },
  INCOME: { label: "Receita", icon: Briefcase, color: "#22c55e" },
  INVESTMENT: { label: "Investimento", icon: TrendingUp, color: "#3b82f6" },
  TRANSFER: { label: "Transferência", icon: ArrowLeftRight, color: "#a855f7" },
};

const typeOptions: CategoryType[] = [
  "EXPENSE",
  "INCOME",
  "INVESTMENT",
  "TRANSFER",
];

interface CategoryDialogProps {
  userId: string;
  initialData?: CategoryFormValues & { id: string };
  trigger?: React.ReactNode;
}

export function CategoryDialog({
  userId,
  initialData,
  trigger,
}: CategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditing = !!initialData;
  const [_selectedType, setSelectedType] = useState<CategoryType>(
    initialData?.type || "EXPENSE",
  );
  const [showIconPicker, setShowIconPicker] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "EXPENSE",
      color: initialData?.color || "#000000",
      icon: initialData?.icon || "Tag",
    },
  });

  async function onSubmit(values: CategoryFormValues) {
    startTransition(async () => {
      try {
        if (isEditing && initialData) {
          await updateCategory(initialData.id, {
            ...values,
            userId: userId,
          });
        } else {
          await createCategory({
            ...values,
            userId: userId,
          });
        }
        setOpen(false);
        if (!isEditing) form.reset();
      } catch (error) {
        console.error("Failed to submit category", error);
      }
    });
  }

  const selectedIconName = form.watch("icon") || "Tag";
  const selectedColor = form.watch("color") || "#000000";
  const SelectedIconComponent = iconMap[selectedIconName] || Tag;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Adicionar Categoria</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo como cards clicáveis */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Tipo</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {typeOptions.map((type) => {
                      const config = typeConfig[type];
                      const isSelected = field.value === type;
                      const IconComp = config.icon;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            field.onChange(type);
                            setSelectedType(type);
                          }}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${config.color}20` }}
                          >
                            <IconComp
                              className="h-5 w-5"
                              style={{ color: config.color }}
                            />
                          </div>
                          <span className="font-medium">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nome com preview */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Nome</FormLabel>
                  <div className="space-y-3">
                    <FormControl>
                      <Input
                        placeholder="Ex: Alimentação"
                        {...field}
                        className="text-base h-12"
                      />
                    </FormControl>
                    {/* Preview */}
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: `${selectedColor}20`,
                          color: selectedColor,
                        }}
                      >
                        <SelectedIconComponent className="h-5 w-5" />
                      </div>
                      <span className="font-medium text-card-foreground">
                        {field.value || "Prévia da categoria"}
                      </span>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ícone como grid inline */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Ícone</FormLabel>
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <SelectedIconComponent className="h-5 w-5" />
                      <span className="text-sm">
                        {field.value || "Selecionar ícone"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        showIconPicker ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {showIconPicker && (
                    <div className="grid grid-cols-5 gap-2 p-3 border rounded-lg mt-2">
                      {availableIcons.map((iconName) => {
                        const Icon = iconMap[iconName];
                        const isSelected = field.value === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => {
                              field.onChange(iconName);
                              setShowIconPicker(false);
                            }}
                            className={`flex items-center justify-center p-3 rounded-lg border transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cor com presets */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Cor</FormLabel>
                  <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {[
                        "#ef4444",
                        "#f97316",
                        "#eab308",
                        "#22c55e",
                        "#14b8a6",
                        "#3b82f6",
                        "#8b5cf6",
                        "#ec4899",
                        "#6b7280",
                        "#000000",
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={`h-8 w-8 rounded-full border-2 transition-all ${
                            field.value === color
                              ? "border-foreground scale-110"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="w-12 h-10 p-1 cursor-pointer"
                        {...field}
                      />
                      <Input
                        type="text"
                        placeholder="#000000"
                        {...field}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isPending}
            >
              {isPending
                ? "Salvando..."
                : isEditing
                  ? "Salvar Alterações"
                  : "Salvar Categoria"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
