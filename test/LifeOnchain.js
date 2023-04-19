const path = require("path");
const { expect } = require("chai");

const utilities = require("../utils/utils");
const { randomInt } = require("crypto");

describe("LifeOnchain", function () {
    async function deploy() {
        const contractCodeName = "LifeOnchain";
        const contractName = "LifeOnchain";
        const contractSymbol = "LIFE";
        const contractSupply = 333;

        const scriptName = "lifeonchain";
        const scriptVersion = "1.0.0";
        const contractScriptName = `${scriptName}-v${scriptVersion}`;

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
            scriptyBuilderContract.address
        );
        await lifeContract.deployed();

        return {
            lifeContract,
            contractScriptName,
        };
    }

    describe("Upon deployment", function () {
        it("Matching script name", async function () {
            const { lifeContract } = await deploy();
            expect(await lifeContract._scriptyScriptName()).to.equal(
                "lifeonchain-v1.0.0"
            );
        });

        it("Minting status", async function () {
            const { lifeContract } = await deploy();
            expect(await lifeContract._isOpen()).to.equal(false);
        });
    });

    describe("Mint", function () {
        it("Single", async function () {
            const { lifeContract, contractScriptName } = await deploy();

            await expect(
                lifeContract.mint({
                    value: ethers.utils.parseEther("0.1"),
                })
            ).to.be.revertedWithCustomError(lifeContract, "MintClosed");

            await lifeContract.setMintStatus(true);

            expect(await lifeContract.totalSupply()).to.equal(0);

            await expect(
                lifeContract.mint({
                    value: ethers.utils.parseEther("0.0001"),
                })
            ).to.be.revertedWithCustomError(lifeContract, "InsufficientFunds");

            expect(await lifeContract.totalSupply()).to.equal(0);

            await expect(
                lifeContract.mint({
                    value: ethers.utils.parseEther("1"),
                })
            );

            expect(await lifeContract.totalSupply()).to.equal(1);

            const tokenURI = await lifeContract.tokenURI(0);
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

        // it("Multiple", async function () {
        //     const { lifeContract, contractScriptName } = await deploy();

        //     await lifeContract.setMintStatus(true);

        //     for (let i = 0; i < 10; i++) {
        //         console.log("multiple", i);
        //         await expect(
        //             lifeContract.mint({
        //                 value: ethers.utils.parseEther("1"),
        //             })
        //         );

        //         const tokenURI = await lifeContract.tokenURI(i);
        //         const payload = JSON.parse(
        //             tokenURI.split("data:application/json,")[1]
        //         );
        //         const content = decodeURIComponent(
        //             decodeURIComponent(payload.animation_url)
        //         ).split("data:text/html,")[1];

        //         const scriptFilePath = path.join(
        //             __dirname,
        //             `../scripts/${contractScriptName}.js`
        //         );
        //         const scriptFileContent = utilities.readFile(scriptFilePath);
        //         const final = [
        //             "<!DOCTYPE html><html><head><title>1337c475</title></head>",
        //             content.replace(
        //                 '<script src="data:text/javascript;base64,"></script>',
        //                 `<script>${scriptFileContent}</script>`
        //             ),
        //             "</html>",
        //         ].join("");

        //         utilities.writeFile(
        //             path.join(__dirname, `output-mutiple-${i}.html`),
        //             final
        //         );
        //     }
        // });
    });
});
