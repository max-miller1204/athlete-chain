'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import Link from 'next/link';
import { ethers } from 'ethers';
import contractAddresses from '../../contract-addresses.json';
import factoryAbi from '../../artifacts/contracts/AthleteChainFactory.sol/AthleteChainFactory.json';
import athleteContractAbi from '../../artifacts/contracts/AthleteContract.sol/AthleteContract.json';
import { usePathname } from 'next/navigation';

interface UserStats {
  contractsCount: number;
  nftsCount: number;
  disputesCount: number;
  verificationStatus: string;
}

interface ContractSummary {
  id: number;
  athlete: string;
  sponsor: string;
  value: string;
  status: string;
}

// Helper function to convert contract state enum to string
const contractStateToString = (state: number): string => {
  const states = ['Draft', 'Active', 'Completed', 'Disputed', 'Terminated'];
  return states[state] || 'Unknown';
};

export default function Dashboard() {
  const { account, provider, isConnected } = useWeb3();
  const [userStats, setUserStats] = useState<UserStats>({
    contractsCount: 0,
    nftsCount: 0,
    disputesCount: 0,
    verificationStatus: 'Unverified',
  });
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pathname = usePathname();

  // Trigger a refresh each time the component is viewed
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
  }, [pathname]);

  // Fetch data from blockchain
  useEffect(() => {
    const fetchData = async () => {
      if (isConnected && account && provider) {
        try {
          // Connect to contracts
          const signer = provider.getSigner();
          const factory = new ethers.Contract(contractAddresses.factoryAddress, factoryAbi.abi, signer);
          const athleteContract = new ethers.Contract(contractAddresses.athleteContractAddress, athleteContractAbi.abi, signer);
          
          try {
            // Instead of calling a non-existent function, fetch all ContractCreated events
            const filter = factory.filters.ContractCreated();
            const events = await factory.queryFilter(filter);
            const relevantEvents = events.filter(event => {
              const athlete = event.args?.athlete;
              const sponsor = event.args?.sponsor;
              return athlete && sponsor && (athlete.toLowerCase() === account.toLowerCase() || sponsor.toLowerCase() === account.toLowerCase());
            });
            const contractIds = [...new Set(relevantEvents.map(event => event.args?.contractId.toString()))];
            
            // Attempt to get user info, but don't fail if this call doesn't work
            let isVerified = { isVerified: false };
            try {
              isVerified = await factory.userInfo(account);
            } catch (userInfoError) {
              console.warn("Couldn't fetch user verification status:", userInfoError);
              // Continue with default values
            }
            
            // Set user stats
            setUserStats({
              contractsCount: contractIds.length,
              nftsCount: 0, // Will implement this when we have NFT functionality
              disputesCount: 0, // Will implement this when we handle disputes
              verificationStatus: isVerified.isVerified ? 'Verified' : 'Unverified',
            });
            
            // Only try to get contract details if we have any contracts
            if (contractIds.length > 0) {
              try {
                // Get contract details for each contract ID
                const contractDetails = await Promise.all(
                  contractIds.map(async (idStr: string) => {
                    const id = ethers.BigNumber.from(idStr);
                    try {
                      const details = await athleteContract.getContractDetails(id);
                      
                      // Format contract total value to ETH or token
                      const valueFormatted = ethers.utils.formatEther(details.totalValue);
                      
                      return {
                        id: id.toNumber(),
                        athlete: details.athlete,
                        sponsor: details.sponsor,
                        value: `${valueFormatted} ${details.paymentToken === ethers.constants.AddressZero ? 'ETH' : 'Tokens'}`,
                        status: contractStateToString(details.state),
                      };
                    } catch (error) {
                      console.error(`Error fetching details for contract ${id.toString()}:`, error);
                      return null;
                    }
                  })
                );
                setContracts(contractDetails.filter((c): c is ContractSummary => c !== null));
              } catch (contractDetailsError) {
                console.error("Error fetching contract details:", contractDetailsError);
              }
            }
          } catch (err) {
            console.error("Error fetching data:", err);
          }
        } catch (error) {
          console.error('Error connecting to contracts:', error);
          
          // If we can't connect at all, use default values
          setUserStats({
            contractsCount: 0,
            nftsCount: 0,
            disputesCount: 0,
            verificationStatus: 'Not Connected',
          });
          setContracts([]);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    setLoading(true);
    if (isConnected) {
      fetchData();
    } else {
      setLoading(false);
    }
    
    // Add refreshTrigger to the dependency array to fetch data when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account, refreshTrigger]);

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      case 'Disputed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <svg className="h-16 w-16 text-blue-600 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Wallet Not Connected</h2>
          <p className="text-gray-600 mb-8">Please connect your wallet to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Create and manage your contracts</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            href="/contracts/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            + New Contract
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-gray-500 text-sm">Contracts</h3>
                  <p className="text-2xl font-bold text-gray-800">{userStats.contractsCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-gray-500 text-sm">NFTs</h3>
                  <p className="text-2xl font-bold text-gray-800">{userStats.nftsCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="bg-red-100 p-3 rounded-full">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-gray-500 text-sm">Disputes</h3>
                  <p className="text-2xl font-bold text-gray-800">{userStats.disputesCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-gray-500 text-sm">Status</h3>
                  <p className="text-2xl font-bold text-gray-800">{userStats.verificationStatus}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Contracts */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Contracts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Athlete
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sponsor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contracts.length > 0 ? (
                    contracts.map((contract) => (
                      <tr key={contract.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{contract.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatAddress(contract.athlete)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatAddress(contract.sponsor)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contract.value}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                            {contract.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link 
                            href={`/contracts/${contract.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No contracts found. Create your first contract!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-200">
              <Link 
                href="/contracts" 
                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                View all contracts →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 