"use client";

import { CalendarDays } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface MonthPickerProps {
  availableMonths: string[];
  currentMonth?: string;
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

export function DashboardMonthPicker({
  availableMonths,
  currentMonth,
}: MonthPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [currentRef, setCurrentRef] = useState<string>("");
  const [currentYear, setCurrentYear] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    setCurrentRef(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    );
    setCurrentYear(now.getFullYear().toString());
    setMounted(true);
  }, []);

  const handleMonthChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "current") {
      params.delete("month");
    } else {
      params.set("month", value);
    }

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const formatLabel = (ref: string) => {
    if (!ref || !ref.includes("-")) return ref;
    const [, month] = ref.split("-");
    return MONTH_NAMES[month] || ref;
  };

  const currentYearMonths = mounted
    ? availableMonths.filter(
        (m) => m.startsWith(currentYear) && m !== currentRef,
      )
    : [];

  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted p-2 rounded-lg">
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
      </div>
      <Select
        defaultValue={currentMonth || "current"}
        onValueChange={handleMonthChange}
        disabled={isPending || !mounted}
      >
        <SelectTrigger className="w-45 bg-card border-border font-medium">
          <SelectValue placeholder="Selecione o mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Mês Atual</SelectItem>
          {mounted &&
            currentYearMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {formatLabel(m)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
