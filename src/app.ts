import { Tezos, TezosToolkit } from "@taquito/taquito";
import { BeaconWallet } from "@taquito/beacon-wallet";
import $ from "jquery";
import qrcode from "qrcode-generator";

export class App {
  private tk: TezosToolkit = Tezos;
  private contract: any;
  public contractAddress = "KT1Pdsb8cUZkXGxVaXCzo9DntriCEYdG9gWT";
  public counter: number;
  public userAddress: string | null;
  private publicToken: string;
  public qrCode: string;

  constructor() {
    this.tk.setRpcProvider("https://carthagenet.smartpy.io");
    // creates contract singleton
    this.contract = undefined;
    this.counter = 0;
    this.userAddress = null;
    this.publicToken = "";
  }

  private async initContract() {
    const contract = await this.tk.wallet.at(this.contractAddress);
    const storage: any = await contract.storage();

    return { contract, storage: storage.toNumber() };
  }

  public initUI() {
    $("#show-balance-button").bind("click", () =>
      this.getBalance($("#address-input").val())
    );

    $("#connect-wallet").bind("click", () => {
      this.connectWallet();
    });

    $("#increment-counter").bind("click", () => {
      this.incrementCounter();
    });

    $("#decrement-counter").bind("click", () => {
      this.decrementCounter();
    });
  }

  private showError(message: string) {
    $("#balance-output").removeClass().addClass("hide");
    $("#error-message")
      .removeClass()
      .addClass("show")
      .html("Error: " + message);
  }

  private showBalance(balance: number) {
    $("#error-message").removeClass().addClass("hide");
    $("#balance-output").removeClass().addClass("show");
    $("#balance").html(balance);
  }

  private getBalance(address: string) {
    this.tk.rpc
      .getBalance(address)
      .then(balance => this.showBalance(balance.toNumber() / 1000000))
      .catch(e => this.showError("Address not found"));
  }

  private async connectWallet() {
    const wallet = new BeaconWallet({
      name: "Taquito Boilerplate",
      eventHandlers: {
        P2P_LISTEN_FOR_CHANNEL_OPEN: {
          handler: async data => {
            console.log("Listening to P2P channel:", data);
            this.publicToken = data.publicKey;
            $("#balance-form").addClass("hide");
            $("#public-token").text(this.publicToken);
            $("#connecting").removeClass("hide").addClass("show");
            // generates QR code
            const qr = qrcode(0, "L");
            qr.addData(this.publicToken);
            qr.make();
            $("#qr-code").html(qr.createImgTag(4));
          }
        },
        P2P_CHANNEL_CONNECT_SUCCESS: {
          handler: async data => {
            console.log("Channel connected:", data);
            $("#connecting").removeClass("show").addClass("hide");
          }
        },
        PERMISSION_REQUEST_SENT: {
          handler: async data => {
            console.log("Permission request sent:", data);
          }
        },
        PERMISSION_REQUEST_SUCCESS: {
          handler: async data => {
            console.log("Wallet is connected:", data);
          }
        }
      }
    });
    this.tk.setWalletProvider(wallet);
    await wallet.requestPermissions({ network: { type: "custom" } });
    this.userAddress = wallet.permissions.address;
    this.getBalance(this.userAddress as string);
    const { contract, storage } = await this.initContract();
    this.contract = contract;
    this.counter = storage;
    $("#counter-value").text(storage);
    $("#header__connect-wallet").addClass("hide");
    $("#balance-form").addClass("hide");
    $("#increment-decrement").removeClass("hide").addClass("show");
    $("#header__interact-with-contract").removeClass("hide").addClass("show");
  }

  private async incrementCounter() {
    try {
      $("#loading").removeClass("hide").addClass("show");
      const op = await this.contract.methods.increment(1).send();
      await op.confirmation();
      this.counter += 1;
      $("#counter-value").text(this.counter);
      this.getBalance(this.userAddress as string);
    } catch (error) {
      console.log(error);
    } finally {
      $("#loading").removeClass("show").addClass("hide");
    }
  }

  private async decrementCounter() {
    try {
      $("#loading").removeClass("hide").addClass("show");
      const op = await this.contract.methods.decrement(1).send();
      await op.confirmation();
      this.counter -= 1;
      $("#counter-value").text(this.counter);
      this.getBalance(this.userAddress as string);
    } catch (error) {
      console.log(error);
    } finally {
      $("#loading").removeClass("show").addClass("hide");
    }
  }
}
