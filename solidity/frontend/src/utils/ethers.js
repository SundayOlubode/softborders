import { ethers } from "ethers";
import {
  CONTRACT_ADDRESSES,
  RWFC_ABI,
  EKES_ABI,
  RATE_PROVIDER_ABI,
  SETTLEMENT_ABI,
} from "../config/contracts";

// Check if MetaMask is installed
export const isMetaMaskInstalled = () => {
  return typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
};

// Connect to MetaMask
export const connectWallet = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts[0];
  } catch (error) {
    throw new Error("Failed to connect to MetaMask: " + error.message);
  }
};

// Get the provider and signer
export const getProviderAndSigner = () => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return { provider, signer };
};

// Get contract instances
export const getContractInstances = () => {
  const { signer } = getProviderAndSigner();

  const rwfc = new ethers.Contract(CONTRACT_ADDRESSES.rwfc, RWFC_ABI, signer);
  const ekes = new ethers.Contract(CONTRACT_ADDRESSES.ekes, EKES_ABI, signer);
  const rateProvider = new ethers.Contract(
    CONTRACT_ADDRESSES.rateProvider,
    RATE_PROVIDER_ABI,
    signer,
  );
  const settlement = new ethers.Contract(
    CONTRACT_ADDRESSES.settlement,
    SETTLEMENT_ABI,
    signer,
  );

  return { rwfc, ekes, rateProvider, settlement };
};

// Convert from wei to ether (for display)
export const formatAmount = (amount) => {
  return ethers.utils.formatEther(amount);
};

// Convert from ether to wei (for transactions)
export const parseAmount = (amount) => {
  return ethers.utils.parseEther(amount);
};

// Get the exchange rate
export const getExchangeRate = async () => {
  const { rateProvider } = getContractInstances();
  const rate = await rateProvider.getExchangeRate();
  return rate.toString() / 10 ** 8; // Convert from 8 decimal places
};

// Get the fee percentage
export const getFeePercentage = async () => {
  const { settlement } = getContractInstances();
  const fee = await settlement.feePercentage();
  return fee.toString() / 100; // Convert from 2 decimal places
};

// Get token balances
export const getBalances = async (address) => {
  const { rwfc, ekes } = getContractInstances();
  const rwfcBalance = await rwfc.balanceOf(address);
  const ekesBalance = await ekes.balanceOf(address);
  return {
    rwfc: formatAmount(rwfcBalance),
    ekes: formatAmount(ekesBalance),
  };
};

// Transfer from Rwanda to Kenya
export const transferRwandaToKenya = async (recipient, amount) => {
  const { rwfc, settlement } = getContractInstances();

  // Convert amount to wei
  const weiAmount = parseAmount(amount);

  // Check allowance
  const signer = await getProviderAndSigner().signer;
  const signerAddress = await signer.getAddress();
  const allowance = await rwfc.allowance(
    signerAddress,
    CONTRACT_ADDRESSES.settlement,
  );

  // Approve if needed
  if (allowance.lt(weiAmount)) {
    const approveTx = await rwfc.approve(
      CONTRACT_ADDRESSES.settlement,
      weiAmount,
    );
    await approveTx.wait();
  }

  // Execute transfer
  const tx = await settlement.transferRwandaToKenya(recipient, weiAmount);
  return tx.wait();
};

// Transfer from Kenya to Rwanda
export const transferKenyaToRwanda = async (recipient, amount) => {
  const { ekes, settlement } = getContractInstances();

  // Convert amount to wei
  const weiAmount = parseAmount(amount);

  // Check allowance
  const signer = await getProviderAndSigner().signer;
  const signerAddress = await signer.getAddress();
  const allowance = await ekes.allowance(
    signerAddress,
    CONTRACT_ADDRESSES.settlement,
  );

  // Approve if needed
  if (allowance.lt(weiAmount)) {
    const approveTx = await ekes.approve(
      CONTRACT_ADDRESSES.settlement,
      weiAmount,
    );
    await approveTx.wait();
  }

  // Execute transfer
  const tx = await settlement.transferKenyaToRwanda(recipient, weiAmount);
  return tx.wait();
};
