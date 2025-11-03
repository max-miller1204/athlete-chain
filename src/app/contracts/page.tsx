'use client';

import { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import ContractCard from '../../components/ContractCard';
import Link from 'next/link';
import { ethers } from 'ethers';
import contractAddresses from '../../contract-addresses.json';
import factoryAbi from '../../artifacts/contracts/AthleteChainFactory.sol/AthleteChainFactory.json';
import athleteContractAbi from '../../artifacts/contracts/AthleteContract.sol/AthleteContract.json';
import { useSearchParams } from 'next/navigation';

interface ContractData {
  id: number;
  athlete: string;
  sponsor: string;
  value: string;
  status: string;
  startDate: string;
  endDate: string;
  contractHash: string;
}

// Convert blockchain timestamp to readable date
const timestampToDate = (timestamp: ethers.BigNumber): string => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp.toNumber() * 1000); // Convert to milliseconds
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
};

// Helper function to convert contract state enum to string
const contractStateToString = (state: number): string => {
  const states = ['Draft', 'Active', 'Completed', 'Disputed', 'Terminated'];
  return states[state] || 'Unknown';
};

export default function ContractsPage() {
  const { isConnected, account, provider } = useWeb3();
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  
  // Check for newly created contract from URL params
  useEffect(() => {
    const newContract = searchParams.get('new');
    if (newContract === 'true') {
      // Set a success message that will clear after 5 seconds
      setSuccess("Contract created successfully! Fetching your contracts...");
      fetchContractsData();
      
      // Clear the success message after 5 seconds
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [success, setSuccess] = useState<string | null>(null);

  const fetchInProgress = useRef(false);
  const lastFetchedAccount = useRef<string | null>(null);

  // Function to fetch contracts data
  const fetchContractsData = async () => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    setLoading(true);
    setError(null);
    
    console.log("=== FETCH CONTRACTS DEBUG ===");
    console.log("Connected:", isConnected);
    console.log("Account:", account);
    console.log("Provider initialized:", !!provider);
    
    try {
      if (isConnected && account && provider) {
        // Only fetch if account changed
        if (lastFetchedAccount.current === account) {
          fetchInProgress.current = false;
          return;
        }
        lastFetchedAccount.current = account;
        
        // Check network first
        const network = await provider.getNetwork();
        const validChainIds = [31337, 1337]; // Hardhat default and local network
        
        if (!validChainIds.includes(network.chainId)) {
          setError(`Please connect to your local development network (Chain ID: 1337 or 31337). Current network: ${network.name} (Chain ID: ${network.chainId})`);
          setContracts([]);
          setLoading(false);
          return;
        }
        
        try {
          // Connect to contracts
          console.log("Connecting to contracts with addresses:", contractAddresses);
          const signer = provider.getSigner();
          const factory = new ethers.Contract(contractAddresses.factoryAddress, factoryAbi.abi, signer);
          const athleteContract = new ethers.Contract(contractAddresses.athleteContractAddress, athleteContractAbi.abi, signer);
          
          try {
            console.log("Fetching contracts for address:", account);
            
            // Get all ContractCreated events
            const filter = factory.filters.ContractCreated();
            const events = await factory.queryFilter(filter);
            
            // Filter events in memory where the user is either athlete or sponsor
            const relevantEvents = events.filter(event => {
              const athlete = event.args?.athlete;
              const sponsor = event.args?.sponsor;
              return athlete === account || sponsor === account;
            });
            
            // Get unique contract IDs
            const contractIds = [...new Set(
              relevantEvents.map(event => event.args?.contractId).filter(Boolean)
            )];
            
            console.log("Contract IDs:", contractIds, "Length:", contractIds.length);
            
            // If we have contract IDs, fetch their details
            if (contractIds && contractIds.length > 0) {
              try {
                // Get contract details for each contract ID
                console.log("Mapping over contract IDs to get details");
                const contractDetails = await Promise.all(
                  contractIds.map(async (id) => {
                    try {
                      console.log("Fetching details for contract ID:", id.toString());
                      const details = await athleteContract.getContractDetails(id);
                      console.log("Got details for contract:", id.toString(), details);
                      
                      // Format contract total value to ETH or token
                      const valueFormatted = ethers.utils.formatEther(details.totalValue);
                      
                      return {
                        id: id.toNumber(),
                        athlete: details.athlete,
                        sponsor: details.sponsor,
                        value: `${valueFormatted} ${details.paymentToken === ethers.constants.AddressZero ? 'ETH' : 'Tokens'}`,
                        status: contractStateToString(details.state),
                        startDate: timestampToDate(details.startDate),
                        endDate: timestampToDate(details.endDate),
                        contractHash: details.contractIPFSHash,
                      };
                    } catch (detailError) {
                      console.error(`Error fetching details for contract ${id.toString()}:`, detailError);
                      // Return a placeholder for failed contract
                      return {
                        id: id.toNumber(),
                        athlete: account || '',
                        sponsor: '0x0000000000000000000000000000000000000000',
                        value: '0 ETH',
                        status: 'Error',
                        startDate: '',
                        endDate: '',
                        contractHash: '',
                      };
                    }
                  })
                );
                
                console.log("Final contract details:", contractDetails);
                setContracts(contractDetails);
              } catch (detailsError) {
                console.error("Error fetching contract details:", detailsError);
                setError("Error fetching contract details. Check console for more information.");
                setContracts([]);
              }
            } else {
              // No contracts found
              console.log("No contracts found for this account");
              setContracts([]);
            }
          } catch (contractError) {
            console.error("Contract call error:", contractError);
            setError("Error fetching contracts: " + (contractError instanceof Error ? contractError.message : String(contractError)));
            setContracts([]);
          }
        } catch (error) {
          console.error('Error connecting to contracts:', error);
          setError("Error connecting to smart contracts. Make sure your wallet is connected to the correct network.");
          setContracts([]);
        }
      } else {
        console.log("Not ready to fetch contracts yet - missing wallet connection or provider");
        setContracts([]);
      }
    } catch (outerError) {
      console.error("Unexpected error in fetchContractsData:", outerError);
      setError("An unexpected error occurred. Please try again.");
      setContracts([]);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
      console.log("=== END FETCH CONTRACTS DEBUG ===");
    }
  };

  // Only fetch contracts when the component mounts or when account changes
  useEffect(() => {
    if (!account) return;
    if (lastFetchedAccount.current === account) return;
    let mounted = true;
    const fetchData = async () => {
      if (!mounted) return;
      setLoading(true);
      try {
        await fetchContractsData();
      } catch (error) {
        console.error("Error in fetchContractsData:", error);
        if (mounted) {
          setLoading(false);
          setError("Failed to load contracts. Please try refreshing the page.");
        }
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [account]); // Only re-run when account changes

  // Filter contracts based on status
  const filteredContracts = filter === 'all' 
    ? contracts 
    : contracts.filter(contract => contract.status.toLowerCase() === filter.toLowerCase());

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <svg className="h-16 w-16 text-blue-600 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Wallet Not Connected</h2>
          <p className="text-gray-600 mb-8">Please connect your wallet to view contracts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Contracts</h1>
          <p className="text-gray-600 mt-2">Manage your athlete sponsorship contracts</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button 
            onClick={fetchContractsData}
            className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2 px-4 rounded-lg flex items-center"
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
            ) : (
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Fetch Contracts
          </button>
          <Link
            href="/contracts/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            + New Contract
          </Link>
        </div>
      </div>

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

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'draft'
              ? 'bg-yellow-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Draft
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('disputed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'disputed'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Disputed
        </button>
        <button
          onClick={() => setFilter('terminated')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'terminated'
              ? 'bg-gray-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Terminated
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div>
          {filteredContracts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  id={contract.id}
                  athlete={contract.athlete}
                  sponsor={contract.sponsor}
                  value={contract.value}
                  status={contract.status}
                  startDate={contract.startDate}
                  endDate={contract.endDate}
                  contractHash={contract.contractHash}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                {filter !== 'all' 
                  ? 'No contracts match the selected filter' 
                  : 'No contracts found'}
              </h3>
              <p className="text-gray-500 mb-2">
                {filter !== 'all'
                  ? 'Try selecting a different filter or create a new contract'
                  : "You don't have any contracts yet. To get started, create your first contract."}
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-lg mx-auto my-4 text-left">
                <h4 className="font-medium text-yellow-800 mb-2">Troubleshooting tips:</h4>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc pl-4">
                  <li>Make sure you&apos;re connected with the correct wallet address</li>
                  <li>Check if your contracts were created under a different account</li>
                  <li>Verify the contract was deployed successfully by checking the console logs</li>
                  <li>Try refreshing the page or clicking the &quot;Fetch Contracts&quot; button below</li>
                </ul>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Link
                  href="/contracts/new"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg inline-block"
                >
                  Create Contract
                </Link>
                {filter !== 'all' && (
                  <button 
                    onClick={() => setFilter('all')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg inline-block"
                  >
                    Show All Contracts
                  </button>
                )}
                <button 
                  onClick={fetchContractsData}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2 px-6 rounded-lg inline-flex items-center justify-center"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Fetch Contracts
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 