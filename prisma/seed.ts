import { prisma } from "../src/shared/lib/db";

async function main() {
  console.log("Iniciando o script de seed...");

  const userId = "cm4nt3q2v0000abc123456789";

  console.log("Limpando banco de dados...");
  // Deleção em ordem para respeitar chaves estrangeiras
  await prisma.investmentLot.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();

  console.log("Criando usuário de teste...");
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: "teste@example.com",
      name: "Usuário de Teste",
    },
  });

  console.log("Criando categorias...");
  const catAlimentacao = await prisma.category.create({
    data: { name: "Alimentação", userId: user.id, color: "#ef4444", icon: "Utensils" },
  });
  const catMoradia = await prisma.category.create({
    data: { name: "Moradia", userId: user.id, color: "#3b82f6", icon: "Home" },
  });
  const catTransporte = await prisma.category.create({
    data: { name: "Transporte", userId: user.id, color: "#f59e0b", icon: "Car" },
  });
  const catLazer = await prisma.category.create({
    data: { name: "Lazer", userId: user.id, color: "#8b5cf6", icon: "Gamepad2" },
  });
  const catSalario = await prisma.category.create({
    data: { name: "Salário", userId: user.id, color: "#10b981", icon: "Briefcase" },
  });

  console.log("Criando Contas Correntes...");
  const accountBradesco = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Bradesco",
      type: "CHECKING",
      balance: 2500,
      color: "#cc092f",
    },
  });

  const accountNubank = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Nubank",
      type: "CHECKING",
      balance: 1200,
      color: "#8a05be",
    },
  });

  console.log("Criando Caixinhas (Investments)...");
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dMinus2 = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const invReserva = await prisma.investment.create({
    data: {
      userId: user.id,
      name: "Reserva de Emergência",
      type: "FIXED",
      institution: "Mercado Pago",
      balance: 5000,
      targetAmount: 10000,
    },
  });
  const txReserva = await prisma.transaction.create({
    data: {
      accountId: accountBradesco.id,
      investmentId: invReserva.id,
      amount: 5000,
      type: "TRANSFER",
      paymentMethod: "APPLICATION",
      date: dMinus2,
      description: "Aporte Inicial Reserva",
      isPaid: true,
      referenceMonth: `${dMinus2.getFullYear()}-${String(dMinus2.getMonth() + 1).padStart(2, "0")}`,
    }
  });
  await prisma.investmentLot.create({
    data: {
      investmentId: invReserva.id,
      transactionId: txReserva.id,
      date: dMinus2,
      originalPrice: 5000,
      currentBalance: 5000,
      isFullyWithdrawn: false,
    }
  });

  const invDividas = await prisma.investment.create({
    data: {
      userId: user.id,
      name: "Regularizar Dívidas",
      type: "FIXED",
      institution: "Mercado Pago",
      balance: 1000,
      targetAmount: 3000,
    },
  });
  const txDividas = await prisma.transaction.create({
    data: {
      accountId: accountNubank.id,
      investmentId: invDividas.id,
      amount: 1000,
      type: "TRANSFER",
      paymentMethod: "APPLICATION",
      date: dMinus2,
      description: "Aporte Inicial Dívidas",
      isPaid: true,
      referenceMonth: `${dMinus2.getFullYear()}-${String(dMinus2.getMonth() + 1).padStart(2, "0")}`,
    }
  });
  await prisma.investmentLot.create({
    data: {
      investmentId: invDividas.id,
      transactionId: txDividas.id,
      date: dMinus2,
      originalPrice: 1000,
      currentBalance: 1000,
      isFullyWithdrawn: false,
    }
  });

  const invCasa = await prisma.investment.create({
    data: {
      userId: user.id,
      name: "Comprar Casa",
      type: "FIXED",
      institution: "Nubank",
      balance: 15000,
      targetAmount: 100000,
    },
  });
  const txCasa = await prisma.transaction.create({
    data: {
      accountId: accountNubank.id,
      investmentId: invCasa.id,
      amount: 15000,
      type: "TRANSFER",
      paymentMethod: "APPLICATION",
      date: dMinus2,
      description: "Aporte Inicial Casa",
      isPaid: true,
      referenceMonth: `${dMinus2.getFullYear()}-${String(dMinus2.getMonth() + 1).padStart(2, "0")}`,
    }
  });
  await prisma.investmentLot.create({
    data: {
      investmentId: invCasa.id,
      transactionId: txCasa.id,
      date: dMinus2,
      originalPrice: 15000,
      currentBalance: 15000,
      isFullyWithdrawn: false,
    }
  });

  console.log("Criando Transações...");

  const transactionsData = [
    // Receita
    {
      accountId: accountBradesco.id,
      categoryId: catSalario.id,
      amount: 5000,
      type: "INCOME",
      paymentMethod: "PIX",
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      description: "Salário Mensal",
      isPaid: true,
      referenceMonth: currentMonthYear,
    },
    // Despesas
    {
      accountId: accountBradesco.id,
      categoryId: catAlimentacao.id,
      amount: 450,
      type: "EXPENSE",
      paymentMethod: "DEBIT_CARD",
      date: new Date(now.getFullYear(), now.getMonth(), 8),
      description: "Supermercado Extra",
      isPaid: true,
      referenceMonth: currentMonthYear,
    },
    {
      accountId: accountBradesco.id,
      categoryId: catAlimentacao.id,
      amount: 120,
      type: "EXPENSE",
      paymentMethod: "PIX",
      date: new Date(now.getFullYear(), now.getMonth(), 12),
      description: "Ifood",
      isPaid: true,
      referenceMonth: currentMonthYear,
    },
    {
      accountId: accountNubank.id,
      categoryId: catMoradia.id,
      amount: 250,
      type: "EXPENSE",
      paymentMethod: "PIX",
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      description: "Conta de Luz",
      isPaid: true,
      referenceMonth: currentMonthYear,
    },
    {
      accountId: accountNubank.id,
      categoryId: catTransporte.id,
      amount: 45,
      type: "EXPENSE",
      paymentMethod: "DEBIT_CARD",
      date: new Date(now.getFullYear(), now.getMonth(), 15),
      description: "Uber Ida",
      isPaid: true,
      referenceMonth: currentMonthYear,
    },
    {
      accountId: accountNubank.id,
      categoryId: catTransporte.id,
      amount: 50,
      type: "EXPENSE",
      paymentMethod: "DEBIT_CARD",
      date: new Date(now.getFullYear(), now.getMonth(), 16),
      description: "Uber Volta",
      isPaid: true,
      referenceMonth: currentMonthYear,
    },
    {
      accountId: accountBradesco.id,
      categoryId: catLazer.id,
      amount: 180,
      type: "EXPENSE",
      paymentMethod: "DEBIT_CARD",
      date: new Date(now.getFullYear(), now.getMonth(), 20),
      description: "Cinema + Shopping",
      isPaid: true,
      referenceMonth: currentMonthYear,
    },
    // Transferências para caixinhas (Aportes)
    {
      accountId: accountBradesco.id,
      investmentId: invReserva.id,
      amount: 500,
      type: "TRANSFER",
      paymentMethod: "APPLICATION",
      date: new Date(now.getFullYear(), now.getMonth(), 6),
      description: "Aporte Reserva",
      isPaid: true,
      referenceMonth: currentMonthYear,
    },
    {
      accountId: accountNubank.id,
      investmentId: invCasa.id,
      amount: 300,
      type: "TRANSFER",
      paymentMethod: "APPLICATION",
      date: new Date(now.getFullYear(), now.getMonth(), 7),
      description: "Aporte Casa",
      isPaid: true,
      referenceMonth: currentMonthYear,
    },
    {
      accountId: accountNubank.id,
      investmentId: invDividas.id,
      amount: 200,
      type: "TRANSFER",
      paymentMethod: "APPLICATION",
      date: new Date(now.getFullYear(), now.getMonth(), 8),
      description: "Aporte Dívidas",
      isPaid: true,
      referenceMonth: currentMonthYear,
    },
  ];

  for (const t of transactionsData) {
    const createdTx = await prisma.transaction.create({ data: t });
    
    if (t.investmentId) {
      await prisma.investmentLot.create({
        data: {
          investmentId: t.investmentId,
          transactionId: createdTx.id,
          date: t.date,
          originalPrice: t.amount,
          currentBalance: t.amount,
          isFullyWithdrawn: false,
        }
      });
    }
  }

  console.log("Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
