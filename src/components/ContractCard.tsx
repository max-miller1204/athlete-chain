'use client';

import Link from 'next/link';
import { useState } from 'react';

interface ContractCardProps {
  id: number;
  athlete: string;
  sponsor: string;
  value: string;
  status: string;
  startDate?: string;
  endDate?: string;
  contractHash?: string;
}

export default function ContractCard({
  id,
  athlete,
  sponsor,
  value,
  status,
  startDate,
  endDate,
  contractHash
}: ContractCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'disputed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'terminated':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format IPFS hash for display and linking
  const formatIPFSLink = (hash: string | undefined) => {
    if (!hash) return '';
    
    // Handle different IPFS formats
    if (hash.startsWith('ipfs://')) {
      return `https://ipfs.io/ipfs/${hash.replace('ipfs://', '')}`;
    } else if (hash.startsWith('Qm')) {
      return `https://ipfs.io/ipfs/${hash}`;
    }
    
    return hash;
  };

  // Format date display
  const formatDate = (date: string | undefined) => {
    if (!date) return 'Not set';
    return date;
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-blue-900">Contract #{id}</h3>
            <p className="text-gray-600 mt-1">Value: {value}</p>
          </div>
          <div className={`mt-3 sm:mt-0 px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(status)}`}>
            {status}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Athlete</p>
            <p className="font-medium">{formatAddress(athlete)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Sponsor</p>
            <p className="font-medium">{formatAddress(sponsor)}</p>
          </div>
          {isExpanded && (
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium">{formatDate(startDate)}</p>
            </div>
          )}
          {isExpanded && (
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-medium">{formatDate(endDate)}</p>
            </div>
          )}
          {isExpanded && contractHash && contractHash !== '' && (
            <div className="sm:col-span-2">
              <p className="text-sm text-gray-500">Contract Document</p>
              <a 
                href={formatIPFSLink(contractHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium break-all"
              >
                {contractHash.length > 40 ? `${contractHash.substring(0, 40)}...` : contractHash}
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 text-sm hover:text-blue-900 flex items-center"
          >
            {isExpanded ? (
              <>
                <span>Show less</span>
                <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                <span>Show more</span>
                <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
          
          <Link
            href={`/contracts/${id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
} 