import React, { useState, useEffect } from "react";
import "./App.css";
import WalletConnect from "./components/WalletConnect";
import BalanceCard from "./components/BalanceCard";
import TransferForm from "./components/TransferForm";
import Notification from "./components/Notification";
import {
  connectWallet,
  getBalances,
  getExchangeRate,
  getFeePercentage,
  transferRwandaToKenya,
  transferKenyaToRwanda,
} from "./utils/ethers";

function App() {
  const [account, setAccount] = useState("");
  const [balances, setBalances] = useState({ rwfc: "0", ekes: "0" });
  const [exchangeRate, setExchangeRate] = useState(0);
  const [feePercentage, setFeePercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Check if already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        setAccount(window.ethereum.selectedAddress);
      }
    };

    checkConnection();
  }, []);

  // Add event listeners for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount("");
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
      }
    };
  }, []);

  // Load data when account changes
  useEffect(() => {
    const loadData = async () => {
      if (!account) {
        setBalances({ rwfc: "0", ekes: "0" });
        return;
      }

      setIsLoading(true);

      try {
        // Get exchange rate and fee percentage (don't need account for these)
        const rate = await getExchangeRate();
        setExchangeRate(rate);

        const fee = await getFeePercentage();
        setFeePercentage(fee);

        // Get balances for the connected account
        const balances = await getBalances(account);
        setBalances(balances);
      } catch (error) {
        console.error("Error loading data:", error);
        setNotification({
          type: "error",
          message: "Failed to load data. Please try refreshing the page.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [account]);

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      const addr = await connectWallet();
      setAccount(addr);
    } catch (error) {
      console.error("Connection error:", error);
      setNotification({
        type: "error",
        message: error.message,
      });
    }
  };

  // Handle Rwanda to Kenya transfer
  const handleTransferRwandaToKenya = async (recipient, amount) => {
    try {
      await transferRwandaToKenya(recipient, amount);

      // Refresh balances
      const newBalances = await getBalances(account);
      setBalances(newBalances);

      setNotification({
        type: "success",
        message: `Successfully transferred ${amount} RWFC to Kenya`,
      });

      return true;
    } catch (error) {
      console.error("Transfer error:", error);
      setNotification({
        type: "error",
        message: error.message,
      });
      throw error;
    }
  };

  // Handle Kenya to Rwanda transfer
  const handleTransferKenyaToRwanda = async (recipient, amount) => {
    try {
      await transferKenyaToRwanda(recipient, amount);

      // Refresh balances
      const newBalances = await getBalances(account);
      setBalances(newBalances);

      setNotification({
        type: "success",
        message: `Successfully transferred ${amount} eKES to Rwanda`,
      });

      return true;
    } catch (error) {
      console.error("Transfer error:", error);
      setNotification({
        type: "error",
        message: error.message,
      });
      throw error;
    }
  };

  return (
    <div className="app">
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">Cross-Border Settlement System</h1>
          <p className="app-subtitle">Rwanda-Kenya Digital Currency Bridge</p>
        </header>

        <WalletConnect account={account} onConnect={handleConnect} />

        {account ? (
          <div className="app-content">
            <BalanceCard
              balances={balances}
              exchangeRate={exchangeRate}
              feePercentage={feePercentage}
              isLoading={isLoading}
            />

            <TransferForm
              onTransferRwandaToKenya={handleTransferRwandaToKenya}
              onTransferKenyaToRwanda={handleTransferKenyaToRwanda}
              balances={balances}
              exchangeRate={exchangeRate}
              isLoading={isLoading}
            />

            <p className="app-footer">
              This is a proof-of-concept for a cross-border settlement system
              between Rwanda and Kenya. All transactions are on the Sepolia
              testnet.
            </p>
          </div>
        ) : (
          <div className="welcome-container">
            <div className="welcome-icon">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                ></path>
              </svg>
            </div>
            <h2 className="welcome-title">Connect Your Wallet</h2>
            <p className="welcome-text">
              Please connect your wallet to use the cross-border settlement
              system.
            </p>
            <button className="btn" onClick={handleConnect}>
              Connect Wallet
            </button>
          </div>
        )}

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
