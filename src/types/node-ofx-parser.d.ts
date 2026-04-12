declare module "node-ofx-parser" {
  interface OFXData {
    OFX: {
      BANKMSGSRSV1?: {
        STMTTRNRS?: any;
      };
      CREDITCARDMSGSRSV1?: {
        CCSTMTTRNRS?: any;
      };
      [key: string]: any;
    };
  }

  const ofxParser: {
    parse(content: string): OFXData;
  };

  export default ofxParser;
}
