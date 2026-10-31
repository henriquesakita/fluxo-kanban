# Fluxo — Quadro Kanban

Quadro Kanban em tema escuro, feito em HTML, CSS e JavaScript puro. Roda no
navegador, no Windows, no Linux e no Android.

## Baixar

Os instaladores e o APK ficam na página de **Releases** do repositório:

| Plataforma | Arquivo |
| --- | --- |
| Windows | `Fluxo-Setup-1.2.0.exe` (instalador) ou `Fluxo-Portable-1.2.0.exe` (portátil) |
| Linux x64 | `Fluxo-1.2.0-linux-x86_64.AppImage` ou `Fluxo-1.2.0-linux-x64.tar.gz` |
| Android | `Fluxo-1.2.0-android.apk` |

## Funcionalidades

- Múltiplos quadros com menu de troca, renomear e excluir
- Arrastar e soltar cartões entre colunas e reordenar dentro da coluna (mouse e toque)
- Criar, editar e excluir cartões com prioridade, prazo e etiquetas
- Prazos com destaque para hoje, amanhã e cartões atrasados
- Checklist por cartão com progresso visível no cartão
- Adicionar, renomear (duplo clique no título) e excluir colunas
- Busca por título, descrição e etiquetas
- Salvamento automático no `localStorage` do navegador
- Exportar e importar todos os quadros em JSON
- Desfazer exclusão de cartão
- Layout flexível: colunas crescem em telas largas e viram um carrossel no celular

## Como abrir no navegador

Dê um duplo clique em `index.html` ou, no terminal:

```powershell
start index.html
```

## Atalhos

| Tecla | Ação |
| --- | --- |
| `Enter` no campo de novo cartão | Adiciona o cartão |
| `Shift + Enter` | Quebra de linha |
| `Esc` | Cancela a edição / fecha o modal |
| `Enter` em um cartão focado | Abre o editor |

## Estrutura

```
index.html              marcação e modal de edição
styles.css              tema escuro e layout
app.js                  estado, renderização, arrastar e soltar, persistência
electron/main.js        janela do app desktop (Electron)
capacitor.config.json   configuração do app Android (Capacitor)
android/                projeto Android nativo gerado pelo Capacitor
www/                    cópia dos arquivos web usada pelo Android (gerada)
build/                  ícones do app e script dos ícones do Android
linux/                  instalador e leia-me do pacote Linux
scripts/                empacotamento Linux e sincronização do www
dist/                   instaladores e pacotes gerados
```

Os dados ficam salvos apenas no dispositivo (navegador, app desktop ou app
Android). Para levar os quadros para outro lugar, use **Exportar** e depois
**Importar**. Quem já usava a versão 1.0 tem os dados migrados automaticamente
na primeira abertura.

## Versão para Windows (instalável)

Pré-requisito: Node.js 18 ou superior.

```powershell
npm install
npm run build
```

O build gera em `dist/`:

- `Fluxo-Setup-1.2.0.exe` — instalador com atalhos na área de trabalho e no menu Iniciar
- `Fluxo-Portable-1.2.0.exe` — versão portátil, sem instalar

Para testar em modo de desenvolvimento:

```powershell
npm start
```

O instalador não é assinado digitalmente, então o Windows pode exibir o aviso
do SmartScreen na primeira execução. Clique em **Mais informações** e depois em
**Executar assim mesmo**.

## Versão para Linux (x64)

O build gera um AppImage e um pacote portátil:

```bash
npm install
npm run build:linux
npm run package:linux
```

Arquivos gerados em `dist/`:

- `Fluxo-1.2.0-linux-x86_64.AppImage` — execute com `chmod +x` e duplo clique
- `Fluxo-1.2.0-linux-x64.tar.gz` — pacote portátil

```bash
tar -xzf Fluxo-1.2.0-linux-x64.tar.gz
cd Fluxo-1.2.0-linux-x64
./fluxo
```

Instalação opcional (atalho no menu de aplicativos):

```bash
./install.sh
```

Dependências comuns em Debian/Ubuntu:

```bash
sudo apt install libgtk-3-0 libnss3 libasound2 libgbm1 libxss1
```

O AppImage só é gerado em Linux (no Windows o empacotador não consegue criar os
symlinks). O workflow do GitHub Actions cuida disso automaticamente.

## Versão para Android (APK)

O app Android é um invólucro do Capacitor em volta do mesmo código web.

```bash
npm install
npm run android:sync
cd android
./gradlew assembleDebug
```

O APK sai em `android/app/build/outputs/apk/debug/app-debug.apk`.

Para instalar no celular, copie o APK e abra no aparelho, permitindo a
instalação de fontes desconhecidas.

Detalhes:

- `appId`: `com.fluxo.kanban`
- Nome exibido: **Fluxo**
- Android mínimo: 7.0 (API 24)
- Exportar abre o menu de compartilhamento do Android para salvar o JSON
- Importar usa o seletor de arquivos do sistema

### Gerar o APK sem Android SDK na máquina

O workflow `.github/workflows/release.yml` compila o APK no GitHub Actions
(`ubuntu-latest`) com JDK 21 e o Android SDK, e anexa o resultado ao release.

## Publicar uma versão

O workflow `.github/workflows/release.yml` roda ao enviar uma tag `v*`:

```bash
git tag v1.2.0
git push origin v1.2.0
```

Ele compila Windows, Linux e Android em paralelo e publica tudo em um release
do GitHub.
