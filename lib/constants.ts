export const MESSAGE_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30; // 30 day

const APP_URL = process.env.NEXT_PUBLIC_URL;

if (!APP_URL) {
  throw new Error('NEXT_PUBLIC_URL or NEXT_PUBLIC_VERCEL_URL is not set');
}

export { APP_URL };

// Monad Testnet Configuration
export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

// NOTE: Kuru contracts removed - MonadSwap now uses Monorail exclusively

// Official Tokens (Monad Testnet)
export const TOKENS = {
  MON: {
    address: "0x0000000000000000000000000000000000000000", // Native token
    symbol: "MON",
    decimals: 18,
    name: "Monad"
  },
  USDC: {
    address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin"
  },
  USDT: {
    address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D", 
    symbol: "USDT",
    decimals: 6,
    name: "Tether USD"
  },
  DAK: {
    address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714",
    symbol: "DAK",
    decimals: 18,
    name: "DAK Token"
  },
  CHOG: {
    address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
    symbol: "CHOG", 
    decimals: 18,
    name: "CHOG Token"
  },
  YAKI: {
    address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50",
    symbol: "YAKI",
    decimals: 18,
    name: "YAKI Token"
  }
} as const;

// Official Markets (Monad Testnet)  
export const MARKETS = {
  "MON-USDC": "0xd3af145f1aa1a471b5f0f62c52cf8fcdc9ab55d3",
  "DAK-MON": "0x94b72620e65577de5fb2b8a8b93328caf6ca161b",
  "CHOG-MON": "0x277bf4a0aac16f19d7bf592feffc8d2d9a890508",
  "YAKI-MON": "0xd5c1dc181c359f0199c83045a85cd2556b325de0"
} as const;
