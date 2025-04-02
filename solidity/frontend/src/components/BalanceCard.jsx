import React from "react";
import "./BalanceCard.css";

const BalanceCard = ({ balances, exchangeRate, feePercentage, isLoading }) => {
  return (
    <div className="balance-grid">
      <div className="balance-card rwanda">
        <h2 className="balance-title text-rwanda">Bank of Kigali</h2>
        <div className="balance-subtitle">RWFC Balance</div>
        {isLoading ? (
          <div className="loading-pulse"></div>
        ) : (
          <div className="balance-value">
            {parseFloat(balances.rwfc).toFixed(6)} RWFC
          </div>
        )}
        <div className="balance-subtitle">Rwandan Franc Coin</div>
      </div>

      <div className="balance-card kenya">
        <h2 className="balance-title text-kenya">KCB Bank</h2>
        <div className="balance-subtitle">eKES Balance</div>
        {isLoading ? (
          <div className="loading-pulse"></div>
        ) : (
          <div className="balance-value">
            {parseFloat(balances.ekes).toFixed(6)} eKES
          </div>
        )}
        <div className="balance-subtitle">Electronic Kenyan Shilling</div>
      </div>

      <div className="balance-card exchange-info">
        <div className="exchange-info-grid">
          <div>
            <h3 className="info-label">Exchange Rate</h3>
            {isLoading ? (
              <div className="loading-pulse sm"></div>
            ) : (
              <div className="info-value">1 RWFC = {exchangeRate} eKES</div>
            )}
          </div>
          <div>
            <h3 className="info-label">Transfer Fee</h3>
            {isLoading ? (
              <div className="loading-pulse sm"></div>
            ) : (
              <div className="info-value">{feePercentage}%</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;
