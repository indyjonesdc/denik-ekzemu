# 📲 Návod – nasazení na Netlify s AI analýzou fotek

## ✅ Co budete potřebovat (5 minut)

1. Účet na **GitHub** (už máte)
2. Účet na **Netlify** (zdarma)
3. API klíč od **Anthropic** (zdarma $5 kreditu)

---

## 1️⃣ Nahrání souborů do GitHubu

Otevřete vaše GitHub repo s aplikací.

**Smažte všechny staré soubory** (volitelné, ale doporučené):
- Klikněte na soubor → 🗑 ikona koše → Commit changes

**Nahrajte nové soubory** z této ZIP:
- Klikněte **Add file → Upload files**
- Z rozbaleného ZIPu přetáhněte **všechny soubory a složky**:
  - `index.html`
  - `app.js`
  - `sw.js`
  - `manifest.json`
  - `netlify.toml`
  - složku `icons/`
  - složku `netlify/`
- Commit changes

---

## 2️⃣ Připojení Netlify ke GitHubu

1. Jděte na **https://app.netlify.com**
2. Klikněte **Add new site → Import an existing project**
3. Vyberte **Deploy with GitHub**
4. Povolte přístup k vašemu GitHub účtu
5. Najděte své repo `ekzem-denik` (nebo jak jste ho pojmenoval)
6. **Build settings nechte prázdné** – Netlify si vše najde sám
7. Klikněte **Deploy**

Za minutu dostanete URL typu `https://random-name-abc123.netlify.app`

**Změnit jméno:** Site configuration → Change site name → třeba `denik-novak` → URL bude `https://denik-novak.netlify.app`

---

## 3️⃣ Získání API klíče od Anthropic

1. Jděte na **https://console.anthropic.com**
2. Registrace přes Google/email
3. Po přihlášení vlevo **API Keys → Create Key**
4. Pojmenujte klíč (např. „ekzem-denik")
5. **Zkopírujte klíč** – začíná `sk-ant-api03-...` ⚠️ zobrazí se jen jednou!
6. Dostanete **$5 kreditu zdarma** – to stačí na stovky porovnání fotek

---

## 4️⃣ Přidání API klíče do Netlify

1. V Netlify dashboardu → vaše stránka → **Site configuration**
2. Vlevo **Environment variables**
3. Klikněte **Add a variable**
4. **Key:** `ANTHROPIC_API_KEY`
5. **Values:** vložte zkopírovaný klíč (`sk-ant-api03-...`)
6. **Save**
7. **Důležité:** Deploys → **Trigger deploy → Deploy site** (aby si funkce načetla klíč)

---

## 5️⃣ Test

1. Otevřete URL své aplikace
2. Přihlaste se / vyzkoušejte demo
3. Jděte na záložku **📷 Foto AI**
4. Vyfoťte 2 obrázky (nebo nahrajte z galerie)
5. Klikněte **🔍 Porovnat poslední dvě fotky**
6. Za 5–10 vteřin se objeví AI analýza!

---

## 🔧 Když něco nefunguje

### „Chyba analýzy: API klíč není nastaven"
→ Nezapomněli jste na **Trigger deploy** po přidání env proměnné? Krok 4.7.

### „Anthropic API vrátilo chybu (401)"
→ Klíč je špatně zkopírován. Smažte v Netlify env proměnnou, znovu zkopírujte klíč z console.anthropic.com a uložte. Pak Trigger deploy.

### „Anthropic API vrátilo chybu (429)"
→ Vyčerpali jste kredit. Console.anthropic.com → Settings → Plans & Billing → dobít.

### Fotka se nenahraje
→ Na iOS Safari musí být povolen přístup ke kameře: Nastavení iPhone → Safari → Kamera → Povolit.

---

## 💡 Bonus: každá změna v GitHubu = automatický update appky

Kdykoli upravíte soubor v GitHubu (přidáte krém, změníte text), Netlify to **automaticky** nasadí na web do 1 minuty. Všichni uživatelé dostanou novou verzi při dalším otevření aplikace.

---

## 💰 Kolik to bude stát?

- **Netlify:** zdarma (až 100 GB provozu a 125 000 volání funkcí měsíčně)
- **Anthropic API:** ~$0.01 za jedno porovnání fotek
- S $5 kreditem zvládnete **stovky porovnání**

Pro běžnou rodinu která fotí jednou týdně to vyjde na ~$0.50 měsíčně.

---

Vyřešeno! Hodně štěstí s nasazením 🌟
