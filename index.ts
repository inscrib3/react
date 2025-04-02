import { useState } from "react";
import { AddressPurpose, BitcoinNetworkType, request, RpcErrorCode, signMultipleTransactions } from "sats-connect";
import Sdk from "@inscrib3/sdk";

const useSdk = (
  network: "mainnet" | "testnet" | "testnet4" | "signet" = "mainnet",
  chain: "bitcoin" | "fractal" = "bitcoin",
  url?: string
) => {
  const sdk = Sdk(network, chain, url);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<{
    paymentAddress: string;
    paymentPublicKey: string;
    recipientAddress: string;
    recipientPublicKey: string;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const mint = async (params: {
    psbt: string[];
    indexToSign: number[][];
  }) => {
    if (!wallet) {
      throw new Error("Wallet not connected");
    }
    return new Promise<string[]>(async (resolve, reject) => {
      let networkType: BitcoinNetworkType;
      switch (network) {
        case "mainnet":
          networkType = BitcoinNetworkType.Mainnet;
          break;
        case "testnet":
          networkType = BitcoinNetworkType.Testnet;
          break;
        case "testnet4":
          networkType = BitcoinNetworkType.Testnet4;
          break;
        case "signet":
          networkType = BitcoinNetworkType.Signet;
          break;
        default:
          networkType = BitcoinNetworkType.Mainnet;
          break;
      }
      await signMultipleTransactions({
        payload: {
          message: `Requesting to sign multiple transactions`,
          network: {
            type: networkType,
          },
          psbts: [{
            psbtBase64: params.psbt[0],
            inputsToSign: [{
              address: wallet.paymentAddress,
              signingIndexes: params.indexToSign[0],
            }]
          }, {
            psbtBase64: params.psbt[1],
            inputsToSign: [{
              address: wallet.recipientAddress,
              signingIndexes: params.indexToSign[1],
            }]
          }]
        },
        onFinish: (response) => {
          resolve(response.map((res) => res.psbtBase64));
        },
        onCancel: () => {
          reject("User cancelled the request");
        },
      });
    });
  };

  const signMessage = async (address: string, message: string) => {
    try {
      setError(null);
      if (!wallet) {
        throw new Error("Wallet not connected");
      }
      const response = await request("signMessage", {
        address,
        message,
      });
      if (response.status === "success") {
        return response.result.signature;
      } else {
        if (response.error.code === RpcErrorCode.USER_REJECTION) {
          throw new Error("User cancelled the request");
        } else {
          throw new Error(response.error ? response.error.message : "An unknown error occurred"); 
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    }
  };

  return {
    error,
    wallet: {
      ...wallet,
      signMessage,
      connect: async () => {
        try {
          setError(null);
          if (chain === "fractal") {
            throw new Error("Fractal is not supported");
          }
          const connectRes = await request('wallet_connect', {
            addresses: [AddressPurpose.Payment, AddressPurpose.Ordinals],
            message: Date.now().toString(),
          });
          if (connectRes.status === "success") {
            const paymentAddressItem = connectRes.result.addresses.find(
              (address) => address.purpose === AddressPurpose.Payment,
            );
            const ordinalsAddressItem = connectRes.result.addresses.find(
              (address) => address.purpose === AddressPurpose.Ordinals,
            );
            setWallet({
              paymentAddress: paymentAddressItem?.address || "",
              paymentPublicKey: paymentAddressItem?.publicKey || "",
              recipientAddress: ordinalsAddressItem?.address || "",
              recipientPublicKey: ordinalsAddressItem?.publicKey || "",
            });
            const message = `Requesting to sign message`;
            const signatureRes = await request("signMessage", {
              address: ordinalsAddressItem?.address || "",
              message,
            });
            if (signatureRes.status === "success") {
              setSignature(signatureRes.result.signature);
              setMessage(message);
            } else {
              if (signatureRes.error.code === RpcErrorCode.USER_REJECTION) {
                throw new Error("User cancelled the request");
              } else {
                throw new Error(signatureRes.error ? signatureRes.error.message : "An unknown error occurred"); 
              }
            }
          } else {
            setWallet(null);
            if (connectRes.error.code === RpcErrorCode.USER_REJECTION) {
              throw new Error("User cancelled the request");
            } else {
              throw new Error(connectRes.error ? connectRes.error.message : "An unknown error occurred");
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      },
    },
    drops: {
      create: async (name: string, symbol: string, description: string, fileList: FileList, price: string) => {
        try {
          setError(null);
          if (!wallet) {
            throw new Error("Wallet not connected");
          }
          const icon = Array.from(fileList)[0];
          const res = await sdk.drops.create(name, symbol, description, icon, price, wallet.paymentAddress, wallet.paymentPublicKey, wallet.recipientAddress, message || "", signature || "");
          return res;
        } catch (e) {
          setError(e instanceof Error ? e.message : "An error occurred");
        }
      },
      all: async () => {
        try {
          setError(null);
          if (!wallet) {
            throw new Error("Wallet not connected");
          }
          const res = await sdk.drops.all(wallet.recipientAddress, message || "", signature || "");
          return res;
        } catch (e) {
          setError(e instanceof Error ? e.message : "An error occurred");
        }
      },
      read: async (id: string) => {
        try {
          setError(null);
          if (!wallet) {
            throw new Error("Wallet not connected");
          }
          const res = await sdk.drops.read(id, wallet.recipientAddress, message || "", signature || "");
          return res;
        } catch (e) {
          setError(e instanceof Error ? e.message : "An error occurred");
        }
      },
      remove: async (id: string) => {
        try {
          setError(null);
          if (!wallet) {
            throw new Error("Wallet not connected");
          }
          const res = await sdk.drops.remove(id, wallet.recipientAddress, message || "", signature || "");
          return res;
        } catch (e) {
          setError(e instanceof Error ? e.message : "An error occurred");
        }
      },
      mint: async (id: string) => {
        try {
          setError(null);
          if (!wallet) {
            throw new Error("Wallet not connected");
          }
          const mintRes = await sdk.drops.mint(id, wallet.paymentAddress, wallet.paymentPublicKey, wallet.recipientAddress, wallet.recipientPublicKey, wallet.recipientAddress, message || "", signature || "");
          const signedPsbt = await mint(mintRes);
          const broadcastMintRes = await sdk.drops.broadcastMint(id, signedPsbt, wallet.recipientAddress, message || "", signature || "");
          return broadcastMintRes;
        } catch (e) {
          setError(e instanceof Error ? e.message : "An error occurred");
        }
      },
      uploads: {
        all: async (id: string) => {
          try {
            setError(null);
            if (!wallet) {
              throw new Error("Wallet not connected");
            }
            const res = await sdk.drops.uploads.all(id, wallet.recipientAddress, message || "", signature || "");
            return res;
          } catch (e) {
            setError(e instanceof Error ? e.message : "An error occurred");
          }
        },
        remove: async (id: string, files: string[]) => {
          try {
            setError(null);
            if (!wallet) {
              throw new Error("Wallet not connected");
            }
            const res = await sdk.drops.uploads.remove(id, files, wallet.recipientAddress, message || "", signature || "");
            return res;
          } catch (e) {
            setError(e instanceof Error ? e.message : "An error occurred");
          }
        },
        update: async (id: string, fileList: FileList) => {
          try {
            setError(null);
            if (!wallet) {
              throw new Error("Wallet not connected");
            }
            const files = Array.from(fileList);
            const res = await sdk.drops.uploads.update(id, files, wallet.recipientAddress, message || "", signature || "");
            return res;
          } catch (e) {
            setError(e instanceof Error ? e.message : "An error occurred");
          }
        },
      },
    }
  };
};
export default useSdk;
