# Cross-Border Settlement System: Rwanda-Kenya

A blockchain-based cross-border settlement system enabling digital currency transfers between Rwanda and Kenya using Ethereum smart contracts.

## Table of Contents

- [Cross-Border Settlement System: Rwanda-Kenya](#cross-border-settlement-system-rwanda-kenya)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [System Architecture](#system-architecture)
  - [Project Structure](#project-structure)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Setup](#setup)
  - [Deployment](#deployment)
    - [To Sepolia Testnet](#to-sepolia-testnet)
  - [Testing](#testing)
    - [Test Coverage](#test-coverage)
  - [Frontend](#frontend)
    - [Development Server](#development-server)
    - [Production Build](#production-build)
    - [Configuration](#configuration)
  - [Technical Documentation](#technical-documentation)
    - [Smart Contracts](#smart-contracts)
    - [Transfer Process](#transfer-process)
      - [Rwanda to Kenya Flow:](#rwanda-to-kenya-flow)
      - [Kenya to Rwanda Flow:](#kenya-to-rwanda-flow)
    - [Gas Usage](#gas-usage)

## Overview

This project implements a proof-of-concept for a cross-border payment and settlement system between Rwanda and Kenya. It creates digital representations of the Rwandan Franc (RWFC) and Kenyan Shilling (eKES) on the Ethereum blockchain, allowing for seamless transfers with automatic currency conversion.

The system addresses current inefficiencies in cross-border transfers within Africa by providing a direct settlement channel between central banks, reducing costs and time delays.

## Features

- **Digital Currency Tokens**: ERC20-compliant tokens representing RWFC and eKES
- **Real-time Exchange Rates**: Configurable fixed exchange rate with update capability
- **Role-Based Access Control**: Secure permissioning for central banks and administrators
- **Fee Management**: Configurable fee structure with fee distribution to central banks
- **Emergency Controls**: System pause/unpause functionality for crisis management
- **User-friendly Interface**: Web frontend for initiating and monitoring transfers

## System Architecture

```
┌─────────────────────────────┐                 ┌─────────────────────────────┐
│       RWANDA BANKING        │                 │        KENYA BANKING        │
│                             │                 │                             │
│  ┌─────────────────────┐    │                 │    ┌─────────────────────┐  │
│  │  National Bank of   │    │                 │    │   Central Bank of   │  │
│  │  Rwanda (BNR)       │    │                 │    │   Kenya (CBK)       │  │
│  └──────────┬──────────┘    │                 │    └──────────┬──────────┘  │
│             │               │                 │               │             │
│  ┌──────────▼──────────┐    │                 │    ┌──────────▼──────────┐  │
│  │                     │    │                 │    │                     │  │
│  │  Rwandan Franc Coin │◄───┼─────────────────┼────►Electronic Kenyan Sh.│  │
│  │       (RWFC)        │    │                 │    │       (eKES)        │  │
│  │                     │    │                 │    │                     │  │
│  └──────────┬──────────┘    │                 │    └──────────┬──────────┘  │
│             │               │                 │               │             │
└─────────────┼───────────────┘                 └───────────────┼─────────────┘
              │                                                 │
              │               ┌─────────────────────────┐       │
              │               │                         │       │
              └───────────────►  Cross-Border Settlement◄───────┘
                              │       Contract          │
                              │                         │
                              └────────────┬────────────┘
                                           │
                                           │
                              ┌────────────▼────────────┐
                              │                         │
                              │    Exchange Rate        │
                              │      Provider           │
                              │                         │
                              └─────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              Web Interface                                   │
│                                                                              │
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐ │
│  │  Bank of Kigali     │   │ Settlement Controls  │   │  KCB Bank Group     │ │
│  │   - Balance         │   │  - Exchange Rate     │   │   - Balance         │ │
│  │   - Send to Kenya   │   │  - Fee Settings      │   │   - Send to Rwanda  │ │
│  │   - Receive from    │   │  - Emergency Pause   │   │   - Receive from    │ │
│  │     Kenya (in RWFC) │   │                      │   │     Rwanda (in KES) │ │
│  └─────────────────────┘   └─────────────────────┘   └─────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
solidity/
├── contracts/                  # Smart contracts
│   ├── tokens/                 # Currency token contracts
│   ├── rates/                  # Exchange rate providers
│   └── settlement/             # Settlement logic
├── scripts/                    # Deployment and utility scripts
├── test/                       # Test suite
│   ├── tokens/                 # Token tests
│   ├── rates/                  # Exchange rate tests
│   ├── settlement/             # Settlement tests
│   └── integration/            # End-to-end tests
├── frontend/                   # User interface
│   ├── src/                    # Source code
│   └── public/                 # Static assets
└── docs/                       # Documentation
```

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/) (v6 or later)
- [Git](https://git-scm.com/)
- An Ethereum wallet with MetaMask
- Sepolia ETH for gas fees (from [Sepolia Faucet](https://sepoliafaucet.com/))

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/SundayOlubode/softborders.git
   cd solidity
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file:

   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your specific details:

   ```
   SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
   PRIVATE_KEY="your_wallet_private_key"
   ETHERSCAN_API_KEY="your_etherscan_api_key"
   ```

5. Compile the contracts:
   ```bash
   npx hardhat compile
   ```

## Deployment

### To Sepolia Testnet

```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy-direct.js --network sepolia
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/settlement/CrossBorderSettlement.test.js

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test
```

### Test Coverage

Generate test coverage report:

```bash
npx hardhat coverage
```

## Frontend

The frontend provides an intuitive interface for interacting with the settlement system.

### Development Server

```bash
cd frontend
npm install
npm run dev
```

### Production Build

```bash
cd frontend
npm run build
```

### Configuration

Update contract addresses in `frontend/src/config/contracts.js` to match your deployed contracts.

## Technical Documentation

### Smart Contracts

- **CBDCToken**: Base contract for CBDC tokens with added security features
- **RwandanFrancCoin**: RWFC token implementation
- **ElectronicKenyanShilling**: eKES token implementation
- **FixedExchangeRateProvider**: Exchange rate provider with manual update capability
- **CrossBorderSettlement**: Main settlement logic for cross-border transfers

### Transfer Process

#### Rwanda to Kenya Flow:

1. User approves RWFC for settlement contract
2. User calls `transferRwandaToKenya()` with recipient and amount
3. Settlement contract applies fee and exchange rate conversion
4. RWFC is burned and eKES is minted to recipient

#### Kenya to Rwanda Flow:

1. User approves eKES for settlement contract
2. User calls `transferKenyaToRwanda()` with recipient and amount
3. Settlement contract applies fee and exchange rate conversion
4. eKES is burned and RWFC is minted to recipient

### Gas Usage

| Operation                | Average Gas Cost |
| ------------------------ | ---------------- |
| Rwanda to Kenya Transfer | 101,102          |
| Kenya to Rwanda Transfer | 101,839          |
| Update Fee               | 30,258           |
| Pause/Unpause            | ~29,800          |
