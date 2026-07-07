# Hegemonia — Railway + Vercel Deploy Rehberi

Docker gerekmez. PostgreSQL için **Neon** (ücretsiz), API için **Railway**, frontend için **Vercel** kullanılır.

## Mimari

```
Oyuncu → Vercel (React) → Railway (Node API) → Neon (PostgreSQL)
                ↘ Firebase (Auth + Chat)
```

---

## 1. Neon — PostgreSQL

1. [neon.tech](https://neon.tech) hesabı açın
2. **New Project** → proje adı: `hegemonia`
3. **Connection string** kopyalayın (ör. `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
4. Bu URL'yi `DATABASE_URL` olarak saklayın

---

## 2. GitHub — Kodu push edin

```bash
git add .
git commit -m "Add Railway and Vercel deploy config"
git push origin main
```

---

## 3. Railway — API

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. `hegemonia` reposunu seçin
3. **Settings** → **Root Directory**: boş bırakın (repo kökü)
4. `railway.toml` otomatik algılanır

### Ortam değişkenleri (Variables)

| Değişken | Değer |
|----------|-------|
| `DATABASE_URL` | Neon connection string |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://SIZIN-VERCEL-URL.vercel.app` (deploy sonrası güncellenir) |
| `DEV_AUTH_BYPASS` | `true` (ilk test için; Firebase ekleyince `false`) |
| `FIREBASE_PROJECT_ID` | (opsiyonel) |
| `FIREBASE_CLIENT_EMAIL` | (opsiyonel) |
| `FIREBASE_PRIVATE_KEY` | (opsiyonel, `\n` kaçışlı) |

`PORT` Railway tarafından otomatik atanır — elle eklemeyin.

5. **Deploy** tamamlanınca **Settings → Networking → Generate Domain** ile public URL alın  
   Örnek: `https://hegemonia-api-production.up.railway.app`

6. Health check: `https://YOUR-API.up.railway.app/health` → `{"status":"ok"}`

### İlk seed (bir kez)

Railway CLI veya dashboard **Run Command**:

```bash
npm run db:seed:prod --workspace=@hegemonia/api
```

Veya lokalden (Railway CLI ile):

```bash
railway link
railway run npm run db:seed:prod --workspace=@hegemonia/api
```

`preDeployCommand` her deploy'da migration çalıştırır; seed otomatik değildir.

---

## 4. Vercel — Frontend

1. [vercel.com](https://vercel.com) → **Add New Project** → GitHub `hegemonia`
2. **Root Directory**: boş (repo kökü — `vercel.json` kullanılır)
3. Framework: Vite (otomatik)

### Environment Variables (Build time)

| Değişken | Değer |
|----------|-------|
| `VITE_API_URL` | `https://YOUR-API.up.railway.app` |
| `VITE_FIREBASE_API_KEY` | Firebase console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `proje.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ... |
| `VITE_FIREBASE_STORAGE_BUCKET` | ... |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ... |
| `VITE_FIREBASE_APP_ID` | ... |

Firebase yoksa yalnızca `VITE_API_URL` yeterli (dev auth bypass API tarafında açık olmalı).

4. **Deploy**

5. Vercel URL'nizi kopyalayın (ör. `https://hegemonia.vercel.app`)

6. Railway'de `CORS_ORIGIN` değişkenini bu URL ile güncelleyin ve API'yi yeniden deploy edin

Preview branch'ler için virgülle ayırın:

```
CORS_ORIGIN=https://hegemonia.vercel.app,https://hegemonia-git-main-xxx.vercel.app
```

---

## 5. Firebase (opsiyonel — chat + gerçek auth)

1. [Firebase Console](https://console.firebase.google.com) → proje oluştur
2. **Authentication** → Email + Google etkinleştir
3. **Firestore** → oluştur, kuralları deploy edin:

```bash
firebase deploy --only firestore:rules
# infra/firebase/firestore.rules dosyasını kullanın
```

4. Web app config → Vercel env'lere `VITE_*` olarak ekleyin
5. Service account JSON → Railway'e `FIREBASE_*` olarak ekleyin
6. `DEV_AUTH_BYPASS=false` yapın

---

## 6. Test checklist

- [ ] `GET /health` Railway'de 200 döner
- [ ] Vercel'de login ekranı açılır
- [ ] Dev giriş veya Firebase ile giriş → profil + 0 HA
- [ ] Harita 81 ili gösterir
- [ ] Fabrika kurma / pazar / siyaset sekmeleri API'ye bağlanır
- [ ] Savaş sayfası Socket.io bağlantısı kurar

---

## Sorun giderme

| Sorun | Çözüm |
|-------|-------|
| CORS hatası | Railway `CORS_ORIGIN` = tam Vercel URL (sonda `/` yok) |
| API bağlanamıyor | `VITE_API_URL` doğru mu, Railway domain public mi |
| DB connection failed | Neon URL'de `?sslmode=require` var mı |
| Migration failed | Railway deploy loglarında `preDeployCommand` çıktısına bakın |
| Chat çalışmıyor | Firebase env'leri Vercel'de tanımlı mı, Firestore rules deploy edildi mi |

---

## Maliyet (tahmini)

| Servis | Tier |
|--------|------|
| Neon | Ücretsiz (0.5 GB) |
| Railway | ~$5/ay kredi (trial) |
| Vercel | Ücretsiz hobby |
| Firebase | Ücretsiz spark |
