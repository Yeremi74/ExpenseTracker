const { MongoClient } = require("mongodb");

let client;
let connected = false;

function mongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !String(uri).trim()) {
    throw new Error(
      "MONGODB_URI no está definida en el archivo .env del servidor (carpeta server)"
    );
  }
  return String(uri).trim();
}

async function connectMongo() {
  if (connected) return client;
  client = new MongoClient(mongoUri());
  await client.connect();
  connected = true;
  await client
    .db(process.env.MONGODB_DB || "tracker")
    .collection("users")
    .createIndex({ email: 1 }, { unique: true });

  const db = client.db(process.env.MONGODB_DB || "tracker");
  await db.collection("budgets").createIndex({ userId: 1, categoryId: 1 }, { unique: true });
  await db.collection("exchange_rates").createIndex({ userId: 1 }, { unique: true });
  await db.collection("daily_exchange_rates").createIndex({ date: 1 }, { unique: true });
  await db.collection("transactions").createIndex({ userId: 1, date: -1 });
  await db.collection("debt_payments").createIndex({ userId: 1, debtId: 1 });
  return client;
}

function getDb() {
  if (!connected || !client) {
    throw new Error("MongoDB no está conectado; llama a connectMongo() antes.");
  }
  const name = process.env.MONGODB_DB || "tracker";
  return client.db(name);
}

async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    connected = false;
  }
}

module.exports = { connectMongo, getDb, closeMongo };
