// SPDX-License-Identifier: GPL-3.0-only
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity ^0.8.11;

import './ILzApp.sol';
import './ILayerZeroEndpoint.sol';
import './Errors.sol';

/*
 * a generic LzApp implementation
 */
abstract contract LzApp is ILzApp {
    /// using ExcessivelySafeCall for address;

    ILayerZeroEndpoint public immutable lzEndpoint;
    mapping(uint16 => mapping(bytes => mapping(uint64 => bytes32))) public failedMessages;

    mapping(uint16 => bytes) public trustedRemoteLookup;

    event SetTrustedRemote(uint16 _srcChainId, bytes _srcAddress);
    event MessageFailed(uint16 _srcChainId, bytes _srcAddress, uint64 _nonce, bytes _payload);
    event FailedMessageCleared(uint16 _srcChainId, bytes _srcAddress, uint64 _nonce, bytes _payload);

    constructor(address _endpoint) {
        lzEndpoint = ILayerZeroEndpoint(_endpoint);
    }

    // abstract function - should be overriden in child contracts
    function _lzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual;

    function _receiveCaller(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) public virtual {
        if (msg.sender != address(this)) revert Errors.AccessError('Restrict to Lz app');
        _lzReceive(_srcChainId, _srcAddress, _nonce, _payload);
    }

    function lzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) public virtual override {
        // lzReceive must be called by the endpoint for security
        if (msg.sender != address(lzEndpoint)) revert Errors.AccessError('Caller is not LZ endpoint');
        // bytes memory trustedRemote = trustedRemoteLookup[_srcChainId];
        // if (_srcAddress.length != trustedRemote.length || keccak256(_srcAddress) != keccak256(trustedRemote))
        //     revert Errors.AccessError('Invalid source contract');
        _nonblockingLzReceive(_srcChainId, _srcAddress, _nonce, _payload);
    }

    function directReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) external {
        // directReceive can be called by trusted remote on the same chain. no need to send lz message
        // bytes memory trustedRemote = trustedRemoteLookup[_srcChainId];
        // if (_srcAddress.length != trustedRemote.length || keccak256(_srcAddress) != keccak256(trustedRemote))
        //     revert Errors.AccessError('Invalid source contract');
        _lzReceive(_srcChainId, _srcAddress, _nonce, _payload);
    }

    // function _blockingLzReceive(
    //     uint16 _srcChainId,
    //     bytes memory _srcAddress,
    //     uint64 _nonce,
    //     bytes memory _payload
    // ) internal virtual {
    //     (bool success, bytes memory reason) = address(this).excessivelySafeCall(
    //         gasleft(),
    //         150,
    //         abi.encodeWithSelector(this._nonblockingLzReceive.selector, _srcChainId, _srcAddress, _nonce, _payload)
    //     );
    //     // try-catch all errors/exceptions
    //     if (!success) {
    //         failedMessages[_srcChainId][_srcAddress][_nonce] = keccak256(_payload);
    //         emit MessageFailed(_srcChainId, _srcAddress, _nonce, _payload);
    //     }
    // }

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) public virtual {
        try this._receiveCaller(_srcChainId, _srcAddress, _nonce, _payload) {
            // do nothing
        } catch {
            // error / exception
            failedMessages[_srcChainId][_srcAddress][_nonce] = keccak256(_payload);
            emit MessageFailed(_srcChainId, _srcAddress, _nonce, _payload);
        }
    }

    function _lzSend(
        uint16 _dstChainId,
        bytes memory _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) internal virtual {
        bytes memory trustedRemote = trustedRemoteLookup[_dstChainId];
        if (trustedRemote.length == 0) revert Errors.AccessError('Restrict to trusted sources');
        lzEndpoint.send{value: msg.value}(_dstChainId, trustedRemote, _payload, _refundAddress, _zroPaymentAddress, _adapterParams);
    }

    function retryMessage(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) public payable virtual {
        // assert there is message to retry
        bytes32 payloadHash = failedMessages[_srcChainId][_srcAddress][_nonce];
        if (payloadHash == bytes32(0)) revert Errors.NotStoredPayload();
        if (keccak256(_payload) != payloadHash) revert Errors.InvalidPayload();
        // clear the stored message
        failedMessages[_srcChainId][_srcAddress][_nonce] = bytes32(0);
        // execute the message. revert if it fails again
        _nonblockingLzReceive(_srcChainId, _srcAddress, _nonce, _payload);
        emit FailedMessageCleared(_srcChainId, _srcAddress, _nonce, _payload);
    }

    // generic config for LayerZero user Application
    function setConfig(
        uint16 _version,
        uint16 _chainId,
        uint256 _configType,
        bytes calldata _config
    ) external override {
        lzEndpoint.setConfig(_version, _chainId, _configType, _config);
    }

    function setSendVersion(uint16 _version) external override {
        lzEndpoint.setSendVersion(_version);
    }

    function setReceiveVersion(uint16 _version) external override {
        lzEndpoint.setReceiveVersion(_version);
    }

    function forceResumeReceive(uint16 _srcChainId, bytes calldata _srcAddress) external override {
        lzEndpoint.forceResumeReceive(_srcChainId, _srcAddress);
    }

    // allow owner to set it multiple times.
    function setTrustedRemote(uint16 _srcChainId, bytes calldata _srcAddress) public {
        trustedRemoteLookup[_srcChainId] = _srcAddress;
        emit SetTrustedRemote(_srcChainId, _srcAddress);
    }

    //--------------------------- VIEW FUNCTION ----------------------------------------

    function isTrustedRemote(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (bool) {
        bytes memory trustedSource = trustedRemoteLookup[_srcChainId];
        return keccak256(trustedSource) == keccak256(_srcAddress);
    }
}
