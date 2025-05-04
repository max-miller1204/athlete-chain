'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { ethers } from 'ethers';
import factoryAbi from '../artifacts/contracts/AthleteChainFactory.sol/AthleteChainFactory.json';
import contractAddresses from '../contract-addresses.json';

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  connectWallet: (walletType: string, forceAccountSelection?: boolean) => Promise<void>;
  disconnectWallet: () => void;
  factoryContract: ethers.Contract | null;
  provider: ethers.providers.Web3Provider | null;
  isConnected: boolean;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [factoryContract, setFactoryContract] = useState<ethers.Contract | null>(null);
  const [forceReconnect, setForceReconnect] = useState(0);
  const verificationStartedRef = useRef(false);

  const connectWallet = async (walletType: string, forceAccountSelection = false) => {
    try {
      let provider;
      if (walletType === 'metamask') {
        if (typeof window.ethereum !== 'undefined') {
          // Request accounts explicitly
          try {
            // Set a timeout for the wallet connection request
            const requestAccountsPromise = new Promise(async (resolve, reject) => {
              const timeoutId = setTimeout(() => {
                reject(new Error('Connection request timed out. Please try again.'));
              }, 15000); // 15 second timeout
              
              try {
                // Request permission to access accounts
                if (forceAccountSelection) {
                  await window.ethereum.request({
                    method: 'wallet_requestPermissions',
                    params: [{ eth_accounts: {} }]
                  });
                }
                
                // Request access to accounts
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                clearTimeout(timeoutId);
                resolve(accounts);
              } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
              }
            });
            
            await requestAccountsPromise;
            
            // Initialize provider
            provider = new ethers.providers.Web3Provider(window.ethereum);
          } catch (requestError: any) {
            throw new Error(`MetaMask account request failed: ${requestError.message || 'User rejected the request'}`);
          }
        } else {
          throw new Error('MetaMask is not installed');
        }
      } else if (walletType === 'walletconnect') {
        try {
          const WalletConnectProvider = (await import('@walletconnect/web3-provider')).default;
          const walletConnectProvider = new WalletConnectProvider({
            infuraId: 'YOUR_INFURA_ID' // Replace with your Infura ID
          });
          await walletConnectProvider.enable();
          provider = new ethers.providers.Web3Provider(walletConnectProvider);
        } catch (wcError: any) {
          throw new Error(`WalletConnect initialization failed: ${wcError.message || 'Unknown error'}`);
        }
      } else {
        throw new Error('Unsupported wallet type');
      }

      try {
        // Get accounts and network information
        const accounts = await provider.listAccounts();
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts found. Please make sure your wallet is unlocked and connected.');
        }
        
        const network = await provider.getNetwork();
        
        // Create contract instances
        const signer = provider.getSigner();
        
        // Check if contract addresses are valid
        if (!contractAddresses.factoryAddress || !ethers.utils.isAddress(contractAddresses.factoryAddress)) {
          console.warn('Invalid factory contract address. Proceeding without contract functionality.');
        }
        
        try {
          const factory = new ethers.Contract(contractAddresses.factoryAddress, factoryAbi.abi, signer);
          setFactoryContract(factory);

          // Set account and chain ID
          setChainId(network.chainId);
          setProvider(provider);
          // Only set account if different
          setAccount(prev => {
            if (prev !== accounts[0]) {
              return accounts[0];
            }
            return prev;
          });
          setFactoryContract(factory);
          // Only call verifyContract after all are set
          if (accounts[0] && factory && provider) {
            if (!verificationStartedRef.current) {
              verificationStartedRef.current = true;
              verifyContract().then((success) => {
                if (!success) {
                  console.log('Contract verification failed - some features may be limited');
                }
              }).catch(() => {
                console.log('Unexpected error during contract verification');
              });
            }
          }
        } catch (contractError: any) {
          console.warn('Contract initialization failed, proceeding with limited functionality:', contractError);
        }
        
        // Clear disconnected flag
        localStorage.removeItem('wallet-disconnected');
      } catch (providerError: any) {
        throw new Error(`Error accessing wallet data: ${providerError.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error connecting to wallet:', error);
      throw error; // Re-throw to allow components to handle the error
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setFactoryContract(null);
    localStorage.setItem('wallet-disconnected', 'true');
    localStorage.setItem('wallet-disconnect-time', Date.now().toString());
    setForceReconnect(prev => prev + 1);
  };

  const verifyContract = async () => {
    if (!provider || !factoryContract || !account) {
      console.warn('verifyContract: provider, factoryContract, or account is null');
      return false;
    }
    try {
      // First check if we're on the correct network
      const network = await provider.getNetwork();
      const expectedChainId = process.env.NEXT_PUBLIC_CHAIN_ID || '31337'; // Default to Hardhat
      // Allow both 31337 (Hardhat default) and 1337 (local network) for development
      const validChainIds = ['31337', '1337'];
      if (!validChainIds.includes(network.chainId.toString())) {
        console.warn(`Connected to wrong network. Expected chainId: ${validChainIds.join(' or ')}, got: ${network.chainId}`);
        return false;
      }
      // Check if contract code exists
      const code = await provider.getCode(contractAddresses.factoryAddress);
      if (code === '0x') {
        console.warn('No contract code found at the specified address');
        return false;
      }
      // Try to call a view function with increased timeout
      const contractVerificationPromise = Promise.race([
        factoryContract.isUserInRole(account, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ATHLETE_ROLE"))),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Contract verification timed out')), 30000) // 30 second timeout
        )
      ]);
      await contractVerificationPromise;
      console.log('Contract verification completed successfully');
      return true;
    } catch (verifyError: any) {
      // Don't log timeout errors as warnings since they're expected in some cases
      if (verifyError.message !== 'Contract verification timed out') {
        console.warn(
          'Contract verification warning:',
          verifyError.message || 'Unknown error',
          'Code may not be deployed on this network or network conditions may be slow'
        );
      }
      return false;
    }
  };

  useEffect(() => {
    const isDisconnected = localStorage.getItem('wallet-disconnected') === 'true';
    if (!isDisconnected && typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            connectWallet('metamask');
          }
        })
        .catch((err: any) => console.error(err));

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          localStorage.removeItem('wallet-disconnected');
          setAccount(prev => {
            if (prev !== accounts[0]) {
              return accounts[0];
            }
            return prev;
          });
          if (provider) {
            const signer = provider.getSigner();
            const factory = new ethers.Contract(contractAddresses.factoryAddress, factoryAbi.abi, signer);
            setFactoryContract(factory);
          }
        } else {
          setAccount(null);
          setFactoryContract(null);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, [provider, forceReconnect]);

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

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

// Add types for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}