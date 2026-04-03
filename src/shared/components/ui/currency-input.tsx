"use client";

import { cn } from "@/shared/lib/utils";
import { FormControl, FormItem, FormLabel, FormMessage } from "./form";
import { Input } from "./input";

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  labelClassName?: string;
}

export function CurrencyInput({
  label,
  value,
  onChange,
  placeholder,
  className,
  labelClassName,
}: CurrencyInputProps) {
  const formatValue = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não é dígito e divide por 100
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = Number(rawValue) / 100;
    onChange(numericValue);
  };

  return (
    <FormItem>
      <FormLabel className={labelClassName}>{label}</FormLabel>
      <FormControl>
        <Input
          type="text" // Usamos text para a máscara funcionar
          placeholder={placeholder || "R$ 0,00"}
          onChange={handleChange}
          value={formatValue(value)}
          className={cn(className)} // Mantém os tamanhos padrões do Input a menos que sobrescritos
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
