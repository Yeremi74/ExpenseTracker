const express = require("express");
const { getDb } = require("../config/database");
const { toObjectId, parseFilters, serializeDoc } = require("../utils/mongo");
const { withUser } = require("../utils/userScope");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const query = withUser(req.userId);
    if (filters.type) query.type = filters.type;

    const docs = await getDb()
      .collection("categories")
      .find(query)
      .sort({ name: 1 })
      .toArray();

    res.json(docs.map(serializeDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "type must be income or expense" });
    }

    const doc = {
      userId: req.userId,
      name: name.trim(),
      type,
      createdAt: new Date(),
    };

    const result = await getDb().collection("categories").insertOne(doc);
    res.status(201).json(serializeDoc({ _id: result.insertedId, ...doc }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const { name, type } = req.body;
    const update = {};

    if (name !== undefined) {
      if (!name?.trim()) return res.status(400).json({ error: "name is required" });
      update.name = name.trim();
    }
    if (type !== undefined) {
      if (!["income", "expense"].includes(type)) {
        return res.status(400).json({ error: "type must be income or expense" });
      }
      update.type = type;
    }

    const result = await getDb()
      .collection("categories")
      .findOneAndUpdate(withUser(req.userId, { _id: id }), { $set: update }, { returnDocument: "after" });

    if (!result) return res.status(404).json({ error: "not found" });
    res.json(serializeDoc(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const result = await getDb()
      .collection("categories")
      .deleteOne(withUser(req.userId, { _id: id }));
    if (result.deletedCount === 0) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
