'use client';

import { useState } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import contractAddresses from '../../contract-addresses.json';
import factoryAbi from '../../artifacts/contracts/AthleteChainFactory.sol/AthleteChainFactory.json';

export default function RegisterPage() {
  const { isConnected, account, provider, connectWallet } = useWeb3();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [walletType, setWalletType] = useState('metamask');
  const [registering, setRegistering] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    address: '',
    name: '',
    role: 'SPONSOR_ROLE',
    profileIPFSHash: 'ipfs://QmPlaceholderHash'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!isConnected || !account || !provider) {
        throw new Error("Wallet not connected");
      }

      if (!ethers.utils.isAddress(formData.address)) {
        throw new Error("Invalid address format");
      }

      let roleBytes;
      switch(formData.role) {
        case 'ATHLETE_ROLE':
          roleBytes = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ATHLETE_ROLE"));
          break;
        case 'SPONSOR_ROLE':
          roleBytes = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SPONSOR_ROLE"));
          break;
        case 'AGENT_ROLE':
          roleBytes = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AGENT_ROLE"));
          break;
        case 'ARBITRATOR_ROLE':
          roleBytes = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ARBITRATOR_ROLE"));
          break;
        default:
          throw new Error("Invalid role");
      }

      const signer = provider.getSigner();
      const factory = new ethers.Contract(contractAddresses.factoryAddress, factoryAbi.abi, signer);

      const tx = await factory.registerUser(
        formData.address,
        roleBytes,
        formData.name,
        formData.profileIPFSHash
      );

      await tx.wait();

      const verifyTx = await factory.verifyUser(formData.address);
      await verifyTx.wait();

      setSuccess(`User ${formData.address} successfully registered as ${formData.role}`);

      setFormData({
        address: '',
        name: '',
        role: 'SPONSOR_ROLE',
        profileIPFSHash: 'ipfs://QmPlaceholderHash'
      });
    } catch (error) {
      console.error('Error registering user:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectWallet = async () => {
    setWalletError(null);
    try {
      await connectWallet(walletType, true);
    } catch (error: any) {
      setWalletError(error.message || 'Failed to connect wallet');
      console.error('Failed to connect wallet:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-center text-blue-900 mb-6">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-8 text-center">
            Connect your wallet to register as an athlete, sponsor, or agent on AthleteChain.
          </p>
          
          {walletError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>{walletError}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label htmlFor="walletType" className="block text-sm font-medium text-gray-700 mb-1">
                Wallet Type
              </label>
              <select
                id="walletType"
                value={walletType}
                onChange={(e) => setWalletType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="metamask">MetaMask</option>
                <option value="walletconnect">WalletConnect</option>
              </select>
            </div>
            <button
              onClick={handleConnectWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg w-full"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900">Register User</h1>
        <p className="text-gray-600 mt-2">Assign roles to users in the platform</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p>{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              User Wallet Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="0x..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              User Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name or organization"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="ATHLETE_ROLE">Athlete</option>
              <option value="SPONSOR_ROLE">Sponsor</option>
              <option value="AGENT_ROLE">Agent</option>
              <option value="ARBITRATOR_ROLE">Arbitrator</option>
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg flex justify-center items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering User...
                </>
              ) : (
                'Register User'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-2">About Roles</h2>
        <p className="text-blue-800 mb-4">
          Each user in the AthleteChain platform must have an assigned role:
        </p>
        <ul className="list-disc list-inside space-y-2 text-blue-700">
          <li><span className="font-medium">Athlete:</span> Can create contracts and receive payments</li>
          <li><span className="font-medium">Sponsor:</span> Can fund contracts and approve milestones</li>
          <li><span className="font-medium">Agent:</span> Can create contracts on behalf of athletes</li>
          <li><span className="font-medium">Arbitrator:</span> Can resolve disputes between athletes and sponsors</li>
        </ul>
      </div>
    </div>
  );
}