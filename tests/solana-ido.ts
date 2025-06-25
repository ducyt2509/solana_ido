import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaIdo } from "../target/types/solana_ido";
import { assert } from "chai";
import moment from "moment";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';

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
  let currency = null
  const token = anchor.web3.Keypair.generate();
  const signer = anchor.web3.Keypair.generate();
  const buyer = anchor.web3.Keypair.generate();

  const eventParser = new anchor.EventParser(program.programId, program.coder);

  const CONFIG_ACCOUNT_SEED = "ido_platform_seed";
  const BUY_TOKEN_SEED = "ido_platform_buy_token_seed";

  const [configAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_ACCOUNT_SEED)],
    program.programId
  );

  before(async () => {
    await Promise.all(
      [owner.publicKey, creator.publicKey, buyer.publicKey].map(async (address) => {

        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(address, 1_000 * 10 ** 9)
        );
      })
    );


    currency = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      creator,
      currency,
      buyer.publicKey,
      true,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    await mintTo(
      provider.connection,
      creator,
      currency,
      buyerTokenAccount.address,
      creator,
      1_000_000_000, // 1000 USDT
      [],
      undefined,
      TOKEN_PROGRAM_ID
    );


  });

  it("Is initialized!", async () => {
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
    // console.log(parsedTransaction);
    if (parsedTransaction?.meta?.logMessages) {
      console.log(parsedTransaction.meta.logMessages);
    } else {
      console.log('No log messages found');
    }
  });

  const startTime = Math.floor(moment().add(10, "seconds").valueOf() / 1000);
  const endTime = Math.floor(moment().add(50, "seconds").valueOf() / 1000);
  const claimTime = Math.floor(moment().add(60, "seconds").valueOf() / 1000);
  const tokensForSale = 1_000_000;
  const tokenDecimnals = 6;
  const tokenRate = 0.1;
  const decimals = 3;

  describe("Create pool", async () => {
    // it("Should revert if create pool by account is not a creator", async () => {
    //   try {
    //     await program.methods
    //       .createPool(
    //         new anchor.BN(startTime),
    //         new anchor.BN(endTime),
    //         new anchor.BN(claimTime),
    //         new anchor.BN(tokensForSale).mul(
    //           new anchor.BN(10).pow(new anchor.BN(tokenDecimnals))
    //         ),
    //         tokenDecimnals,
    //         new anchor.BN(tokenRate).mul(
    //           new anchor.BN(10).pow(new anchor.BN(decimals))
    //         ),
    //         decimals,
    //         currency.publicKey,
    //         token.publicKey,
    //         signer.publicKey
    //       )
    //       .accounts({ signer: owner.publicKey })
    //       .signers([owner])
    //       .rpc();
    //     assert.equal("Should revert but it didnt", "");
    //   } catch (error) {
    //     assert.equal(error.error.errorCode.code, "Unauthorized");
    //     assert.equal(error.error.errorMessage, "Unauthorized");
    //   }
    // });
    // it("Should revert if invalid time (Start Time In the past )", async () => {
    //   try {

    //     await program.methods
    //       .createPool(
    //         new anchor.BN(startTime - 5000),
    //         new anchor.BN(endTime),
    //         new anchor.BN(claimTime),
    //         new anchor.BN(tokensForSale).mul(
    //           new anchor.BN(10).pow(new anchor.BN(tokenDecimnals))
    //         ),
    //         tokenDecimnals,
    //         new anchor.BN(tokenRate).mul(
    //           new anchor.BN(10).pow(new anchor.BN(decimals))
    //         ),
    //         decimals,
    //         currency.publicKey,
    //         token.publicKey,
    //         signer.publicKey
    //       )
    //       .accounts({ signer: creator.publicKey })
    //       .signers([creator])
    //       .rpc();
    //     assert.equal("Should revert but it didnt", "");
    //   } catch (error) {
    //     assert.equal(error.error.errorCode.code, "StartTimeInThePast");
    //     assert.equal(error.error.errorMessage, "Start time cannot be in the past.");
    //   }
    // });
    // it("Should revert if invalid time (End Time in the past)", async () => {
    //   try {

    //     await program.methods
    //       .createPool(
    //         new anchor.BN(startTime),
    //         new anchor.BN(endTime - 5000),
    //         new anchor.BN(claimTime),
    //         new anchor.BN(tokensForSale).mul(
    //           new anchor.BN(10).pow(new anchor.BN(tokenDecimnals))
    //         ),
    //         tokenDecimnals,
    //         new anchor.BN(tokenRate).mul(
    //           new anchor.BN(10).pow(new anchor.BN(decimals))
    //         ),
    //         decimals,
    //         currency.publicKey,
    //         token.publicKey,
    //         signer.publicKey
    //       )
    //       .accounts({ signer: creator.publicKey })
    //       .signers([creator])
    //       .rpc();
    //     assert.equal("Should revert but it didnt", "");
    //   } catch (error) {
    //     assert.equal(error.error.errorCode.code, "EndTimeInThePast");
    //     assert.equal(error.error.errorMessage, "End time cannot be in the past.");
    //   }
    // });
    // it("Should revert if invalid time (End Time < Start Time)", async () => {
    //   try {

    //     await program.methods
    //       .createPool(
    //         new anchor.BN(startTime + 5000),
    //         new anchor.BN(endTime + 4000),
    //         new anchor.BN(claimTime),
    //         new anchor.BN(tokensForSale).mul(
    //           new anchor.BN(10).pow(new anchor.BN(tokenDecimnals))
    //         ),
    //         tokenDecimnals,
    //         new anchor.BN(tokenRate).mul(
    //           new anchor.BN(10).pow(new anchor.BN(decimals))
    //         ),
    //         decimals,
    //         currency.publicKey,
    //         token.publicKey,
    //         signer.publicKey
    //       )
    //       .accounts({ signer: creator.publicKey })
    //       .signers([creator])
    //       .rpc();
    //     assert.equal("Should revert but it didnt", "");
    //   } catch (error) {
    //     assert.equal(error.error.errorCode.code, "EndTimeBeforeStartTime");
    //     assert.equal(error.error.errorMessage, "End time must be after start time.");
    //   }
    // });
    // it("Should revert if invalid time (ClaimTime in the past )", async () => {
    //   try {

    //     await program.methods
    //       .createPool(
    //         new anchor.BN(startTime),
    //         new anchor.BN(endTime),
    //         new anchor.BN(claimTime - 1000),
    //         new anchor.BN(tokensForSale).mul(
    //           new anchor.BN(10).pow(new anchor.BN(tokenDecimnals))
    //         ),
    //         tokenDecimnals,
    //         new anchor.BN(tokenRate).mul(
    //           new anchor.BN(10).pow(new anchor.BN(decimals))
    //         ),
    //         decimals,
    //         currency.publicKey,
    //         token.publicKey,
    //         signer.publicKey
    //       )
    //       .accounts({ signer: creator.publicKey })
    //       .signers([creator])
    //       .rpc();
    //     assert.equal("Should revert but it didnt", "");
    //   } catch (error) {
    //     assert.equal(error.error.errorCode.code, "ClaimTimeInThePast");
    //     assert.equal(error.error.errorMessage, "Claim time cannot be in the past.");
    //   }
    // });
    // it("Should revert if invalid time (ClaimTime < End Time )", async () => {
    //   try {
    //     await program.methods
    //       .createPool(
    //         new anchor.BN(startTime),
    //         new anchor.BN(endTime + 5000),
    //         new anchor.BN(claimTime + 4000),
    //         new anchor.BN(tokensForSale).mul(
    //           new anchor.BN(10).pow(new anchor.BN(tokenDecimnals))
    //         ),
    //         tokenDecimnals,
    //         new anchor.BN(tokenRate).mul(
    //           new anchor.BN(10).pow(new anchor.BN(decimals))
    //         ),
    //         decimals,
    //         currency.publicKey,
    //         token.publicKey,
    //         signer.publicKey
    //       )
    //       .accounts({ signer: creator.publicKey })
    //       .signers([creator])
    //       .rpc();
    //     assert.equal("Should revert but it didnt", "");
    //   } catch (error) {
    //     assert.equal(error.error.errorCode.code, "ClaimTimeBeforeEndTime");
    //     assert.equal(error.error.errorMessage, "Claim time must be after end time.");
    //   }
    // });
    it("Should create pool successfull", async () => {
      console.log(tokenRate / (10 ** decimals));
      const tx = await program.methods
        .createPool(
          new anchor.BN(startTime),
          new anchor.BN(endTime),
          new anchor.BN(claimTime),
          new anchor.BN(tokensForSale).mul(
            new anchor.BN(10).pow(new anchor.BN(tokenDecimnals))
          ),
          tokenDecimnals,
          new anchor.BN(tokenRate),
          decimals,
          new anchor.web3.PublicKey(currency),
          token.publicKey,
          signer.publicKey
        )
        .accounts({ signer: creator.publicKey })
        .signers([creator])
        .rpc();

      console.log("Your transaction signature", tx);


      const [poolPDA] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("ido_platform_pool_seed"),
          token.publicKey.toBuffer(),
        ],
        program.programId
      )

      console.log("Pool PDA:", poolPDA.toBase58());

      const poolInfo = await program.account.poolAccount.fetch(poolPDA);

      assert.equal(poolInfo.startTime.toNumber(), startTime, "Start time should match");
      assert.equal(poolInfo.endTime.toNumber(), endTime, "End time should match");
      assert.equal(poolInfo.claimTime.toNumber(), claimTime, "Claim time should match");
      assert.equal(
        poolInfo.tokensForSale.toNumber(),
        new anchor.BN(tokensForSale).mul(
          new anchor.BN(10).pow(new anchor.BN(tokenDecimnals))
        ).toNumber(),
        "Tokens for sale should match"
      );
      assert.equal(
        poolInfo.tokenRate.toNumber(),
        new anchor.BN(tokenRate).mul(
          new anchor.BN(10).pow(new anchor.BN(decimals))
        ).toNumber(),
        'Token rate should match'
      );
      assert.equal(poolInfo.tokenDecimals, tokenDecimnals, "Token decimals should match");
      assert.equal(poolInfo.decimals, decimals, "Decimals should match");
      assert.equal(poolInfo.currency.toBase58(), new anchor.web3.PublicKey(currency).toBase58(), "Currency should match");
      assert.equal(poolInfo.token.toBase58(), token.publicKey.toBase58(), "Token should match");
      assert.equal(poolInfo.signer.toBase58(), signer.publicKey.toBase58(), "Signer should match");
    });

    it("should buy token successfully", async () => {
      const amountToPay = new anchor.BN(100_000);

      const [poolAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("ido_platform_pool_seed"), token.publicKey.toBuffer()],
        program.programId
      );

      const [receiptAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("ido_platform_buy_token_seed"),
          buyer.publicKey.toBuffer(),
          poolAccount.toBuffer()
        ],
        program.programId
      );

      const buyerAta = await getAssociatedTokenAddress(
        currency,
        buyer.publicKey,
        true,
        TOKEN_PROGRAM_ID
      );

      // Check balance before buying
      const beforeBalanceInfo = await provider.connection.getTokenAccountBalance(buyerAta);
      const beforeBalance = BigInt(beforeBalanceInfo.value.amount);
      console.log("Buyer currency balance before:", beforeBalance.toString());

      const tx = await program.methods
        .buyToken(amountToPay, token.publicKey)
        .accounts({
          buyer: buyer.publicKey,
          associatedToken: buyerAta,
        })
        .signers([buyer])
        .rpc();

      // Check balance after buying
      const afterBalanceInfo = await provider.connection.getTokenAccountBalance(buyerAta);
      const afterBalance = BigInt(afterBalanceInfo.value.amount);
      console.log("Buyer currency balance after:", afterBalance.toString());

      // Fetch and assert receipt
      const receipt = await program.account.purchaseReceipt.fetch(receiptAccount);

      const parsedTransaction = await provider.connection.getParsedTransaction(
        tx,
        {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        }
      );

      console.log({
        amount: amountToPay.toNumber(),
        decimals: decimals,
        tokenRate: tokenRate,
        tokenDecimnals: tokenDecimnals,

      })
      // console.log(parsedTransaction);
      if (parsedTransaction?.meta?.logMessages) {
        console.log(parsedTransaction.meta.logMessages);
      } else {
        console.log('No log messages found');
      }

      console.log("Receipt:", {
        buyer: receipt.buyer.toBase58(),
        pool: receipt.pool.toBase58(),
        currencyAmount: receipt.currencyAmount.toString(),
        tokensReceived: receipt.tokensReceived.toString(),
        isClaimed: receipt.isClaimed,
      });

      assert.equal(receipt.buyer.toBase58(), buyer.publicKey.toBase58());
      assert.equal(receipt.pool.toBase58(), poolAccount.toBase58());
      assert.ok(receipt.currencyAmount.eq(amountToPay));
      // assert.ok(receipt.tokensReceived.gt(new anchor.BN(0)));
      assert.isFalse(receipt.isClaimed);
    });
  });
});
