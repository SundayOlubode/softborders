export const CONTRACT_ADDRESSES = {
  rwfc: "0x5eB2E66488EF6CD286F0a738476Ed4538A4d4ACd",
  ekes: "0xf3aFB8F6D51655d38cB03E5E231048bbE7B3a039",
  rateProvider: "0x0d73fEC84Bb06D2Ee0cc1b83Ae095Fff2eaE5CA2",
  settlement: "0x824CA95AafC222D344B660Aa38d0a2a8D2baDf92",
};

export const RWFC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export const EKES_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export const RATE_PROVIDER_ABI = [
  "function getExchangeRate() view returns (uint256)",
  "function updateRate(uint256 newRate)",
];

export const SETTLEMENT_ABI = [
  "function transferRwandaToKenya(address recipient, uint256 rwfcAmount)",
  "function transferKenyaToRwanda(address recipient, uint256 kesAmount)",
  "function feePercentage() view returns (uint256)",
  "function updateFee(uint256 newFeePercentage)",
  "function pause()",
  "function unpause()",
];
