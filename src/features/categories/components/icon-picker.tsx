"use client";

import {
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Building,
  Building2,
  Car,
  CreditCard,
  DollarSign,
  Edit2,
  Film,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Laptop,
  LineChart,
  Mail,
  MapPin,
  Phone,
  PiggyBank,
  Plane,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Star,
  Tag,
  TrendingUp,
  Tv,
  Utensils,
  Wallet,
  Watch,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";

const iconMap: Record<string, React.ComponentType<any>> = {
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Building,
  Building2,
  Briefcase,
  Car,
  CreditCard,
  DollarSign,
  Edit2,
  Film,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Laptop,
  LineChart,
  Mail,
  MapPin,
  Phone,
  PiggyBank,
  Plane,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Star,
  Tag,
  TrendingUp,
  Tv,
  Utensils,
  Wallet,
  Watch,
  Zap,
};

const availableIcons = Object.keys(iconMap);

const iconsByType: Record<string, string[]> = {
  EXPENSE: [
    "ShoppingCart",
    "ShoppingBag",
    "Car",
    "Home",
    "Utensils",
    "Film",
    "Gamepad2",
    "Tv",
    "Laptop",
    "Smartphone",
    "Plane",
    "Gift",
    "Heart",
    "GraduationCap",
  ],
  INCOME: [
    "Briefcase",
    "Banknote",
    "DollarSign",
    "Wallet",
    "TrendingUp",
    "ArrowUpRight",
  ],
  INVESTMENT: [
    "LineChart",
    "Building",
    "Building2",
    "PiggyBank",
    "TrendingUp",
    "Banknote",
  ],
  TRANSFER: [
    "ArrowLeftRight",
    "ArrowUpRight",
    "CreditCard",
    "Wallet",
    "Phone",
    "Mail",
  ],
};

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  type: string;
  trigger?: React.ReactNode;
}

export function IconPicker({
  value,
  onChange,
  type,
  trigger,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const icons = iconsByType[type] || availableIcons.slice(0, 20);

  const IconComponent = iconMap[value] || Tag;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-accent">
            <IconComponent className="h-4 w-4" />
            <span className="text-sm">{value || "Selecionar"}</span>
          </div>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escolha um ícone</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto p-1">
          {icons.map((iconName) => {
            const Icon = iconMap[iconName];
            const isSelected = value === iconName;
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => {
                  onChange(iconName);
                  setOpen(false);
                }}
                className={`flex items-center justify-center p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { iconMap, availableIcons };
export type { IconPickerProps };
