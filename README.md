# 🤖 Automação da pesquisa de vagas no linkedin

---

## 💻 Tecnologias utilizadas

- [Node.js](https://nodejs.org/)
- [Puppeteer](https://pptr.dev/)
- [Cheerio](https://cheerio.js.org/)
---

## 📂 Estrutura do projeto

```
envio-curriculo-linkedin/
├── scraper.js                    # Script principal
├── quick-scraper.js              # Versão rápida
├── package.json                  # Configurações e dependências
├── vagas_remotas_senior.csv      # Saída em CSV
├── vagas_remotas_senior.json     # Saída em JSON
├── node_modules/                 # Dependências instaladas
└── index.html                    # Site para acompanhamento das vagas
```

---


⚙️ Como Executar

### 1. Como executar

```bash
# Instalar dependências
npm install

# Executar versão completa
npm start

# Executar versão rápida
npm run quick

# Modo desenvolvimento (navegador visível)
npm run dev
```

---


Características do Script:

✅ Não requer login

✅ Foca em vagas remotas

✅ Filtros

✅ Remove duplicatas

✅ Salva em CSV e JSON

✅ Delay entre requisições para evitar bloqueio

✅ Headers realistas para evitar detecção

---

