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
        const scriptVersion = "1.0.1";
        const contractScriptName = `${scriptName}-v${scriptVersion}`;

        const traitsRarities = [
            [500, 500, 1500, 2000, 2500, 3000],
            [
                125, 225, 325, 525, 525, 525, 625, 625, 625, 725, 825, 825, 825,
                825, 925, 925,
            ],
            [200, 500, 700, 800, 800, 900, 1000, 1000, 1200, 1300, 1600],
        ];
        const traitsRaritiesHash =
            "0x43252ab79379691f924d20ae52eae95ea7897214a8cc7f8f475ef571bc4bc022";

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
        };
    }

    describe("Upon deployment", function () {
        it("Matching script name", async function () {
            const { lifeContract } = await deploy();
            expect(await lifeContract._scriptyScriptName()).to.equal(
                "lifeonchain-v1.0.1"
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
            const { lifeContract, contractScriptName, traitsRarities } =
                await deploy();

            await lifeContract.setMintStatus(true);

            const toMint = 10;
            await expect(
                lifeContract.mint(toMint, traitsRarities, {
                    value: ethers.utils.parseEther("1"),
                })
            );
            expect(await lifeContract.totalSupply()).to.equal(toMint);

            for (let i = 0; i < toMint; i++) {
                console.log(`tokenURI(${i})`);
                const tokenURI = await lifeContract.tokenURI(i);
                const payload = JSON.parse(
                    tokenURI.split("data:application/json,")[1]
                );
                const content = decodeURIComponent(
                    decodeURIComponent(payload.animation_url)
                ).split("data:text/html,")[1];

                const scriptFilePath = path.join(
                    __dirname,
                    `../scripts/${contractScriptName}.js`
                );
                const scriptFileContent = utilities.readFile(scriptFilePath);
                const final = [
                    "<!DOCTYPE html><html><head><title>1337c475</title></head>",
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
