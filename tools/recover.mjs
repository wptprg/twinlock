#!/usr/bin/env node
// Twinlock standalone recovery — recovers the words of a wallet, or the entries of an access book,
// from a Twinlock file WITHOUT the HTML page.
// Requirements: Node.js 18 or newer. No dependencies. Works offline.
//
//   node recover.mjs path/to/c01.json        (wallet)
//   node recover.mjs path/to/a01.json        (access book)
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

// Returns { tipo: 'carteira', descricao, palavras } for a wallet (twinlock/1)
// or { tipo: 'acessos', descricao, acessos } for an access book (twinlock-acessos/1, SPEC.md §8).
async function recuperar(arquivo, acesso, cripto) {
  const obj = JSON.parse(readFileSync(arquivo, 'utf8'));
  const carteira = ['twinlock/1', 'cofre/1'].includes(obj.formato);
  const caderno = obj.formato === 'twinlock-acessos/1';
  if (!carteira && !caderno) throw new Error('Unknown format: ' + obj.formato);
  const it = obj.kdf.iteracoes;
  const verificador = await pbkdf2('acesso\u0000' + acesso, deB64(obj.saltVerificador), it);
  if (!igual(verificador, deB64(obj.verificador))) throw new Error('Wrong access key.');
  const bits = await pbkdf2('aes\u0000' + acesso + '\u0000' + cripto, deB64(obj.saltChave), it);
  const chave = await crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['decrypt']);
  const aad = obj.id + (caderno ? '\u0000acessos' : '');
  let texto, descricao = obj.descricao || '';
  try {
    texto = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(obj.iv), additionalData: utf8(aad) }, chave, deB64(obj.dados));
    if (obj.descricaoCifrada) {
      const d = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: deB64(obj.descricaoCifrada.iv), additionalData: utf8(obj.id + '\u0000descricao') },
        chave, deB64(obj.descricaoCifrada.dados));
      descricao = new TextDecoder().decode(d);
    }
  } catch {
    throw new Error('Wrong encryption key (or the file was modified).');
  }
  const plano = new TextDecoder().decode(texto);
  if (caderno) return { tipo: 'acessos', descricao, acessos: JSON.parse(plano).acessos || [] };
  return { tipo: 'carteira', descricao, palavras: plano.split(' ') };
}

function mostrarAcessos(acessos) {
  const ordem = [...acessos].sort((a, b) => String(a.servico || '').localeCompare(String(b.servico || '')));
  for (const a of ordem) {
    console.log('* ' + (a.servico || '(no service)') + (a.endereco ? '  ' + a.endereco : ''));
    if (a.usuario) console.log('    user:     ' + a.usuario);
    if (a.codigoSenha) console.log('    password: #' + a.codigoSenha + '  (see your paper)');
    if (a.senha) console.log('    password: ' + a.senha);
    for (const c of a.campos || []) console.log('    ' + (c.nome || '?') + ': ' + (c.valor || ''));
    if (a.notas) console.log('    notes:    ' + String(a.notas).replace(/\n/g, '\n              '));
  }
}

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Usage: node recover.mjs <wallet.json | book.json>');
  process.exit(2);
}
const acesso = process.env.TWINLOCK_ACCESS ?? await perguntarOculto('Access key: ');
const cripto = process.env.TWINLOCK_ENCRYPTION ?? await perguntarOculto('Encryption key: ');
try {
  const r = await recuperar(arquivo, acesso, cripto);
  if (r.tipo === 'acessos') {
    console.log('\nAccess book: ' + (r.descricao || '(no description)'));
    console.log(r.acessos.length + ' entries:\n');
    mostrarAcessos(r.acessos);
    console.log('\nClose this window when you are done. Do not leave the list on screen.');
  } else {
    console.log('\nWallet: ' + (r.descricao || '(no description)'));
    console.log(r.palavras.length + ' words:\n');
    r.palavras.forEach((p, i) => console.log(String(i + 1).padStart(2, ' ') + '. ' + p));
    console.log('\nClose this window when you are done. Do not leave the words on screen.');
  }
} catch (e) {
  console.error('\n' + e.message);
  process.exit(1);
}
