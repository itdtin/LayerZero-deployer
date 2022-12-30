// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import './BasedOFT.sol';

contract TestToken is BasedOFT {
    string public constant _name = 'Test Token';
    string public constant _symbol = 'TST';

    constructor(address _lzEndpoint, uint256 _globalSupply) BasedOFT(_name, _symbol, _lzEndpoint, _globalSupply) {}
}
