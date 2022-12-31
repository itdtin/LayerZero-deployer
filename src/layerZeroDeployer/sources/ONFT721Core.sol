// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IONFT721Core.sol";
import "./LzApp.sol";
import "./ERC165.sol";

abstract contract ONFT721Core is LzApp, ERC165, IONFT721Core {
    uint public constant NO_EXTRA_GAS = 0;
    uint16 public constant FUNCTION_TYPE_SEND = 1;
    bool public useCustomAdapterParams;

    event SetUseCustomAdapterParams(bool _useCustomAdapterParams);

    constructor(address _lzEndpoint) LzApp(_lzEndpoint) {}

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IONFT721Core).interfaceId || super.supportsInterface(interfaceId);
    }

    function estimateSendFee(uint16 _dstChainId, bytes memory _toAddress, uint _tokenId, bool _useZro, bytes memory _adapterParams) public view virtual override returns (uint nativeFee, uint zroFee) {
        // mock the payload for send()
        bytes memory payload = abi.encode(_toAddress, _tokenId);
        return lzEndpoint.estimateFees(_dstChainId, address(this), payload, _useZro, _adapterParams);
    }

    function sendFrom(address _from, uint16 _dstChainId, bytes memory _toAddress, uint _tokenId, address payable _refundAddress, address _zroPaymentAddress, bytes memory _adapterParams) public payable virtual override {
        _send(_from, _dstChainId, _toAddress, _tokenId, _refundAddress, _zroPaymentAddress, _adapterParams);
    }

    function _send(address _from, uint16 _dstChainId, bytes memory _toAddress, uint _tokenId, address payable _refundAddress, address _zroPaymentAddress, bytes memory _adapterParams) internal virtual {
        _debitFrom(_from, _dstChainId, _toAddress, _tokenId);

        bytes memory payload = abi.encode(_toAddress, _tokenId);

        _lzSend(_dstChainId, payload, _refundAddress, _zroPaymentAddress, _adapterParams);

        emit SendToChain(_dstChainId, _from, _toAddress, _tokenId);
    }

    function _lzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64, /*_nonce*/
        bytes memory _payload
    ) internal virtual override {
        (bytes memory toAddressBytes, uint tokenId) = abi.decode(_payload, (bytes, uint));
        address toAddress;
        assembly {
            toAddress := mload(add(toAddressBytes, 20))
        }

        _creditTo(_srcChainId, toAddress, tokenId);

        emit ReceiveFromChain(_srcChainId, _srcAddress, toAddress, tokenId);
    }

    function setUseCustomAdapterParams(bool _useCustomAdapterParams) external {
        useCustomAdapterParams = _useCustomAdapterParams;
        emit SetUseCustomAdapterParams(_useCustomAdapterParams);
    }

    function _debitFrom(address _from, uint16 _dstChainId, bytes memory _toAddress, uint _tokenId) internal virtual;

    function _creditTo(uint16 _srcChainId, address _toAddress, uint _tokenId) internal virtual;
}
