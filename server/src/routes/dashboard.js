const express = require("express");
const { getDb } = require("../config/database");
const { getExchangeRates, convertToVes } = require("../utils/currency");
const { utcMonthRange } = require("../utils/date");
const { serializeDoc } = require("../utils/mongo");
const { withUser } = require("../utils/userScope");

const router = express.Router();

const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

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

router.get("/summary", async (req, res) => {
  try {
    const db = getDb();
    const userFilter = withUser(req.userId);
    const rates = await getExchangeRates(db, req.userId);

    const [transactions, debts] = await Promise.all([
      db.collection("transactions").find(userFilter).toArray(),
      db.collection("debts").find(userFilter).toArray(),
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

router.get("/monthly", async (req, res) => {
  try {
    const db = getDb();
    const rates = await getExchangeRates(db, req.userId);
    const range = currentMonthRange();
    const transactions = await db
      .collection("transactions")
      .find(withUser(req.userId))
      .toArray();

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

router.get("/alerts", async (req, res) => {
  try {
    const db = getDb();
    const userFilter = withUser(req.userId);
    const rates = await getExchangeRates(db, req.userId);
    const { start, end } = currentMonthRange();

    const [budgets, transactions, categories, debts] = await Promise.all([
      db.collection("budgets").find(userFilter).toArray(),
      db
        .collection("transactions")
        .find({ ...userFilter, type: "expense", date: { $gte: start, $lte: end } })
        .toArray(),
      db.collection("categories").find({ ...userFilter, type: "expense" }).toArray(),
      db.collection("debts").find(userFilter).toArray(),
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

    const hasInstallments = (debt) =>
      Array.isArray(debt.installments) && debt.installments.length > 0;

    const upcomingDebts = [];

    for (const debt of debts) {
      if (hasInstallments(debt)) {
        for (const inst of debt.installments) {
          if ((inst.paidAmount || 0) >= inst.amount) continue;
          if (!inst.dueDate) continue;
          const due = new Date(inst.dueDate);
          const now = new Date();
          const week = new Date(Date.now() + 7 * 86400000);
          if (due >= now && due <= week) {
            upcomingDebts.push({ debt, inst });
          }
        }
        continue;
      }

      if (!debt.dueDate) continue;
      const due = new Date(debt.dueDate);
      const now = new Date();
      const week = new Date(Date.now() + 7 * 86400000);
      if (due >= now && due <= week && debt.paidAmount < debt.totalAmount) {
        upcomingDebts.push({ debt, inst: null });
      }
    }

    for (const { debt, inst } of upcomingDebts) {
      const isReceivable = (debt.direction || "payable") === "receivable";
      const label = inst
        ? `${debt.name} (Cuota ${inst.number}/${debt.installments.length})`
        : debt.name;
      const dueDate = inst ? inst.dueDate : debt.dueDate;
      const amount = inst
        ? inst.amount - (inst.paidAmount || 0)
        : debt.totalAmount - debt.paidAmount;

      alerts.push({
        level: "info",
        type: "debt",
        debtId: debt._id.toString(),
        categoryName: label,
        message: `${isReceivable ? "Cobro" : "Pago"} próximo: ${label} vence ${dueDate.toISOString().slice(0, 10)}`,
        amount,
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

router.get("/trends", async (req, res) => {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 12);
    const db = getDb();
    const rates = await getExchangeRates(db, req.userId);
    const transactions = await db
      .collection("transactions")
      .find(withUser(req.userId))
      .toArray();
    const now = new Date();
    const currentYear = now.getUTCFullYear();

    const periods = [];
    for (let offset = months - 1; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(currentYear, now.getUTCMonth() - offset, 1));
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const range = utcMonthRange(year, month);
      const income = sumTransactions(transactions, rates, "income", range);
      const expenses = sumTransactions(transactions, rates, "expense", range);

      periods.push({
        year,
        month,
        label: year === currentYear ? MONTH_LABELS[month - 1] : `${MONTH_LABELS[month - 1]} ${year}`,
        income,
        expenses,
        net: income - expenses,
      });
    }

    res.json({ periods, baseCurrency: "ves" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/expenses-by-category", async (req, res) => {
  try {
    const db = getDb();
    const userFilter = withUser(req.userId);
    const rates = await getExchangeRates(db, req.userId);
    const { start, end } = currentMonthRange();

    const [transactions, categories] = await Promise.all([
      db
        .collection("transactions")
        .find({ ...userFilter, type: "expense", date: { $gte: start, $lte: end } })
        .toArray(),
      db.collection("categories").find({ ...userFilter, type: "expense" }).toArray(),
    ]);

    const categoryMap = Object.fromEntries(
      categories.map((category) => [category._id.toString(), category.name])
    );
    const amounts = {};

    for (const tx of transactions) {
      const key = tx.categoryId?.toString() ?? "uncategorized";
      const converted = convertToVes(tx.amount, tx.currency || "ves", rates);
      amounts[key] = (amounts[key] ?? 0) + converted;
    }

    const total = Object.values(amounts).reduce((sum, value) => sum + value, 0);
    const items = Object.entries(amounts)
      .map(([categoryId, amount]) => ({
        categoryId: categoryId === "uncategorized" ? null : categoryId,
        name: categoryMap[categoryId] || "Sin categoría",
        amount,
        percentage: total > 0 ? amount / total : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    res.json({ items, total, baseCurrency: "ves" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/recent", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 20);
    const db = getDb();
    const userFilter = withUser(req.userId);
    const rates = await getExchangeRates(db, req.userId);

    const [transactions, categories] = await Promise.all([
      db
        .collection("transactions")
        .find(userFilter)
        .sort({ date: -1, createdAt: -1 })
        .limit(limit)
        .toArray(),
      db.collection("categories").find(userFilter).toArray(),
    ]);

    const categoryMap = Object.fromEntries(
      categories.map((category) => [category._id.toString(), category.name])
    );

    res.json(
      transactions.map((doc) => {
        const serialized = serializeDoc(doc);
        const categoryId = serialized.categoryId?.toString?.() ?? serialized.categoryId;
        return {
          ...serialized,
          categoryId,
          categoryName: categoryMap[categoryId] || "Sin categoría",
          amountVes: convertToVes(doc.amount, doc.currency || "ves", rates),
        };
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
