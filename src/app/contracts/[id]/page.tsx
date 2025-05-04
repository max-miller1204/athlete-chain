"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ethers } from "ethers";
import { useWeb3 } from "../../../context/Web3Context";
import contractAddresses from "../../../contract-addresses.json";
import athleteContractAbi from "../../../artifacts/contracts/AthleteContract.sol/AthleteContract.json";
import Link from "next/link";

export default function ContractDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { provider, isConnected, account } = useWeb3();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fetchInProgress = useRef(false);
  const lastFetchedContractId = useRef<string | null>(null);

  // Parse contractId as string for contract calls
  const contractId = params?.id && !isNaN(Number(params.id)) ? params.id.toString() : null;

  // Helper functions
  const contractStateToString = (state: number) => {
    const states = ["Draft", "Active", "Completed", "Disputed", "Terminated"];
    return states[state] || "Unknown";
  };
  const timestampToDate = (timestamp: ethers.BigNumber) => {
    if (!timestamp) return "";
    const date = new Date(timestamp.toNumber() * 1000);
    return date.toISOString().split("T")[0];
  };

  // Show wallet not connected message
  if (!isConnected || !provider) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <p className="text-blue-900 font-bold mb-4">Please connect your wallet to view contract details.</p>
        <Link href="/contracts" className="text-blue-600 hover:underline">Back to Contracts</Link>
      </div>
    );
  }

  // Fetch contract details
  const fetchContract = async () => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    if (!provider || !isConnected || contractId === null) {
      setError(`Wallet not connected or contract ID missing.\nprovider: ${!!provider}, isConnected: ${isConnected}, contractId: ${contractId}`);
      setLoading(false);
      fetchInProgress.current = false;
      return;
    }
    // Only fetch if contractId changed
    if (lastFetchedContractId.current === contractId) {
      fetchInProgress.current = false;
      return;
    }
    lastFetchedContractId.current = contractId;
    setLoading(true);
    setError(null);
    try {
      if (!provider) throw new Error("Provider not available");
      const signer = provider.getSigner();
      const athleteContract = new ethers.Contract(
        contractAddresses.athleteContractAddress,
        athleteContractAbi.abi,
        signer
      );
      console.log('Fetching contract details', { contractId, provider, isConnected });
      const details = await athleteContract.getContractDetails(contractId);
      const valueFormatted = ethers.utils.formatEther(details.totalValue);
      setContract({
        id: contractId,
        athlete: details.athlete,
        sponsor: details.sponsor,
        value: `${valueFormatted} ${details.paymentToken === ethers.constants.AddressZero ? "ETH" : "Tokens"}`,
        status: contractStateToString(details.state),
        stateNum: details.state,
        startDate: timestampToDate(details.startDate),
        endDate: timestampToDate(details.endDate),
        contractHash: details.contractIPFSHash,
        paymentToken: details.paymentToken,
        raw: details,
      });
      // Fetch milestones
      const milestonesCount = await athleteContract.getMilestonesCount(contractId);
      const ms = [];
      for (let i = 0; i < milestonesCount; i++) {
        const m = await athleteContract.getMilestoneDetails(contractId, i);
        ms.push({
          description: m[0],
          amount: ethers.utils.formatEther(m[1]),
          deadline: timestampToDate(m[2]),
          status: m[3],
          evidence: m[4],
          paid: m[5],
        });
      }
      setMilestones(ms);
    } catch (err: any) {
      setError(`Contract not found or error fetching details.\nError: ${err && (err.reason || err.message || err.toString())}\nprovider: ${!!provider}, isConnected: ${isConnected}, contractId: ${contractId}`);
      console.error('Error fetching contract details:', err);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  useEffect(() => {
    if (contractId === null) {
      setError("Invalid or missing contract ID in URL.");
      setLoading(false);
      return;
    }
    if (!isConnected || !provider) {
      setError("Wallet not connected or provider missing.");
      setLoading(false);
      return;
    }
    if (lastFetchedContractId.current === contractId) return;
    fetchContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, isConnected, contractId]);

  // Action handlers
  const handleActivate = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (!provider) throw new Error("Provider not available");
      const signer = provider.getSigner();
      const athleteContract = new ethers.Contract(
        contractAddresses.athleteContractAddress,
        athleteContractAbi.abi,
        signer
      );
      const tx = await athleteContract.activateContract(contractId);
      await tx.wait();
      await fetchContract();
    } catch (err: any) {
      setActionError("Failed to activate contract: " + (err.reason || err.message));
    } finally {
      setActionLoading(false);
    }
  };
  const handleDispute = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (!provider) throw new Error("Provider not available");
      const signer = provider.getSigner();
      const athleteContract = new ethers.Contract(
        contractAddresses.athleteContractAddress,
        athleteContractAbi.abi,
        signer
      );
      const tx = await athleteContract.raiseDispute(contractId, "Dispute raised from UI");
      await tx.wait();
      await fetchContract();
    } catch (err: any) {
      setActionError("Failed to raise dispute: " + (err.reason || err.message));
    } finally {
      setActionLoading(false);
    }
  };
  // Add more handlers for other state changes as needed

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <p className="text-red-600 font-bold mb-4">{error}</p>
        <pre className="text-xs text-gray-500 bg-gray-100 rounded p-2 overflow-x-auto text-left">{JSON.stringify({ provider: !!provider, isConnected, contractId }, null, 2)}</pre>
        <Link href="/contracts" className="text-blue-600 hover:underline">Back to Contracts</Link>
      </div>
    );
  }
  if (contractId === null) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <p className="text-red-600 font-bold mb-4">Invalid or missing contract ID.</p>
        <Link href="/contracts" className="text-blue-600 hover:underline">Back to Contracts</Link>
      </div>
    );
  }
  if (!contract) return null;

  // Determine user role
  const isAthlete = account && contract.athlete && account.toLowerCase() === contract.athlete.toLowerCase();
  const isSponsor = account && contract.sponsor && account.toLowerCase() === contract.sponsor.toLowerCase();

  // Show action buttons based on state and role
  const showActivate = contract.status === "Draft" && (isAthlete || isSponsor);
  const showDispute = contract.status === "Active" && (isAthlete || isSponsor);

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <button
        onClick={() => router.push("/contracts")}
        className="mb-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg"
      >
        &larr; Back to Contracts
      </button>
      <div className="bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Contract #{contract.id}</h1>
        <div className="mb-4 flex flex-wrap gap-4">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium border border-blue-200">{contract.status}</span>
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-medium border border-gray-200">Value: {contract.value}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-500">Athlete</p>
            <p className="font-medium break-all">{contract.athlete}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Sponsor</p>
            <p className="font-medium break-all">{contract.sponsor}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Start Date</p>
            <p className="font-medium">{contract.startDate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">End Date</p>
            <p className="font-medium">{contract.endDate}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Contract Document</p>
            {contract.contractHash ? (
              <a
                href={contract.contractHash.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${contract.contractHash.replace("ipfs://", "")}` : contract.contractHash}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium break-all"
              >
                {contract.contractHash.length > 40 ? `${contract.contractHash.substring(0, 40)}...` : contract.contractHash}
              </a>
            ) : (
              <span className="text-gray-400">No document</span>
            )}
          </div>
        </div>
        {/* Action buttons */}
        {(showActivate || showDispute) && (
          <div className="mb-6 flex gap-4">
            {showActivate && (
              <button
                onClick={handleActivate}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
              >
                {actionLoading ? "Activating..." : "Activate Contract"}
              </button>
            )}
            {showDispute && (
              <button
                onClick={handleDispute}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg"
              >
                {actionLoading ? "Raising Dispute..." : "Raise Dispute"}
              </button>
            )}
            {actionError && <span className="text-red-600 ml-4">{actionError}</span>}
          </div>
        )}
        {milestones.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Milestones</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{m.description}</td>
                      <td className="px-4 py-2">{m.amount}</td>
                      <td className="px-4 py-2">{m.deadline}</td>
                      <td className="px-4 py-2">{typeof m.status === "number" ? contractStateToString(m.status) : m.status}</td>
                      <td className="px-4 py-2">{m.paid ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 