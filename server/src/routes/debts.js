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

function serializeDebt(doc) {
  const serialized = serializeDoc(doc);
  if (doc.installmentGroupId) {
    serialized.installmentGroupId = doc.installmentGroupId.toString();
  }
  if (doc.settlementTransactionId) {
    serialized.settlementTransactionId = doc.settlementTransactionId.toString();
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

function buildInstallmentDocs(base, installments, groupId) {
  const docs = [];
  for (let i = 0; i < installments.count; i++) {
    docs.push({
      ...base,
      name: `${base.name} (Cuota ${i + 1}/${installments.count})`,
      dueDate: addDaysUTC(installments.firstDueDate, i * installments.intervalDays),
      installmentGroupId: groupId,
      installmentNumber: i + 1,
      installmentTotal: installments.count,
    });
  }
  return docs;
}

router.post("/:id/settle", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const { date, categoryId } = req.body;
    const catId = toObjectId(categoryId);
    if (!catId) return res.status(400).json({ error: "categoryId is required" });

    const db = getDb();
    const debt = await db.collection("debts").findOne({ _id: id });
    if (!debt) return res.status(404).json({ error: "not found" });

    const remaining = debt.totalAmount - debt.paidAmount;
    if (remaining <= 0) {
      return res.status(400).json({ error: "debt is already settled" });
    }

    const type = debt.direction === "receivable" ? "income" : "expense";
    const category = await db.collection("categories").findOne({ _id: catId });
    if (!category) return res.status(400).json({ error: "category not found" });
    if (category.type !== type) {
      return res.status(400).json({ error: "category type does not match debt direction" });
    }

    const settlementDate = date
      ? parseDateInput(date)
      : parseDateInput(new Date().toISOString().slice(0, 10));

    const transactionDoc = {
      type,
      amount: remaining,
      currency: debt.currency || "ves",
      categoryId: catId,
      title: debt.name,
      description: debt.description?.trim() || "",
      date: settlementDate,
      debtId: id,
      createdAt: new Date(),
    };

    const txResult = await db.collection("transactions").insertOne(transactionDoc);
    const result = await db.collection("debts").findOneAndUpdate(
      { _id: id },
      {
        $set: {
          paidAmount: debt.totalAmount,
          settledAt: settlementDate,
          settlementTransactionId: txResult.insertedId,
        },
      },
      { returnDocument: "after" }
    );

    res.status(201).json({
      debt: serializeDebt(result),
      transaction: serializeDoc({
        _id: txResult.insertedId,
        ...transactionDoc,
        categoryId: catId.toString(),
        debtId: id.toString(),
      }),
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
    if (paid > Number(totalAmount)) {
      return res.status(400).json({ error: "paidAmount cannot exceed totalAmount" });
    }

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

    const baseDoc = {
      name: name.trim(),
      totalAmount: Number(totalAmount),
      paidAmount: paid,
      currency: parsedCurrency,
      direction: parsedDirection,
      description: description?.trim() || "",
      createdAt: new Date(),
    };

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

      const groupId = new ObjectId();
      const docs = buildInstallmentDocs(baseDoc, parsedInstallments, groupId);
      const result = await getDb().collection("debts").insertMany(docs);
      const created = docs.map((doc, index) =>
        serializeDebt({ _id: result.insertedIds[index], ...doc })
      );

      return res.status(201).json({ count: created.length, debts: created });
    }

    const doc = {
      ...baseDoc,
      dueDate: dueDate ? parseDateInput(dueDate) : null,
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
      update.totalAmount = Number(totalAmount);
    }
    if (paidAmount !== undefined) {
      if (Number(paidAmount) < 0) {
        return res.status(400).json({ error: "paidAmount cannot be negative" });
      }
      update.paidAmount = Number(paidAmount);
    }
    if (description !== undefined) update.description = description.trim();
    if (dueDate !== undefined) update.dueDate = dueDate ? parseDateInput(dueDate) : null;
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

    const nextTotal = update.totalAmount ?? existing.totalAmount;
    const nextPaid = update.paidAmount ?? existing.paidAmount;
    if (nextPaid > nextTotal) {
      return res.status(400).json({ error: "paidAmount cannot exceed totalAmount" });
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
