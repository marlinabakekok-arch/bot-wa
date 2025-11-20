// File: lib/transactionManager.js
const fs = require('fs');
const path = require('path');
const DB_PATH = path.resolve('./database/transactions.json');

const readDb = () => {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ orders: [] }));
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
};
const writeDb = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

const transactionManager = {
    add: (userJid, status, orderData) => {
        const db = readDb();
        const newTransaction = {
            transactionId: `TRX_${Date.now()}`,
            orderId: null, userJid, status, orderData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        db.orders.push(newTransaction);
        writeDb(db);
        return newTransaction;
    },
    update: (transactionId, updates) => {
        const db = readDb();
        const index = db.orders.findIndex(t => t.transactionId === transactionId);
        if (index !== -1) {
            db.orders[index] = { ...db.orders[index], ...updates, updatedAt: new Date().toISOString() };
            writeDb(db);
        }
    },
    getPendingPayment: (userJid) => {
        const db = readDb();
        return db.orders.find(t => t.userJid === userJid && t.status === 'pending_payment');
    },
    getHistory: (userJid) => {
        const db = readDb();
        return db.orders.filter(t => t.userJid === userJid).reverse();
    }
};
module.exports = transactionManager;