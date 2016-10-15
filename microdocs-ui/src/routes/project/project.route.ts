import {Component} from "@angular/core";
import {ROUTER_DIRECTIVES, ActivatedRoute, Router, Params} from "@angular/router";

import {COMPONENTS} from "@maxxton/components/components";
import {FILTERS} from "@maxxton/components/filters";
import {Project, Path, Method, Schema, Dependency} from "microdocs-core-ts/dist/domain";
import {REST, DATABASE, USES, INCLUDES} from "microdocs-core-ts/dist/domain/dependency/dependency-type.model";
import {SchemaHelper} from "microdocs-core-ts/dist/helpers/schema/schema.helper";

import {ProjectService} from "../../services/project.service";
import {EndpointPanel} from "../../panels/endpoint-panel/endpoint.panel";
import {ModelPanel} from "../../panels/model-panel/model.panel";
import {ProblemPanel} from "../../panels/problem-panel/problem.panel";
import {SortByHttpMethod} from "../../pipes/sort-by-http-method.pipe"
import {Subject} from "rxjs/Subject";
import {DependencyGraph} from "../../panels/dependency-graph/dependency-graph";
import {EndpointGroupPanel} from "../../panels/endpoint-group-panel/endpoint-group.panel";
import {ExportPanel} from "../../panels/export-panel/export.panel";


@Component({
  selector: 'project-route',
  templateUrl: 'project.route.html',
  directives: [ROUTER_DIRECTIVES, COMPONENTS, EndpointGroupPanel, EndpointPanel, ModelPanel, ProblemPanel, DependencyGraph, ExportPanel],
  pipes: [FILTERS, SortByHttpMethod]
})
export class ProjectRoute {

  private nodes:Subject = new Subject();

  private env:string;
  private title:string;
  private version:string;
  private versions:string[];
  private project:Project = {};
  private loading:boolean = true;
  private showExportModal:boolean = false;

  private queryParams:Params;
  private pathParams:Params;
  
  private color = 'blue-gray';
  private colorRanges = {
    'pink': ['a', 'b'],
    'red': ['c', 'd'],
    'orange': ['e', 'f'],
    'amber': ['g', 'h'],
    'yellow': ['i', 'j'],
    'lime': ['k', 'l'],
    'green': ['m', 'n'],
    'teal': ['o', 'p'],
    'cyan': ['q', 'r'],
    'light-blue': ['s', 't'],
    'blue': ['u', 'v'],
    'indigo': ['w', 'x'],
    'purple': ['y', 'z']
  };

  private rest = REST;
  private database = DATABASE;
  private uses = USES;
  private includes = INCLUDES;

  constructor(private projectService:ProjectService,
              private route:ActivatedRoute,
              private router:Router) {
  }

  ngOnInit() {
    this.router.routerState.queryParams.subscribe(params => {
      this.loading = true;
      this.queryParams = params;
      if (this.pathParams != undefined) {
        setTimeout(() => this.init());
      }
    });
    this.route.params.subscribe(params => {
      this.loading = true;
      this.pathParams = params;
      if (this.queryParams != undefined) {
        setTimeout(() => this.init(), 100);
      }
    });
  }

  init() {
    this.version = this.queryParams['version'];
    this.env = this.queryParams['env'];
    this.title = this.pathParams['project'];
    this.color = this.getColorByTitle(this.title);
    //load metadata
    this.projectService.getProjects(this.env).subscribe(node => {
      if (node.dependencies != undefined) {
        for (var key in node.dependencies) {
          if (key == this.title) {
            this.versions = node.dependencies[key].versions;
            if(!this.version) {
              this.version = node.dependencies[key].version;
            }
            this.loadProject(this.title, this.version, this.env);
            break;
          }
        }

        // update nodes
        this.nodes.next(node);
      }
    });
  }
  
  getColorByTitle(title:string):string{
    let selectedColor;
    var first = title.substr(0, 1);
    for (var color in this.colorRanges) {
      this.colorRanges[color].forEach(char => {
        if (char == first) {
          selectedColor = color;
          return false;
        }
      });
      if (selectedColor) {
        return selectedColor;
      }
    }
    return 'blue-gray';
  }

  loadProject(title:string, version:string, env:string) {
    this.projectService.getProject(title, version, env).subscribe(project => {
      this.project = project;
      this.loading = false;
    });
  }

  onChangeVersion(version:string) {
    var url = '/projects/' + this.project.info.group + "/" + this.title;
    this.router.navigate(['projects', this.project.info.group, this.title], {queryParams: {version: version, env: this.projectService.getSelectedEnv()}});
  }

  getModelSourceLink(sourceLink:string, name:string, schema:Schema) {
    if (sourceLink != null && sourceLink != undefined) {
      var schemaSettings = {
        class: {
          type: schema.type,
          simpleName: schema.name,
          name: name,
          path: name.replace(new RegExp('\\.', 'g'), '/'),
          lineNumber: 0
        }
      };

      sourceLink = SchemaHelper.resolveString(sourceLink, schemaSettings);
    }
    return sourceLink;
  }

  getDependencyLink(dependency:Dependency):string {
    return '/projects/' + (dependency.group != undefined ? dependency.group : 'default') + '/' + dependency['_id'];
  }

}