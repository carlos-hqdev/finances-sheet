import { format } from "date-fns";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Landmark,
  Percent,
  PiggyBank,
  Target,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  InvestmentDetailActions,
  InvestmentLotTable,
} from "@/features/investments";
import { TransactionDialog } from "@/features/transactions";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { prisma } from "@/shared/lib/db";
import { formatCurrency } from "@/shared/lib/utils";

interface InvestmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvestmentDetailPage({
  params,
}: InvestmentDetailPageProps) {
  const { id } = await params;

  const investment = await prisma.investment.findUnique({
    where: { id },
    include: {
      lots: {
        orderBy: { date: "desc" },
      },
      transactions: {
        orderBy: { date: "desc" },
      },
    },
  });

  const [accountsRaw, categories, creditCardsRaw, investmentsListRaw] =
    await Promise.all([
      prisma.bankAccount.findMany(),
      prisma.category.findMany(),
      prisma.creditCard.findMany(),
      prisma.investment.findMany(),
    ]);

  const accounts = accountsRaw.map((acc) => ({
    id: acc.id,
    name: acc.name,
    balance: acc.balance.toNumber(),
  }));

  const investmentsList = investmentsListRaw.map((inv) => ({
    id: inv.id,
    name: inv.name,
    balance: inv.balance.toNumber(),
  }));

  const creditCards = creditCardsRaw.map((c) => ({
    id: c.id,
    name: "Cartão",
    accountId: c.accountId,
    limit: c.limit.toNumber(),
  }));

  if (!investment) {
    notFound();
  }

  // Convert Decimals to numbers for Client Components
  const balance = investment.balance.toNumber();
  const targetAmount = investment.targetAmount
    ? investment.targetAmount.toNumber()
    : null;
  const yieldRate = investment.yieldRate
    ? investment.yieldRate.toNumber()
    : null;
  const amount = investment.amount ? investment.amount.toNumber() : null;

  const mappedLots = investment.lots.map((lot) => ({
    id: lot.id,
    date: lot.date,
    originalPrice: lot.originalPrice.toNumber(),
    currentBalance: lot.currentBalance.toNumber(),
    isFullyWithdrawn: lot.isFullyWithdrawn,
  }));

  // Progress Bar logic
  let progressPercentage = 0;
  if (targetAmount && targetAmount > 0) {
    progressPercentage = Math.min(
      100,
      Math.max(0, (balance / targetAmount) * 100),
    );
  }

  const plainInvestment = {
    id: investment.id,
    name: investment.name,
    type: investment.type,
    institution: investment.institution,
    balance,
    targetAmount,
    yieldRate,
    amount,
    isDailyYield: investment.isDailyYield,
    indexer: investment.indexer,
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="mb-4">
        <Button
          variant="ghost"
          asChild
          className="text-muted-foreground hover:text-foreground pl-0"
        >
          <Link href="/investments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Investimentos
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <PiggyBank className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {investment.name}
            </h2>
            <div className="flex items-center text-muted-foreground mt-1">
              <Landmark className="mr-1 h-4 w-4" />
              <span>{investment.institution || "Outros"}</span>
              <span className="mx-2">•</span>
              <span className="uppercase text-xs font-semibold tracking-wider">
                {(() => {
                  const tipoFormatado =
                    {
                      SAVINGS: "Reserva / Caixinha",
                      FIXED: "Renda Fixa",
                      VARIABLE: "Renda Variável",
                      CRYPTO: "Criptomoedas",
                      FIIS: "Fundos Imobiliários",
                      OTHER: "Outros",
                    }[investment.type] || investment.type;

                  const indexador =
                    investment.indexer && investment.indexer !== "OTHER"
                      ? ` (${investment.indexer === "PREFIXED" ? "PRÉ" : investment.indexer})`
                      : "";

                  return `${tipoFormatado}${indexador}`;
                })()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <TransactionDialog
            accounts={accounts}
            categories={categories}
            creditCards={creditCards}
            investments={investmentsList}
            defaultType="TRANSFER"
            defaultDestinationAccountId={investment.id} // Entrando no investimento
            trigger={
              <Button
                variant="default"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <ArrowDownCircle className="w-4 h-4" />{" "}
                {investment.type === "FIXED" ? "Guardar" : "Aportar"}
              </Button>
            }
          />
          <TransactionDialog
            accounts={accounts}
            categories={categories}
            creditCards={creditCards}
            investments={investmentsList}
            defaultType="TRANSFER"
            defaultOriginAccountId={investment.id} // Saindo do investimento
            trigger={
              <Button
                variant="outline"
                className="gap-2 text-rose-500 hover:text-rose-600 border-rose-500/20 hover:bg-rose-500/10"
              >
                <ArrowUpCircle className="w-4 h-4" /> Resgatar
              </Button>
            }
          />
          <InvestmentDetailActions investment={plainInvestment} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meta (Target)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {targetAmount ? formatCurrency(targetAmount) : "Não definida"}
            </div>
            {targetAmount && targetAmount > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {investment.type === "FIXED" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Rendimento Configurado
              </CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {yieldRate
                  ? `${yieldRate}% ${
                      investment.indexer
                        ? investment.indexer === "PREFIXED"
                          ? "Prefixado"
                          : investment.indexer === "OTHER"
                            ? ""
                            : investment.indexer
                        : investment.isDailyYield
                          ? "CDI"
                          : ""
                    } ${investment.isDailyYield ? "(Diário)" : ""}`.trim()
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-foreground">
          Aportes e Lotes (PEPS)
        </h3>
        <InvestmentLotTable lots={mappedLots} investmentId={investment.id} />
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-foreground">
          Extrato da Caixinha
        </h3>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right pr-6">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investment.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhuma transação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  investment.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="pl-6 text-muted-foreground">
                        {format(tx.date, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {tx.description}
                      </TableCell>
                      <TableCell
                        className={`text-right pr-6 font-semibold ${tx.type === "INCOME" || (tx.type === "TRANSFER" && tx.paymentMethod === "APPLICATION") ? "text-emerald-500" : "text-foreground"}`}
                      >
                        {tx.type === "INCOME" ||
                        (tx.type === "TRANSFER" &&
                          tx.paymentMethod === "APPLICATION")
                          ? "+"
                          : "-"}
                        {formatCurrency(tx.amount.toNumber())}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
