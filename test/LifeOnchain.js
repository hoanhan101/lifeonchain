const path = require("path");
const { expect } = require("chai");

const utilities = require("../utils/utils");
const { randomInt } = require("crypto");

describe("LifeOnchain", function () {
    async function deploy() {
        const contractCodeName = "LifeOnchain";
        const contractName = "LIFEONCHAIN";
        const contractSymbol = "LIFE";
        const contractSupply = 333;

        const scriptName = "lifeonchain";
        const scriptVersion = "1.4.0";
        const contractScriptName = `${scriptName}-v${scriptVersion}`;

        const traitsRarities = [
            [500, 500, 1500, 2000, 2500, 3000],
            [
                125, 225, 325, 425, 500, 550, 600, 625, 650, 715, 755, 835, 855,
                915, 925, 975,
            ],
            [
                10, 10, 10, 20, 20, 20, 30, 40, 40, 50, 60, 70, 80, 90, 100,
                120, 130, 140, 150, 160, 170, 190, 240, 240, 250, 260, 270, 280,
                290, 300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 410,
                420, 430, 440, 450, 460,
            ],
        ];
        const traitsRaritiesHash = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
                ["uint256[][]"],
                [traitsRarities]
            )
        );
        const contentStoreContract = await (
            await ethers.getContractFactory("ContentStore")
        ).deploy();

        await contentStoreContract.deployed();
        const scriptyStorageContract = await (
            await ethers.getContractFactory("ScriptyStorage")
        ).deploy(contentStoreContract.address);
        await scriptyStorageContract.deployed();

        const scriptyBuilderContract = await (
            await ethers.getContractFactory("ScriptyBuilder")
        ).deploy();
        await scriptyBuilderContract.deployed();

        const lifeContract = await (
            await ethers.getContractFactory(contractCodeName)
        ).deploy(
            contractName,
            contractSymbol,
            contractSupply,
            contractScriptName,
            scriptyStorageContract.address,
            scriptyBuilderContract.address,
            traitsRaritiesHash
        );
        await lifeContract.deployed();

        return {
            lifeContract,
            contractScriptName,
            traitsRarities,
            traitsRaritiesHash,
            contractSupply,
        };
    }

    describe("Upon deployment", function () {
        it("Matching script name", async function () {
            const { lifeContract } = await deploy();
            expect(await lifeContract._scriptyScriptName()).to.equal(
                "lifeonchain-v1.4.0"
            );
        });

        it("Matching trait rarities hash", async function () {
            const { traitsRaritiesHash } = await deploy();
            expect(traitsRaritiesHash).to.equal(
                "0x8822b2c7dfb2ebe36b689a2290b289b4584f51decdbba4aaab1756a8e935f873"
            );
        });

        it("Minting status", async function () {
            const { lifeContract } = await deploy();
            expect(await lifeContract._isOpen()).to.equal(false);
        });
    });

    describe("Mint", function () {
        it("Single", async function () {
            const { lifeContract, contractScriptName, traitsRarities } =
                await deploy();
            await expect(
                lifeContract.mint(1, traitsRarities, {
                    value: ethers.utils.parseEther("0.1"),
                })
            ).to.be.revertedWithCustomError(lifeContract, "MintClosed");

            await lifeContract.setMintStatus(true);

            expect(await lifeContract.totalSupply()).to.equal(0);

            await expect(
                lifeContract.mint(1, traitsRarities, {
                    value: ethers.utils.parseEther("0.0001"),
                })
            ).to.be.revertedWithCustomError(lifeContract, "InsufficientFunds");

            expect(await lifeContract.totalSupply()).to.equal(0);

            await expect(
                lifeContract.mint(1, traitsRarities, {
                    value: ethers.utils.parseEther("1"),
                })
            );
            expect(await lifeContract.totalSupply()).to.equal(1);

            const tokenURI = await lifeContract.tokenURI(0);
            console.log(tokenURI.split("data:application/json,")[1]);
            const payload = JSON.parse(
                tokenURI.split("data:application/json,")[1]
            );
            console.log(payload.image);
            const content = decodeURIComponent(
                decodeURIComponent(payload.animation_url)
            ).split("data:text/html,")[1];

            const scriptFilePath = path.join(
                __dirname,
                `../scripts/${contractScriptName}.js`
            );
            const scriptFileContent = utilities.readFile(scriptFilePath);
            const final = [
                "<!DOCTYPE html><html><head><title>LifeOnchain</title></head>",
                content.replace(
                    '<script src="data:text/javascript;base64,"></script>',
                    `<script>${scriptFileContent}</script>`
                ),
                "</html>",
            ].join("");

            utilities.writeFile(
                path.join(__dirname, "output-single.html"),
                final
            );
        });

        it("Multiple", async function () {
            const {
                lifeContract,
                contractScriptName,
                traitsRarities,
                contractSupply,
            } = await deploy();

            await lifeContract.setMintStatus(true);

            const toMint = parseInt(contractSupply / 10);
            await expect(
                lifeContract.mint(toMint, traitsRarities, {
                    value: ethers.utils.parseEther("10"),
                })
            );
            expect(await lifeContract.totalSupply()).to.equal(toMint);

            for (let i = 0; i < toMint; i++) {
                console.log(`tokenURI(${i})`);
                const tokenURI = await lifeContract.tokenURI(i);
                const payload = JSON.parse(
                    tokenURI.split("data:application/json,")[1]
                );
                console.log(payload.image);
                const content = decodeURIComponent(
                    decodeURIComponent(payload.animation_url)
                ).split("data:text/html,")[1];
                console.log(content);

                const scriptFilePath = path.join(
                    __dirname,
                    `../scripts/${contractScriptName}.js`
                );
                const scriptFileContent = utilities.readFile(scriptFilePath);
                const final = [
                    "<!DOCTYPE html><html><head><title>LIFEONCHAIN</title></head>",
                    content.replace(
                        '<script src="data:text/javascript;base64,"></script>',
                        `<script>${scriptFileContent}</script>`
                    ),
                    "</html>",
                ].join("");

                utilities.writeFile(
                    path.join(__dirname, `output-mutiple-${i}.html`),
                    final
                );
            }
        });
    });
});
