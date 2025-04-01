import React, { useState } from "react";
import "./TransferForm.css";

const TransferForm = ({
  onTransferRwandaToKenya,
  onTransferKenyaToRwanda,
  balances,
  exchangeRate,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState("rwanda");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Calculate estimate
  const calculateEstimate = () => {
    if (!amount || isNaN(parseFloat(amount))) return "0";

    const numAmount = parseFloat(amount);
    if (activeTab === "rwanda") {
      // RWFC to eKES
      return (numAmount * exchangeRate * 0.9975).toFixed(4); // Applying 0.25% fee
    } else {
      // eKES to RWFC
      return ((numAmount / exchangeRate) * 0.9975).toFixed(4); // Applying 0.25% fee
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!recipient) {
      setError("Recipient address is required");
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // Check if sufficient balance
    if (
      activeTab === "rwanda" &&
      parseFloat(amount) > parseFloat(balances.rwfc)
    ) {
      setError("Insufficient RWFC balance");
      return;
    }

    if (
      activeTab === "kenya" &&
      parseFloat(amount) > parseFloat(balances.ekes)
    ) {
      setError("Insufficient eKES balance");
      return;
    }

    try {
      setIsProcessing(true);

      if (activeTab === "rwanda") {
        await onTransferRwandaToKenya(recipient, amount);
        setSuccess(`Successfully sent ${amount} RWFC to Kenya`);
      } else {
        await onTransferKenyaToRwanda(recipient, amount);
        setSuccess(`Successfully sent ${amount} eKES to Rwanda`);
      }

      // Reset form
      setAmount("");
      // Keep recipient for convenience
    } catch (err) {
      console.error("Transfer error:", err);
      setError(err.message || "Transfer failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="transfer-card">
      <div className="tabs">
        <button
          className={`tab ${activeTab === "rwanda" ? "active-rwanda" : ""}`}
          onClick={() => setActiveTab("rwanda")}
        >
          Rwanda → Kenya
        </button>
        <button
          className={`tab ${activeTab === "kenya" ? "active-kenya" : ""}`}
          onClick={() => setActiveTab("kenya")}
        >
          Kenya → Rwanda
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Recipient Address</label>
          <input
            type="text"
            className="input"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={isLoading || isProcessing}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Amount to Send ({activeTab === "rwanda" ? "RWFC" : "eKES"})
          </label>
          <input
            type="text"
            className="input"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading || isProcessing}
          />
          <span className="balance-hint">
            Balance: {activeTab === "rwanda" ? balances.rwfc : balances.ekes}{" "}
            {activeTab === "rwanda" ? "RWFC" : "eKES"}
          </span>
        </div>

        <div className="estimate-box">
          <div className="estimate-title">Estimated Receive Amount:</div>
          <div className="estimate-value">
            {calculateEstimate()} {activeTab === "rwanda" ? "eKES" : "RWFC"}
          </div>
          <div className="estimate-detail">
            Includes 0.25% fee • Exchange rate: 1 RWFC = {exchangeRate} eKES
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {success && <div className="alert alert-success">{success}</div>}

        <button
          type="submit"
          className={`btn submit-button ${
            activeTab === "rwanda" ? "btn-rwanda" : "btn-kenya"
          }`}
          disabled={isLoading || isProcessing}
        >
          {isProcessing ? (
            <span className="processing-indicator">
              <div className="spinner"></div>
              Processing...
            </span>
          ) : (
            `Send ${
              activeTab === "rwanda" ? "RWFC to Kenya" : "eKES to Rwanda"
            }`
          )}
        </button>
      </form>
    </div>
  );
};

export default TransferForm;
