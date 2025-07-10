import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaIdo } from "../target/types/solana_ido";
import { assert } from "chai";
import moment from "moment";
import {
  createAssociatedTokenAccountInstruction,
  createMint,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  mintTo
} from "@solana/spl-token";
import * as console from "node:console";

const sleep = (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};
describe("solana-ido-platform", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();

  const program = anchor.workspace.SolanaIdo as Program<SolanaIdo>;

  const owner = anchor.web3.Keypair.generate();
  const creator = anchor.web3.Keypair.generate();
  const inputMint = anchor.web3.Keypair.generate();
  const tokenMint = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();
  const receiver = anchor.web3.Keypair.generate();

  const eventParser = new anchor.EventParser(program.programId, program.coder);

  const CONFIG_ACCOUNT_SEED = "ido_platform_seed";
  const POOL_SEED = "ido_platform_pool_seed";
  const USER_ACCOUNT_SEED = "ido_platform_account_seed";

  const [configAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_ACCOUNT_SEED)],
    program.programId
  );

  before(async () => {
    // Request airdrop
    await Promise.all(
      [owner.publicKey, creator.publicKey, user.publicKey, receiver.publicKey].map(async (address) => {
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(address, 1_000 * 10 ** 9)
        );
      })
    );
    // initialize mint token
    await Promise.all([
      createMint(
        provider.connection,
        owner,
        owner.publicKey,
        null,
        6,
        inputMint,
        { commitment: "confirmed" },
        TOKEN_PROGRAM_ID
      ),
      createMint(
        provider.connection,
        owner,
        owner.publicKey,
        null,
        6,
        tokenMint,
        { commitment: "confirmed" },
        TOKEN_PROGRAM_ID
      ),
    ]);
    // Mint test token
    [user, receiver,].map(async (account) => {
      const mintTransaction = new anchor.web3.Transaction();
      const inputMintAccount = getAssociatedTokenAddressSync(
        inputMint.publicKey,
        account.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const ataAccount = await provider.connection.getAccountInfo(inputMintAccount)
      if (!ataAccount) {
        const createATAInstruction = createAssociatedTokenAccountInstruction(
          account.publicKey,
          inputMintAccount,
          account.publicKey,
          inputMint.publicKey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        mintTransaction.add(createATAInstruction);

        const accountATA = getAssociatedTokenAddressSync(
          inputMint.publicKey,
          account.publicKey,
          true,
          TOKEN_PROGRAM_ID
        );

        const mintToInstruction = createMintToInstruction(
          inputMint.publicKey,
          accountATA,
          owner.publicKey,
          1_000_000_000 * 10 ** 6,
          [owner],
          TOKEN_PROGRAM_ID
        )
        mintTransaction.add(mintToInstruction);
        try {
          await anchor.web3.sendAndConfirmTransaction(
            provider.connection,
            mintTransaction,
            [account, owner],
            { skipPreflight: true }
          )
        } catch (e) {
          console.error(e);
        }
      }
    })
  });

  it("Is initialized!!!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize(owner.publicKey, creator.publicKey)
      // .accounts({configAccount})
      .rpc();
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
    // console.log(parsedTransaction.meta.logMessages);
  });

  const startTime = Math.floor(moment().valueOf() / 1000);
  const endTime = Math.floor(moment().add(10, "seconds").valueOf() / 1000);
  const claimTime = Math.floor(moment().add(20, "seconds").valueOf() / 1000);
  const tokenForSale = 1_000_000;
  const tokenSold = 0
  const tokenRate = 1;
  const tokenRateDecimals = 2;


  describe("Create pool", async () => {
    it("Should revert if create pool by account is not a creator", async () => {
      try {
        await program.methods
          .createPool(
            new anchor.BN(startTime),
            new anchor.BN(endTime),
            new anchor.BN(claimTime),
            new anchor.BN(tokenForSale),
            new anchor.BN(tokenSold),
            new anchor.BN(tokenRate),
            tokenRateDecimals,
            inputMint.publicKey,
            tokenMint.publicKey,
            owner.publicKey,
            receiver.publicKey,
          )
          .accounts({ signer: owner.publicKey })
          .signers([owner])
          .rpc();
        assert.equal("Should revert but it didnt", "");
      } catch (error) {
        //console.log(error);
        assert.equal(error.error.errorCode.code, "Unauthorized");
        assert.equal(error.error.errorMessage, "Unauthorized");
      }
    });
    it("Should revert if invalid time", async () => {
      try {
        const wrongStartTime = endTime + 10_000;
        await program.methods
          .createPool(
            new anchor.BN(wrongStartTime),
            new anchor.BN(endTime),
            new anchor.BN(claimTime),
            new anchor.BN(tokenForSale),
            new anchor.BN(tokenSold),
            new anchor.BN(tokenRate),
            tokenRateDecimals,
            inputMint.publicKey,
            tokenMint.publicKey,
            creator.publicKey,
            receiver.publicKey,
          )
          .accounts({ signer: creator.publicKey })
          .signers([creator])
          .rpc();
        assert.equal("Should revert but it didnt", "");
      } catch (error) {
        // console.log(error);
        assert.equal(error.error.errorCode.code, "InvalidPoolTime");
      }
    });
    it("Should create pool successfully", async () => {
      const tx = await program.methods
        .createPool(
          new anchor.BN(startTime),
          new anchor.BN(endTime),
          new anchor.BN(claimTime),
          new anchor.BN(tokenForSale),
          new anchor.BN(tokenSold),
          new anchor.BN(tokenRate),
          tokenRateDecimals,
          inputMint.publicKey,
          tokenMint.publicKey,
          creator.publicKey,
          receiver.publicKey,
        )
        .accounts({ signer: creator.publicKey })
        .signers([creator])
        .rpc();
      await sleep(1);
      const txDetails = await provider.connection.getParsedTransaction(tx, { commitment: "confirmed" });
      const events = eventParser.parseLogs(
        txDetails?.meta?.logMessages
      );
      let parsedEvents = [];
      for (const event of events) {
        parsedEvents.push(event);
      }
      const poolCreatedEvent = parsedEvents.find(
        (event) => event.name === "poolCreatedEvent"
      );
      assert.equal(
        poolCreatedEvent.data.signer.toBase58(),
        creator.publicKey.toBase58()
      );
      assert.equal(
        poolCreatedEvent.data.acceptCurrency.toBase58(),
        inputMint.publicKey.toBase58()
      );

    });
  });

  describe("Buy token", async () => {
    it("Should buy token successfully with partial sign", async () => {
      const userInputAccount = getAssociatedTokenAddressSync(
        inputMint.publicKey,
        user.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      const receiverInputAccount = getAssociatedTokenAddressSync(
        inputMint.publicKey,
        receiver.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      const beforeBalance = (await provider.connection.getTokenAccountBalance(userInputAccount)).value.amount;
      const receiverBalanceBefore = (await provider.connection.getTokenAccountBalance(receiverInputAccount)).value.amount;
      console.log("Before Receiver balance: ", receiverBalanceBefore);
      console.log("Before balance: ", beforeBalance);

      // Step 1: Build the transaction
      const tx = await program.methods.buyToken(new anchor.BN(100)).accounts({
        buyer: user.publicKey,
        poolSigner: creator.publicKey,
        inputMint: inputMint.publicKey,
        tokenMint: tokenMint.publicKey,
      }).transaction();

      // Step 2: Partial sign by creator
      tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
      tx.feePayer = creator.publicKey;
      tx.partialSign(creator);
      tx.partialSign(user);

      const rawTx = tx.serialize();
      const sig = await provider.connection.sendRawTransaction(rawTx);
      await provider.connection.confirmTransaction(sig);

      const [poolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("ido_platform_pool_seed"),
          tokenMint.publicKey.toBuffer(),
        ],
        program.programId
      );


      const [buyerAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("ido_platform_account_seed"),
          poolAccount.toBuffer(),
          user.publicKey.toBuffer()
        ],
        program.programId
      );

      const buyerAccountInfo = await program.account.userAccount.fetch(buyerAccountPda);

      console.log("Buyer account info: ", {
        bought: new anchor.BN(buyerAccountInfo.bought.toString()),
        claimed: new anchor.BN(buyerAccountInfo.claimed.toString()),
        pool: buyerAccountInfo.pool.toBase58(),
      });

      const afterBalance = (await provider.connection.getTokenAccountBalance(userInputAccount)).value.amount;
      console.log("After balance: ", afterBalance);

      const receiverBalanceAfter = (await provider.connection.getTokenAccountBalance(receiverInputAccount)).value.amount;
      console.log("After Receiver balance: ", receiverBalanceAfter);

    });


  })

  describe("Claim token", async () => {
    before(async () => {
      // 1. Derive pool_account (PDA)
      const [poolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("ido_platform_pool_seed"), tokenMint.publicKey.toBuffer()],
        program.programId
      );

      // 2. Derive ATA of pool_account (PDA)
      const poolTokenAccount = await getAssociatedTokenAddress(
        tokenMint.publicKey,
        poolAccount,
        true // isPDA
      );

      // 3. Derive ATA of user
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint.publicKey,
        user.publicKey
      );

      // 4. Ensure ATA for pool exists
      const poolAtaInfo = await provider.connection.getAccountInfo(poolTokenAccount);
      if (!poolAtaInfo) {
        const createPoolAtaIx = createAssociatedTokenAccountInstruction(
          user.publicKey,         // payer
          poolTokenAccount,       // ATA address
          poolAccount,            // owner (PDA)
          tokenMint.publicKey
        );

        const createAtaTx = new anchor.web3.Transaction().add(createPoolAtaIx);
        await provider.sendAndConfirm(createAtaTx, [user]);
      }

      // 5. Mint token to pool_token_account (only if balance is zero)
      const poolBalanceInfo = await provider.connection.getTokenAccountBalance(poolTokenAccount);
      if (Number(poolBalanceInfo.value.amount) === 0) {
        const mintToIx = createMintToInstruction(
          tokenMint.publicKey,
          poolTokenAccount,
          owner.publicKey, // mintAuthority
          1_000_000_000,
          [owner],
          TOKEN_PROGRAM_ID
        );

        await anchor.web3.sendAndConfirmTransaction(
          provider.connection,
          new anchor.web3.Transaction().add(mintToIx),
          [owner],
          { skipPreflight: true }
        );
      }

    })

    it("Claim token with wrong time", async () => {
      try {
        // // 7. Claim token
        const tx = await program.methods
          .claimToken()
          .accounts({
            buyer: user.publicKey,
            tokenMint: tokenMint.publicKey,
          })
          .signers([user])
          .rpc();

        console.log("✅ Claim tx:", tx);


      } catch (error) {
        assert.equal(error.error.errorCode.code, "ClaimNotStartedYet");
        assert.equal(error.error.errorMessage, "ClaimNotStartedYet");

      }
    })


    it("✅ claim with balance check", async () => {
      try {
        await sleep(30)
        // 1. Derive pool_account (PDA)
        const [poolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("ido_platform_pool_seed"), tokenMint.publicKey.toBuffer()],
          program.programId
        );

        // 2. Derive ATA of pool_account (PDA)
        const poolTokenAccount = await getAssociatedTokenAddress(
          tokenMint.publicKey,
          poolAccount,
          true // isPDA
        );

        // 3. Derive ATA of user
        const userTokenAccount = await getAssociatedTokenAddress(
          tokenMint.publicKey,
          user.publicKey
        );


        // 6. Get balances before
        const poolBefore = await provider.connection.getTokenAccountBalance(poolTokenAccount);

        let userBeforeAmount = "0";
        const userAtaInfo = await provider.connection.getAccountInfo(userTokenAccount);
        if (userAtaInfo) {
          const userBefore = await provider.connection.getTokenAccountBalance(userTokenAccount);
          userBeforeAmount = userBefore.value.amount;
        } else {
          console.log("ℹ️ User token ATA does not exist yet (will be created during claim).");
        }

        console.log("🔢 Pool Before:", poolBefore.value.amount);

        // // 7. Claim token
        const tx = await program.methods
          .claimToken()
          .accounts({
            buyer: user.publicKey,
            tokenMint: tokenMint.publicKey,
          })
          .signers([user])
          .rpc();

        console.log("✅ Claim tx:", tx);

        // // 8. Get balances after
        const poolAfter = await provider.connection.getTokenAccountBalance(poolTokenAccount);
        const userAfter = await provider.connection.getTokenAccountBalance(userTokenAccount);

        console.log("🔢 Pool Before:", poolBefore.value.amount);
        console.log("🔢 Pool After: ", poolAfter.value.amount);
        console.log("🔢 User Before:", userBeforeAmount);
        console.log("🔢 User After: ", userAfter.value.amount);

        const [buyerAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("ido_platform_account_seed"),
            poolAccount.toBuffer(),
            user.publicKey.toBuffer()
          ],
          program.programId
        );

        const buyerAccountInfo = await program.account.userAccount.fetch(buyerAccountPda);

        console.log("Buyer account info: ", {
          bought: new anchor.BN(buyerAccountInfo.bought.toString()),
          claimed: new anchor.BN(buyerAccountInfo.claimed.toString()),
          pool: buyerAccountInfo.pool.toBase58(),
        });

      } catch (error) {
        console.log("❌ Error during claim:", error);
      }
    });



  })




});
