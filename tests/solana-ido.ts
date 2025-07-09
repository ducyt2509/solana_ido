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
  ASSOCIATED_TOKEN_PROGRAM_ID
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

          const programTokenAccount = getAssociatedTokenAddressSync(
            tokenMint.publicKey,     // mint
            program.programId,       // owner (public key của chương trình)
            true,                    // allowOwnerOffCurve → vì programId không phải keypair
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );

          const accountInfo = await provider.connection.getAccountInfo(programTokenAccount);
          if (!accountInfo) {
            const createATAIx = createAssociatedTokenAccountInstruction(
              owner.publicKey,         // payer
              programTokenAccount,     // ATA to create
              program.programId,       // owner of ATA
              tokenMint.publicKey,     // mint
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            );

            const tx = new anchor.web3.Transaction().add(createATAIx);
            await provider.sendAndConfirm(tx, [owner]);
          }

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
  const endTime = Math.floor(moment().add(500, "seconds").valueOf() / 1000);
  const claimTime = Math.floor(moment().add(500, "seconds").valueOf() / 1000);
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
    it("Should buy token successfully", async () => {
      // Get input token balance before
      const userInputAccount = getAssociatedTokenAddressSync(
        inputMint.publicKey,
        user.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );
      const beforeBalance = (await provider.connection.getTokenAccountBalance(userInputAccount)).value.amount;

      console.log("Before balance: ", beforeBalance);

      const signature = await program.methods.buyToken(
        new anchor.BN(100),
      ).accounts({
        buyer: user.publicKey,
        inputMint: inputMint.publicKey,
        tokenMint: tokenMint.publicKey,
      })
        .signers([user])
        .rpc();

      // Get input token balance after
      const afterBalance = (await provider.connection.getTokenAccountBalance(userInputAccount)).value.amount;
      console.log("After balance: ", afterBalance);
    })

    it("Should claim token successfully", async () => {
      const userTokenAccount = getAssociatedTokenAddressSync(
        tokenMint.publicKey,
        user.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Kiểm tra tài khoản có tồn tại chưa
      const accountInfo = await provider.connection.getAccountInfo(userTokenAccount);

      if (!accountInfo) {
        console.warn("Token account does not exist yet:", userTokenAccount.toBase58());
      } else {
        const beforeBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);
        console.log("Before balance:", beforeBalance.value.uiAmountString);
      }

      const signature = await program.methods.claimToken()
        .accounts({
          buyer: user.publicKey,
          inputMint: inputMint.publicKey,
          tokenMint: tokenMint.publicKey,
        })
        .signers([user, creator])
        .rpc();


      const userTokenAccount2 = getAssociatedTokenAddressSync(
        tokenMint.publicKey,
        user.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Kiểm tra tài khoản có tồn tại chưa
      const accountInfo2 = await provider.connection.getAccountInfo(userTokenAccount);

      if (!accountInfo) {
        console.warn("Token account does not exist yet:", userTokenAccount.toBase58());
      } else {
        const beforeBalance = await provider.connection.getTokenAccountBalance(userTokenAccount2);
        console.log("after balance:", beforeBalance.value.uiAmountString);
      }

    });
  })




});
