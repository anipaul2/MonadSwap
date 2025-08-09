import { PoolFetcher, PathFinder, TokenSwap } from '@kuru-labs/kuru-sdk';
import { ethers } from 'ethers';
import { KURU_CONTRACTS, TOKENS } from './constants';

console.log('📦 Using ethers v6 with v5 compatibility for Kuru SDK');

// Base tokens for routing - Use native MON and major stable coins as routing tokens
const BASE_TOKENS = [
  { symbol: "MON", address: "0x0000000000000000000000000000000000000000" },
  { symbol: "USDC", address: TOKENS.USDC.address },
  { symbol: "USDT", address: TOKENS.USDT.address }
];

// Kuru Service for real SDK integration
export class KuruService {
  private provider: any;
  private apiUrl: string;
  private poolFetcher: PoolFetcher;

  constructor(provider?: any) {
    console.log('🔄 Creating provider for Kuru SDK');
    
    // Create ethers v6 provider and add v5 compatibility methods
    const baseProvider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
    
    // Add ethers v5 compatibility layer for Kuru SDK
    this.provider = {
      ...baseProvider,
      // v5 compatibility methods
      getNetwork: baseProvider.getNetwork.bind(baseProvider),
      getBalance: baseProvider.getBalance.bind(baseProvider),
      call: baseProvider.call.bind(baseProvider),
      estimateGas: baseProvider.estimateGas.bind(baseProvider),
      getTransactionCount: baseProvider.getTransactionCount.bind(baseProvider),
      getGasPrice: baseProvider.getFeeData.bind(baseProvider),
      // Add other methods Kuru SDK might need
      _isProvider: true,
      provider: baseProvider.provider,
      connection: {
        url: 'https://testnet-rpc.monad.xyz'
      }
    };
    
    console.log('🔍 Provider initialized:', {
      provider: this.provider,
      type: 'JsonRpcProvider (v5 compatible)',
      version: 'ethers v6 with v5 compatibility'
    });
    
    this.apiUrl = "https://api.testnet.kuru.io";
    this.poolFetcher = new PoolFetcher(this.apiUrl);
    
    console.log('🚀 KuruService initialized:', {
      apiUrl: this.apiUrl,
      rpcUrl: 'https://testnet-rpc.monad.xyz',
      network: 'Monad Testnet',
      ethersVersion: 'v6 with v5 compatibility'
    });
  }

  // Get token balance for connected wallet
  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        // Native MON balance
        const balance = await this.provider.getBalance(walletAddress);
        return ethers.formatEther(balance);
      } else {
        // ERC20 token balance
        const contract = new ethers.Contract(
          tokenAddress,
          ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
          this.provider
        );
        const balance = await contract.balanceOf(walletAddress);
        const decimals = await contract.decimals();
        return ethers.formatUnits(balance, decimals);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      return "0.00";
    }
  }

  // Get all available pools for swapping using Kuru SDK
  async getPools(tokenInAddress: string, tokenOutAddress: string) {
    try {
      console.log('🔍 Fetching pools for swap:', {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        apiUrl: this.apiUrl,
        baseTokens: BASE_TOKENS
      });
      
      // Note: API health endpoint doesn't exist, proceeding directly to pool fetch
      console.log('🌐 Fetching pools from Kuru API...');
      
      const pools = await this.poolFetcher.getAllPools(
        tokenInAddress,
        tokenOutAddress,
        BASE_TOKENS
      );
      
      console.log('✅ Pools found:', pools.length);
      if (pools.length > 0) {
        console.log('📝 Pool details:', pools);
      } else {
        console.warn('⚠️ No pools returned from API. This could mean:');
        console.warn('  1. No liquidity exists for this token pair');
        console.warn('  2. Tokens are not deployed on testnet');
        console.warn('  3. API endpoint issues');
      }
      return pools;
    } catch (error) {
      console.error('❌ Error fetching pools:', error);
      console.error('🔍 Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      return [];
    }
  }

  // Calculate swap quote using Kuru SDK
  async getSwapQuote(
    tokenInAddress: string,
    tokenOutAddress: string,
    amount: number, // Amount in human readable format (not wei)
    swapType: "amountIn" | "amountOut" = "amountIn"
  ) {
    try {
      console.log('🔍 Getting swap quote:', {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amount,
        swapType
      });

      // Get pools first
      const pools = await this.getPools(tokenInAddress, tokenOutAddress);
      
      if (pools.length === 0) {
        console.error('❌ No pools available for this trading pair');
        throw new Error('No pools available for this trading pair');
      }

      console.log('🔍 Finding best path with pools:', pools.length);
      
      // Ensure provider is properly connected before using PathFinder
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      // Find best path using PathFinder - ensure provider has network connection
      console.log('🔗 Ensuring provider network connection...');
      try {
        const network = await this.provider.getNetwork();
        console.log('✅ Network connected:', network.chainId, network.name);
      } catch (networkError) {
        console.error('❌ Network connection failed, creating new provider...', networkError);
        // Create a fresh provider if network connection fails
        const baseProvider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
        this.provider = {
          ...baseProvider,
          getNetwork: baseProvider.getNetwork.bind(baseProvider),
          getBalance: baseProvider.getBalance.bind(baseProvider),
          call: baseProvider.call.bind(baseProvider),
          estimateGas: baseProvider.estimateGas.bind(baseProvider),
          getTransactionCount: baseProvider.getTransactionCount.bind(baseProvider),
          getGasPrice: baseProvider.getFeeData.bind(baseProvider),
          _isProvider: true,
          provider: baseProvider.provider,
          connection: { url: 'https://testnet-rpc.monad.xyz' }
        };
        const network = await this.provider.getNetwork();
        console.log('✅ New provider network connected:', network.chainId, network.name);
      }
      
      console.log('🔍 Calling PathFinder.findBestPath...');
      const routeOutput = await PathFinder.findBestPath(
        this.provider,
        tokenInAddress,
        tokenOutAddress,
        amount,
        swapType,
        this.poolFetcher,
        pools
      );
      console.log('✅ PathFinder returned route:', routeOutput);

      console.log('PathFinder result:', routeOutput);

      if (!routeOutput) {
        console.error('❌ No valid swap path found');
        throw new Error('No valid swap path found');
      }

      const result = {
        routeOutput: routeOutput,
        amountOut: routeOutput.output,
        priceImpact: routeOutput.priceImpact || '~0.1%',
        success: true as const
      };

      console.log('✅ Swap quote result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error getting swap quote:', error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Execute swap transaction using Kuru SDK
  async executeSwap(
    signer: ethers.Signer,
    tokenInAddress: string,
    tokenOutAddress: string,
    amount: number, // Amount in human readable format
    inTokenDecimals: number,
    outTokenDecimals: number,
    approveTokens: boolean = true
  ) {
    // Native token (MON) doesn't need approval
    const isNativeToken = tokenInAddress === "0x0000000000000000000000000000000000000000";
    const shouldApprove = approveTokens && !isNativeToken;
    
    console.log('🔍 Swap execution config:', {
      isNativeToken,
      shouldApprove,
      originalApproveTokens: approveTokens
    });
    try {
      console.log('🔄 Executing swap:', {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amount,
        inDecimals: inTokenDecimals,
        outDecimals: outTokenDecimals
      });

      // Get swap quote first
      const quote = await this.getSwapQuote(tokenInAddress, tokenOutAddress, amount, "amountIn");
      
      if (!quote.success) {
        throw new Error(quote.error || 'Failed to get swap quote');
      }

      console.log('🔄 Executing swap with route:', quote.routeOutput);
      console.log('🔍 Swap parameters:', {
        router: KURU_CONTRACTS.ROUTER,
        signer: await signer.getAddress(),
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amount,
        inDecimals: inTokenDecimals,
        outDecimals: outTokenDecimals,
        slippage: 0.5,
        approveTokens
      });

      // Quick test - check if we can call the token contract
      if (tokenOutAddress !== "0x0000000000000000000000000000000000000000") {
        try {
          const contract = new ethers.Contract(
            tokenOutAddress,
            ["function name() view returns (string)", "function symbol() view returns (string)"],
            this.provider
          );
          const name = await contract.name();
          const symbol = await contract.symbol();
          console.log('✅ Token contract accessible:', { name, symbol, address: tokenOutAddress });
        } catch (tokenError) {
          console.error('❌ Token contract not accessible:', tokenError);
          console.error('⚠️ This token may not be properly deployed on testnet');
        }
      }

      // Check token balance before swap
      if (!isNativeToken) {
        try {
          const tokenContract = new ethers.Contract(
            tokenInAddress,
            ["function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)"],
            this.provider
          );
          const userAddress = await signer.getAddress();
          const balance = await tokenContract.balanceOf(userAddress);
          const allowance = await tokenContract.allowance(userAddress, KURU_CONTRACTS.ROUTER);
          const amountWei = ethers.parseUnits(amount.toString(), inTokenDecimals);
          
          console.log('🔍 Pre-swap token checks:', {
            userBalance: ethers.formatUnits(balance, inTokenDecimals),
            currentAllowance: ethers.formatUnits(allowance, inTokenDecimals),
            requiredAmount: amount,
            hasEnoughBalance: balance >= amountWei,
            hasEnoughAllowance: allowance >= amountWei,
            shouldApprove
          });
          
          if (balance < amountWei) {
            throw new Error(`Insufficient ${tokenInAddress} balance. Have: ${ethers.formatUnits(balance, inTokenDecimals)}, Need: ${amount}`);
          }
        } catch (balanceError) {
          console.error('❌ Token balance/allowance check failed:', balanceError);
          throw balanceError;
        }
      }

      // Execute swap using TokenSwap from Kuru SDK
      try {
        console.log('🔄 Calling TokenSwap.swap...');
        const receipt = await TokenSwap.swap(
          signer as any, // Kuru SDK type compatibility
          KURU_CONTRACTS.ROUTER,
          quote.routeOutput,
          amount,
          inTokenDecimals,
          outTokenDecimals,
          1.0, // Increase slippage tolerance to 1%
          shouldApprove, // Don't approve for native tokens
          (txHash: string | null) => {
            console.log(`Approval transaction hash: ${txHash}`);
          }
        );
        console.log('✅ TokenSwap.swap completed:', receipt);
        
        console.log('✅ Swap executed successfully:', receipt);

        return {
          success: true,
          txHash: receipt.transactionHash,
          amountOut: quote.amountOut
        };
      } catch (swapError) {
        console.error('❌ TokenSwap.swap failed:', swapError);
        throw swapError;
      }
    } catch (error) {
      console.error('❌ Error executing swap:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed'
      };
    }
  }


}

// Create singleton instance  
export const createKuruService = (provider: any) => {
  return new KuruService(provider);
};