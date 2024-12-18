"use client";
import { ethers } from 'ethers';
import { ToMantleSDK } from "to-mantle-js-sdk";
import { useState } from 'react';

const sdk = new ToMantleSDK();

// ERC20 ABI for the transfer function
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Function to get transactions within a specific time window
const getTransactionsInTimeWindow = async (address, startTime, endTime) => {
  try {
    const transactions = await sdk.baseExplorer.getTokenTransfers(address);
    console.log("All transactions:", transactions);

    const filteredTransactions = transactions.filter(tx => {
      const txTime = parseInt(tx.timeStamp);
      const isInWindow = txTime >= startTime && txTime <= endTime;
      console.log(`Transaction ${tx.hash}: Time ${txTime}, Start ${startTime}, End ${endTime}, InWindow: ${isInWindow}`);
      return isInWindow;
    });

    console.log("Filtered transactions:", filteredTransactions);
    return filteredTransactions;
  } catch (error) {
    console.error("Error in getTransactionsInTimeWindow:", error);
    throw error;
  }
};

// Function to verify if a specific deposit amount exists in transactions
const findDepositTransaction = (transactions, amount, toAddress, tokenDecimals = 6) => {
  const amountWithDecimals = ethers.utils.parseUnits(amount.toString(), tokenDecimals).toString();
  console.log("Looking for amount:", amountWithDecimals, "to address:", toAddress);

  const foundTx = transactions.find(tx => {
    const valueMatch = tx.value === amountWithDecimals;
    const addressMatch = tx.to.toLowerCase() === toAddress.toLowerCase();
    console.log(`Checking tx ${tx.hash}: Value match: ${valueMatch}, Address match: ${addressMatch}`);
    console.log(`TX value: ${tx.value}, Expected: ${amountWithDecimals}`);
    return valueMatch && addressMatch;
  });

  console.log("Found transaction:", foundTx);
  return foundTx;
};

// Function to connect to MetaMask
const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed!");
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  console.log("Connected wallet address:", address);
  return { provider, signer, address };
};

// Function to execute USDT transfer using MetaMask
const executeUSDTTransfer = async (tokenAddress, toAddress, amount) => {
  try {
    const { signer } = await connectWallet();

    const usdtContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const decimals = await usdtContract.decimals();
    console.log("Token decimals:", decimals);

    const amountWithDecimals = ethers.utils.parseUnits(amount.toString(), decimals);
    console.log("Amount with decimals:", amountWithDecimals.toString());

    const tx = await usdtContract.transfer(toAddress, amountWithDecimals);
    console.log("Transfer transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transfer transaction receipt:", receipt);

    return receipt;
  } catch (error) {
    console.error("Error in executeUSDTTransfer:", error);
    throw error;
  }
};



// Execute Lottery function
const executeLotteryOnMantle = async () => {
  try {
    const result = await sdk.executeMantleLogic({
      contractAddress: "0x9C297e5eC9E4e3921d656e8277da1484D41afA15",
      contractABI: [
        {
          "inputs": [],
          "name": "enterLottery",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_usdtAddress",
              "type": "address"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "name": "ENTRY_AMOUNT",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "usdt",
          "outputs": [
            {
              "internalType": "contract IERC20",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "enterLottery",
      functionParams: [],
      value: "0"
    });
    console.log("Lottery result:", result);
    return { success: true, result };
  } catch (error) {
    console.error('Error during lottery check:', error);
    throw error;
  }
};

const checkUSDTBalance = async (tokenAddress, walletAddress) => {
  try {
    const { provider } = await connectWallet();
    const usdtContract = new ethers.Contract(
      tokenAddress,
      ["function balanceOf(address) view returns (uint256)"],
      provider
    );

    const balance = await usdtContract.balanceOf(walletAddress);
    console.log("USDT Balance:", balance.toString());
    return balance;
  } catch (error) {
    console.error("Error checking balance:", error);
    throw error;
  }
};

// Transfer Winning Amount function
const transferWinningAmount = async () => {
  try {
    // Get current user's address from MetaMask
    const { address: userAddress } = await connectWallet();

    const result = await sdk.executeBaseSepoliaLogic({
      contractAddress: "0x03460a51BFc74E658AD643Ecf6FE36F2571815Bc",
      contractABI: [
        "function transfer(address to, uint256 amount) returns (bool)"
      ],
      functionName: "transfer",
      functionParams: [
        userAddress,  // Transfer to current user's address
        "40000000"    // Amount to transfer with 6 decimals (40 USDT)
      ],
      value: "0"
    });
    console.log("Transfer result:", result);
    return { success: true, result };
  } catch (error) {
    console.error('Error during transfer:', error);
    throw error;
  }
};


const Modal = ({ isOpen, onClose, title, message, status }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center mb-4">
          {status === 'success' && (
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          {status === 'loading' && (
            <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mr-3" />
          )}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-blue-500 text-white rounded py-2 hover:bg-blue-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Main verification function
const verifyDeposit = async (depositAmount, tokenAddress, toAddress, timeWindowSeconds = 300) => {
  try {
    console.log("Starting deposit verification...");
    console.log("Deposit amount:", depositAmount);
    console.log("Token address:", tokenAddress);
    console.log("To address:", toAddress);

    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = currentTime - timeWindowSeconds;
    console.log("Time window:", startTime, "to", currentTime + timeWindowSeconds);

    const { address: userAddress } = await connectWallet();
    console.log("User address:", userAddress);

    console.log("Checking for previous transactions...");
    const beforeTransactions = await getTransactionsInTimeWindow(
      userAddress,
      startTime,
      currentTime
    );
    console.log("Before transactions:", beforeTransactions);

    console.log("Executing USDT transfer...");
    const txReceipt = await executeUSDTTransfer(
      tokenAddress,
      toAddress,
      depositAmount
    );

    const waitTime = 30000;
    console.log(`Waiting ${waitTime / 1000} seconds for transaction indexing...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    console.log("Getting transactions after deposit...");
    const afterTransactions = await getTransactionsInTimeWindow(
      userAddress,
      startTime,
      currentTime + timeWindowSeconds
    );
    console.log("After transactions:", afterTransactions);

    const newTransactions = afterTransactions.filter(txAfter =>
      !beforeTransactions.some(txBefore => txBefore.hash === txAfter.hash)
    );
    console.log("New transactions:", newTransactions);

    const depositTx = findDepositTransaction(newTransactions, depositAmount, toAddress);

    if (depositTx) {
      return {
        success: true,
        message: "Deposit verified successfully",
        transaction: depositTx,
        receipt: txReceipt
      };
    } else {
      return {
        success: false,
        message: "Deposit not found in recent transactions",
        newTransactions,
        receipt: txReceipt,
        metadata: {
          userAddress,
          depositAmount,
          toAddress,
          timeWindow: {
            start: startTime,
            end: currentTime + timeWindowSeconds
          }
        }
      };
    }
  } catch (error) {
    console.error('Error during deposit verification:', error);
    throw error;
  }
};

// Main Component
export default function Home() {
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    status: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const showModal = (title, message, status) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      status
    });
  };

  const executeVerifiedDeposit = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      showModal("Processing", "Initiating deposit verification...", "loading");


      const tokenAddress = "0x03460a51BFc74E658AD643Ecf6FE36F2571815Bc";
      const toAddress = "0x2A070993A1ECB983E9092DA803654Ae3F16C2161";
      const amount = 20;

      const depositResult = await verifyDeposit(
        amount,
        tokenAddress,
        toAddress,
        300
      );

      if (depositResult.success) {
        showModal("Success", "Deposit verified successfully! Approving token...", "loading");

        // First approve token

        if (true) {


          // Then execute lottery
          const lotteryResult = await executeLotteryOnMantle();
          if (lotteryResult.success) {
            showModal("Success", "Lottery entered successfully! Processing winning amount...", "loading");

            // Finally transfer winning amount
            const transferResult = await transferWinningAmount();
            if (transferResult.success) {
              showModal("Congratulations!", "You've successfully completed all steps and received your winning amount!", "success");
            }
          }
        } else {
          showModal("Error", "Token approval failed. Please try again.", "error");
        }
      } else {
        showModal("Error", "Deposit verification failed. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showModal(
        "Error",
        `An error occurred: ${error.message}`,
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-black text-center mb-6">Lottery Game</h1>
        <button
          onClick={executeVerifiedDeposit}
          disabled={isProcessing}
          className={`w-full px-6 py-3 text-black rounded-lg text-white font-semibold 
            ${isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 transition-colors'
            }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Processing...
            </span>
          ) : (
            'Start Game'
          )}
        </button>
      </div>

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        status={modalConfig.status}
      />
    </div>
  );
}