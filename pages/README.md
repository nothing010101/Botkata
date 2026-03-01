# KataCari - Pencari Kata KBBI

## Deploy ke Vercel

### Cara termudah (Vercel CLI):
```bash
npm install -g vercel
npm install
vercel
```

### Via GitHub:
1. Upload folder ke GitHub
2. Import di vercel.com -> Deploy

## Kenapa Next.js?
KBBI tidak izinkan request langsung dari browser (CORS block).
Next.js API route (serverless) fetch dari server Vercel, bukan browser.
Hasilnya: no CORS, data real-time jalan sempurna.

## Sumber: kbbi.kemdikbud.go.id
