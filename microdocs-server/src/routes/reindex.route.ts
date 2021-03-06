
import * as express from "express";

import {BaseRoute} from "./route";

/**
 * @controller
 */
export class ReindexRoute extends BaseRoute {

  mapping = {methods: ["put"], path: "/reindex", handler: this.reindex};

  /**
   * Start the reindex process
   * @httpPut /api/v1/reindex
   * @httpQuery ?env {string} environment to publish the project definition
   * @httpResponse 200 {Problem[]}
   */
  public reindex(req: express.Request, res: express.Response, next: express.NextFunction, scope: BaseRoute) {
    const handler = scope.getHandler(req);
    try {
      const env = scope.getEnv(req, scope);
      if (env == null) {
        handler.handleBadRequest(req, res, "env '" + req.query.env + "' doesn't exists");
        return;
      }

      const nodes = scope.injection.AggregationService().reindexAll(env);
      handler.handleProjects(req, res, nodes, env, scope.injection);
    } catch (e) {
      scope.getDefaultHandler().handleInternalServerError(req, res, e);
    }
  }

}
