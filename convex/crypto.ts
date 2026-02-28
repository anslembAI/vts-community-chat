
// Simple SHA-256 implementation using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    let str = "";
    for (let i = 0; i < length; i++) {
        str += chars.charAt(array[i] % chars.length);
    }
    return str;
}

// Master encryption key (should be set in Convex environment variables)
const ENCRYPTION_KEY_RAW = process.env.SECURITY_ENCRYPTION_KEY || "vts-chat-placeholder-key-32-chars-long-";

async function getEncryptionKey() {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(ENCRYPTION_KEY_RAW);
    const hash = await crypto.subtle.digest("SHA-256", keyData);
    return await crypto.subtle.importKey(
        "raw",
        hash,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encrypt(text: string): Promise<string> {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoded
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return Buffer.from(combined).toString("base64");
}

export async function decrypt(encryptedBase64: string): Promise<string> {
    const key = await getEncryptionKey();
    const combined = Buffer.from(encryptedBase64, "base64");
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted
    );
    return new TextDecoder().decode(decrypted);
}

export async function hashValue(value: string): Promise<string> {
    return hashPassword(value); // Re-use SHA-256 logic
}
