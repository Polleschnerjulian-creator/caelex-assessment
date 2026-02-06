declare module "swagger-ui-react" {
  import { ComponentType } from "react";

  interface SwaggerUIProps {
    spec?: object;
    url?: string;
    layout?: string;
    docExpansion?: "list" | "full" | "none";
    deepLinking?: boolean;
    defaultModelsExpandDepth?: number;
    displayOperationId?: boolean;
    filter?: boolean | string;
    maxDisplayedTags?: number;
    operationsSorter?: "alpha" | "method" | ((a: any, b: any) => number);
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    tagsSorter?: "alpha" | ((a: any, b: any) => number);
    tryItOutEnabled?: boolean;
    supportedSubmitMethods?: string[];
    validatorUrl?: string | null;
    withCredentials?: boolean;
    persistAuthorization?: boolean;
    onComplete?: () => void;
    preauthorizeBasic?: {
      [key: string]: { username: string; password: string };
    };
    preauthorizeApiKey?: { [key: string]: string };
    requestInterceptor?: (req: any) => any;
    responseInterceptor?: (res: any) => any;
    showMutatedRequest?: boolean;
    defaultModelExpandDepth?: number;
    plugins?: any[];
    syntaxHighlight?:
      | boolean
      | {
          activated?: boolean;
          theme?: string;
        };
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
