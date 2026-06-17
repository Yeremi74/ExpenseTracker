const express = require("express");
const { getDb } = require("../config/database");
const { toObjectId, parseFilters, serializeDoc } = require("../utils/mongo");
const { parseCurrency } = require("../utils/currency");
const { parseDateInput, parseDateStart, parseDateEnd } = require("../utils/date");
const { withUser } = require("../utils/userScope");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const query = withUser(req.userId);
    if (filters.type) query.type = filters.type;
    if (filters.categoryId) {
      const categoryId = toObjectId(filters.categoryId);
      if (!categoryId) return res.status(400).json({ error: "invalid categoryId" });
      query.categoryId = categoryId;
    }
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = parseDateStart(filters.dateFrom);
      if (filters.dateTo) query.date.$lte = parseDateEnd(filters.dateTo);
    }
    if (filters.search?.trim()) {
      const searchRegex = { $regex: filters.search.trim(), $options: "i" };
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const docs = await getDb()
      .collection("transactions")
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .toArray();

    res.json(
      docs.map((doc) =>
        serializeDoc({
          ...doc,
          categoryId: doc.categoryId?.toString(),
        })
      )
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type, amount, categoryId, title, description, date, currency } = req.body;

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "type must be income or expense" });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "amount must be greater than 0" });
    }

    const catId = toObjectId(categoryId);
    if (!catId) return res.status(400).json({ error: "invalid categoryId" });

    const category = await getDb()
      .collection("categories")
      .findOne(withUser(req.userId, { _id: catId }));
    if (!category) return res.status(400).json({ error: "category not found" });
    if (category.type !== type) {
      return res.status(400).json({ error: "category type does not match transaction type" });
    }

    let parsedCurrency;
    try {
      parsedCurrency = parseCurrency(currency);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const doc = {
      userId: req.userId,
      type,
      amount: Number(amount),
      currency: parsedCurrency,
      categoryId: catId,
      title: title?.trim() || "",
      description: description?.trim() || "",
      date: date ? parseDateInput(date) : parseDateInput(new Date().toISOString().slice(0, 10)),
      createdAt: new Date(),
    };

    const result = await getDb().collection("transactions").insertOne(doc);
    res.status(201).json(
      serializeDoc({
        _id: result.insertedId,
        ...doc,
        categoryId: catId.toString(),
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const existing = await getDb()
      .collection("transactions")
      .findOne(withUser(req.userId, { _id: id }));
    if (!existing) return res.status(404).json({ error: "not found" });

    const { type, amount, categoryId, title, description, date, currency } = req.body;
    const update = {};

    const nextType = type ?? existing.type;
    if (type !== undefined && !["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "type must be income or expense" });
    }
    if (amount !== undefined) {
      if (Number(amount) <= 0) return res.status(400).json({ error: "amount must be greater than 0" });
      update.amount = Number(amount);
    }
    if (categoryId !== undefined) {
      const catId = toObjectId(categoryId);
      if (!catId) return res.status(400).json({ error: "invalid categoryId" });
      const category = await getDb()
        .collection("categories")
        .findOne(withUser(req.userId, { _id: catId }));
      if (!category) return res.status(400).json({ error: "category not found" });
      if (category.type !== nextType) {
        return res.status(400).json({ error: "category type does not match transaction type" });
      }
      update.categoryId = catId;
    }
    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description.trim();
    if (date !== undefined) update.date = parseDateInput(date);
    if (type !== undefined) update.type = type;
    if (currency !== undefined) {
      try {
        update.currency = parseCurrency(currency);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    const result = await getDb()
      .collection("transactions")
      .findOneAndUpdate(withUser(req.userId, { _id: id }), { $set: update }, { returnDocument: "after" });

    res.json(
      serializeDoc({
        ...result,
        categoryId: result.categoryId?.toString(),
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
      .collection("transactions")
      .deleteOne(withUser(req.userId, { _id: id }));
    if (result.deletedCount === 0) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
