import {ReportJsonRepository} from '../repositories/json/report-json.repo';
import {ProjectSettingsJsonRepository} from "../repositories/json/project-settings-json.repo";
import {ReportRepository} from '../repositories/report.repo';
import {ProjectSettingsRepository} from "../repositories/project-settings.repo";
import {
  Project,
  TreeNode,
  Dependency,
  Path
} from "microdocs-core-ts/dist/domain";
import {NOTICE, ERROR} from "microdocs-core-ts/dist/domain/problem/problem-level.model";
import {REST} from "microdocs-core-ts/dist/domain/dependency/dependency-type.model";

import {ProblemReporter} from "microdocs-core-ts/dist/helpers";

import {PathCheck} from "../checks/path-check";
import {QueryParamsCheck} from "../checks/query-params.check";
import {BodyParamsCheck} from "../checks/body-params.check";
import {PathParamsCheck} from "../checks/path-params.check";
import {ResponseCheck} from "../checks/response.check";
import {ProjectService} from "./project.service";

export class AggregationService {

  private endpointChecks:PathCheck[] = [new QueryParamsCheck(), new BodyParamsCheck(), new PathParamsCheck(), new ResponseCheck()];
  private reportRepo:ReportRepository;
  private projectSettingsRepo:ProjectSettingsRepository;
  private projectService:ProjectService;

  constructor() {
    this.reportRepo = ReportJsonRepository.bootstrap();
    this.projectSettingsRepo = ProjectSettingsJsonRepository.bootstrap();
    this.projectService = ProjectService.bootstrap();
  }

  public static bootstrap():AggregationService {
    return new AggregationService();
  }

  /**
   * Start the reindex process
   * @return {TreeNode}
   */
  public reindex():TreeNode {
    console.info("Start reindex");

    // Find all projects
    var projectCache:{[title:string]:{[version:string]:Project}} = {};
    // var projects:Project[] = [];
    var projectInfos = this.reportRepo.getProjects();
    projectInfos.forEach(projectInfo => {
      try {
        var project = this.reportRepo.getProject(projectInfo);
        if (project != null) {
          project = this.mergeProjectSettings(project);
          if (projectCache[project.info.title] == null || projectCache[project.info.title] == undefined) {
            projectCache[project.info.title] = {};
          }
          projectCache[project.info.title][project.info.version] = project;
        }
      } catch (e) {
        console.error("Failed to load project: " + projectInfo.title);
        console.error(e);
      }
    });

    console.info("Build dependency tree");
    var tree = this.buildDependencyTree(projectCache);

    console.info("Store aggregations");
    for (var title in projectCache) {
      for (var version in projectCache[title]) {
        var project = projectCache[title][version];
        this.projectService.storeAggregatedProject(project);
      }
    }
    this.projectService.storeAggregatedProjects(tree);

    console.info("Finish reindex");

    return tree;
  }

  /**
   * Build dependency tree
   * @param projects list of all projects
   * @return {TreeNode} result
   */
  public buildDependencyTree(projectCache:{[title:string]:{[version:string]:Project}}):TreeNode {
    // create rootnode
    var rootNode = new TreeNode();

    // add of all projects the latest version
    for (var title in projectCache) {
      for (var version in projectCache[title]) {
        var project = projectCache[title][version];
        var node = new TreeNode();
        node.parent = rootNode;
        node.group = project.info.group;
        node.version = project.info.version;
        node.versions = project.info.versions;
        rootNode.dependencies[project.info.title] = node;
      }
    }

    var copyProjectCache:{[title:string]:{[version:string]:Project}} = {};
    for (var title in projectCache) {
      for (var version in projectCache[title]) {
        if (copyProjectCache[title] == undefined) {
          copyProjectCache[title] = {};
        }
        copyProjectCache[title][version] = projectCache[title][version];
      }
    }

    // resolve dependencies
    for (var title in copyProjectCache) {
      for (var version in copyProjectCache[title]) {
        var project = copyProjectCache[title][version];
        var aggregatedProject = this.resolveDependencies(project, projectCache, rootNode.dependencies[project.info.title]);
      }
    }

    return rootNode;
  }

  /**
   * Recursively follow each dependency.
   * Check if a project version is already in the tree
   * @param project project of which the dependencies should be resolved
   * @param projects list of all projects
   * @param parentNode the parent node
   */
  private resolveDependencies(project:Project, projectCache:{[title:string]:{[version:string]:Project}}, parentNode:TreeNode):Project {
    console.info('resolve project: ' + project.info.title + ":" + project.info.version);
    if (project.dependencies != null && project.dependencies != undefined) {
      var dependencies = {};
      for (var title in project.dependencies) {
        dependencies[title] = project.dependencies[title];
      }
      for (var title in dependencies) {
        var node = new TreeNode();
        node.parent = parentNode;

        //resolve dependency
        var dependency = dependencies[title];
        var dependencyProblems : ProblemReporter = new ProblemReporter();

        //find dependent project
        var dependentProject:Project = null;
        for (var name in projectCache) {
          for (var version in projectCache[name]) {
            if (projectCache[name][version].info.title == title) {
              dependentProject = projectCache[name][version];
            }
          }
        }
        if (dependentProject != null) {
          dependency.latestVersion = dependentProject.info.version;
          dependency.version = dependentProject.info.version;
          dependency.group = dependentProject.info.group;

          // check endpoint
          if (dependency.type == REST) {
            var compatible = this.checkEndpoints(title, dependency, dependentProject, project);
            console.info(project.info.title + ":" + project.info.version + ' -> ' + dependentProject.info.title + ":" + dependentProject.info.version + " = compatible: " + compatible);

            if (!compatible) {
              //find last compatible if contains problems
              var previousProject = this.previousProject(dependentProject);
              while (previousProject != null) {
                var prevCompatible = this.checkEndpoints(title, dependency, previousProject, project);
                console.info(project.info.title + ":" + project.info.version + ' -> ' + previousProject.info.title + ":" + previousProject.info.version + " = compatible: " + prevCompatible);

                if (prevCompatible) {
                  dependency.version = previousProject.info.version;
                  break;
                }
                previousProject = this.previousProject(previousProject);
              }
              if (previousProject != null) {
                // scan previous project
                projectCache[previousProject.info.title][previousProject.info.version] = previousProject;
                this.resolveDependencies(dependentProject, projectCache, node);
              }
            }
          }
          //todo: check other dependency types
        } else {
          // project not found
          dependencyProblems.report(ERROR, "Unknown project: " + title, dependency.component);
        }
        if(dependencyProblems.hasProblems()){
          // log problems
          dependencyProblems.publish(dependency, project);
        }

        // create node
        var path = parentNode.getRoot().findNodePath(title, dependency.version);
        if (path == null) {
          if (dependency != null) {
            node.version = dependency.version;
          }
          if (dependentProject != null) {
            node.group = dependentProject.info.group;
            node.versions = dependentProject.info.versions;
            this.resolveDependencies(dependentProject, projectCache, node);
          }
        } else {
          node.reference = "#" + path;
        }
        parentNode.dependencies[title] = node;
        parentNode.problems = project.problemCount;
      }
    }
    return project;
  }

  /**
   * Check dependency definition with the real project
   * @param title name of the project
   * @param dependency
   * @param dependentProject
   * @returns {boolean} true if compatible, otherwise false
   */
  private checkEndpoints(title:string, dependency:Dependency, dependentProject:Project, currentProject:Project):boolean{
    var compatible = true;
    if (dependency.paths != undefined) {
      for (var path in dependency.paths) {
        for (var method in dependency.paths[path]) {
          var problemReport = new ProblemReporter(currentProject);
          var clientEndpoint = dependency.paths[path][method];
          clientEndpoint.path = path;
          clientEndpoint.requestMethod = method;
          var producerEndpoint = this.findEndpoint(title, clientEndpoint, path, method, dependentProject, problemReport);
          if (producerEndpoint != null) {
            // execute checks on the endpoint
            this.endpointChecks.forEach(check => check.check(clientEndpoint, producerEndpoint, currentProject, problemReport));
          } else {
            // endpoint does not exists
            problemReport.report(ERROR, "No mapping for '" + method + " " + path + "' on " + title, clientEndpoint.controller, clientEndpoint.method);
          }

          // log problems
          if(problemReport.hasProblems()) {
            compatible = false;
            problemReport.publish(clientEndpoint, currentProject);
          }
        }
      }
    }
    return compatible;
  }

  /**
   * Load the previous version of a project
   * @param project
   * @returns {null|Project} previous project or null if it does not exists
   */
  private previousProject(project:Project):Project {
    // load older version if so requested
    var prevProjectInfo = project.info.getPrevVersion();
    if (prevProjectInfo == null) {
      // no previous project
      return null;
    }
    try {
      project = this.reportRepo.getProject(prevProjectInfo);
      project = this.mergeProjectSettings(project);
      return project;
    } catch (e) {
      console.warn("Failed to load project: " + project.info.title);
      console.warn(e);
      return null;
    }
  }

  /**
   * Find an endpoint in a given project
   * @param project project to search in
   * @param path path of the endpoint
   * @param method request method of the endpoint
   * @returns {null,Path} returns Path or null if it does not exists
   */
  private findEndpoint(title:string, clientEndpoint:Path, clientPath:string, clientMethod:string, project:Project, problemReport:ProblemReporter):Path {
    var clientSegments:string[] = clientPath.split('/');
    for (var producerPath in project.paths) {
      var producerSegments:string[] = producerPath.split('/');
      if (clientSegments.length == producerSegments.length) {
        var almostEquals = true;
        var equals = true;
        for (var i = 0; i < clientSegments.length; i++) {
          var clientSegment:string = clientSegments[i];
          var producerSegment:string = producerSegments[i];

          if (!this.isSegmentVariable(producerSegment) && !this.isSegmentVariable(clientSegment) && clientSegment != producerSegment) {
            // segment is not equals
            equals = false;
            almostEquals = false;
            break;
          } else if (this.isSegmentVariable(producerSegment) != this.isSegmentVariable(clientSegment)) {
            // segment on the producer or client is a variable. Hard to check
            equals = false;
            almostEquals = true;
          }else{
            // segments are both on the producer and client variable
          }
        }
        if (almostEquals || equals) {
          for (var method in project.paths[producerPath]) {
            if (method.toLowerCase() == clientMethod.toLowerCase()) {
              if (!equals) {
                problemReport.report(NOTICE, "Path variable(s) do not match for '" + method + " " + clientPath + "' on " + title, clientEndpoint.controller, clientEndpoint.method);
              }
              var endpoint = project.paths[producerPath][method];
              endpoint.path = producerPath;
              endpoint.requestMethod = method;
              return endpoint;
            }
          }
        }
      }
    }
    return null;
  }

  private isSegmentVariable(segment:string):boolean {
    return segment.indexOf("{") == 0 && segment.lastIndexOf("}") == segment.length - 1;
  }

  /**
   * Merge project settings over the project object
   * @param project
   * @returns {Project}
   */
  private mergeProjectSettings(project:Project):Project {
    var settings = this.projectSettingsRepo.getSettings();
    if(settings['global'] != undefined && settings['global'] != null){
      project = <Project> this.mergeObjects(project, settings['global']);
    }

    if (project.info != undefined && project.info != null) {
      if (project.info.group != undefined && project.info.group != null) {
        if (settings['groups'] != undefined && settings['groups'] != null &&
            settings['groups'][project.info.group] != undefined && settings['groups'][project.info.group] != null) {
          project = <Project> this.mergeObjects(project,settings['groups'][project.info.group]);
        }
      }

      if (project.info.title != undefined && project.info.title != null) {
        if (settings['projects'] != undefined && settings['projects'] != null &&
          settings['projects'][project.info.title] != undefined && settings['projects'][project.info.title] != null) {
          project = <Project> this.mergeObjects(project,settings['projects'][project.info.title]);
        }
      }
    }

    return project;
  }

  /**
   * Merge obj2 on top of obj1
   * @param obj1
   * @param obj2
   * @returns {{}} return merged object
   */
  private mergeObjects(obj1:{}, obj2:{}):{} {
    for(var key in obj2){
      if(obj1[key] != undefined && typeof(obj1[key]) == 'object'){
        obj1[key] = this.mergeObjects(obj1[key], obj2[key]);
      }else{
        obj1[key] = obj2[key];
      }
    }
    return obj1;
  }

}