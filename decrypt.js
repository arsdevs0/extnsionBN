const crypto = require("crypto");
const fs = require("fs");

async function run() {
    let raw = fs.readFileSync("payload.json", "utf8");
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    const data = JSON.parse(raw);
    const token = data.token;
    const rc_enc = data.rc_enc;

    const keyHash = crypto.createHash("sha256").update(token).digest();
    
    const buffer = Buffer.from(rc_enc, "base64");
    const iv = buffer.subarray(0, 12);
    const ciphertext = buffer.subarray(12, buffer.length - 16);
    const authTag = buffer.subarray(buffer.length - 16);

    const decipher = crypto.createDecipheriv("aes-256-gcm", keyHash, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, null, "utf8");
    decrypted += decipher.final("utf8");
    
    console.log(decrypted);
}
run().catch(console.error);
