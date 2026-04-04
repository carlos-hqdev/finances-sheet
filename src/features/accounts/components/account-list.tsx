import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatCurrency } from "@/shared/lib/utils";
import { getAccounts } from "../actions/account-actions";
import { AccountActions } from "./account-actions";

export async function AccountList() {
  const accounts = await getAccounts();

  if (accounts.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card">
        Nenhuma conta cadastrada.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table className="w-full text-sm text-left text-muted-foreground">
        <TableHeader className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="px-6 py-3 text-muted-foreground">
              Nome
            </TableHead>
            <TableHead className="px-6 py-3 text-muted-foreground">
              Instituição
            </TableHead>
            <TableHead className="px-6 py-3 text-muted-foreground">
              Tipo
            </TableHead>
            <TableHead className="px-6 py-3 text-right text-muted-foreground w-37.5">
              Saldo
            </TableHead>
            <TableHead className="px-6 py-3 w-12.5 text-center text-muted-foreground">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow
              key={account.id}
              className="border-b border-border hover:bg-muted/50 transition-colors"
            >
              <TableCell className="px-6 py-4 font-medium text-foreground">
                {account.name}
              </TableCell>
              <TableCell className="px-6 py-4 text-muted-foreground">
                {account.institution || "-"}
              </TableCell>
              <TableCell className="px-6 py-4">
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground border-border"
                >
                  {{
                    CHECKING: "Conta Corrente",
                    INVESTMENT: "Investimento / Caixinha",
                    CASH: "Dinheiro Vivo",
                  }[account.type] || account.type}
                </Badge>
              </TableCell>
              <TableCell className="px-6 py-4 text-right font-semibold text-foreground">
                {formatCurrency(Number(account.balance))}
              </TableCell>
              <TableCell className="px-6 py-4 text-center">
                <AccountActions account={account} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
