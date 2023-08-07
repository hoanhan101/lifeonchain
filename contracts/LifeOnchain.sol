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

    string[][3] traitsNames;
    bytes32 traitsRaritiesHash;

    uint8[][46] thumbnailsDNAs;
    string[][16] thumbnailsColors;

    mapping(uint256 => uint256) foundTraits;
    mapping(uint256 => Traits) livesTraits;

    error MintClosed();
    error ContractMinter();
    error SoldOut();
    error InsufficientFunds();
    error TokenDoesntExist();
    error ZeroBalance();
    error FailToWithdraw();
    error InvalidTraits();

    constructor(
        string memory name,
        string memory symbol,
        uint256 supply,
        string memory scriptyScriptName,
        address scriptyStorageAddress,
        address scriptyBuilderAddress,
        bytes32 _traitsRaritiesHash
    ) ERC721A(name, symbol) {
        _scriptyScriptName = scriptyScriptName;
        _scriptyStorageAddress = scriptyStorageAddress;
        _scriptyBuilderAddress = scriptyBuilderAddress;
        traitsRaritiesHash = _traitsRaritiesHash;

        _supply = supply;

        traitsNames[0] = [
            "blistering",
            "sluggish",
            "rapid",
            "leisurely",
            "swift",
            "moderate"
        ];
        traitsNames[1] = [
            "rainbow",
            "1337",
            "matrix green",
            "acid burn",
            "hacker black",
            "neon pink",
            "hackerman blue",
            "cyberpunk",
            "ghost in the shell",
            "lime green",
            "cyber purple",
            "cylon red",
            "darknet red",
            "cyber yellow",
            "circuit board",
            "hacker green"
        ];
        traitsNames[2] = [
            "yinyang",
            "mayan bricks",
            "honey comb",
            "venetian blinds",
            "greyship",
            "pi heptomino shuttle",
            "chicken wire",
            "lightspeed bubble",
            "negative spaceship",
            "venetian blinds oscillator",
            "piorbital",
            "honey farm hassler",
            "toad flipper",
            "growing spaceship",
            "houndstooth",
            "bubble",
            "lightspeed oscillator",
            "lumps of muck hassler",
            "halfmax",
            "die hard",
            "pi heptomino hassler",
            "totala periodic",
            "piorbital 2",
            "pi heptomino hassler 2",
            "switch engine predecessors",
            "pentomino hassler",
            "unsynthesizable oscillator",
            "prepulsar shuttle",
            "anura",
            "rake",
            "400p49",
            "b29",
            "skewed pulsar hassler",
            "106p135",
            "karelsp177",
            "gosper gun",
            "lumps of muck hassler 2",
            "quasar",
            "honey farm hassler",
            "frothing puffer",
            "traffic jam",
            "spacenonfillerplus diehard",
            "against the grain",
            "diagonal wick stretcher",
            "glider gun",
            "original"
        ];

        thumbnailsDNAs = [
            [0, 0, 1, 0, 0, 1, 0, 0, 1],
            [1, 1, 1, 1, 0, 1, 1, 1, 1],
            [0, 0, 0, 0, 1, 0, 0, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0],
            [1, 0, 1, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0, 1, 1, 1, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0],
            [1, 0, 0, 1, 1, 0, 1, 0, 0],
            [1, 1, 1, 0, 0, 0, 1, 1, 1],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 0, 0, 0, 1, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0],
            [1, 1, 0, 0, 0, 0, 1, 1, 0],
            [1, 0, 1, 1, 0, 0, 1, 1, 1],
            [0, 0, 0, 1, 0, 0, 0, 0, 0],
            [1, 1, 0, 1, 0, 1, 0, 1, 1],
            [0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 0, 1, 1, 0, 1],
            [0, 1, 1, 0, 1, 0, 1, 1, 0],
            [0, 0, 1, 0, 1, 0, 1, 0, 0],
            [1, 1, 0, 1, 1, 0, 0, 0, 0],
            [0, 1, 0, 0, 1, 1, 0, 1, 0],
            [1, 0, 1, 0, 0, 0, 1, 0, 1],
            [0, 1, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 1, 0],
            [1, 0, 0, 0, 0, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 1, 0],
            [0, 1, 1, 0, 0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1, 0, 1, 0, 1],
            [0, 1, 1, 1, 0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 1],
            [0, 0, 0, 1, 0, 1, 1, 1, 0],
            [1, 1, 0, 0, 0, 0, 0, 1, 0],
            [0, 1, 0, 1, 1, 1, 0, 1, 0],
            [0, 1, 0, 0, 0, 1, 0, 1, 0],
            [0, 0, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 0, 0, 0, 0, 1, 0],
            [1, 0, 1, 0, 0, 1, 1, 0, 0],
            [0, 0, 0, 1, 0, 1, 0, 0, 0],
            [0, 1, 0, 1, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 1, 0, 0, 0, 1]
        ];

        thumbnailsColors = [
            ["#000000", "#000000"],
            ["#4dff4d", "#000000"],
            ["#00ff00", "#0f701e"],
            ["#00ffff", "#04af6d"],
            ["#1c1c1c", "#000000"],
            ["#00ff00", "#ff0090"],
            ["#ffffff", "#1e90ff"],
            ["#00ff00", "#ff00ff"],
            ["#1c1c1c", "#ff6a00"],
            ["#000000", "#00ff7f"],
            ["#00ffff", "#8a2be2"],
            ["#00ff00", "#c21e56"],
            ["#00ff00", "#a62b2b"],
            ["#000000", "#f9dc24"],
            ["#00ff7f", "#7f00ff"],
            ["#000000", "#4dff4d"]
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
    function mint(
        uint256 amount,
        uint256[][] calldata traitsRarities
    ) public payable {
        if (!_isOpen) revert MintClosed();
        if (msg.sender != tx.origin) revert ContractMinter();
        if (msg.value < (_price * amount)) revert InsufficientFunds();
        if (keccak256(abi.encode(traitsRarities)) != traitsRaritiesHash)
            revert InvalidTraits();
        uint totalMinted = _totalMinted();
        unchecked {
            if ((totalMinted + amount) > _supply) revert SoldOut();
        }

        setTraitsCombination(totalMinted, amount, traitsRarities);

        _safeMint(msg.sender, amount, "");
    }

    /**
     * @notice Get an unique DNA for a given token ID
     */
    function setTraitsCombination(
        uint256 startTokenId,
        uint256 amount,
        uint256[][] calldata traitsRarities
    ) internal {
        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(block.prevrandao, startTokenId, address(this))
            )
        );

        uint256 currentTokenId = startTokenId;
        uint256[] calldata speedRarities = traitsRarities[0];
        uint256[] calldata colorRarities = traitsRarities[1];
        uint256[] calldata modeRarities = traitsRarities[2];
        uint256 combination;

        Traits memory traits;
        while (true) {
            traits.speedIndex = getRandomTraitIndex(speedRarities, seed);
            traits.colorIndex = getRandomTraitIndex(colorRarities, seed >> 16);
            traits.modeIndex = getRandomTraitIndex(modeRarities, seed >> 32);

            combination =
                (uint256(traits.speedIndex) << 32) |
                (uint256(traits.colorIndex) << 16) |
                uint256(traits.modeIndex);
            if (foundTraits[combination] == 0) {
                foundTraits[combination] = 1;
                livesTraits[currentTokenId] = traits;

                unchecked {
                    ++currentTokenId;
                    if (currentTokenId > (startTokenId + amount)) break;
                }
            }
            seed = uint256(keccak256(abi.encode(seed)));
        }
    }

    /**
     * @notice Get random trait index based on seed
     * Inspired by Anonymice (0xbad6186e92002e312078b5a1dafd5ddf63d3f731)
     */
    function getRandomTraitIndex(
        uint256[] calldata traitRarities,
        uint256 seed
    ) private pure returns (uint16 index) {
        uint256 rand = seed % 10000;
        uint256 lowerBound;
        uint256 upperBound;
        uint256 percentage;

        for (uint256 i; i < traitRarities.length; ) {
            percentage = traitRarities[i];
            upperBound = lowerBound + percentage;

            if (rand >= lowerBound && rand < upperBound) {
                return uint16(i);
            }

            unchecked {
                lowerBound += percentage;
                ++i;
            }
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
            .scriptContent = "%253Cstyle%253Ebody%257Bbackground-color%253A%2520%2523111111%253B%2520margin%253A%2520auto%253B%2520display%253A%2520grid%253B%2520grid-template-columns%253A%2520repeat%25281%252C%25201fr%2529%253B%2520grid-template-rows%253A%2520repeat%25282%252C%252010px%252C%25201fr%2529%253B%257D%253C%252Fstyle%253E";
        requests[1].name = "";
        requests[1].wrapType = 1;
        requests[1].scriptContent = vars;

        requests[2].name = _scriptyScriptName;
        requests[2].wrapType = 0;
        requests[2].contractAddress = _scriptyStorageAddress;

        bytes memory json = abi.encodePacked(
            '{"name":"',
            traitsNames[2][traits.modeIndex],
            " #",
            SmallSolady.toString(tokenId),
            '", "description":"',
            "LIFEONCHAIN is an onchain and interactive implementation of Conway's Game of Life with a twist. There are 333 pieces in total. Each piece is created randomly among 46 modes, 16 colors and 6 speed settings. All start out simple. Some grow and expand indefinitely. Some stabilize overtime. Some just freeze. To interact with the piece, click on it, drag & drop to create life. Observe the change. A tiny change can produce a vastly difference result. Complexity arises from simplicity. Different screen sizes also affect how the simulation evoles.",
            '","image":"data:image/svg+xml;base64,',
            buildThumbnail(traits),
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
     * @notice Build thumbnail
     */
    function buildThumbnail(
        Traits memory traits
    ) internal view returns (string memory thumbnail) {
        string memory body;
        uint8 counter;
        string[3] memory spacing = ["0%", "33.33%", "66.66%"];
        for (uint8 i = 0; i < 3; i++) {
            for (uint j = 0; j < 3; j++) {
                body = string(
                    abi.encodePacked(
                        body,
                        '<rect x="',
                        spacing[j],
                        '" y="',
                        spacing[i],
                        '" width="33.33%" height="33.33%" fill="',
                        thumbnailsColors[traits.colorIndex][
                            thumbnailsDNAs[traits.modeIndex][counter]
                        ],
                        '" />'
                    )
                );
                ++counter;
            }
        }
        return
            SmallSolady.encode(
                abi.encodePacked(
                    '<svg width="100%" height="100%" viewBox="0 0 20000 20000" xmlns="http://www.w3.org/2000/svg">',
                    body,
                    "</svg>"
                )
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
