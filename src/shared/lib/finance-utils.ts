export function getFinanceReferenceMonth(
  date: Date,
  salaryDay: number = 25,
): string {
  const d = new Date(date.getTime()); // Cria uma cópia para não alterar a data original
  const day = d.getDate();

  if (day >= salaryDay) {
    // Definimos o dia como 1 antes de mudar o mês para evitar o erro de meses curtos/longos
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`; // Ex: "2026-04"
}
