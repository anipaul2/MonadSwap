'use client'

import { useState, useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { createKuruService } from '@/lib/kuru-service';
import { type SwapToken } from '@/lib/kuru-config';

interface SwapQuote {
  amountOut: string;
  priceImpact: string;
  success: boolean;
  error?: string;
}

interface SwapResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function useKuruSwap() {
  const { data: walletClient } = useWalletClient();
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const getQuote = useCallback(async (
    fromToken: SwapToken,
    toToken: SwapToken,
    amount: string
  ): Promise<SwapQuote> => {
    if (!amount || parseFloat(amount) <= 0) {
      return { success: false, error: 'Invalid amount', amountOut: '', priceImpact: '' };
    }

    setIsGettingQuote(true);
    try {
      console.log('🔍 Getting quote for swap:', {
        from: fromToken.symbol,
        to: toToken.symbol,
        amount: amount
      });

      // Create ethers provider for Kuru SDK
      const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
      const kuruService = createKuruService(provider);

      const humanAmount = parseFloat(amount);
      
      console.log('🔍 Calling kuruService.getSwapQuote with:', {
        fromAddress: fromToken.address,
        toAddress: toToken.address,
        humanAmount,
        swapType: "amountIn"
      });
      
      const quote = await kuruService.getSwapQuote(
        fromToken.address,
        toToken.address,
        humanAmount,
        "amountIn"
      );
      
      console.log('📊 Quote received:', quote);

      if (quote.success) {
        return {
          success: true,
          amountOut: quote.amountOut.toString(),
          priceImpact: typeof quote.priceImpact === 'string' ? quote.priceImpact : `${quote.priceImpact}%`
        };
      } else {
        return {
          success: false,
          error: quote.error || 'Failed to get quote',
          amountOut: '',
          priceImpact: ''
        };
      }
    } catch (error) {
      console.error('Error getting quote:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Quote failed',
        amountOut: '',
        priceImpact: ''
      };
    } finally {
      setIsGettingQuote(false);
    }
  }, []);

  const executeSwap = useCallback(async (
    fromToken: SwapToken,
    toToken: SwapToken,
    amount: string
  ): Promise<SwapResult> => {
    if (!walletClient) {
      return { success: false, error: 'Farcaster wallet not connected' };
    }

    setIsSwapping(true);
    try {
      console.log('🔄 Using Farcaster wallet for swap execution');
      console.log('📝 Wallet client details:', {
        account: walletClient.account,
        chain: walletClient.chain,
        transport: walletClient.transport
      });

      // Use walletClient.sendTransaction directly for Farcaster wallet integration
      const signerAddress = walletClient.account.address;
      console.log('🔍 Using Farcaster wallet address:', signerAddress);
      
      // Create ethers provider and signer for Kuru SDK
      const ethersProvider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
      
      // Create a complete signer interface that the Kuru SDK can use
      const signer = {
        // Core signer methods
        getAddress: () => Promise.resolve(signerAddress),
        sendTransaction: async (tx: any) => {
          console.log('🔄 Sending transaction via Farcaster wallet:', tx);
          // Use walletClient to send the transaction (this will use Farcaster wallet)
          const result = await walletClient.sendTransaction({
            to: tx.to,
            data: tx.data,
            value: tx.value || BigInt(0),
            gas: tx.gasLimit
          });
          console.log('✅ Transaction sent via Farcaster wallet:', result);
          return { hash: result, wait: () => Promise.resolve({ transactionHash: result }) };
        },
        signTransaction: (tx: any) => walletClient.signTransaction(tx),
        connect: () => signer,
        
        // Provider methods that the Kuru SDK expects (ethers v5 compatibility)
        call: (tx: any) => ethersProvider.call(tx),
        getBalance: (address: string) => ethersProvider.getBalance(address),
        getTransactionCount: (address: string) => ethersProvider.getTransactionCount(address),
        getGasPrice: async () => {
          const feeData = await ethersProvider.getFeeData();
          // Convert ethers v6 BigInt to ethers v5 BigNumber format
          return {
            toString: () => feeData.gasPrice?.toString() || '1000000000',
            toBigInt: () => feeData.gasPrice || BigInt(1000000000),
            _hex: `0x${(feeData.gasPrice || BigInt(1000000000)).toString(16)}`,
            _isBigNumber: true
          };
        },
        getNetwork: () => ethersProvider.getNetwork(),
        estimateGas: async (tx: any) => {
          // Convert ethers v5 BigNumber values to ethers v6 BigInt format
          const cleanTx = {
            ...tx,
            gasPrice: tx.gasPrice?.toBigInt ? tx.gasPrice.toBigInt() : tx.gasPrice,
            gasLimit: tx.gasLimit?.toBigInt ? tx.gasLimit.toBigInt() : tx.gasLimit,
            value: tx.value?.toBigInt ? tx.value.toBigInt() : tx.value,
            maxFeePerGas: tx.maxFeePerGas?.toBigInt ? tx.maxFeePerGas.toBigInt() : tx.maxFeePerGas,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toBigInt ? tx.maxPriorityFeePerGas.toBigInt() : tx.maxPriorityFeePerGas
          };
          console.log('🔍 Converting transaction for gas estimation:', { original: tx, cleaned: cleanTx });
          return ethersProvider.estimateGas(cleanTx);
        },
        
        // Ethers v5/v6 compatibility flags
        _isSigner: true,
        _isProvider: false,
        provider: {
          // Proxy provider methods with v5 compatibility
          getGasPrice: async () => {
            const feeData = await ethersProvider.getFeeData();
            return {
              toString: () => feeData.gasPrice?.toString() || '1000000000',
              toBigInt: () => feeData.gasPrice || BigInt(1000000000),
              _hex: `0x${(feeData.gasPrice || BigInt(1000000000)).toString(16)}`,
              _isBigNumber: true
            };
          },
          call: (tx: any) => ethersProvider.call(tx),
          getBalance: (address: string) => ethersProvider.getBalance(address),
          getTransactionCount: (address: string) => ethersProvider.getTransactionCount(address),
          getNetwork: () => ethersProvider.getNetwork(),
          estimateGas: async (tx: any) => {
            // Convert ethers v5 BigNumber values to ethers v6 BigInt format
            const cleanTx = {
              ...tx,
              gasPrice: tx.gasPrice?.toBigInt ? tx.gasPrice.toBigInt() : tx.gasPrice,
              gasLimit: tx.gasLimit?.toBigInt ? tx.gasLimit.toBigInt() : tx.gasLimit,
              value: tx.value?.toBigInt ? tx.value.toBigInt() : tx.value,
              maxFeePerGas: tx.maxFeePerGas?.toBigInt ? tx.maxFeePerGas.toBigInt() : tx.maxFeePerGas,
              maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toBigInt ? tx.maxPriorityFeePerGas.toBigInt() : tx.maxPriorityFeePerGas
            };
            console.log('🔍 Provider estimateGas converting tx:', { original: tx, cleaned: cleanTx });
            return ethersProvider.estimateGas(cleanTx);
          }
        }
      } as any; // Type assertion for Kuru SDK compatibility

      const kuruService = createKuruService(ethersProvider);

      // Kuru SDK expects human readable numbers
      const humanAmount = parseFloat(amount);

      const result = await kuruService.executeSwap(
        signer,
        fromToken.address,
        toToken.address,
        humanAmount, // Pass as number
        fromToken.decimals,
        toToken.decimals,
        true // Auto-approve tokens
      );

      return result;
    } catch (error) {
      console.error('Error executing swap:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed'
      };
    } finally {
      setIsSwapping(false);
    }
  }, [walletClient]);

  return {
    getQuote,
    executeSwap,
    isGettingQuote,
    isSwapping
  };
}