package main

import (
	"fmt"
)

// Currency represents a currency code (e.g., "RWF", "KES")
type Currency string

// BalanceKey returns a composite key for storing an account's balance for a given currency.
func BalanceKey(currency Currency, accountID string) string {
	return fmt.Sprintf("balance:%s:%s", currency, accountID)
}
