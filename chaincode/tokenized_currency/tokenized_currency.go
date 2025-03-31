package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	pb "github.com/hyperledger/fabric-protos-go/peer"
)

// TokenizedCurrencyChaincode implements a multi-currency token system.
type TokenizedCurrencyChaincode struct {
}

func (t *TokenizedCurrencyChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	// Initialization logic (if any)
	return shim.Success(nil)
}

func (t *TokenizedCurrencyChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	switch function {
	case "Mint":
		return t.Mint(stub, args)
	case "Burn":
		return t.Burn(stub, args)
	case "Transfer":
		return t.Transfer(stub, args)
	case "QueryBalance":
		return t.QueryBalance(stub, args)
	default:
		return shim.Error("Invalid function name.")
	}
}

// Mint creates new tokens for a specific currency.
// args[0] = currency (e.g., "RWF")
// args[1] = accountID to credit
// args[2] = amount (string integer)
// Only a central bank identity should be allowed to mint.
func (t *TokenizedCurrencyChaincode) Mint(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 3 {
		return shim.Error("Mint requires 3 arguments: currency, accountID, amount")
	}
	currency := args[0]
	accountID := args[1]
	amount, err := strconv.Atoi(args[2])
	if err != nil {
		return shim.Error("Amount must be an integer")
	}

	// Enforce that only an identity with attribute role==centralbank can mint.
	creator, err := stub.GetCreator()
	if err != nil {
		return shim.Error("Failed to get creator identity")
	}
	// (For demonstration, we assume a function checkCentralBank exists.)
	if !checkCentralBank(creator) {
		return shim.Error("Only central bank identities can mint tokens")
	}

	// Retrieve current balance
	key := BalanceKey(Currency(currency), accountID)
	balanceBytes, _ := stub.GetState(key)
	currentBalance := 0
	if balanceBytes != nil {
		currentBalance, _ = strconv.Atoi(string(balanceBytes))
	}

	newBalance := currentBalance + amount
	err = stub.PutState(key, []byte(strconv.Itoa(newBalance)))
	if err != nil {
		return shim.Error("Failed to update balance")
	}

	return shim.Success([]byte(fmt.Sprintf("Minted %d %s tokens for account %s", amount, currency, accountID)))
}

// Burn destroys tokens from the caller's account.
// args[0] = currency, args[1] = accountID, args[2] = amount
func (t *TokenizedCurrencyChaincode) Burn(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 3 {
		return shim.Error("Burn requires 3 arguments: currency, accountID, amount")
	}
	currency := args[0]
	accountID := args[1]
	amount, err := strconv.Atoi(args[2])
	if err != nil {
		return shim.Error("Amount must be an integer")
	}

	// Only central bank can burn tokens
	creator, err := stub.GetCreator()
	if err != nil {
		return shim.Error("Failed to get creator identity")
	}
	if !checkCentralBank(creator) {
		return shim.Error("Only central bank identities can burn tokens")
	}

	key := BalanceKey(Currency(currency), accountID)
	balanceBytes, err := stub.GetState(key)
	if err != nil || balanceBytes == nil {
		return shim.Error("Account not found")
	}
	currentBalance, _ := strconv.Atoi(string(balanceBytes))
	if currentBalance < amount {
		return shim.Error("Insufficient balance to burn")
	}

	newBalance := currentBalance - amount
	err = stub.PutState(key, []byte(strconv.Itoa(newBalance)))
	if err != nil {
		return shim.Error("Failed to update balance")
	}

	return shim.Success([]byte(fmt.Sprintf("Burned %d %s tokens from account %s", amount, currency, accountID)))
}

// Transfer moves tokens between two accounts.
// args[0] = currency, args[1] = sender accountID, args[2] = receiver accountID, args[3] = amount
func (t *TokenizedCurrencyChaincode) Transfer(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 4 {
		return shim.Error("Transfer requires 4 arguments: currency, sender, receiver, amount")
	}
	currency := args[0]
	sender := args[1]
	receiver := args[2]
	amount, err := strconv.Atoi(args[3])
	if err != nil {
		return shim.Error("Amount must be an integer")
	}

	// Deduct from sender
	senderKey := BalanceKey(Currency(currency), sender)
	senderBalanceBytes, err := stub.GetState(senderKey)
	if err != nil || senderBalanceBytes == nil {
		return shim.Error("Sender account not found")
	}
	senderBalance, _ := strconv.Atoi(string(senderBalanceBytes))
	if senderBalance < amount {
		return shim.Error("Insufficient balance in sender account")
	}
	senderBalance -= amount

	// Credit receiver
	receiverKey := BalanceKey(Currency(currency), receiver)
	receiverBalanceBytes, _ := stub.GetState(receiverKey)
	receiverBalance := 0
	if receiverBalanceBytes != nil {
		receiverBalance, _ = strconv.Atoi(string(receiverBalanceBytes))
	}
	receiverBalance += amount

	// Update states
	if err := stub.PutState(senderKey, []byte(strconv.Itoa(senderBalance))); err != nil {
		return shim.Error("Failed to update sender balance")
	}
	if err := stub.PutState(receiverKey, []byte(strconv.Itoa(receiverBalance))); err != nil {
		return shim.Error("Failed to update receiver balance")
	}

	return shim.Success([]byte(fmt.Sprintf("Transferred %d %s tokens from %s to %s", amount, currency, sender, receiver)))
}

// QueryBalance returns the balance for an account in a given currency.
// args[0] = currency, args[1] = accountID
func (t *TokenizedCurrencyChaincode) QueryBalance(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 2 {
		return shim.Error("QueryBalance requires 2 arguments: currency and accountID")
	}
	currency := args[0]
	accountID := args[1]
	key := BalanceKey(Currency(currency), accountID)
	balanceBytes, err := stub.GetState(key)
	if err != nil || balanceBytes == nil {
		return shim.Error("Account not found")
	}
	return shim.Success(balanceBytes)
}

// checkCentralBank is a placeholder function to simulate checking the caller's identity.
// In a real deployment, you’d parse the serialized identity and check its attributes.
func checkCentralBank(creator []byte) bool {
	// For demonstration, always return true.
	// Replace with proper MSP/attribute checks.
	return true
}

func main() {
	err := shim.Start(new(TokenizedCurrencyChaincode))
	if err != nil {
		fmt.Printf("Error starting TokenizedCurrency chaincode: %s", err)
	}
}
