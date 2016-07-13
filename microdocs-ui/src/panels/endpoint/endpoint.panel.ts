import {Component, Input} from '@angular/core';
import {ROUTER_DIRECTIVES, ActivatedRoute, Router} from "@angular/router";

import {COMPONENTS} from "angular-frontend-mxt/dist/components";
import {FILTERS} from "angular-frontend-mxt/dist/filters";
import {Path, Schema} from 'microdocs-core-ts/dist/domain';

import {BodyRenderPanel} from '../body-render/body-render.panel';

@Component({
  selector: 'endpoint',
  templateUrl: 'endpoint.panel.html',
  directives: [ROUTER_DIRECTIVES, COMPONENTS, BodyRenderPanel],
  pipes: [FILTERS]
})
export class EndpointPanel {

  @Input()
  private endpoint:Path;
  @Input()
  private path:string;
  @Input()
  private schemaList:{[key:string]:Schema};

  getStatusName(statusCode : string){
    switch(statusCode.trim()){
      case '200': return 'OK';
      case '201': return 'CREATED';
      case '204': return 'NO CONTENT';
      case '400': return 'BAD REQUEST';
      case '401': return 'UNAUTHORIZED';
      case '403': return 'FORBIDDEN';
      case '404': return 'NOT FOUND';
      case '405': return 'METHOD NOT ALLOWED';
      case '409': return 'CONFLICT';
      case '500': return 'INTERNAL SERVER ERROR';
      case '503': return 'SERVICE UNAVAILABLE';
      default: return '';
    }
  }

}