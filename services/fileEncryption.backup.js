const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ALGORITHM = "chacha20-poly1305";

function getEncryptionKey() {
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error("ENCRYPTION_KEY is not configured");
    }

    const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

    if (key.length !== 32) {
        throw new Error("ENCRYPTION_KEY must be exactly 32 bytes");
    }

    return key;
}

function encryptFile(inputPath, outputPath) {
    const key = getEncryptionKey();

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        key,
        iv,
        {
            authTagLength: 16
        }
    );

    const input = fs.readFileSync(inputPath);

    const encrypted = Buffer.concat([
        cipher.update(input),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    const finalData = Buffer.concat([
        iv,
        authTag,
        encrypted
    ]);

    fs.writeFileSync(outputPath, finalData);

    return outputPath;
}

function decryptFile(inputPath, outputPath) {
    const key = getEncryptionKey();

    const encryptedData = fs.readFileSync(inputPath);

    const iv = encryptedData.subarray(0, 12);
    const authTag = encryptedData.subarray(12, 28);
    const encryptedContent = encryptedData.subarray(28);

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        iv,
        {
            authTagLength: 16
        }
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final()
    ]);

    fs.writeFileSync(outputPath, decrypted);

    return outputPath;
}

module.exports = {
    encryptFile,
    decryptFile
};
