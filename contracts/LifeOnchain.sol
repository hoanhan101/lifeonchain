// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/*
 * 4ny 11v3 c311 w17h f3w32 7h4n 7w0 11v3 n319h8025 d135, 45 1f 8y und32p0pu14710n.
 * 4ny 11v3 c311 w17h 7w0 02 7h233 11v3 n319h8025 11v35 0n 70 7h3 n3x7 93n324710n.
 * 4ny 11v3 c311 w17h m023 7h4n 7h233 11v3 n319h8025 d135, 45 1f 8y 0v32p0pu14710n.
 * 4ny ny d34d c311 w17h 3x4c71y 7h233 11v3 n319h8025 83c0m35 4 11v3 c311, 45 1f 8y 23p20duc710n.
 */
import "./scripty/IScriptyBuilder.sol";
import "./SmallSolady.sol";
import "./ILifeOnchain.sol";

import {ERC721A, IERC721A} from "erc721a/contracts/ERC721A.sol";
import {ERC721AQueryable} from "erc721a/contracts/extensions/ERC721AQueryable.sol";
import {ERC721ABurnable} from "erc721a/contracts/extensions/ERC721ABurnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LifeOnchain is an onchain and interactive implementation of Conway's Game of Life
 * @author hoanh.eth
 */
contract LifeOnchain is ERC721A, ERC721AQueryable, ERC721ABurnable, Ownable {
    address public immutable _scriptyStorageAddress;
    address public immutable _scriptyBuilderAddress;

    string public _scriptyScriptName;

    uint256 public immutable _supply;

    uint256 public immutable _price = 0.03 ether;

    bool public _isOpen = false;

    string[][3] public traitsNames;
    uint16[][3] public traitsRarities;

    mapping(bytes32 => bool) public foundTraits;
    mapping(uint256 => Traits) public livesTraits;

    error MintClosed();
    error ContractMinter();
    error SoldOut();
    error InsufficientFunds();
    error WalletMax();
    error TokenDoesntExist();
    error ZeroBalance();
    error FailToWithdraw();

    constructor(
        string memory name,
        string memory symbol,
        uint256 supply,
        string memory scriptyScriptName,
        address scriptyStorageAddress,
        address scriptyBuilderAddress
    ) ERC721A(name, symbol) {
        _scriptyScriptName = scriptyScriptName;
        _scriptyStorageAddress = scriptyStorageAddress;
        _scriptyBuilderAddress = scriptyBuilderAddress;

        _supply = supply;

        traitsNames[0] = [
            "blistering",
            "rapid",
            "swift",
            "moderate",
            "leisurely",
            "sluggish"
        ];
        traitsNames[1] = [
            "rainbow",
            "hacker green",
            "matrix green",
            "acid burn",
            "cyberpunk",
            "terminator red",
            "hacker black",
            "circuit board",
            "cyber yellow",
            "neon pink"
            "hackerman blue"
            "lime green"
            "cyber purple"
            "ghost in the shell"
            "cylon red"
            "darknet red"
        ];
        traitsNames[2] = [
            "yinyang",
            "floating diamond",
            "techno scripspy",
            "glitzy globs",
            "rocketry",
            "flicker box",
            "lazer disk",
            "shattered glass",
            "mayan bricks",
            "honey comb",
            "original"
        ];

        traitsRarities[0] = [500, 500, 1500, 2000, 2500, 3000];
        traitsRarities[1] = [
            125,
            225,
            325,
            525,
            525,
            525,
            625,
            625,
            625,
            725,
            825,
            825,
            825,
            825,
            925,
            925
        ];
        traitsRarities[2] = [
            200,
            500,
            700,
            800,
            800,
            900,
            1000,
            1000,
            1200,
            1300,
            1600
        ];
    }

    /**
     * @notice Set minting status
     */
    function setMintStatus(bool state) external onlyOwner {
        _isOpen = state;
    }

    /**
     * @notice Set scripty's script name
     */
    function setScriptyScriptName(string memory newName) external onlyOwner {
        _scriptyScriptName = newName;
    }

    /**
     * @notice Mint function
     */
    function mint() public payable {
        if (!_isOpen) revert MintClosed();
        if (msg.sender != tx.origin) revert ContractMinter();
        if (msg.value < _price) revert InsufficientFunds();
        uint totalMinted = _totalMinted();
        unchecked {
            if (totalMinted > _supply) revert SoldOut();
        }

        uint16[3] memory combination = getTraitsCombination(totalMinted);
        Traits memory traits;
        traits.speedIndex = combination[0];
        traits.colorIndex = combination[1];
        traits.modeIndex = combination[2];
        livesTraits[totalMinted] = traits;

        _safeMint(msg.sender, 1, "");
    }

    /**
     * @notice Get an unique DNA for a given token ID
     */
    function getTraitsCombination(
        uint256 tokenId
    ) internal returns (uint16[3] memory traits) {
        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(
                    block.number,
                    "11f30nch41n",
                    SmallSolady.toString(tokenId),
                    address(this)
                )
            )
        );
        while (true) {
            traits[0] = getRandomTraitIndex(traitsRarities[0], seed);
            traits[1] = getRandomTraitIndex(traitsRarities[1], seed >> 16);
            traits[2] = getRandomTraitIndex(traitsRarities[2], seed >> 32);

            bytes32 combination = keccak256(abi.encodePacked(traits));
            if (foundTraits[combination] == false) {
                foundTraits[combination] = true;
                return traits;
            }
            seed++;
        }
    }

    /**
     * @notice Get random trait index based on seed
     * Inspired by Anonymice (0xbad6186e92002e312078b5a1dafd5ddf63d3f731)
     */
    function getRandomTraitIndex(
        uint16[] memory traitRarities,
        uint256 seed
    ) private pure returns (uint16 index) {
        uint16 rand = uint16(seed % 10000);
        uint16 lowerBound;
        for (uint16 i = 0; i < traitRarities.length; i++) {
            uint16 percentage = traitRarities[i];

            if (rand < percentage + lowerBound && rand >= lowerBound) {
                return i;
            }
            lowerBound = lowerBound + percentage;
        }
        revert();
    }

    /**
     * @notice Build metadata and assemble the corresponding HTML
     */
    function tokenURI(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC721A, IERC721A)
        returns (string memory metadata)
    {
        if (!_exists(tokenId)) revert TokenDoesntExist();

        Traits memory traits = livesTraits[tokenId];
        bytes memory attr = buildAttributes(traits);
        bytes memory vars = buildVars(tokenId, traits);

        // Wrap the following content:
        // 1. Double encoded CSS and DOM elements
        // 2. JS variables
        // 3. JS renderer logic
        WrappedScriptRequest[] memory requests = new WrappedScriptRequest[](3);
        requests[0].wrapType = 4;
        requests[0]
            .scriptContent = "%253Cstyle%253Ebody%257Bbackground-color%253A%2520%2523111111%253B%2520margin%253A%2520auto%253B%2520display%253A%2520grid%253B%2520grid-template-columns%253A%2520repeat%25281%252C%25201fr%2529%253B%2520grid-template-rows%253A%2520repeat%25282%252C%252010px%252C%25201fr%2529%253B%257Dcanvas%257Bborder%253A%25202px%2520solid%2520black%253B%257D%253C%252Fstyle%253E";
        requests[1].name = "";
        requests[1].wrapType = 1;
        requests[1].scriptContent = vars;

        requests[2].name = _scriptyScriptName;
        requests[2].wrapType = 0;
        requests[2].contractAddress = _scriptyStorageAddress;

        bytes memory json = abi.encodePacked(
            '{"name":"',
            "Life #",
            SmallSolady.toString(tokenId),
            '", "description":"',
            "LifeOnchain is an onchain and interactive implementation of Conway's Game of Life",
            '","image":"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjY0MCIgdmlld0JveD0iMCAwIDI1NiAyNTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6YmxhY2siPjwvc3ZnPg==',
            '","animation_url":"',
            buildAnimationURI(requests),
            '",',
            attr,
            "}"
        );

        return string(abi.encodePacked("data:application/json,", json));
    }

    /**
     * @notice Build traits attributes based on traits
     */
    function buildAttributes(
        Traits memory traits
    ) internal view returns (bytes memory attr) {
        return
            abi.encodePacked(
                '"attributes": [',
                buildTrait("speed", traitsNames[0][traits.speedIndex]),
                ",",
                buildTrait("color", traitsNames[1][traits.colorIndex]),
                ",",
                buildTrait("mode", traitsNames[2][traits.modeIndex]),
                "]"
            );
    }

    /**
     * @notice Build all vars
     */
    function buildVars(
        uint256 tokenId,
        Traits memory traits
    ) internal pure returns (bytes memory vars) {
        return
            bytes(
                SmallSolady.encode(
                    abi.encodePacked(
                        buildVar("tokenID", tokenId),
                        buildVar("speedIndex", traits.speedIndex),
                        buildVar("colorIndex", traits.colorIndex),
                        buildVar("modeIndex", traits.modeIndex)
                    )
                )
            );
    }

    /**
     * @notice Build trait metadata
     */
    function buildTrait(
        string memory key,
        string memory value
    ) internal pure returns (string memory trait) {
        return
            string.concat('{"trait_type":"', key, '","value": "', value, '"}');
    }

    /**
     * @notice Build single var
     */
    function buildVar(
        string memory key,
        uint256 value
    ) internal pure returns (bytes memory trait) {
        return
            abi.encodePacked(
                "var ",
                key,
                "=",
                SmallSolady.toString(value),
                ";"
            );
    }

    /**
     * @notice Build the final HTML with scripty
     */
    function buildAnimationURI(
        WrappedScriptRequest[] memory requests
    ) internal view returns (bytes memory html) {
        IScriptyBuilder iScriptyBuilder = IScriptyBuilder(
            _scriptyBuilderAddress
        );
        uint256 bufferSize = iScriptyBuilder.getBufferSizeForURLSafeHTMLWrapped(
            requests
        );
        return iScriptyBuilder.getHTMLWrappedURLSafe(requests, bufferSize);
    }

    /**
     * @notice Withdraw ETH balance
     */
    function withdrawBalance() external onlyOwner {
        if (address(this).balance == 0) revert ZeroBalance();
        (bool sent, ) = owner().call{value: address(this).balance}("");
        if (!sent) revert FailToWithdraw();
    }
}
