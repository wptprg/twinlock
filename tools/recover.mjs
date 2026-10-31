#!/usr/bin/env node
// Twinlock standalone recovery — recovers the words from a Twinlock file WITHOUT the HTML page.
// Requirements: Node.js 18 or newer. No dependencies. Works offline.
//
//   node recover.mjs path/to/c01.json
//
// The two keys are asked interactively and never echoed. For automated tests only, they may be
// given through the environment variables TWINLOCK_ACCESS and TWINLOCK_ENCRYPTION.
// Format reference: SPEC.md in the Twinlock repository.

import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const crypto = webcrypto;
const utf8 = (s) => new TextEncoder().encode(String(s).normalize('NFKC'));
const deB64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'));

async function pbkdf2(segredo, salt, iteracoes) {
  const base = await crypto.subtle.importKey('raw', utf8(segredo), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iteracoes }, base, 256));
}
function igual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
function perguntarOculto(pergunta) {
  return new Promise((res) => {
    process.stdout.write(pergunta);
    const stdin = process.stdin;
    const raw = typeof stdin.setRawMode === 'function';
    if (raw) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let s = '';
    const on = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          if (raw) stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', on);
          process.stdout.write('\n');
          res(s);
          return;
        }
        if (c === '\u0003') process.exit(1);          // Ctrl+C
        else if (c === '\u007f' || c === '\b') s = s.slice(0, -1);
        else s += c;
      }
    };
    stdin.on('data', on);
  });
}

async function recuperar(arquivo, acesso, cripto) {
  const obj = JSON.parse(readFileSync(arquivo, 'utf8'));
  if (!['twinlock/1', 'cofre/1'].includes(obj.formato)) throw new Error('Unknown format: ' + obj.formato);
  const it = obj.kdf.iteracoes;
  const verificador = await pbkdf2('acesso\u0000' + acesso, deB64(obj.saltVerificador), it);
  if (!igual(verificador, deB64(obj.verificador))) throw new Error('Wrong access key.');
  const bits = await pbkdf2('aes\u0000' + acesso + '\u0000' + cripto, deB64(obj.saltChave), it);
  const chave = await crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['decrypt']);
  let texto, descricao = obj.descricao || '';
  try {
    texto = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(obj.iv), additionalData: utf8(obj.id) }, chave, deB64(obj.dados));
    if (obj.descricaoCifrada) {
      const d = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: deB64(obj.descricaoCifrada.iv), additionalData: utf8(obj.id + '\u0000descricao') },
        chave, deB64(obj.descricaoCifrada.dados));
      descricao = new TextDecoder().decode(d);
    }
  } catch {
    throw new Error('Wrong encryption key (or the file was modified).');
  }
  return { descricao, palavras: new TextDecoder().decode(texto).split(' ') };
}

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Usage: node recover.mjs <wallet.json>');
  process.exit(2);
}
const acesso = process.env.TWINLOCK_ACCESS ?? await perguntarOculto('Access key: ');
const cripto = process.env.TWINLOCK_ENCRYPTION ?? await perguntarOculto('Encryption key: ');
try {
  const { descricao, palavras } = await recuperar(arquivo, acesso, cripto);
  console.log('\nWallet: ' + (descricao || '(no description)'));
  console.log(palavras.length + ' words:\n');
  palavras.forEach((p, i) => console.log(String(i + 1).padStart(2, ' ') + '. ' + p));
  console.log('\nClose this window when you are done. Do not leave the words on screen.');
} catch (e) {
  console.error('\n' + e.message);
  process.exit(1);
}
