import { Middleware, ExpressErrorMiddlewareInterface } from "routing-controllers";
import { LoggerFactory } from "@webscale/logging";
import { LogLevel } from "../../node_modules/@webscale/logging/logging/log-level";

const logger = LoggerFactory.create();

@Middleware({ type: "after" })
export class ErrorHandler implements ExpressErrorMiddlewareInterface {

  error(error: any, request: any, response: any, next: (err?: any) => any) {
    let body: any = {
      message: error.message,
      path: request.path
    };
    body.status = error.httpCode || 500;
    let errorMessage = "Error";
    switch (body.status) {
      case 400:
        errorMessage = "Bad Request";
        break;
      case 401:
        errorMessage = "Unauthorized";
        break;
      case 403:
        errorMessage = "Forbidden";
        break;
      case 404:
        errorMessage = "Not Found";
        break;
      case 500:
        errorMessage = "Internal Server Error";
        break;
    }
    if (errorMessage) {
      body.error = errorMessage;
    }
    if (logger.shouldLog(LogLevel.debug)) {
      let stack = error.stack;
      if (stack) {
        body.stack = stack.split("\n");
      }
    }

    response.status(error.status || 500).json(body);
  }

}