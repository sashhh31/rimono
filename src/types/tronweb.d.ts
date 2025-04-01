declare module 'tronweb' {
    export default class TronWeb {
      static isAddress: any;
      constructor(options: any);
      
      address: {
        toHex(base58Address: string): string;
        fromHex(hexAddress: string): string;
      };
      
      defaultAddress: {
        base58: string;
        hex: string;
      };
      
      trx: {
        getCurrentBlock(): Promise<any>;
        getBalance(address: string): Promise<any>;
        // Add other methods as needed
      };
      
      contract(abi: any[], contractAddressHex: string): Promise<{
        methods: {
          [methodName: string]: (...args: any[]) => {
            call(): Promise<any>;
            send(options?: any): Promise<string>;
          };
        };
      }>;
      
      fullNode: { host: string };
      
      // Add other properties and methods as needed
    }
  }