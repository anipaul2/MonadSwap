# 🚀 MonadSwap Deployment Guide

## Quick Deploy to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "feat: production-ready MonadSwap with viral sharing"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set the following environment variables in Vercel dashboard:

```
NEXT_PUBLIC_URL=https://your-app-name.vercel.app
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
NEYNAR_API_KEY=your-neynar-key
KURU_API_URL=https://api.testnet.kuru.io
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_CHAIN_ID=10143
```

### 3. Update Manifest
After deployment, update the `NEXT_PUBLIC_URL` in Vercel with your actual Vercel URL.

## 🔄 Features Included

✅ **DEX Trading** - Swap tokens on Monad Testnet  
✅ **Price Alerts** - Get notified when tokens hit targets  
✅ **Social Trending** - See tokens trending in your network  
✅ **Viral Sharing** - Share swaps to grow the platform  
✅ **Automated Monitoring** - Cron job for price alerts  
✅ **Production Ready** - Optimized manifest and images  

## 🔔 Testing Notifications

After deployment, test the webhook at:
`https://your-app.vercel.app/api/webhook`

## 🎯 Viral Loop

1. User completes swap
2. Success modal shows with sharing button
3. User shares on Farcaster with app embed
4. Their followers discover and try the app
5. Loop continues!