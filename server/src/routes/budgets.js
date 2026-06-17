const express = require("express");
const { getDb } = require("../config/database");
const { parseCurrency } = require("../utils/currency");
const { toObjectId, serializeDoc } = require("../utils/mongo");
const { withUser } = require("../utils/userScope");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const docs = await getDb()
      .collection("budgets")
      .find(withUser(req.userId))
      .toArray();
    res.json(
      docs.map((doc) =>
        serializeDoc({
          ...doc,
          categoryId: doc.categoryId?.toString() ?? null,
        })
      )
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { categoryId, amount } = req.body;
    let currency;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "amount must be greater than 0" });
    }

    try {
      currency = parseCurrency(req.body.currency);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const catId = categoryId ? toObjectId(categoryId) : null;
    if (categoryId && !catId) {
      return res.status(400).json({ error: "invalid categoryId" });
    }

    if (catId) {
      const category = await getDb()
        .collection("categories")
        .findOne(withUser(req.userId, { _id: catId }));
      if (!category) return res.status(400).json({ error: "category not found" });
      if (category.type !== "expense") {
        return res.status(400).json({ error: "budget category must be expense type" });
      }
    }

    const db = getDb();
    const existing = await db.collection("budgets").findOne(
      withUser(req.userId, { categoryId: catId ?? null })
    );

    if (existing) {
      const result = await db.collection("budgets").findOneAndUpdate(
        withUser(req.userId, { _id: existing._id }),
        { $set: { amount: Number(amount), currency } },
        { returnDocument: "after" }
      );
      return res.json(
        serializeDoc({
          ...result,
          categoryId: result.categoryId?.toString() ?? null,
        })
      );
    }

    const doc = {
      userId: req.userId,
      categoryId: catId,
      amount: Number(amount),
      currency,
      createdAt: new Date(),
    };

    const result = await db.collection("budgets").insertOne(doc);
    res.status(201).json(
      serializeDoc({
        _id: result.insertedId,
        ...doc,
        categoryId: catId?.toString() ?? null,
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const result = await getDb()
      .collection("budgets")
      .deleteOne(withUser(req.userId, { _id: id }));
    if (result.deletedCount === 0) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
