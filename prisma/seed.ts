import { prisma } from "../src/shared/lib/db";

async function main() {
  console.log("Iniciando o script de seed...");

  console.log("Limpando banco de dados...");
  await prisma.investmentLot.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Hash real da senha 'qwer1234' capturado do banco de dados (Better Auth scrypt format)
  const realHash =
    "6757d4260edaf7f866188e0831510ad9:dfc3792b4895c498eb51646ba9bf79ea3e4f90c2724d87f3ecee8bb7642ecb7442faa9f37e6f3aefa674de683975188faa66a81f33b7e5d410970ba080e3e680";

  // 1. Criar Usuário Carlos
  console.log("Criando usuário Carlos...");
  const userCarlos = await prisma.user.create({
    data: {
      name: "Carlos",
      email: "carlos@admin.dev",
      accounts: {
        create: {
          providerId: "credential",
          accountId: "carlos@admin.dev", // Better Auth costuma usar o email como accountId em credentials
          password: realHash,
        },
      },
    },
  });

  // 2. Criar Usuário Henrique
  console.log("Criando usuário Henrique...");
  const userHenrique = await prisma.user.create({
    data: {
      name: "Henrique",
      email: "henrique@admin.dev",
      accounts: {
        create: {
          providerId: "credential",
          accountId: "henrique@admin.dev",
          password: realHash,
        },
      },
    },
  });

  // --------------------------------------------------------
  // DADOS DO CARLOS
  // --------------------------------------------------------
  console.log("Populando dados do Carlos...");
  const categories = [
    "Alimentação",
    "Moradia",
    "Transporte",
    "Lazer",
    "Salário",
  ];
  const categoryMapCarlos: Record<string, string> = {};
  for (const name of categories) {
    const cat = await prisma.category.create({
      data: { name, userId: userCarlos.id, color: "#3b82f6" },
    });
    categoryMapCarlos[name] = cat.id;
  }

  const bradesco = await prisma.bankAccount.create({
    data: {
      userId: userCarlos.id,
      name: "Bradesco",
      type: "CHECKING",
      balance: 5000,
    },
  });
  const nubank = await prisma.bankAccount.create({
    data: {
      userId: userCarlos.id,
      name: "Nubank",
      type: "CHECKING",
      balance: 2000,
    },
  });

  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const ref = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    await prisma.transaction.create({
      data: {
        accountId: bradesco.id,
        categoryId: categoryMapCarlos["Salário"],
        amount: 3000,
        type: "INCOME",
        date: new Date(date.getFullYear(), date.getMonth(), 5),
        description: "Salário Mensal Carlos",
        isPaid: true,
        referenceMonth: ref,
      },
    });

    await prisma.transaction.create({
      data: {
        accountId: nubank.id,
        categoryId: categoryMapCarlos["Alimentação"],
        amount: 150,
        type: "EXPENSE",
        date: new Date(date.getFullYear(), date.getMonth(), 10),
        description: "Supermercado Carlos",
        isPaid: true,
        referenceMonth: ref,
      },
    });
  }

  // --------------------------------------------------------
  // DADOS DO HENRIQUE
  // --------------------------------------------------------
  console.log("Populando dados do Henrique (Apenas bancos, sem transações)...");
  await prisma.bankAccount.create({
    data: {
      userId: userHenrique.id,
      name: "Itaú",
      type: "CHECKING",
      balance: 10000,
    },
  });
  await prisma.bankAccount.create({
    data: {
      userId: userHenrique.id,
      name: "Inter",
      type: "CHECKING",
      balance: 500,
    },
  });

  console.log("Seed concluído com sucesso!");
  console.log("Senha para todos: qwer1234");
  console.log("Emails: carlos@admin.dev | henrique@admin.dev");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
