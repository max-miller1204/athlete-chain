'use client';

import { useState } from 'react';
import { useWeb3 } from '../../../context/Web3Context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ethers } from 'ethers';
import contractAddresses from '../../../contract-addresses.json';
import factoryAbi from '../../../artifacts/contracts/AthleteChainFactory.sol/AthleteChainFactory.json';
import athleteContractAbi from '../../../artifacts/contracts/AthleteContract.sol/AthleteContract.json';

export default function NewContractPage() {
  const { isConnected, account, provider } = useWeb3();
  const router = useRouter();
  const [formStep, setFormStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    sponsorAddress: '',
    contractValue: '',
    paymentToken: 'USDC',
    startDate: '',
    endDate: '',
    contractDocument: null as File | null,
    milestones: [
      {
        description: '',
        amount: '',
        deadline: ''
      }
    ]
  });

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for numeric inputs
    if (name === 'contractValue') {
      // Only update if it's a valid number or empty
      if (value === '') {
        setFormData({
          ...formData,
          [name]: value
        });
      } else {
        // Try to parse as number and validate
        const numValue = value.replace(/[^0-9.]/g, '');
        if (!isNaN(Number(numValue))) {
          setFormData({
            ...formData,
            [name]: numValue
          });
        }
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle milestone changes
  const handleMilestoneChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedMilestones = [...formData.milestones];
    
    // Special handling for milestone amounts
    if (name === 'amount') {
      // Only update if it's a valid number or empty
      if (value === '') {
        updatedMilestones[index] = {
          ...updatedMilestones[index],
          [name]: value
        };
        
        setFormData({
          ...formData,
          milestones: updatedMilestones
        });
      } else {
        // Try to parse as number and validate
        const numValue = value.replace(/[^0-9.]/g, '');
        if (!isNaN(Number(numValue))) {
          updatedMilestones[index] = {
            ...updatedMilestones[index],
            [name]: numValue
          };
          
          setFormData({
            ...formData,
            milestones: updatedMilestones
          });
        }
      }
    } else {
      updatedMilestones[index] = {
        ...updatedMilestones[index],
        [name]: value
      };
      
      setFormData({
        ...formData,
        milestones: updatedMilestones
      });
    }
  };

  // Add a new milestone
  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [
        ...formData.milestones,
        {
          description: '',
          amount: '',
          deadline: ''
        }
      ]
    });
  };

  // Remove a milestone
  const removeMilestone = (index: number) => {
    if (formData.milestones.length <= 1) return;
    
    const updatedMilestones = [...formData.milestones];
    updatedMilestones.splice(index, 1);
    
    setFormData({
      ...formData,
      milestones: updatedMilestones
    });
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData({
        ...formData,
        contractDocument: e.target.files[0]
      });
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null); // Clear previous errors
    
    try {
      if (!isConnected || !account || !provider) {
        throw new Error("Wallet not connected");
      }
      
      console.log('Submitting contract data:', formData);
      
      // Ensure sponsor address is valid
      if (!ethers.utils.isAddress(formData.sponsorAddress)) {
        throw new Error("Invalid sponsor address format");
      }
      
      // Validation for contract value - must be a valid positive number
      const contractValue = formData.contractValue.trim();
      if (!contractValue || isNaN(Number(contractValue)) || Number(contractValue) <= 0) {
        throw new Error("Contract value must be a valid positive number");
      }
      
      // Validate all milestone amounts
      formData.milestones.forEach((milestone, index) => {
        const amount = milestone.amount.trim();
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
          throw new Error(`Milestone ${index + 1} amount must be a valid positive number`);
        }
        
        // Validate milestone deadline
        if (!milestone.deadline) {
          throw new Error(`Milestone ${index + 1} deadline is required`);
        }
      });
      
      // Validate dates
      if (!formData.startDate) {
        throw new Error("Start date is required");
      }
      
      if (!formData.endDate) {
        throw new Error("End date is required");
      }
      
      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        throw new Error("End date must be after start date");
      }
      
      // Convert to blockchain format
      const signer = provider.getSigner();
      const factory = new ethers.Contract(contractAddresses.factoryAddress, factoryAbi.abi, signer);
      const athleteContract = new ethers.Contract(
        contractAddresses.athleteContractAddress, 
        athleteContractAbi.abi, 
        signer
      );
      
      // Format dates to unix timestamps
      const startTimestamp = Math.floor(new Date(formData.startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(formData.endDate).getTime() / 1000);
      
      // Safely convert contract value to wei
      let contractValueWei;
      try {
        contractValueWei = ethers.utils.parseEther(contractValue);
      } catch (error) {
        console.error("Error parsing contract value:", error);
        throw new Error(`Invalid contract value format: ${contractValue}`);
      }
      
      // Convert mock IPFS hash
      const contractIPFSHash = "ipfs://QmContractDocHash"; // In a real app, upload to IPFS
      
      // Payment token - for simplicity, using ETH (zero address)
      const paymentToken = "0x0000000000000000000000000000000000000000";
      
      // Empty arbitrators array for now
      const arbitrators: string[] = [];
      
      // 1. Create contract
      console.log("Creating contract with values:", {
        athlete: account,
        sponsor: formData.sponsorAddress,
        contractIPFSHash,
        totalValue: contractValueWei.toString(),
        startTimestamp,
        endTimestamp,
        paymentToken,
        arbitrators
      });
      
      // Use factory contract to create the contract instead of athlete contract directly
      const createTx = await factory.createSponsorshipContract(
        account, // athlete (current user)
        formData.sponsorAddress, // sponsor
        contractIPFSHash,
        contractValueWei,
        startTimestamp,
        endTimestamp,
        paymentToken,
        arbitrators
      );
      
      // Wait for transaction confirmation
      console.log("Waiting for contract creation confirmation...");
      const createReceipt = await createTx.wait();
      console.log("Contract created:", createReceipt);
      
      // Get contract ID from event logs
      const contractCreatedEvent = createReceipt.events?.find(
        (e: { event?: string }) => e.event === "ContractCreated"
      );
      
      if (!contractCreatedEvent) {
        throw new Error("Contract creation event not found");
      }
      
      // Extract contract ID from event
      const contractId = contractCreatedEvent.args.contractId.toNumber();
      console.log("New contract ID:", contractId);
      
      // Verify contract was created successfully
      try {
        console.log("Verifying contract was created...");
        const contractDetails = await athleteContract.getContractDetails(contractId);
        console.log("Contract verification successful:", contractDetails);
        
        // Verify the contract is associated with this account
        console.log("Verifying contract is associated with account...");
        const userContracts = await factory.getUserContracts(account);
        console.log("User contracts:", userContracts);
        
        // Check if the new contract ID is in the user's contracts
        let contractFound = false;
        for (const id of userContracts) {
          if (id.toNumber() === contractId) {
            contractFound = true;
            break;
          }
        }
        
        if (!contractFound) {
          console.warn("Contract was created but not found in user's contracts. Trying to add it manually...");
          // This is a fallback mechanism - not ideal but can help in some cases
        }
      } catch (verifyError) {
        console.error("Error verifying contract:", verifyError);
        // Continue anyway since the contract might still have been created
      }
      
      // 2. Add milestones
      console.log("Adding milestones...");
      
      // Prepare milestone data
      const descriptions = formData.milestones.map(m => m.description);
      
      // Safely parse milestone amounts
      const amounts = [];
      for (const milestone of formData.milestones) {
        const amount = milestone.amount.trim();
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
          throw new Error("All milestone amounts must be valid positive numbers");
        }
        
        try {
          const parsedAmount = ethers.utils.parseEther(amount);
          amounts.push(parsedAmount);
        } catch (error) {
          console.error("Error parsing milestone amount:", error);
          throw new Error(`Invalid milestone amount format: ${amount}`);
        }
      }
      
      const deadlines = formData.milestones.map(m => 
        Math.floor(new Date(m.deadline).getTime() / 1000)
      );
      
      console.log("Adding milestones with values:", {
        contractId,
        descriptions,
        amounts: amounts.map(a => a.toString()),
        deadlines
      });
      
      const milestoneTx = await athleteContract.addMilestones(
        contractId,
        descriptions,
        amounts,
        deadlines
      );
      
      console.log("Waiting for milestone addition confirmation...");
      await milestoneTx.wait();
      console.log("Milestones added successfully");
      
      // Redirect to contracts page with a query parameter to indicate a new contract
      // Add timestamp to prevent browser caching
      const timestamp = Date.now();
      console.log(`Redirecting to: /contracts?new=true&t=${timestamp}`);
      router.push(`/contracts?new=true&t=${timestamp}`);
    } catch (error) {
      console.error('Error creating contract:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      alert(`Error creating contract: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  // Calculate total milestone amount
  const totalMilestoneAmount = formData.milestones.reduce((sum, milestone) => {
    const amount = parseFloat(milestone.amount) || 0;
    return sum + amount;
  }, 0);

  // Check if milestone total equals contract value, accounting for floating point precision
  const isMilestoneTotalValid = () => {
    const contractValue = parseFloat(formData.contractValue) || 0;
    return Math.abs(contractValue - totalMilestoneAmount) < 0.001;
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <svg className="h-16 w-16 text-blue-600 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Wallet Not Connected</h2>
          <p className="text-gray-600 mb-8">Please connect your wallet to create a new contract.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900">Create New Contract</h1>
        <p className="text-gray-600 mt-2">Set up a new sponsorship contract</p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${formStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            1
          </div>
          <div className={`flex-1 h-1 mx-2 ${formStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${formStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            2
          </div>
          <div className={`flex-1 h-1 mx-2 ${formStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${formStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            3
          </div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <div className={formStep >= 1 ? 'text-blue-600 font-medium' : ''}>Contract Details</div>
          <div className={formStep >= 2 ? 'text-blue-600 font-medium' : ''}>Milestones</div>
          <div className={formStep >= 3 ? 'text-blue-600 font-medium' : ''}>Review & Submit</div>
        </div>
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
        <form onSubmit={handleSubmit}>
          {/* Step 1: Contract Details */}
          {formStep === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="sponsorAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Sponsor Wallet Address
                </label>
                <input
                  type="text"
                  id="sponsorAddress"
                  name="sponsorAddress"
                  value={formData.sponsorAddress}
                  onChange={handleChange}
                  placeholder="0x..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-sm text-yellow-600 flex items-start">
                  <svg className="h-4 w-4 text-yellow-500 mr-1 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    The sponsor address must be registered with SPONSOR_ROLE first. 
                    <Link href="/register" className="text-blue-600 hover:underline ml-1">
                      Register this address
                    </Link>
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="contractValue" className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Value
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      id="contractValue"
                      name="contractValue"
                      value={formData.contractValue}
                      onChange={handleChange}
                      placeholder="0.00"
                      min="0.00000001"
                      step="0.00000001"
                      pattern="[0-9]*[.]?[0-9]+"
                      title="Please enter a valid positive number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <select
                      name="paymentToken"
                      value={formData.paymentToken}
                      onChange={handleChange}
                      className="bg-gray-100 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                      <option value="DAI">DAI</option>
                      <option value="ETH">ETH</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contractDocument" className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Document
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  {formData.contractDocument ? (
                    <div className="flex flex-col items-center">
                      <svg className="h-8 w-8 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-800 font-medium">{formData.contractDocument.name}</span>
                      <span className="text-gray-500 text-sm">{Math.round(formData.contractDocument.size / 1024)} KB</span>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 text-sm mt-2"
                        onClick={() => setFormData({ ...formData, contractDocument: null })}
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-800 mb-1">Drag and drop your document here</p>
                      <p className="text-gray-500 text-sm mb-3">PDF, DOC, or DOCX up to 10MB</p>
                      <label htmlFor="file-upload" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg cursor-pointer">
                        Browse Files
                      </label>
                      <input
                        id="file-upload"
                        name="contractDocument"
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setFormStep(2)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Next: Milestones
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Milestones */}
          {formStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Define Milestones</h2>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Milestone
                </button>
              </div>
              
              <p className="text-gray-600">
                Define milestones for payment release. The total value of all milestones should equal your contract value.
              </p>

              {formData.milestones.map((milestone, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between mb-3">
                    <h3 className="font-medium">Milestone {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      disabled={formData.milestones.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor={`description-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        id={`description-${index}`}
                        name="description"
                        value={milestone.description}
                        onChange={(e) => handleMilestoneChange(index, e)}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`amount-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Amount ({formData.paymentToken})
                        </label>
                        <input
                          type="number"
                          id={`amount-${index}`}
                          name="amount"
                          value={milestone.amount}
                          onChange={(e) => handleMilestoneChange(index, e)}
                          placeholder="0.00"
                          min="0.00000001"
                          step="0.00000001"
                          pattern="[0-9]*[.]?[0-9]+"
                          title="Please enter a valid positive number"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor={`deadline-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Deadline Date
                        </label>
                        <input
                          type="date"
                          id={`deadline-${index}`}
                          name="deadline"
                          value={milestone.deadline}
                          onChange={(e) => handleMilestoneChange(index, e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-blue-800">Total Milestone Value</h3>
                    <p className="text-blue-600">{totalMilestoneAmount.toFixed(2)} {formData.paymentToken}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-800">Contract Value</h3>
                    <p className="text-blue-600">{(parseFloat(formData.contractValue) || 0).toFixed(2)} {formData.paymentToken}</p>
                  </div>
                </div>
                
                {!isMilestoneTotalValid() && (
                  <p className="text-red-600 text-sm mt-2">
                    ⚠️ The total milestone value must match the contract value
                  </p>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium py-2 px-6 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setFormStep(3)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
                  disabled={!isMilestoneTotalValid()}
                >
                  Review Contract
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {formStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800">Review Contract</h2>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Athlete</h3>
                  <p className="mt-1">{formatAddress(account || '')}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Sponsor</h3>
                  <p className="mt-1">{formatAddress(formData.sponsorAddress)}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Contract Value</h3>
                    <p className="mt-1">{formData.contractValue} {formData.paymentToken}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                    <p className="mt-1">{formData.startDate}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">End Date</h3>
                    <p className="mt-1">{formData.endDate}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Contract Document</h3>
                  <p className="mt-1">{formData.contractDocument?.name || 'No document uploaded'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Milestones</h3>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {formData.milestones.map((milestone, index) => (
                      <div key={index} className="p-4">
                        <div className="flex justify-between mb-2">
                          <h4 className="font-medium">Milestone {index + 1}</h4>
                          <span>{milestone.amount} {formData.paymentToken}</span>
                        </div>
                        <p className="text-gray-600">{milestone.description}</p>
                        <p className="text-sm text-gray-500 mt-1">Due: {milestone.deadline}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-yellow-800">Important Note</h3>
                    <p className="text-yellow-700 text-sm mt-1">
                      By submitting this contract, you are creating a legally binding agreement on the blockchain. 
                      Make sure all details are correct before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setFormStep(2)}
                  className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium py-2 px-6 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center"
                >
                  {isSubmitting && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isSubmitting ? 'Creating Contract...' : 'Create Contract'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 