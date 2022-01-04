import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployContract, Fixture } from "ethereum-waffle";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { UnipilotFactory, UnipilotVault } from "../../typechain";
import { UniswapV3Deployer } from "../UniswapV3Deployer";
import { deployUniswapContracts, deployWETH9 } from "../stubs";
import hre from "hardhat";

const deployWeth9 = async (wallet0: SignerWithAddress) => {
  let WETH9 = await deployWETH9(wallet0);
  return WETH9;
};

const deployUniswapFactory = async (wallet0: SignerWithAddress) => {
  let WETH9 = await deployWeth9(wallet0);
  let uniswapv3Contracts = await deployUniswapContracts(wallet0, WETH9);
  console.log("uniswapv3COntracts factory", uniswapv3Contracts.factory.address);
  return uniswapv3Contracts.factory.address;
};

interface UNIPILOT_FACTORY_FIXTURE {
  unipilotFactory: UnipilotFactory;
}

async function unipilotFactoryFixture(
  deployer: SignerWithAddress,
  uniswapV3Factory: string,
  uniStrategy: string,
): Promise<UNIPILOT_FACTORY_FIXTURE> {
  const unipilotFactoryDep = await ethers.getContractFactory("UnipilotFactory");
  const unipilotFactory = (await unipilotFactoryDep.deploy(
    uniswapV3Factory,
    deployer.address,
    uniStrategy,
  )) as UnipilotFactory;
  return { unipilotFactory };
}

interface UNIPILOT_VAULT_FIXTURE extends UNIPILOT_FACTORY_FIXTURE {
  createVault(
    tokenA: string,
    tokenB: string,
    fee: number,
    sqrtPrice: number,
    tokenName: string,
    tokenSymbol: string,
  ): Promise<UnipilotVault>;
}

export const unipilotVaultFixture: Fixture<UNIPILOT_VAULT_FIXTURE> =
  async function (): Promise<UNIPILOT_VAULT_FIXTURE> {
    let [wallet0, wallet1] = await hre.ethers.getSigners();
    const uniswapV3Factory = await deployUniswapFactory(wallet0);
    const { unipilotFactory } = await unipilotFactoryFixture(
      wallet0,
      uniswapV3Factory,
      "",
    );

    const unipilotVaultDep = await ethers.getContractFactory("UnipilotVault");

    return {
      unipilotFactory,
      createVault: async (
        tokenA,
        tokenB,
        fee,
        sqrtPrice,
        tokenName,
        tokenSymbol,
      ) => {
        const tx = await unipilotFactory.createVault(
          tokenA,
          tokenB,
          fee,
          sqrtPrice,
          tokenName,
          tokenSymbol,
        );
        const receipt = await tx.wait();
        const vaultAddress = receipt.events?.[0].args?._vault as string;
        return unipilotVaultDep.attach(vaultAddress) as UnipilotVault;
      },
    };
  };
