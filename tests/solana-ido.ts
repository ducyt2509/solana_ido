import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaIdo } from "../target/types/solana_ido";
import { assert } from "chai";

const sleep = (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

describe("solana-ido", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();

  const program = anchor.workspace.SolanaIdo as Program<SolanaIdo>;

  const owner = anchor.web3.Keypair.generate();
  const creator = anchor.web3.Keypair.generate();

  const CONFIG_ACCOUNT_SEED = "ido_platform_seed";

  const [configAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_ACCOUNT_SEED)],
    program.programId
  );

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .initialize(owner.publicKey, creator.publicKey)
      .rpc();
    console.log("Your transaction signature", tx);

    const configInfo = await program.account.configAccount.fetch(configAccount);

    assert.equal(configInfo.owner.toBase58(), owner.publicKey.toBase58());
    assert.equal(configInfo.creator.toBase58(), creator.publicKey.toBase58());

    await sleep(1);
    const parsedTransaction = await provider.connection.getParsedTransaction(
      tx,
      {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      }
    );
    console.log(parsedTransaction.meta.logMessages);
  });


  it("Create Pool!", async () => {
    const creator = anchor.web3.Keypair.generate();
    let poolId = "pool_123";
    let poolName = "My First Pool";
    let startTime = new anchor.BN(1780177932);
    let endTime = new anchor.BN(1788177932);
    let totalTokensAvailable = new anchor.BN(1000000);
    let price = new anchor.BN(100);
    let tokenAddress = anchor.web3.Keypair.generate().publicKey;
    let maxPerUser = new anchor.BN(1000);


    // Airdrop Sol cho creator để đảm bảo có đủ phí giao dịch
    await provider.connection.requestAirdrop(creator.publicKey, 2_227_200); // Airdrop số lượng lamports cần thiết
    await provider.connection.confirmTransaction(await provider.connection.requestAirdrop(creator.publicKey, 2_227_200));
    // Gọi hàm createPool
    const tx = await program.methods.createPool(
      poolId, poolName, startTime, endTime, totalTokensAvailable, price, tokenAddress, maxPerUser,
    ).accounts({
      creator: creator.publicKey,
    }).signers([creator]).rpc()

    console.log("Transaction Signature:", tx);

    // Tạo poolAccount từ seed
    const CONFIG_CREATE_POOL = "ido_create_pool";
    const [poolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(CONFIG_CREATE_POOL),
        creator.publicKey.toBuffer(),
        Buffer.from(poolId)
      ],
      program.programId
    );

    // Chờ xác nhận giao dịch
    await provider.connection.confirmTransaction(tx, "confirmed");

    // Fetch thông tin poolConfig sau khi giao dịch được xác nhận
    const poolConfig = await program.account.pool.fetch(poolAccount);
    console.log("Pool Config:", {
      poolId: poolConfig.poolId,
      poolName: poolConfig.poolName,
      creator: poolConfig.creator.toBase58(),
      startTime: poolConfig.startTime.toString(),
      endTime: poolConfig.endTime.toString(),
      totalTokensAvailable: poolConfig.totalTokensAvailable.toString(),
      price: poolConfig.price.toString(),
      tokenAddress: poolConfig.tokenAddress.toBase58(),
      maxPerUser: poolConfig.maxPerUser.toString(),
    });

    // Kiểm tra các thông tin trong poolConfig
    assert.equal(poolConfig.poolId, poolId, "Pool ID should match.");
    assert.equal(poolConfig.poolName, poolName, "Pool Name should match.");
    assert.equal(poolConfig.creator.toBase58(), creator.publicKey.toBase58(), "Creator should match.");
    assert.equal(poolConfig.startTime.toString(), startTime.toString(), "Start time should match.");
    assert.equal(poolConfig.endTime.toString(), endTime.toString(), "End time should match.");
    assert.equal(poolConfig.totalTokensAvailable.toString(), totalTokensAvailable.toString(), "Total tokens available should match.");
    assert.equal(poolConfig.price.toString(), price.toString(), "Price should match.");
    assert.equal(poolConfig.tokenAddress.toBase58(), tokenAddress.toBase58(), "Token address should match.");
    assert.equal(poolConfig.maxPerUser.toString(), maxPerUser.toString(), "Max per user should match.");
  });

  // it("Start time in the past should fail", async () => {
  //   const creator = anchor.web3.Keypair.generate();
  //   let poolId = "pool_1234";
  //   let poolName = "My First Pool_1";
  //   let startTime = new anchor.BN(Date.now() / 1000 - 3600); // Thời gian bắt đầu trong quá khứ
  //   let endTime = new anchor.BN(Date.now() / 1000 + 3600); // Thời gian kết thúc trong tương lai
  //   let totalTokensAvailable = new anchor.BN(1000000);
  //   let price = new anchor.BN(100);
  //   let tokenAddress = anchor.web3.Keypair.generate().publicKey;
  //   let maxPerUser = new anchor.BN(1000);

  //   await provider.connection.requestAirdrop(creator.publicKey, 2_227_200); // Airdrop số lượng lamports cần thiết
  //   await provider.connection.confirmTransaction(await provider.connection.requestAirdrop(creator.publicKey, 2_227_200));

  //   try {
  //     // Gọi hàm createPool với startTime trong quá khứ
  //     await program.methods.createPool(
  //       poolId, poolName, startTime, endTime, totalTokensAvailable, price, tokenAddress, maxPerUser,
  //     ).accounts({
  //       creator: creator.publicKey,
  //     }).signers([creator]).rpc();
  //   } catch (error) {
  //     console.log("Expected error:", error.error.errorMessage);
  //     assert.include(error.error.errorMessage, "Start time cannot be in the past.",);
  //   }

  // });
})
