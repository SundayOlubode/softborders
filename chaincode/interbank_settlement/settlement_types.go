package main

// SettlementType defines the type of settlement transaction.
type SettlementType string

const (
	Domestic    SettlementType = "Domestic"
	CrossBorder SettlementType = "CrossBorder"
)

// Settlement represents a settlement transaction.
type Settlement struct {
	From          string         `json:"from"`
	To            string         `json:"to"`
	CurrencyFrom  string         `json:"currencyFrom"`
	CurrencyTo    string         `json:"currencyTo"`
	Amount        int            `json:"amount"`
	ExchangeRate  int            `json:"exchangeRate"` // assume integer factor (e.g., multiplied by 1e4)
	Type          SettlementType `json:"type"`
}
