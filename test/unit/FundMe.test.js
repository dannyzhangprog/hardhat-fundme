const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { assert, expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe Contract Tests", function () {
      let fundMe, fundMeUser;
      let deployer, user;
      let mockV3Aggregator;

      beforeEach(async function () {
        // 1. 部署所有合约
        await deployments.fixture(["all"]);
        
        // 2. 获取命名账户
        const { deployer: deployerAcc, user: userAcc } = await getNamedAccounts();
        deployer = deployerAcc;
        user = userAcc;

        // 3. 获取合约部署信息
        const fundMeDeployment = await deployments.get("FundMe");
        mockV3Aggregator = await deployments.get("MockV3Aggregator");

        // 4. 初始化合约实例
        fundMe = await ethers.getContractAt(
          "FundMe",
          fundMeDeployment.address,
          await ethers.getSigner(deployer)
        );

        // 5. 初始化用户账户实例
        const userSigner = await ethers.getSigner(user);
        fundMeUser = fundMe.connect(userSigner);
      });

      /* ========== 基础校验测试 ========== */
      describe("Basic Checks", function () {
        it("应该正确设置合约所有者", async function () {
          assert.equal(await fundMe.owner(), deployer);
        });

        it("应该正确分配价格预言机地址", async function () {
          assert.equal(await fundMe.dataFeed(), mockV3Aggregator.address);
        });
      });

      /* ========== 资金募集功能测试 ========== */
      describe("Fund Functionality", function () {
        it("当募集窗口关闭时，应拒绝资金存入", async function () {
          // 推进时间超过窗口期
          await helpers.time.increase(200);
          await helpers.mine();
          
          await expect(fundMe.fund({ value: ethers.parseEther("0.1") }))
            .to.be.revertedWith("WindowClosed");
        });

        it("当存入金额低于最低限额时，应拒绝交易", async function () {
          await expect(fundMe.fund({ value: ethers.parseEther("0.01") }))
            .to.be.revertedWith("BelowMinAmount");
        });

        it("当参数有效时，应成功记录资金", async function () {
          // 执行有效存款
          const fundAmount = ethers.parseEther("0.1");
          await fundMe.fund({ value: fundAmount });

          // 验证资金记录
          const recordedAmount = await fundMe.fundersToAmount(deployer);
          assert.equal(recordedAmount.toString(), fundAmount.toString());
        });
      });

      /* ========== 资金提取功能测试 ========== */
      describe("Withdraw Functionality", function () {
        beforeEach(async function () {
          // 公共前置条件：达到目标金额
          await fundMe.fund({ value: ethers.parseEther("1") });
        });

        it("非所有者调用应被拒绝", async function () {
          await helpers.time.increase(200);
          await helpers.mine();
          
          await expect(fundMeUser.getFund())
            .to.be.revertedWith("Unauthorized");
        });

        it("当窗口未关闭时，应拒绝提取", async function () {
          await expect(fundMe.getFund())
            .to.be.revertedWith("WindowNotClosed");
        });

        it("当目标未达成时，应拒绝提取", async function () {
          // 重置测试场景
          await deployments.fixture(["all"]);
          await fundMe.fund({ value: ethers.parseEther("0.5") }); // 未达目标
          
          await helpers.time.increase(200);
          await helpers.mine();
          
          await expect(fundMe.getFund())
            .to.be.revertedWith("TargetNotReached");
        });

        it("当条件满足时，应成功提取资金并触发事件", async function () {
          // 推进时间并验证提取
          await helpers.time.increase(200);
          await helpers.mine();
          
          await expect(fundMe.getFund())
            .to.emit(fundMe, "FundsWithdrawn")
            .withArgs(ethers.parseEther("1"));
        });
      });

      /* ========== 资金退款功能测试 ========== */
      describe("Refund Functionality", function () {
        beforeEach(async function () {
          // 公共前置条件：存入资金但未达目标
          await fundMe.fund({ value: ethers.parseEther("0.1") });
        });

        it("当窗口未关闭时，应拒绝退款", async function () {
          await expect(fundMe.refund())
            .to.be.revertedWith("WindowNotClosed");
        });

        it("当目标达成时，应拒绝退款", async function () {
          // 达成目标
          await fundMe.fund({ value: ethers.parseEther("0.9") });
          
          await helpers.time.increase(200);
          await helpers.mine();
          
          await expect(fundMe.refund())
            .to.be.revertedWith("TargetReached");
        });

        it("当无存款记录时，应拒绝退款", async function () {
          await helpers.time.increase(200);
          await helpers.mine();
          
          await expect(fundMeUser.refund()) // 使用未存款账户
            .to.be.revertedWith("NoFundsAvailable");
        });

        it("当条件满足时，应成功退款并触发事件", async function () {
          // 推进时间并验证退款
          await helpers.time.increase(200);
          await helpers.mine();
          
          await expect(fundMe.refund())
            .to.emit(fundMe, "FundsRefunded")
            .withArgs(deployer, ethers.parseEther("0.1"));
        });
      });
    });