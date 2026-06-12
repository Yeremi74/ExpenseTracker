const express = require("express");
const { getDb } = require("../config/database");
const { getExchangeRates, convertToVes } = require("../utils/currency");
const { utcMonthRange } = require("../utils/date");

const router = express.Router();

function currentMonthRange() {
  const now = new Date();
  return utcMonthRange(now.getFullYear(), now.getMonth() + 1);
}

function sumTransactions(transactions, rates, type, dateRange) {
  return transactions
    .filter((tx) => {
      if (type && tx.type !== type) return false;
      if (dateRange) {
        const date = new Date(tx.date);
        if (date < dateRange.start || date > dateRange.end) return false;
      }
      return true;
    })
    .reduce(
      (sum, tx) => sum + convertToVes(tx.amount, tx.currency || "ves", rates),
      0
    );
}

router.get("/summary", async (_req, res) => {
  try {
    const db = getDb();
    const rates = await getExchangeRates(db);

    const [transactions, debts] = await Promise.all([
      db.collection("transactions").find({}).toArray(),
      db.collection("debts").find({}).toArray(),
    ]);

    const totalIncome = sumTransactions(transactions, rates, "income");
    const totalExpenses = sumTransactions(transactions, rates, "expense");
    const totalDebts = debts.reduce(
      (sum, debt) => {
        if ((debt.direction || "payable") !== "payable") return sum;
        return (
          sum +
          convertToVes(
            debt.totalAmount - debt.paidAmount,
            debt.currency || "ves",
            rates
          )
        );
      },
      0
    );
    const totalReceivables = debts.reduce(
      (sum, debt) => {
        if (debt.direction !== "receivable") return sum;
        return (
          sum +
          convertToVes(
            debt.totalAmount - debt.paidAmount,
            debt.currency || "ves",
            rates
          )
        );
      },
      0
    );

    res.json({
      balance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      totalDebts,
      totalReceivables,
      debtCount: debts.length,
      transactionCount: transactions.length,
      baseCurrency: "ves",
      rates,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monthly", async (_req, res) => {
  try {
    const db = getDb();
    const rates = await getExchangeRates(db);
    const range = currentMonthRange();
    const transactions = await db.collection("transactions").find({}).toArray();

    const monthIncome = sumTransactions(transactions, rates, "income", range);
    const monthExpenses = sumTransactions(transactions, rates, "expense", range);

    res.json({
      monthIncome,
      monthExpenses,
      monthBalance: monthIncome - monthExpenses,
      baseCurrency: "ves",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/alerts", async (_req, res) => {
  try {
    const db = getDb();
    const rates = await getExchangeRates(db);
    const { start, end } = currentMonthRange();

    const [budgets, transactions, categories, debts] = await Promise.all([
      db.collection("budgets").find({}).toArray(),
      db
        .collection("transactions")
        .find({ type: "expense", date: { $gte: start, $lte: end } })
        .toArray(),
      db.collection("categories").find({ type: "expense" }).toArray(),
      db.collection("debts").find({}).toArray(),
    ]);

    const spentMap = {};
    for (const tx of transactions) {
      const key = tx.categoryId.toString();
      const converted = convertToVes(tx.amount, tx.currency || "ves", rates);
      spentMap[key] = (spentMap[key] ?? 0) + converted;
    }

    const categoryMap = Object.fromEntries(
      categories.map((c) => [c._id.toString(), c.name])
    );

    const alerts = [];

    if (rates.usdBcv <= 0 || rates.usdt <= 0) {
      alerts.push({
        level: "warning",
        type: "rates",
        message: "Configura las tasas de cambio para cálculos precisos",
      });
    }

    for (const budget of budgets) {
      const categoryId = budget.categoryId?.toString() ?? null;
      const spent = categoryId
        ? (spentMap[categoryId] ?? 0)
        : Object.values(spentMap).reduce((s, v) => s + v, 0);
      const budgetVes = convertToVes(budget.amount, budget.currency || "ves", rates);
      const usage = budgetVes > 0 ? spent / budgetVes : 0;

      if (usage >= 1) {
        alerts.push({
          level: "critical",
          type: categoryId ? "category" : "global",
          categoryId,
          categoryName: categoryId ? categoryMap[categoryId] : "Presupuesto general",
          budget: budgetVes,
          spent,
          usage,
          message: categoryId
            ? `Superaste el presupuesto de ${categoryMap[categoryId] || "categoría"}`
            : "Superaste tu presupuesto mensual general",
        });
      } else if (usage >= 0.8) {
        alerts.push({
          level: "warning",
          type: categoryId ? "category" : "global",
          categoryId,
          categoryName: categoryId ? categoryMap[categoryId] : "Presupuesto general",
          budget: budgetVes,
          spent,
          usage,
          message: categoryId
            ? `Estás al ${Math.round(usage * 100)}% del presupuesto de ${categoryMap[categoryId] || "categoría"}`
            : `Estás al ${Math.round(usage * 100)}% de tu presupuesto mensual`,
        });
      }
    }

    const upcomingDebts = debts.filter((debt) => {
      if (!debt.dueDate) return false;
      const due = new Date(debt.dueDate);
      const now = new Date();
      const week = new Date(Date.now() + 7 * 86400000);
      return due >= now && due <= week && debt.paidAmount < debt.totalAmount;
    });

    for (const debt of upcomingDebts) {
      alerts.push({
        level: "info",
        type: "debt",
        debtId: debt._id.toString(),
        categoryName: debt.name,
        message: `${(debt.direction || "payable") === "receivable" ? "Cobro" : "Pago"} próximo: ${debt.name} vence ${debt.dueDate.toISOString().slice(0, 10)}`,
        amount: debt.totalAmount - debt.paidAmount,
        currency: debt.currency || "ves",
      });
    }

    alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.level] - order[b.level];
    });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
