'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useWeb3 } from '../context/Web3Context';

export default function Navbar() {
  const { account, connectWallet, disconnectWallet, isConnected } = useWeb3();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Format account address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle sign out
  const handleSignOut = () => {
    disconnectWallet();
    setIsProfileOpen(false);
  };

  // Handle connect different wallet
  const handleConnectDifferent = () => {
    disconnectWallet();
    setWalletError(null);
    setTimeout(async () => {
      try {
        await connectWallet('metamask', true);
        setIsProfileOpen(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
        setWalletError(errorMessage);
        console.error('Failed to connect wallet:', error);
      }
    }, 100);
  };

  // Handle connect wallet
  const handleConnectWallet = async () => {
    setWalletError(null);
    try {
      await connectWallet('metamask');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setWalletError(errorMessage);
      console.error('Failed to connect wallet:', error);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="font-bold text-xl">
                AthleteChain
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 hover:text-white">
                  Dashboard
                </Link>
                <Link href="/contracts" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 hover:text-white">
                  Contracts
                </Link>
                <Link href="/nfts" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 hover:text-white">
                  NFTs
                </Link>
                <Link href="/disputes" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 hover:text-white">
                  Disputes
                </Link>
                <Link href="/register" className="px-3 py-2 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700 text-white">
                  Register Users
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {isConnected ? (
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    className="bg-blue-700 py-2 px-4 rounded-lg font-medium flex items-center"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                  >
                    <span>{formatAddress(account || '')}</span>
                    <svg 
                      className={`ml-2 h-4 w-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown menu */}
                  {isProfileOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <Link 
                        href="/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Your Profile
                      </Link>
                      <Link 
                        href="/register" 
                        className="block px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Register Account
                      </Link>
                      <button
                        onClick={handleConnectDifferent}
                        className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
                      >
                        Connect Different Wallet
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 
                             text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-blue-700 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 hover:text-white">
              Dashboard
            </Link>
            <Link href="/contracts" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 hover:text-white">
              Contracts
            </Link>
            <Link href="/nfts" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 hover:text-white">
              NFTs
            </Link>
            <Link href="/disputes" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 hover:text-white">
              Disputes
            </Link>
            <Link href="/register" className="block px-3 py-2 rounded-md text-base font-medium bg-green-600 hover:bg-green-700 hover:text-white">
              Register
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-blue-700">
            <div className="flex items-center px-5">
              {isConnected ? (
                <div className="w-full">
                  <div className="bg-blue-700 py-2 px-4 rounded-lg font-medium mb-2">
                    {formatAddress(account || '')}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Link 
                      href="/profile"
                      className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 hover:text-white"
                    >
                      Your Profile
                    </Link>
                    <Link 
                      href="/register"
                      className="block px-3 py-2 rounded-md text-base font-medium bg-green-600 hover:bg-green-700 text-white"
                    >
                      Register Account
                    </Link>
                    <button
                      onClick={handleConnectDifferent}
                      className="text-left px-3 py-2 rounded-md text-base font-medium text-blue-300 hover:bg-blue-700 hover:text-blue-200"
                    >
                      Connect Different Wallet
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="text-left px-3 py-2 rounded-md text-base font-medium text-red-300 hover:bg-blue-700 hover:text-red-200"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 
                             text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add error display */}
      {walletError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{walletError}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setWalletError(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}
    </nav>
  );
} 