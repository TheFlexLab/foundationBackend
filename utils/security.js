const crypto = require('crypto');
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const { ALGORITHM } = require('../config/env');

const encryptData = (data) => {
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(data instanceof Buffer ? data : JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

const decryptData = (data) => {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    try {
        return JSON.parse(decrypted);
    } catch (error) {
        return decrypted;
    }
};

module.exports = {
    encryptData,
    decryptData
};