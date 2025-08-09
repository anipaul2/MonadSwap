import { ethers } from 'ethers';
import { TOKENS } from './constants';

// Direct RPC service for balance checking on Monad testnet
export class MonadBalanceService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    // Direct connection to Monad testnet RPC
    this.provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
  }

  // Get native MON balance
  async getMonBalance(walletAddress: string): Promise<string> {
    try {
      console.log(`Fetching MON balance for address: ${walletAddress}`);
      const balance = await this.provider.getBalance(walletAddress);
      const formatted = ethers.formatEther(balance);
      console.log(`MON balance: ${formatted}`);
      return formatted;
    } catch (error) {
      console.error('Error fetching MON balance:', error);
      return "0.00";
    }
  }

  // Get ERC20 token balance (USDC, USDT, etc.)
  async getTokenBalance(tokenAddress: string, walletAddress: string, decimals: number = 18): Promise<string> {
    try {
      console.log(`Fetching token balance for ${tokenAddress} and wallet ${walletAddress}`);
      
      const contract = new ethers.Contract(
        tokenAddress,
        [
          "function balanceOf(address) view returns (uint256)",
          "function decimals() view returns (uint8)",
          "function symbol() view returns (string)"
        ],
        this.provider
      );

      const [balance, symbol] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.symbol()
      ]);

      const formatted = ethers.formatUnits(balance, decimals);
      console.log(`${symbol} balance: ${formatted}`);
      return formatted;
    } catch (error) {
      console.error(`Error fetching token balance for ${tokenAddress}:`, error);
      return "0.00";
    }
  }

  // Get all token balances at once
  async getAllBalances(walletAddress: string) {
    try {
      console.log(`Fetching all balances for wallet: ${walletAddress}`);
      
      const [monBalance, usdcBalance, usdtBalance] = await Promise.all([
        this.getMonBalance(walletAddress),
        this.getTokenBalance(TOKENS.USDC.address, walletAddress, TOKENS.USDC.decimals),
        this.getTokenBalance(TOKENS.USDT.address, walletAddress, TOKENS.USDT.decimals)
      ]);

      return {
        MON: monBalance,
        USDC: usdcBalance,
        USDT: usdtBalance
      };
    } catch (error) {
      console.error('Error fetching all balances:', error);
      return {
        MON: "0.00",
        USDC: "0.00", 
        USDT: "0.00"
      };
    }
  }

  // Verify we're connected to Monad testnet
  async verifyNetwork(): Promise<boolean> {
    try {
      const network = await this.provider.getNetwork();
      console.log('Connected to network:', {
        name: network.name,
        chainId: Number(network.chainId),
        expected: 10143
      });
      
      return Number(network.chainId) === 10143;
    } catch (error) {
      console.error('Error verifying network:', error);
      return false;
    }
  }
}

// Singleton instance
export const monadBalanceService = new MonadBalanceService();