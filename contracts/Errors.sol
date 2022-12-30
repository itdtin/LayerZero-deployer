// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

library Errors {
    //Common
    error Expired();
    error InvalidSignature(address recoveredAddress);
    error WrongLength();
    error WrongArguments();
    error TransferFailed();
    error ZeroAddress();
    error ZeroAmount();
    error NotEnoughValue();
    error AmountError(bytes msg, uint256 amount);

    //Pools
    error NoPool();
    error DuplicatePool();
    error DuplicateTokens();
    error InvalidPoolParams();
    error NoFactory();
    error FactoryAlreadyAdded();
    error InvalidTokenDecimals();
    error TooSmallInitialLiquidity();
    error NeedToRemoveLiqudiityFirst();
    error PoolReady();

    //Gas ad slippage
    error TooMuchSlippage();
    error GasIsOver();

    //Payload
    error NotStoredPayload();
    error InvalidPayload();
    error InvalidMethod(uint8 method);

    // Access Control
    error AccessError(bytes errorMsg);

    // Blocklist
    error TokenInBlocklist();
    error IdenticalAddresses();

    // Math
    error OutOfBounds();
    error InvalidExponent();
    error MaxInRatio();
    error InvalidInvariantRatio();
    error StableGetBalanceDidntConverge();
    error StableInvariantDidntConverge();

    //Fees
    error TooBigFee();
    error InvalidFee();

    //Integrations
    error InvalidSrcToken();
    error InvalidDestToken();
    error InvalidToken();
    error InvalidPath();

    //Staking
    error InvalidStartBlock();
    error InvalidBonusEndBlock();
    error PoolExist();
    error InvalidMultiplier();

    //Sale
    error NotStarted();
    error NotFinished();
    error Started();
    error HardcapReached();
}
