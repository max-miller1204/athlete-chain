'use client';

import { useWeb3 } from '../context/Web3Context';
import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const { connectWallet, isConnected } = useWeb3();
  const [walletError, setWalletError] = useState<string | null>(null);

  // Handle connect wallet
  const handleConnectWallet = async () => {
    setWalletError(null);
    try {
      await connectWallet('metamask');
    } catch (error: any) {
      setWalletError(error.message || 'Failed to connect wallet');
      console.error('Failed to connect wallet:', error);
    }
  };

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-3xl -z-10" />
        
        <div className="py-16 md:py-24 px-6 sm:px-8 lg:px-12 rounded-3xl shadow-xl">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-900 mb-6">
              Decentralized Athlete Contract Management
            </h1>
            <p className="text-lg md:text-xl text-blue-700 mb-10">
              Secure, transparent, and efficient contract management for athletes, 
              sponsors, and teams using blockchain technology.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {!isConnected ? (
                <button
                  onClick={handleConnectWallet}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                             text-white text-lg font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition duration-200"
                >
                  Connect Wallet
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                             text-white text-lg font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition duration-200"
                >
                  Go to Dashboard
                </Link>
              )}
              <Link
                href="#features"
                className="bg-white text-blue-700 hover:bg-blue-50 border-2 border-blue-200 
                           text-lg font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section id="features" className="py-12">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">Key Features</h2>
          <p className="text-lg text-blue-700 max-w-3xl mx-auto">
            AthleteChain provides a comprehensive solution for managing athlete sponsorships and contracts
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-3">Smart Contracts</h3>
            <p className="text-gray-600">
              Automatically execute contract terms based on predefined conditions. Ensure transparency with immutable contract storage.
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-3">Decentralized Payments</h3>
            <p className="text-gray-600">
              Enable automatic payments using cryptocurrencies with milestone-based releases and revenue-sharing models.
            </p>
          </div>
          
          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-3">Contract Verification</h3>
            <p className="text-gray-600">
              Every contract update is recorded on-chain for full transparency. Store contract documents securely with IPFS.
            </p>
          </div>
          
          {/* Feature 4 */}
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-3">Dispute Resolution</h3>
            <p className="text-gray-600">
              Implement an arbitration system for handling contract disputes with DAO-style voting mechanisms.
            </p>
          </div>
          
          {/* Feature 5 */}
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-3">NFT Sponsorships</h3>
            <p className="text-gray-600">
              Convert contracts into NFTs representing athlete endorsements. Allow sponsors to trade or transfer deals securely.
            </p>
          </div>
          
          {/* Feature 6 */}
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-3">Multi-User Roles</h3>
            <p className="text-gray-600">
              Different permissions for athletes, agents, sponsors, and teams. Secure role-based access control.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16 rounded-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">How It Works</h2>
          <p className="text-lg text-blue-700 max-w-3xl mx-auto">
            A simple process to get started with blockchain-based contract management
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="bg-blue-600 text-white text-xl font-bold rounded-full w-10 h-10 flex items-center justify-center mb-4">1</div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">Connect Wallet</h3>
                <p className="text-gray-600">
                  Connect your Ethereum wallet to the platform, establishing your digital identity securely.
                </p>
              </div>
            </div>
            <div className="md:w-1/2 md:pl-8">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="bg-blue-600 text-white text-xl font-bold rounded-full w-10 h-10 flex items-center justify-center mb-4">2</div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">Register Profile</h3>
                <p className="text-gray-600">
                  Create your profile as an athlete, agent, sponsor, or team with appropriate permissions.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between mb-12">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="bg-blue-600 text-white text-xl font-bold rounded-full w-10 h-10 flex items-center justify-center mb-4">3</div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">Create Contract</h3>
                <p className="text-gray-600">
                  Draft a new contract with specific terms, milestones, payment schedules, and duties.
                </p>
              </div>
            </div>
            <div className="md:w-1/2 md:pl-8">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="bg-blue-600 text-white text-xl font-bold rounded-full w-10 h-10 flex items-center justify-center mb-4">4</div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">Execute & Monitor</h3>
                <p className="text-gray-600">
                  Activate the contract, track milestone completion, and watch automatic payments execute.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl py-12 px-6 sm:px-12 lg:px-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to revolutionize contract management?
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              Join the future of athlete sponsorships and endorsements with blockchain technology.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {!isConnected ? (
                <button
                  onClick={handleConnectWallet}
                  className="bg-white text-blue-700 hover:bg-blue-50 
                             text-lg font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition duration-200"
                >
                  Get Started
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  className="bg-white text-blue-700 hover:bg-blue-50 
                             text-lg font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition duration-200"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Display wallet error if any */}
      {walletError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
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
    </div>
  );
}
