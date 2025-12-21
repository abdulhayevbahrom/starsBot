# TON Stars / Premium Sotish Servisi

## Ishga Tushirish
1. `npm install`
2. `.env` ni to'ldiring (mnemonic va address).
3. `npm run dev` (dev) yoki `npm start` (prod).

## Test
- Root: http://localhost:8070/
- Order: POST /api/order (JSON: {username: "test", type: "stars", amount: 100})
- Health: GET /health

## Xavfsizlik
- Mnemonic ni sir saqlang.
- Production: HTTPS, rate-limit qo'shing.