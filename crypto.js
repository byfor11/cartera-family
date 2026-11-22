/* Descifrado en el navegador (WebCrypto): PBKDF2-SHA256 -> AES-256-GCM. Compatible con encrypt_data.py. */
(function () {
  const STORE = 'cartera-family-key-v1';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const toB = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toS = (buf) => { let s = ''; new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); };
  async function derive(password, env) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: toB(env.salt), iterations: env.iterations },
      base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  }
  async function decrypt(key, env) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toB(env.iv) }, key, toB(env.ciphertext));
    return JSON.parse(dec.decode(plain));
  }
  async function remember(key, env) {
    const raw = await crypto.subtle.exportKey('raw', key);
    localStorage.setItem(STORE, JSON.stringify({ salt: env.salt, iterations: env.iterations, key: toS(raw) }));
  }
  async function stored(env) {
    try {
      const s = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!s || s.salt !== env.salt || s.iterations !== env.iterations) return null;
      return await crypto.subtle.importKey('raw', toB(s.key), { name: 'AES-GCM' }, false, ['decrypt']);
    } catch (e) { return null; }
  }
  function forget() { localStorage.removeItem(STORE); }
  function hasStored() { return !!localStorage.getItem(STORE); }
  window.CFCrypto = { derive, decrypt, remember, stored, forget, hasStored, supported: !!(window.crypto && crypto.subtle) };
})();
