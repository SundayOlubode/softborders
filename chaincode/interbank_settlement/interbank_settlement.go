package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	pb "github.com/hyperledger/fabric-protos-go/peer"
)

// InterbankSettlementChaincode implements interbank settlement logic.
type InterbankSettlementChaincode struct {
}

func (s *InterbankSettlementChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	// Initialization logic if needed.
	return shim.Success(nil)
}

func (s *InterbankSettlementChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	switch function {
	case "SettleDomestic":
		return s.SettleDomestic(stub, args)
	case "SettleCrossBorder":
		return s.SettleCrossBorder(stub, args)
	case "RegisterOrg":
		return s.RegisterOrg(stub, args)
	default:
		return shim.Error("Invalid function name.")
	}
}

// SettleDomestic performs a domestic settlement using the TokenizedCurrency chaincode's ledger.
// args[0] = currency (e.g., "RWF")
// args[1] = sender account ID
// args[2] = receiver account ID
// args[3] = amount
func (s *InterbankSettlementChaincode) SettleDomestic(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 4 {
		return shim.Error("SettleDomestic requires 4 arguments")
	}
	currency := args[0]
	sender := args[1]
	receiver := args[2]
	amount, err := strconv.Atoi(args[3])
	if err != nil {
		return shim.Error("Amount must be an integer")
	}

	// Here, we simulate the transfer by updating the ledger.
	// We assume that the tokenized currency ledger uses the same key structure.
	senderKey := BalanceKey(currency, sender)
	receiverKey := BalanceKey(currency, receiver)

	senderBalanceBytes, err := stub.GetState(senderKey)
	if err != nil || senderBalanceBytes == nil {
		return shim.Error("Sender account not found")
	}
	senderBalance, _ := strconv.Atoi(string(senderBalanceBytes))
	if senderBalance < amount {
		return shim.Error("Insufficient funds in sender account")
	}
	senderBalance -= amount

	receiverBalanceBytes, _ := stub.GetState(receiverKey)
	receiverBalance := 0
	if receiverBalanceBytes != nil {
		receiverBalance, _ = strconv.Atoi(string(receiverBalanceBytes))
	}
	receiverBalance += amount

	err = stub.PutState(senderKey, []byte(strconv.Itoa(senderBalance)))
	if err != nil {
		return shim.Error("Failed to update sender balance")
	}
	err = stub.PutState(receiverKey, []byte(strconv.Itoa(receiverBalance)))
	if err != nil {
		return shim.Error("Failed to update receiver balance")
	}

	return shim.Success([]byte(fmt.Sprintf("Domestic settlement of %d %s from %s to %s complete", amount, currency, sender, receiver)))
}

// SettleCrossBorder performs a cross-border settlement.
// args[0] = fromCurrency (e.g., "RWF")
// args[1] = toCurrency (e.g., "KES")
// args[2] = sender account ID (in fromCurrency)
// args[3] = receiver account ID (in toCurrency)
// args[4] = amount in fromCurrency
// args[5] = exchangeRate (integer; e.g., if 1 RWF = 0.005 KES then pass 5 with a multiplier of 1e3)
func (s *InterbankSettlementChaincode) SettleCrossBorder(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 6 {
		return shim.Error("SettleCrossBorder requires 6 arguments")
	}
	fromCurrency := args[0]
	toCurrency := args[1]
	sender := args[2]
	receiver := args[3]
	amount, err := strconv.Atoi(args[4])
	if err != nil {
		return shim.Error("Amount must be an integer")
	}
	exchangeRate, err := strconv.Atoi(args[5])
	if err != nil {
		return shim.Error("Exchange rate must be an integer")
	}

	// Deduct from sender's account in fromCurrency.
	senderKey := BalanceKey(fromCurrency, sender)
	senderBalanceBytes, err := stub.GetState(senderKey)
	if err != nil || senderBalanceBytes == nil {
		return shim.Error("Sender account not found")
	}
	senderBalance, _ := strconv.Atoi(string(senderBalanceBytes))
	if senderBalance < amount {
		return shim.Error("Insufficient funds in sender account")
	}
	senderBalance -= amount
	err = stub.PutState(senderKey, []byte(strconv.Itoa(senderBalance)))
	if err != nil {
		return shim.Error("Failed to update sender balance")
	}

	// Calculate equivalent amount in toCurrency.
	// For simplicity, we assume exchangeRate is a multiplier.
	convertedAmount := amount * exchangeRate

	// Credit receiver's account in toCurrency.
	receiverKey := BalanceKey(toCurrency, receiver)
	receiverBalanceBytes, _ := stub.GetState(receiverKey)
	receiverBalance := 0
	if receiverBalanceBytes != nil {
		receiverBalance, _ = strconv.Atoi(string(receiverBalanceBytes))
	}
	receiverBalance += convertedAmount
	err = stub.PutState(receiverKey, []byte(strconv.Itoa(receiverBalance)))
	if err != nil {
		return shim.Error("Failed to update receiver balance")
	}

	return shim.Success([]byte(fmt.Sprintf("Cross-border settlement complete: %d %s debited from %s and %d %s credited to %s", amount, fromCurrency, sender, convertedAmount, toCurrency, receiver)))
}

// RegisterOrg is a placeholder to allow new organizations to join the network.
// In a production system, this might update a registry or configuration.
func (s *InterbankSettlementChaincode) RegisterOrg(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// args[0] = OrgID, args[1] = OrgName, etc.
	if len(args) < 2 {
		return shim.Error("RegisterOrg requires at least 2 arguments")
	}
	orgID := args[0]
	orgName := args[1]

	// Save org info to the ledger (simplified example)
	key := "org:" + orgID
	orgInfo := map[string]string{"orgID": orgID, "orgName": orgName}
	orgInfoBytes, err := json.Marshal(orgInfo)
	if err != nil {
		return shim.Error("Failed to marshal org info")
	}
	err = stub.PutState(key, orgInfoBytes)
	if err != nil {
		return shim.Error("Failed to register org")
	}
	return shim.Success([]byte(fmt.Sprintf("Organization %s registered", orgName)))
}

func main() {
	err := shim.Start(new(InterbankSettlementChaincode))
	if err != nil {
		fmt.Printf("Error starting InterbankSettlement chaincode: %s", err)
	}
}
