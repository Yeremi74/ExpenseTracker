const { ObjectId } = require("mongodb");

function toObjectId(id) {
  if (!id || !ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

function parseFilters(query) {
  const filters = {};

  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("filter[") && key.endsWith("]")) {
      filters[key.slice(7, -1)] = value;
    }
  }

  if (query.filter && typeof query.filter === "object") {
    for (const [key, value] of Object.entries(query.filter)) {
      if (value != null && value !== "") {
        filters[key] = value;
      }
    }
  }

  return filters;
}

function serializeDoc(doc) {
  if (!doc) return doc;
  return { ...doc, id: doc._id.toString(), _id: undefined };
}

module.exports = { toObjectId, parseFilters, serializeDoc };
