'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import factoryAbi from '../artifacts/contracts/AthleteChainFactory.sol/AthleteChainFactory.json';

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  connectWallet: (forceAccountSelection?: boolean) => Promise<void>;
  disconnectWallet: () => void;
  factoryContract: ethers.Contract | null;
  provider: ethers.providers.Web3Provider | null;
  isConnected: boolean;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  chainId: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  factoryContract: null,
  provider: null,
  isConnected: false,
});

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children, factoryAddress }: { children: ReactNode, factoryAddress: string }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [factoryContract, setFactoryContract] = useState<ethers.Contract | null>(null);
  const [forceReconnect, setForceReconnect] = useState(0);

  const connectWallet = async (forceAccountSelection = false) => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Clear the disconnected flag when attempting to connect
        const disconnectTime = localStorage.getItem('wallet-disconnect-time');
        const wasDisconnected = localStorage.getItem('wallet-disconnected') === 'true';
        
        // Always force account selection if user previously disconnected
        if (wasDisconnected) {
          forceAccountSelection = true;
        }
        
        // Remove disconnection flags
        localStorage.removeItem('wallet-disconnected');
        localStorage.removeItem('wallet-disconnect-time');
        
        // First disconnect completely to ensure a clean state
        if (forceAccountSelection) {
          // Remove the account to ensure MetaMask knows we want a fresh connection
          await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          });
        }
        
        // Request account access
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts'
        });
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        
        setAccount(accounts[0]);
        setChainId(network.chainId);
        setProvider(provider);

        // Create contract instance
        const signer = provider.getSigner();
        const factory = new ethers.Contract(factoryAddress, factoryAbi.abi, signer);
        setFactoryContract(factory);
      } catch (error) {
        console.error('Error connecting to wallet:', error);
      }
    } else {
      console.error('Please install MetaMask!');
    }
  };

  // Disconnect wallet function with improved security
  const disconnectWallet = () => {
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setFactoryContract(null);
    
    // Store disconnected state and timestamp in local storage
    localStorage.setItem('wallet-disconnected', 'true');
    // Store timestamp of disconnect to enforce re-authentication
    localStorage.setItem('wallet-disconnect-time', Date.now().toString());
    
    // Increment force reconnect counter to trigger a clean reconnect if needed
    setForceReconnect(prev => prev + 1);
  };

  useEffect(() => {
    // Check if user manually disconnected previously
    const isDisconnected = localStorage.getItem('wallet-disconnected') === 'true';
    
    // Only try to auto-connect if not manually disconnected
    if (!isDisconnected && typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            connectWallet();
          }
        })
        .catch((err: any) => console.error(err));

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          // Clear disconnected flag when accounts change
          localStorage.removeItem('wallet-disconnected');
          // Reconnect with the new account
          setAccount(accounts[0]);
          if (provider) {
            const signer = provider.getSigner();
            const factory = new ethers.Contract(factoryAddress, factoryAbi.abi, signer);
            setFactoryContract(factory);
          }
        } else {
          // MetaMask was locked or user has removed accounts
          setAccount(null);
          setFactoryContract(null);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, [provider, factoryAddress, forceReconnect]);

  return (
    <Web3Context.Provider value={{ 
      account, 
      chainId, 
      connectWallet, 
      disconnectWallet,
      factoryContract, 
      provider,
      isConnected: !!account
    }}>
      {children}
    </Web3Context.Provider>
  );
};

// Add types for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
} 