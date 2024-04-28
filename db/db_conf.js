const { Sequelize } = require("sequelize");
const dotenv = require('dotenv');
const path = require('path');

// CHARGER LES VARIABLES D'ENVIRONNEMENT DEPUIS LE FICHIER .ENV PAR DÉFAUT
dotenv.config();

// SI LE FICHIER .ENV.LOCAL EXISTE, CHARGER LES VARIABLES D'ENVIRONNEMENT SUPPLÉMENTAIRES
const localEnvPath = path.resolve(__dirname, '../config/.env.local');
dotenv.config({ path: localEnvPath });

const db = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT,
    }
);

db.authenticate()
    .then(() => {
        console.log("Database connection has been established successfully.");
    })
    .catch((err) => {
        console.error("Unable to connect to the database:", err);
    });

module.exports = db;
