import { ethers } from 'ethers';
import { sdk } from '@farcaster/miniapp-sdk';

// Monorail Configuration (using Next.js API proxy to avoid CORS issues)
// Updated: 2025-01-27 - Now using proxy routes
export const MONORAIL_CONFIG = {
  pathfinderUrl: '/api/monorail/pathfinder',
  dataUrl: '/api/monorail',
  appId: '2110175452158992', // Your Monorail App ID
  defaultSlippage: 1000, // 10% in basis points (increased for testnet volatile pairs)
  defaultDeadline: 600 // 10 minutes (increased for better execution)
};

// Monorail API Types
export interface MonorailQuote {
  success: boolean;
  amountOut: string;
  priceImpact: string;
  routes: MonorailRoute[][];
  transaction?: {
    to: string;
    data: string;
    value: string;
  };
  error?: string;
  gasEstimate?: number;
  quoteId?: string;
  minOutput?: string;
  fees?: {
    protocolBps: number;
    protocolAmount: string;
    feeShareBps: number;
    feeShareAmount: string;
  };
}

export interface MonorailRoute {
  from: string;
  from_symbol: string;
  to: string;
  to_symbol: string;
  weighted_price_impact: string;
  splits: MonorailSplit[];
}

export interface MonorailSplit {
  protocol: string;
  percentage: string;
  price_impact: string;
  fee: string;
}

export interface MonorailToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  categories: string[];
  mon_per_token: string;
  mon_value?: string;
  usd_per_token: string;
  pconf: string; // Price confidence 0-100
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class MonorailService {
  constructor() {
    console.log('🚀 MonorailService initialized with app ID:', MONORAIL_CONFIG.appId);
  }

  // Create a Farcaster wallet client wrapper
  createFarcasterWalletClient(userAddress: string) {
    if (!sdk.wallet?.ethProvider) {
      throw new Error('Farcaster ethProvider not available');
    }

    return {
      account: { address: userAddress as `0x${string}` },
      chain: { id: 10143 },
      sendTransaction: async (tx: any) => {
        console.log('📤 Sending transaction via Farcaster SDK:', tx);
        
        try {
          const result = await sdk.wallet.ethProvider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: userAddress as `0x${string}`,
              to: tx.to,
              data: tx.data,
              value: tx.value ? `0x${tx.value.toString(16)}` : '0x0',
              gas: tx.gas ? `0x${tx.gas.toString(16)}` : undefined
            }]
          });
          
          console.log('✅ Farcaster transaction result:', result);
          return result;
        } catch (error) {
          console.error('❌ Farcaster transaction error:', error);
          throw error;
        }
      }
    };
  }

  // Get swap quote using Monorail Pathfinder
  async getSwapQuote(
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: number,
    senderAddress?: string
  ): Promise<MonorailQuote> {
    try {
      // Ensure amount is properly formatted as decimal string (not scientific notation)
      const formattedAmount = amount.toFixed(18).replace(/\.?0+$/, '');
      
      const params = new URLSearchParams({
        source: MONORAIL_CONFIG.appId,
        from: fromTokenAddress,
        to: toTokenAddress,
        amount: formattedAmount,
        max_slippage: MONORAIL_CONFIG.defaultSlippage.toString(),
        deadline: MONORAIL_CONFIG.defaultDeadline.toString()
      });

      console.log('🔧 Swap parameters:', {
        slippage: `${MONORAIL_CONFIG.defaultSlippage / 100}%`,
        deadline: `${MONORAIL_CONFIG.defaultDeadline}s`,
        amount: formattedAmount,
        originalAmount: amount.toString()
      });

      // Add sender for transaction data
      if (senderAddress) {
        params.append('sender', senderAddress);
      }

      console.log('🔍 Monorail quote request:', {
        from: fromTokenAddress,
        to: toTokenAddress,
        amount: formattedAmount,
        sender: senderAddress,
        slippage: `${MONORAIL_CONFIG.defaultSlippage} (${MONORAIL_CONFIG.defaultSlippage/100}%)`,
        deadline: `${MONORAIL_CONFIG.defaultDeadline}s`,
        url: `${MONORAIL_CONFIG.pathfinderUrl}/quote?${params}`
      });

      const response = await fetch(`${MONORAIL_CONFIG.pathfinderUrl}/quote?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Monorail API error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Monorail quote response:', data);

      // Parse the response according to Monorail API spec
      const quote: MonorailQuote = {
        success: true,
        amountOut: data.output_formatted || data.output,
        priceImpact: data.compound_impact || '0',
        routes: data.routes || [],
        gasEstimate: data.gas_estimate,
        quoteId: data.quote_id,
        minOutput: data.min_output_formatted || data.min_output,
        fees: data.fees ? {
          protocolBps: data.fees.protocol_bps,
          protocolAmount: data.fees.protocol_amount,
          feeShareBps: data.fees.fee_share_bps,
          feeShareAmount: data.fees.fee_share_amount
        } : undefined,
        transaction: data.transaction ? {
          to: data.transaction.to,
          data: data.transaction.data,
          value: data.transaction.value || '0'
        } : undefined
      };

      console.log('✅ Monorail quote parsed:', {
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact,
        gasEstimate: quote.gasEstimate,
        hasTransaction: !!quote.transaction,
        routesCount: quote.routes.length,
        transactionDetails: quote.transaction ? {
          to: quote.transaction.to,
          value: quote.transaction.value,
          dataLength: quote.transaction.data.length
        } : 'No transaction data'
      });

      return quote;
    } catch (error) {
      console.error('❌ Monorail quote error:', error);
      return {
        success: false,
        amountOut: '',
        priceImpact: '',
        routes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }


  // Check and execute token approval if needed
  async approveToken(
    walletClient: any,
    tokenAddress: string,
    spenderAddress: string,
    userAddress: string
  ): Promise<SwapResult> {
    try {
      console.log('🔐 Requesting token approval:', {
        token: tokenAddress,
        spender: spenderAddress,
        user: userAddress
      });

      // ERC-20 approval transaction
      const maxApproval = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      
      // Construct approval transaction data properly
      const spenderPadded = spenderAddress.slice(2).padStart(64, '0');
      const amountPadded = maxApproval.slice(2).padStart(64, '0');
      const approvalData = `0x095ea7b3${spenderPadded}${amountPadded}`;
      
      console.log('🔧 Approval transaction details:', {
        to: tokenAddress,
        data: approvalData,
        dataLength: approvalData.length,
        spender: spenderAddress,
        amount: maxApproval
      });

      // Send approval transaction
      const txHash = await walletClient.sendTransaction({
        to: tokenAddress,
        data: approvalData,
        value: BigInt(0),
        gas: BigInt(150000) // Increased gas for safety
      });

      console.log('✅ Token approval transaction sent:', txHash);
      
      return {
        success: true,
        txHash: txHash
      };
    } catch (error) {
      console.error('❌ Token approval error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Approval failed'
      };
    }
  }

  // Execute swap using the transaction data from quote
  async executeSwap(
    walletClient: any,
    quote: MonorailQuote
  ): Promise<SwapResult> {
    try {
      if (!quote.success || !quote.transaction) {
        throw new Error('Invalid quote or missing transaction data');
      }

      console.log('🚀 Executing Monorail swap:', {
        to: quote.transaction.to,
        value: quote.transaction.value,
        gasEstimate: quote.gasEstimate,
        quoteId: quote.quoteId
      });

      // Execute the transaction using Farcaster wallet
      // Use gas estimate from Monorail with generous buffer for testnet
      const gasLimit = quote.gasEstimate 
        ? BigInt(Math.floor(quote.gasEstimate * 1.5)) // 50% buffer for testnet
        : BigInt(800000); // Higher default for complex swaps

      console.log('⛽ Gas settings:', {
        estimated: quote.gasEstimate,
        limit: gasLimit.toString(),
        buffer: '50%'
      });

      const txHash = await walletClient.sendTransaction({
        to: quote.transaction.to,
        data: quote.transaction.data,
        value: BigInt(quote.transaction.value),
        gas: gasLimit
      });

      console.log('✅ Monorail swap executed successfully:', {
        txHash,
        quoteId: quote.quoteId
      });

      return {
        success: true,
        txHash
      };
    } catch (error) {
      console.error('❌ Monorail swap execution error:', error);
      
      // Parse common error messages
      let userFriendlyError = 'Swap execution failed';
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
      
      if (errorMessage.includes('insufficient funds')) {
        userFriendlyError = 'Insufficient balance or gas';
      } else if (errorMessage.includes('execution reverted')) {
        userFriendlyError = 'Transaction reverted - likely insufficient allowance or liquidity';
      } else if (errorMessage.includes('slippage')) {
        userFriendlyError = 'Price impact too high - try reducing amount';
      }

      return {
        success: false,
        error: userFriendlyError
      };
    }
  }

  // Get all token balances for an address (sorted by verified then MON value)
  async getWalletBalances(address: string): Promise<MonorailToken[]> {
    try {
      const url = `${MONORAIL_CONFIG.dataUrl}/wallet/${address}/balances`;
      console.log('💰 Fetching wallet balances for:', address);
      console.log('🔗 Using proxy URL:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const balances: MonorailToken[] = await response.json();
      console.log('✅ Wallet balances retrieved:', balances.length, 'tokens');
      
      return balances;
    } catch (error) {
      console.error('❌ Error fetching wallet balances:', error);
      throw error;
    }
  }

  // Get portfolio value in USD
  async getPortfolioValue(address: string): Promise<string> {
    try {
      const url = `${MONORAIL_CONFIG.dataUrl}/portfolio/${address}/value`;
      console.log('📊 Fetching portfolio value for:', address);
      console.log('🔗 Using proxy URL:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Portfolio value:', data.value);
      return data.value;
    } catch (error) {
      console.error('❌ Error fetching portfolio value:', error);
      throw error;
    }
  }

  // Get tokens by category (verified, stable, meme, etc.)
  async getTokensByCategory(
    category: 'wallet' | 'verified' | 'stable' | 'lst' | 'bridged' | 'meme',
    address?: string
  ): Promise<MonorailToken[]> {
    try {
      const params = address ? `?address=${address}` : '';
      console.log(`🏷️ Fetching ${category} tokens${address ? ' with balances' : ''}`);

      const response = await fetch(`${MONORAIL_CONFIG.dataUrl}/tokens/category/${category}${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const tokens: MonorailToken[] = await response.json();
      console.log(`✅ ${category} tokens retrieved:`, tokens.length);
      return tokens;
    } catch (error) {
      console.error(`❌ Error fetching ${category} tokens:`, error);
      throw error;
    }
  }

  // Search for tokens (max 10 results)
  async searchTokens(query: string, address?: string): Promise<MonorailToken[]> {
    try {
      const params = new URLSearchParams({ find: query });
      if (address) params.append('address', address);

      console.log('🔍 Searching tokens for:', query);

      const response = await fetch(`${MONORAIL_CONFIG.dataUrl}/tokens?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const tokens: MonorailToken[] = await response.json();
      console.log('✅ Token search results:', tokens.length);
      return tokens;
    } catch (error) {
      console.error('❌ Error searching tokens:', error);
      throw error;
    }
  }

  // Get token metadata by contract address
  async getTokenMetadata(contractAddress: string): Promise<MonorailToken> {
    try {
      console.log('📋 Fetching token metadata for:', contractAddress);

      const response = await fetch(`${MONORAIL_CONFIG.dataUrl}/token/${contractAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const token: MonorailToken = await response.json();
      console.log('✅ Token metadata retrieved:', token.symbol);
      return token;
    } catch (error) {
      console.error('❌ Error fetching token metadata:', error);
      throw error;
    }
  }

  // Get MON price in USD
  async getMonPrice(): Promise<number> {
    try {
      console.log('💰 Fetching MON price...');

      const response = await fetch(`${MONORAIL_CONFIG.dataUrl}/symbol/MONUSD`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const price = parseFloat(data.price);
      console.log('✅ MON price:', `$${price}`);
      return price;
    } catch (error) {
      console.error('❌ Error fetching MON price:', error);
      throw error;
    }
  }

  // Get verified tokens with balances for token selector
  async getSwapTokens(address: string): Promise<MonorailToken[]> {
    try {
      console.log('🔄 Fetching verified tokens for swap interface...');
      
      // Get verified tokens with user balances
      const verifiedTokens = await this.getTokensByCategory('verified', address);
      
      // Filter out tokens with very low price confidence or no liquidity
      const filteredTokens = verifiedTokens.filter(token => {
        const priceConf = parseFloat(token.pconf);
        const hasPrice = parseFloat(token.usd_per_token) > 0;
        return priceConf >= 50 && hasPrice; // Only tokens with 50%+ price confidence
      });

      console.log(`✅ Filtered ${filteredTokens.length} verified tokens for swapping`);
      return filteredTokens;
    } catch (error) {
      console.error('❌ Error fetching swap tokens:', error);
      // Fallback to empty array if API fails
      return [];
    }
  }
}

// Create singleton instance
export const monorailService = new MonorailService();