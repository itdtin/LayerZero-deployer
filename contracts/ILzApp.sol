// SPDX-License-Identifier: GPL-3.0-only


pragma solidity ^0.8.11;
import './ILayerZeroUserApplicationConfig.sol';

interface ILzApp is ILayerZeroUserApplicationConfig {
    // @notice LayerZero endpoint will invoke this function to deliver the message on the destination
    // @param _srcChainId - the source endpoint identifier
    // @param _srcAddress - the source sending contract address from the source chain
    // @param _nonce - the ordered message nonce
    // @param _payload - the signed payload is the UA bytes has encoded to be sent
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;

    // @notice this function is invoked in case no L0 message needed
    function directReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
}
