# Twinlock

**Sua frase de recuperação, cifrada. Um arquivo, duas chaves, sem internet.**

O Twinlock é um único arquivo HTML que cifra as 12, 18 ou 24 palavras de uma carteira de
criptomoedas (frase de recuperação BIP39) para que você possa guardá-las em qualquer lugar,
num pen drive, numa gaveta, na nuvem, sem que ninguém consiga lê-las. Para ver as palavras
de novo você precisa do arquivo, da página do Twinlock e de **duas chaves que só você conhece**.

*Read it in [English](README.md).*

---

## Por quê

Frase de recuperação escrita no papel é frágil: queima, apaga, perde, alguém fotografa.
Placas de aço são melhores, mas continuam num único lugar físico. O Twinlock permite manter
cópias cifradas em vários lugares, físicos ou virtuais, enquanto o que importa fica na sua
cabeça: duas chaves.

## Como funciona

1. Você abre o `twinlock.html` no Chrome, Edge ou Firefox. **Nunca precisa de internet.**
2. Escolhe uma pasta (um segundo pen drive, por exemplo) onde ficam os arquivos cifrados.
3. Para cada carteira digita uma descrição curta, uma **chave de acesso**, uma
   **chave de criptografia** e as palavras.
4. O Twinlock deriva uma chave AES-256 a partir das suas duas chaves (PBKDF2, um milhão de
   iterações) e grava um arquivo JSON pequeno por carteira. As palavras, e opcionalmente a
   descrição, só existem nesse arquivo em forma cifrada. Suas chaves nunca são gravadas.
5. Para ler uma carteira você clica no card, digita as duas chaves e as palavras aparecem,
   uma por vez conforme passa o mouse, com trava automática depois de dois minutos.

Quem achar o pen drive com o HTML vê um programa vazio. Quem achar os arquivos vê dados
aleatórios. Quem achar os dois ainda precisa das suas duas chaves.

## Cadernos de acessos: as senhas de todo o resto

Desde a versão 1.1 a mesma pasta pode guardar **cadernos de acessos**: um arquivo cifrado com
a sua lista de logins (streaming, e-mail, banco, fóruns), cada um com o serviço, o usuário, um
**código da senha** e anotações. O código é a forma recomendada de usar o caderno: mantenha as
senhas em si num papel, numeradas, e anote no caderno só o número. Mesmo decifrado, o arquivo
revela quais contas existem, nunca as senhas delas. Para contas que não merecem o papel, você
pode guardar a senha no próprio acesso; ela aparece borrada, revela-se ao passar o mouse, e
"Copiar" limpa a área de transferência depois de 20 segundos.

Um caderno abre como uma carteira, com as suas duas chaves, e mostra uma lista com busca.
Incluir ou editar um acesso recifra o arquivo inteiro com um nonce novo; a versão anterior
fica guardada como `a01.json.bak`. O caderno trava sozinho depois de dez minutos sem atividade;
ao contrário das palavras, trocar de janela não tranca, porque um caderno é consultado enquanto
você faz outra coisa, e os segredos continuam borrados nesse meio-tempo. O formato do arquivo está no
[SPEC.md](SPEC.md#8-access-book--twinlock-acessos1).

## Começando

1. Baixe o `twinlock.html` na [última release](https://github.com/wptprg/twinlock/releases/latest).
2. **Confira o arquivo** (veja [Conferindo o download](#conferindo-o-download)).
3. Copie para um pen drive ou qualquer pasta. Dê dois cliques. Ele abre no navegador.
4. Clique em **Escolher pasta** e indique onde os arquivos cifrados devem ficar.
5. Clique em **Nova carteira** e siga os três passos.

O Twinlock lembra a pasta entre uma sessão e outra (só uma referência a ela, nunca o conteúdo).

## Conferindo o download

Toda release publica o SHA-256 do `twinlock.html`. Compare com o arquivo que você tem:

```powershell
# Windows (PowerShell)
Get-FileHash twinlock.html -Algorithm SHA256
```

```bash
# macOS
shasum -a 256 twinlock.html
```

```bash
# Linux
sha256sum twinlock.html
```

Se o hash não bater com o das notas da release, **não use o arquivo**.
### Conferindo a assinatura (opcional, mais forte)

Toda release também traz o `SHA256SUMS.asc`, uma assinatura GPG do arquivo de hash feita com
a chave do projeto. A chave pública está neste repositório como
[`twinlock-release-key.asc`](twinlock-release-key.asc). A impressão digital dela é:

```
7823 EC86 0CD1 CD49 7C9C  0B66 A98E 07B1 4154 21FF
```

```bash
gpg --import twinlock-release-key.asc
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum -c SHA256SUMS          # macOS: shasum -a 256 -c SHA256SUMS
```

O `gpg --verify` precisa dizer "Good signature" e mostrar a impressão digital acima. Uma
impressão digital diferente significa outra chave, não outra versão: **não use o arquivo**.

O Twinlock é, de propósito, um único arquivo legível, sem minificação, sem etapa de build e
sem dependências. Qualquer pessoa pode abri-lo num editor de texto e auditar as cerca de 1 900
linhas de código. A própria página mostra a versão e o endereço oficial no rodapé.

## Do que o Twinlock protege, e do que não protege

**Protege contra**

* Perda ou roubo dos arquivos: sem as duas chaves eles são inúteis.
* Perda ou roubo do HTML: ele não contém nada seu.
* Arquivos adulterados: qualquer alteração faz a decifragem falhar (autenticação AES-GCM).
* Observação casual: as palavras ficam borradas e aparecem uma por vez; a tela trava sozinha.

**Não protege contra**

* **Esquecer uma chave.** Não existe recuperação. Nenhuma. Se precisar, anote uma dica para
  você mesmo, nunca a chave em si junto dos arquivos.
* Computador comprometido (keylogger, malware, captura de tela). Use uma máquina de confiança.
* Chaves fracas quando os arquivos ficam na internet. Se qualquer um pode baixar seus arquivos,
  pode testar chaves offline sem limite. Use chaves longas (20 ou mais caracteres somados) e
  cifre a descrição.
* Alguém que tenha as duas chaves. Mantenha-as separadas, e separadas dos arquivos.

## Recuperando as palavras sem o Twinlock

O formato do arquivo está totalmente documentado em [SPEC.md](SPEC.md) e usa só algoritmos
padrão (PBKDF2-HMAC-SHA256 e AES-256-GCM). Se este projeto, o navegador ou o arquivo HTML
desaparecerem um dia, você ainda recupera as palavras, ou os acessos de um caderno, com
algumas linhas de código:

* [`tools/recover.mjs`](tools/recover.mjs): Node.js, sem dependências.
* [`tools/recover.py`](tools/recover.py): Python 3 com o pacote `cryptography`.

```bash
node tools/recover.mjs c01.json
```

```bash
node tools/recover.mjs a01.json
```

[`tools/sample-wallet.json`](tools/sample-wallet.json) e [`tools/sample-book.json`](tools/sample-book.json)
são arquivos públicos de teste; as chaves estão no SPEC.md.

## Idiomas

A interface existe em inglês, português e espanhol. Ela segue o idioma do navegador e pode
ser trocada no menu do canto superior direito. As palavras em si são sempre em inglês, que é
o que toda carteira de hardware e software usa.

## Modo manual

Firefox e Safari não deixam uma página gravar direto numa pasta. Nesses navegadores o Twinlock
cai no modo manual: você carrega seus arquivos `.json` para ver os cards, e cada carteira nova é
baixada para você mover ao lugar certo. Todo o resto é idêntico.

## Perguntas frequentes

**É seguro deixar os arquivos no Google Drive / iCloud / e-mail?**
Mais seguro que papel, desde que suas chaves sejam fortes e você marque "Cifrar também a
descrição". Leia acima a seção sobre do que o Twinlock não protege.

**Posso guardar outra coisa além de uma frase BIP39?**
Carteiras guardam só frases BIP39: o Twinlock valida as palavras contra a lista oficial em
inglês, inclusive o checksum, porque erro de digitação em frase de recuperação é o pior erro
possível. Para todo o resto (logins de sites, PINs, anotações) crie um caderno de acessos,
descrito acima.

**O caderno deve usar as mesmas chaves das carteiras?**
Pode, mas você vai digitar as chaves do caderno com muito mais frequência que as de uma
carteira, e o que é digitado com frequência fica mais exposto a um teclado ou tela
comprometidos. Chaves diferentes para o caderno mantêm um vazamento ali longe das carteiras.

**Por que duas chaves em vez de uma senha forte?**
Porque as pessoas reutilizam senhas e as anotam. Duas chaves guardadas em lugares diferentes
(uma decorada, outra num cartão no cofre, por exemplo) são mais difíceis de perder juntas.

**A página envia alguma coisa para algum lugar?**
Não. O arquivo tem uma Content-Security-Policy que proíbe todo acesso à rede, e você pode ler
o código para confirmar que não há nenhuma chamada de rede nele. Funciona com o Wi-Fi desligado.

**Por que não um aplicativo?**
Aplicativo precisa ser instalado, atualizado e confiado. Um único arquivo HTML roda em qualquer
computador com navegador, hoje e daqui a dez anos, e pode ser auditado por qualquer pessoa.

## Apoie o projeto

O Twinlock é gratuito e vai continuar gratuito. Se ele ajuda você, dá para apoiar a manutenção:

* Bitcoin (BTC): `14Udp9aA1woSDCQhcwKVDLricHRkr8yvy8`
* Ethereum (ETH): `0xEd9BC7282a522879569dd7c670054ac8684a62Af`

Os mesmos endereços, com QR codes, estão no [site](https://wptprg.github.io/twinlock/#apoiar).
Antes de enviar, compare o endereço mostrado lá com o daqui: endereço de doação é alvo
clássico de adulteração.

## Segurança

Encontrou uma vulnerabilidade? Leia o [SECURITY.md](SECURITY.md).

## Licença

[MIT](LICENSE). Copyright © 2026 Waldir P Thomaz.
