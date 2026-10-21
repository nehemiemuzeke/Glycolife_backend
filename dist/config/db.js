"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDb = initDb;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
let dbInstance = null;
async function getDb() {
    if (dbInstance)
        return dbInstance;
    const dbPath = path_1.default.resolve(process.cwd(), "glycolife.db");
    dbInstance = await (0, sqlite_1.open)({
        filename: dbPath,
        driver: sqlite3_1.default.Database,
    });
    await dbInstance.run("PRAGMA foreign_keys = ON;");
    return dbInstance;
}
/** Ajoute une colonne seulement si elle n'existe pas encore */
async function addColumnIfMissing(db, table, column, definition) {
    const cols = await db.all(`PRAGMA table_info(${table})`);
    const exists = cols.some((c) => c.name === column);
    if (!exists) {
        await db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`✅ Colonne ajoutée: ${table}.${column}`);
    }
}
async function initDb() {
    const db = await getDb();
    // ── Création des tables ──
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      nom TEXT,
      prenom TEXT,
      role TEXT DEFAULT 'patient',
      telephone TEXT,
      avatar TEXT,
      google_id TEXT,
      provider TEXT DEFAULT 'local',
      reset_token TEXT,
      reset_expires TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS glycemias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      valeur REAL NOT NULL,
      date_mesure DATETIME DEFAULT CURRENT_TIMESTAMP,
      moment TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      type_repas TEXT,
      date_mesure DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      nom TEXT NOT NULL,
      dosage TEXT,
      date_prise DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'doctor',
      title TEXT NOT NULL,
      description TEXT,
      date DATETIME NOT NULL,
      recurrence TEXT DEFAULT 'none',
      notification_enabled INTEGER DEFAULT 1,
      notification_minutes_before INTEGER DEFAULT 30,
      doctor_name TEXT,
      doctor_specialty TEXT,
      medication_dosage TEXT,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      contact_user_id INTEGER,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, phone),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      contact_phone TEXT,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
    // ── Migrations : colonnes ajoutées après coup ──
    await addColumnIfMissing(db, "users", "avatar", "TEXT");
    await addColumnIfMissing(db, "users", "google_id", "TEXT");
    await addColumnIfMissing(db, "users", "provider", "TEXT DEFAULT 'local'");
    await addColumnIfMissing(db, "users", "reset_token", "TEXT");
    await addColumnIfMissing(db, "users", "reset_expires", "TEXT");
    await addColumnIfMissing(db, "users", "telephone", "TEXT");
    await addColumnIfMissing(db, "users", "role", "TEXT DEFAULT 'patient'");
    await addColumnIfMissing(db, "users", "updated_at", "DATETIME");
    console.log("✅ Base de données SQLite connectée & initialisée (glycolife.db)");
    return db;
}
