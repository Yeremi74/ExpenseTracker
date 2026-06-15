const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database");
const { toObjectId, serializeDoc } = require("../utils/mongo");
const { parseCurrency } = require("../utils/currency");
const { parseDateInput, addDaysUTC } = require("../utils/date");
const debtPaymentsRouter = require("./debtPayments");

const router = express.Router();

function parseDirection(value) {
  if (value === "receivable" || value === "payable") return value;
  if (value == null || value === "") return "payable";
  throw new Error("direction must be payable or receivable");
}

function hasInstallments(debt) {
  return Array.isArray(debt.installments) && debt.installments.length > 0;
}

function sumInstallmentPaid(installments) {
  return installments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
}

function serializeInstallment(inst) {
  return {
    id: inst.id.toString(),
    number: inst.number,
    amount: inst.amount,
    dueDate: inst.dueDate instanceof Date ? inst.dueDate.toISOString() : inst.dueDate,
    paidAmount: inst.paidAmount || 0,
    settledAt: inst.settledAt instanceof Date ? inst.settledAt.toISOString() : inst.settledAt ?? null,
    settlementTransactionId: inst.settlementTransactionId?.toString() ?? null,
  };
}

function serializeDebt(doc) {
  const serialized = serializeDoc(doc);
  if (doc.installmentGroupId) {
    serialized.installmentGroupId = doc.installmentGroupId.toString();
  }
  if (doc.settlementTransactionId) {
    serialized.settlementTransactionId = doc.settlementTransactionId.toString();
  }
  if (hasInstallments(doc)) {
    serialized.installments = doc.installments.map(serializeInstallment);
  }
  return serialized;
}

function parseInstallments(value) {
  if (!value) return null;
  const count = Number(value.count);
  const intervalDays = Number(value.intervalDays);
  if (!Number.isInteger(count) || count < 2) {
    throw new Error("installments count must be at least 2");
  }
  if (!Number.isInteger(intervalDays) || intervalDays < 1) {
    throw new Error("installments intervalDays must be at least 1");
  }
  if (!value.firstDueDate) {
    throw new Error("installments firstDueDate is required");
  }
  return {
    count,
    intervalDays,
    firstDueDate: parseDateInput(value.firstDueDate),
  };
}

function buildInstallmentsArray(amountPerInstallment, parsedInstallments) {
  const items = [];
  for (let i = 0; i < parsedInstallments.count; i++) {
    items.push({
      id: new ObjectId(),
      number: i + 1,
      amount: amountPerInstallment,
      dueDate: addDaysUTC(parsedInstallments.firstDueDate, i * parsedInstallments.intervalDays),
      paidAmount: 0,
      settledAt: null,
      settlementTransactionId: null,
    });
  }
  return items;
}

async function createSettlementTransaction(db, debt, amount, categoryId, settlementDate, debtId) {
  const type = debt.direction === "receivable" ? "income" : "expense";
  const category = await db.collection("categories").findOne({ _id: categoryId });
  if (!category) throw new Error("category not found");
  if (category.type !== type) {
    throw new Error("category type does not match debt direction");
  }

  const transactionDoc = {
    type,
    amount,
    currency: debt.currency || "ves",
    categoryId,
    title: debt.name,
    description: debt.description?.trim() || "",
    date: settlementDate,
    debtId,
    createdAt: new Date(),
  };

  const txResult = await db.collection("transactions").insertOne(transactionDoc);
  return {
    transactionId: txResult.insertedId,
    transaction: serializeDoc({
      _id: txResult.insertedId,
      ...transactionDoc,
      categoryId: categoryId.toString(),
      debtId: debtId.toString(),
    }),
  };
}

router.post("/:id/settle", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const { date, categoryId, installmentId } = req.body;
    const catId = toObjectId(categoryId);
    if (!catId) return res.status(400).json({ error: "categoryId is required" });

    const db = getDb();
    const debt = await db.collection("debts").findOne({ _id: id });
    if (!debt) return res.status(404).json({ error: "not found" });

    const settlementDate = date
      ? parseDateInput(date)
      : parseDateInput(new Date().toISOString().slice(0, 10));

    if (hasInstallments(debt)) {
      if (!installmentId) {
        return res.status(400).json({ error: "installmentId is required for installment debts" });
      }

      const instObjectId = toObjectId(installmentId);
      if (!instObjectId) return res.status(400).json({ error: "invalid installmentId" });

      const installment = debt.installments.find((inst) => inst.id.equals(instObjectId));
      if (!installment) return res.status(404).json({ error: "installment not found" });

      const remaining = installment.amount - (installment.paidAmount || 0);
      if (remaining <= 0) {
        return res.status(400).json({ error: "installment is already settled" });
      }

      const { transactionId, transaction } = await createSettlementTransaction(
        db,
        {
          ...debt,
          name: `${debt.name} (Cuota ${installment.number}/${debt.installments.length})`,
        },
        remaining,
        catId,
        settlementDate,
        id
      );

      const updatedInstallments = debt.installments.map((inst) => {
        if (!inst.id.equals(instObjectId)) return inst;
        return {
          ...inst,
          paidAmount: inst.amount,
          settledAt: settlementDate,
          settlementTransactionId: transactionId,
        };
      });

      const result = await db.collection("debts").findOneAndUpdate(
        { _id: id },
        {
          $set: {
            installments: updatedInstallments,
            paidAmount: sumInstallmentPaid(updatedInstallments),
          },
        },
        { returnDocument: "after" }
      );

      return res.status(201).json({
        debt: serializeDebt(result),
        transaction,
      });
    }

    const remaining = debt.totalAmount - debt.paidAmount;
    if (remaining <= 0) {
      return res.status(400).json({ error: "debt is already settled" });
    }

    const { transactionId, transaction } = await createSettlementTransaction(
      db,
      debt,
      remaining,
      catId,
      settlementDate,
      id
    );

    const result = await db.collection("debts").findOneAndUpdate(
      { _id: id },
      {
        $set: {
          paidAmount: debt.totalAmount,
          settledAt: settlementDate,
          settlementTransactionId: transactionId,
        },
      },
      { returnDocument: "after" }
    );

    res.status(201).json({
      debt: serializeDebt(result),
      transaction,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use("/:debtId/payments", debtPaymentsRouter);

router.get("/", async (req, res) => {
  try {
    const docs = await getDb()
      .collection("debts")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json(docs.map(serializeDebt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, totalAmount, paidAmount, description, dueDate, currency, direction, installments } =
      req.body;

    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    if (!totalAmount || Number(totalAmount) <= 0) {
      return res.status(400).json({ error: "totalAmount must be greater than 0" });
    }

    const paid = paidAmount != null ? Number(paidAmount) : 0;
    if (paid < 0) return res.status(400).json({ error: "paidAmount cannot be negative" });

    let parsedCurrency;
    try {
      parsedCurrency = parseCurrency(currency);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    let parsedDirection;
    try {
      parsedDirection = parseDirection(direction);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const amountPerUnit = Number(totalAmount);

    if (installments) {
      if (paid > 0) {
        return res.status(400).json({ error: "paidAmount not supported for installments" });
      }

      let parsedInstallments;
      try {
        parsedInstallments = parseInstallments(installments);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }

      const installmentItems = buildInstallmentsArray(amountPerUnit, parsedInstallments);
      const doc = {
        name: name.trim(),
        totalAmount: amountPerUnit * parsedInstallments.count,
        paidAmount: 0,
        currency: parsedCurrency,
        direction: parsedDirection,
        description: description?.trim() || "",
        dueDate: null,
        installments: installmentItems,
        createdAt: new Date(),
      };

      const result = await getDb().collection("debts").insertOne(doc);
      return res.status(201).json(serializeDebt({ _id: result.insertedId, ...doc }));
    }

    if (paid > amountPerUnit) {
      return res.status(400).json({ error: "paidAmount cannot exceed totalAmount" });
    }

    const doc = {
      name: name.trim(),
      totalAmount: amountPerUnit,
      paidAmount: paid,
      currency: parsedCurrency,
      direction: parsedDirection,
      description: description?.trim() || "",
      dueDate: dueDate ? parseDateInput(dueDate) : null,
      createdAt: new Date(),
    };

    const result = await getDb().collection("debts").insertOne(doc);
    res.status(201).json(serializeDebt({ _id: result.insertedId, ...doc }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const existing = await getDb().collection("debts").findOne({ _id: id });
    if (!existing) return res.status(404).json({ error: "not found" });

    const { name, totalAmount, paidAmount, description, dueDate, currency, direction } = req.body;
    const update = {};

    if (name !== undefined) {
      if (!name?.trim()) return res.status(400).json({ error: "name is required" });
      update.name = name.trim();
    }
    if (totalAmount !== undefined) {
      if (Number(totalAmount) <= 0) {
        return res.status(400).json({ error: "totalAmount must be greater than 0" });
      }
      if (hasInstallments(existing)) {
        return res.status(400).json({ error: "totalAmount cannot be edited for installment debts" });
      }
      update.totalAmount = Number(totalAmount);
    }
    if (paidAmount !== undefined) {
      if (hasInstallments(existing)) {
        return res.status(400).json({ error: "paidAmount is managed through installments" });
      }
      if (Number(paidAmount) < 0) {
        return res.status(400).json({ error: "paidAmount cannot be negative" });
      }
      update.paidAmount = Number(paidAmount);
    }
    if (description !== undefined) update.description = description.trim();
    if (dueDate !== undefined && !hasInstallments(existing)) {
      update.dueDate = dueDate ? parseDateInput(dueDate) : null;
    }
    if (direction !== undefined) {
      try {
        update.direction = parseDirection(direction);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }
    if (currency !== undefined) {
      try {
        update.currency = parseCurrency(currency);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    if (!hasInstallments(existing)) {
      const nextTotal = update.totalAmount ?? existing.totalAmount;
      const nextPaid = update.paidAmount ?? existing.paidAmount;
      if (nextPaid > nextTotal) {
        return res.status(400).json({ error: "paidAmount cannot exceed totalAmount" });
      }
    }

    const result = await getDb()
      .collection("debts")
      .findOneAndUpdate({ _id: id }, { $set: update }, { returnDocument: "after" });

    res.json(serializeDebt(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const result = await getDb().collection("debts").deleteOne({ _id: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
