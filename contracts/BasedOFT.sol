// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import './OFT.sol';
import './draft-ERC20Permit.sol';
import './ERC20Votes.sol';

contract BasedOFT is OFT, ERC20Permit, ERC20Votes {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        uint256 _globalSupply
    ) ERC20Permit(_name) OFT(_name, _symbol, _lzEndpoint, _globalSupply) {}

    function _debitFrom(
        address,
        uint16,
        bytes memory,
        uint256 _amount
    ) internal override {
        _transfer(_msgSender(), address(this), _amount);
    }

    function _creditTo(
        uint16,
        address _toAddress,
        uint256 _amount
    ) internal override {
        _transfer(address(this), _toAddress, _amount);
    }

    function getType() public view virtual override returns (uint256) {
        return 1;
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}
