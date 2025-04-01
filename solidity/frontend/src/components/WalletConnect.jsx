import React from "react";
import { isMetaMaskInstalled } from "../utils/ethers";
import "./WalletConnect.css";

const WalletConnect = ({ account, onConnect }) => {
  return (
    <div className="wallet-connect">
      {account ? (
        <div className="wallet-status">
          <div className="wallet-indicator connected"></div>
          <span className="wallet-address">
            {account.substring(0, 6)}...{account.substring(account.length - 4)}
          </span>
        </div>
      ) : (
        <div className="wallet-status">
          <div className="wallet-indicator disconnected"></div>
          <span className="wallet-address">Not Connected</span>
        </div>
      )}

      {!account && (
        <button
          onClick={onConnect}
          disabled={!isMetaMaskInstalled()}
          className="btn"
        >
          {isMetaMaskInstalled() ? "Connect Wallet" : "Install MetaMask"}
        </button>
      )}

      {account && <div className="network-badge">Sepolia Testnet</div>}
    </div>
  );
};

export default WalletConnect;
