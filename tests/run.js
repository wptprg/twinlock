#!/usr/bin/env node
// Twinlock test suite. Requires Node.js 18+. No dependencies.
//   node tests/run.js
// Extracts the pure-logic block from twinlock.html (between the LOGICA markers) and exercises it:
// BIP39 official vectors, checksum errors, encryption round trips, wrong keys, tampering,
// the public test vector in tools/sample-wallet.json and the integrity of the embedded word list.
'use strict';
const fs = require('fs');
const path = require('path');
const nodeCrypto = require('crypto');

const raiz = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(raiz, 'twinlock.html'), 'utf8');
const ini = src.indexOf('// ==== LOGICA ===='), fim = src.indexOf('// ==== FIM LOGICA ====');
if (ini < 0 || fim < 0) throw new Error('LOGICA markers not found in twinlock.html');
const ctx = {};
new Function('ctx', src.slice(ini, fim) + `
Object.assign(ctx, { BIP39, cifrarCarteira, decifrarCarteira, cifrarCaderno, decifrarCaderno, recifrarCaderno, validarFrase, forcaSenha, FORMATO, FORMATO_ACESSOS, ITERACOES, VERSAO });`)(ctx);
const { BIP39, cifrarCarteira, decifrarCarteira, cifrarCaderno, decifrarCaderno, recifrarCaderno, validarFrase, forcaSenha, FORMATO, FORMATO_ACESSOS, ITERACOES, VERSAO } = ctx;

const HASH_LISTA_OFICIAL = '2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda'; // sha256 of bip-0039/english.txt

let falhas = 0;
const ok = (cond, nome) => { console.log((cond ? 'PASS ' : 'FAIL ') + nome); if (!cond) falhas++; };
const rep = (p, n, ult) => Array(n).fill(p).concat([ult]);
const adulterar = (b64) => b64.replace(/^(.)/, c => (c === 'A' ? 'B' : 'A'));
const esperaErro = async (fn, codigo, nome) => { let e; try { await fn(); } catch (x) { e = x; } ok(e && e.codigo === codigo, nome); };

(async () => {
  console.log(`Twinlock ${VERSAO} · format ${FORMATO} · ${ITERACOES} iterations\n`);

  // --- word list
  ok(BIP39.length === 2048 && BIP39[0] === 'abandon' && BIP39[2047] === 'zoo', 'word list: 2048 words, abandon…zoo');
  ok(nodeCrypto.createHash('sha256').update(BIP39.join('\n') + '\n').digest('hex') === HASH_LISTA_OFICIAL, 'word list: SHA-256 matches the official BIP39 english.txt');

  // --- BIP39 official vectors (Trezor)
  for (const [n, ult] of [[11, 'about'], [17, 'agent'], [23, 'art']]) ok((await validarFrase(rep('abandon', n, ult))).ok, `BIP39: ${n + 1} words, entropy 00…00`);
  for (const [n, ult] of [[11, 'wrong'], [17, 'when'], [23, 'vote']]) ok((await validarFrase(rep('zoo', n, ult))).ok, `BIP39: ${n + 1} words, entropy ff…ff`);
  ok((await validarFrase('legal winner thank year wave sausage worth useful legal winner thank yellow'.split(' '))).ok, 'BIP39: 12 words, entropy 7f…7f');
  ok((await validarFrase(rep('abandon', 11, 'abandon'))).codigo === 'CHECKSUM', 'BIP39: bad checksum → CHECKSUM');
  const r2 = await validarFrase(rep('abandon', 11, 'xyzzy'));
  ok(r2.codigo === 'PALAVRA' && r2.posicoes.join() === '12', 'BIP39: unknown word → PALAVRA at position 12');
  ok((await validarFrase(rep('abandon', 14, 'about'))).codigo === 'QTD', 'BIP39: 15 words → QTD');
  ok((await validarFrase(rep(' Abandon ', 11, 'ABOUT'))).ok, 'BIP39: case and spaces normalised');

  // --- encryption, plain label
  const palavras = rep('zoo', 23, 'vote');
  const t0 = Date.now();
  const obj = await cifrarCarteira({ descricao: 'Ledger Nano X', palavras, acesso: 'minhaChave1', cripto: 'cripto2024segura' });
  const tCifra = Date.now() - t0;
  const s = JSON.stringify(obj);
  ok(obj.formato === FORMATO && obj.kdf.iteracoes === ITERACOES && obj.descricao === 'Ledger Nano X' && !obj.descricaoCifrada, 'file: plain label, declared iterations');
  ok(!s.includes('zoo') && !s.includes('minhaChave1') && !s.includes('cripto2024'), 'file: no secret in clear text');
  const t1 = Date.now();
  const volta = await decifrarCarteira(obj, 'minhaChave1', 'cripto2024segura');
  console.log(`     (encrypt ${tCifra} ms, decrypt ${Date.now() - t1} ms at ${ITERACOES} iterations)`);
  ok(volta.palavras.join(' ') === palavras.join(' ') && volta.descricao === 'Ledger Nano X', 'round trip');
  ok((await decifrarCarteira(obj, 'minhaChave1', 'cripto2024segura'.normalize('NFD'))).palavras.length === 24, 'keys are NFKC-normalised');

  // --- encryption, encrypted label (low iterations to keep the suite fast)
  const objC = await cifrarCarteira({ descricao: 'Segredo', cifrarDescricao: true, palavras, acesso: 'minhaChave1', cripto: 'cripto2024segura' }, 2000);
  ok(objC.descricao === '' && objC.descricaoCifrada && !JSON.stringify(objC).includes('Segredo'), 'encrypted label: not in clear text');
  ok(objC.descricaoCifrada.iv !== objC.iv, 'encrypted label: its own IV');
  const voltaC = await decifrarCarteira(objC, 'minhaChave1', 'cripto2024segura');
  ok(voltaC.descricao === 'Segredo' && voltaC.palavras.join(' ') === palavras.join(' '), 'encrypted label: round trip');

  // --- errors
  await esperaErro(() => decifrarCarteira(objC, 'minhaChave2', 'cripto2024segura'), 'ACESSO', 'wrong access key → ACESSO');
  await esperaErro(() => decifrarCarteira(objC, 'minhaChave1', 'cripto2024errada'), 'CRIPTO', 'wrong encryption key → CRIPTO');
  await esperaErro(() => decifrarCarteira({ ...objC, dados: adulterar(objC.dados) }, 'minhaChave1', 'cripto2024segura'), 'CRIPTO', 'tampered words → rejected');
  await esperaErro(() => decifrarCarteira({ ...objC, descricaoCifrada: { ...objC.descricaoCifrada, dados: adulterar(objC.descricaoCifrada.dados) } }, 'minhaChave1', 'cripto2024segura'), 'CRIPTO', 'tampered label → rejected');
  await esperaErro(() => decifrarCarteira({ ...objC, id: 'outro' }, 'minhaChave1', 'cripto2024segura'), 'CRIPTO', 'swapped id (AAD) → rejected');
  await esperaErro(() => decifrarCarteira({ formato: 'x' }, 'a', 'b'), 'FORMATO', 'unknown format → FORMATO');

  // --- pre-release format
  const legado = { ...(await cifrarCarteira({ descricao: 'Antiga', palavras, acesso: 'minhaChave1', cripto: 'cripto2024segura' }, 2000)), formato: 'cofre/1' };
  delete legado.versao;
  const vL = await decifrarCarteira(legado, 'minhaChave1', 'cripto2024segura');
  ok(vL.palavras.length === 24 && vL.descricao === 'Antiga', 'reads pre-release cofre/1 files');

  // --- randomness
  const obj2 = await cifrarCarteira({ descricao: 'd', palavras, acesso: 'minhaChave1', cripto: 'cripto2024segura' }, 2000);
  ok(obj2.saltChave !== obj.saltChave && obj2.iv !== obj.iv && obj2.id !== obj.id, 'fresh salts, IV and id per file');

  // --- public test vector (SPEC.md §5)
  const vetor = JSON.parse(fs.readFileSync(path.join(raiz, 'tools', 'sample-wallet.json'), 'utf8'));
  const vv = await decifrarCarteira(vetor, 'test-access-key', 'test-encryption-key-1');
  ok(vv.palavras.join(' ') === palavras.join(' ') && vv.descricao === 'Sample wallet', 'tools/sample-wallet.json decrypts to the documented vector');

  // --- strength meter
  ok(forcaSenha('abc') === 0 && forcaSenha('abcdefghij') <= 1 && forcaSenha('Abcdef12!xyzQW') >= 3 && forcaSenha('Abcdef12!xyzQWERTY') === 4, 'strength meter ordering');

  // --- access book (SPEC.md §8)
  const entradas = [
    { id: 'e1', servico: 'Netflix', endereco: 'netflix.com', usuario: 'x@x.com', codigoSenha: '4', notas: 'linha 1\nlinha 2', extra: 'kept' },
    { id: 'e2', servico: 'Forum', usuario: 'someone', senha: 'correct horse', campos: [{ nome: 'PIN', valor: '1234', oculto: true }] },
  ];
  const { arquivo: livro, chave } = await cifrarCaderno({ descricao: 'Contas', cifrarDescricao: true, acessos: entradas, acesso: 'minhaChave1', cripto: 'cripto2024segura' }, 2000);
  const sL = JSON.stringify(livro);
  ok(livro.formato === FORMATO_ACESSOS && livro.descricao === '' && livro.descricaoCifrada, 'book: format twinlock-acessos/1, encrypted label');
  ok(!sL.includes('Netflix') && !sL.includes('x@x.com') && !sL.includes('correct horse') && !sL.includes('1234') && !sL.includes('Contas'), 'book: nothing in clear text');
  const vL2 = await decifrarCaderno(livro, 'minhaChave1', 'cripto2024segura');
  ok(vL2.descricao === 'Contas' && vL2.acessos.length === 2 && vL2.acessos[0].notas === 'linha 1\nlinha 2' && vL2.acessos[1].senha === 'correct horse', 'book: round trip');
  ok(vL2.acessos[0].extra === 'kept' && vL2.acessos[0].senha === '' && vL2.acessos[0].campos.length === 0 && vL2.acessos[1].campos[0].oculto === true, 'book: unknown fields kept, missing fields normalised');
  await esperaErro(() => decifrarCaderno(livro, 'minhaChave2', 'cripto2024segura'), 'ACESSO', 'book: wrong access key → ACESSO');
  await esperaErro(() => decifrarCaderno(livro, 'minhaChave1', 'cripto2024errada'), 'CRIPTO', 'book: wrong encryption key → CRIPTO');
  await esperaErro(() => decifrarCaderno({ ...livro, dados: adulterar(livro.dados) }, 'minhaChave1', 'cripto2024segura'), 'CRIPTO', 'book: tampered → rejected');
  await esperaErro(() => decifrarCarteira(livro, 'minhaChave1', 'cripto2024segura'), 'FORMATO', 'book: wallet reader refuses a book');
  await esperaErro(() => decifrarCaderno({ ...objC, formato: FORMATO_ACESSOS }, 'minhaChave1', 'cripto2024segura'), 'CRIPTO', 'book: a relabelled wallet fails authentication (AAD)');
  await esperaErro(() => decifrarCarteira({ ...livro, formato: FORMATO }, 'minhaChave1', 'cripto2024segura'), 'CRIPTO', 'book: a relabelled book fails authentication (AAD)');
  // re-encryption with the key kept in memory
  const re = await recifrarCaderno(livro, chave, [...entradas, { id: 'e3', servico: 'Bank', codigoSenha: '7' }]);
  ok(re.iv !== livro.iv && re.dados !== livro.dados && re.id === livro.id && re.saltChave === livro.saltChave && re.verificador === livro.verificador && re.atualizadoEm, 'book: re-encrypt keeps id/salts/verifier, fresh IV, sets atualizadoEm');
  const vRe = await decifrarCaderno(re, 'minhaChave1', 'cripto2024segura');
  ok(vRe.acessos.length === 3 && vRe.acessos[2].servico === 'Bank' && vRe.descricao === 'Contas', 'book: re-encrypted file decrypts with the same keys, label intact');
  const vRe2 = await decifrarCaderno(re, 'minhaChave1', 'cripto2024segura');
  const re2 = await recifrarCaderno(re, vRe2.chave, []);
  ok((await decifrarCaderno(re2, 'minhaChave1', 'cripto2024segura')).acessos.length === 0, 'book: key returned by decifrarCaderno re-encrypts too');
  await esperaErro(() => decifrarCaderno({ ...re, dados: livro.dados }, 'minhaChave1', 'cripto2024segura'), 'CRIPTO', 'book: old ciphertext under a new IV → rejected');
  const vazio = await cifrarCaderno({ descricao: 'v', acessos: [], acesso: 'minhaChave1', cripto: 'cripto2024segura' }, 2000);
  ok((await decifrarCaderno(vazio.arquivo, 'minhaChave1', 'cripto2024segura')).acessos.length === 0, 'book: empty book round trip');

  // --- public book vector (SPEC.md §8.5)
  const vetorL = JSON.parse(fs.readFileSync(path.join(raiz, 'tools', 'sample-book.json'), 'utf8'));
  const vvL = await decifrarCaderno(vetorL, 'test-access-key', 'test-encryption-key-1');
  const nf = vvL.acessos.find(a => a.servico === 'Netflix'), fo = vvL.acessos.find(a => a.servico === 'Example forum');
  ok(vvL.descricao === 'Sample book' && vvL.acessos.length === 2 && nf && nf.usuario === 'someone@example.com' && nf.codigoSenha === '4' && nf.senha === ''
    && fo && fo.usuario === 'someone' && fo.senha === 'correct horse battery staple' && fo.campos.length === 1 && fo.campos[0].nome === 'PIN' && fo.campos[0].valor === '1234' && fo.campos[0].oculto,
    'tools/sample-book.json decrypts to the documented vector');

  console.log(falhas ? `\n${falhas} FAILURE(S)` : '\nAll tests passed.');
  process.exit(falhas ? 1 : 0);
})();
