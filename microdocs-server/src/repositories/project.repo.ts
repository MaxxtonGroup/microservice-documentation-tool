
import {Project, RootNode} from "@maxxton/microdocs-core-ts/dist/domain";

/**
 * @author Steven Hermans
 */
export interface ProjectRepository {
  
  /**
   * Load the projects index
   * @param env for which env to load
   */
  getAggregatedProjects(env:string):RootNode;
  
  /**
   * Load project
   * @param env for which env to load
   */
  getAggregatedProject(env:string, title:string, version:string):Project;
  
  /**
   * Save project index
   * @param env for which env to load
   * @param treeNode project index
   */
  storeAggregatedProjects(env:string, treeNode:RootNode):void;
  
  /**
   * Save project
   * @param env for which env to load
   * @param project project to save
   */
  storeAggregatedProject(env:string, project:Project):void;
  
  /**
   * Remove project
   * @param env for which env to load
   * @param title title of the project
   * @param version versoin of the project
   */
  removeAggregatedProject(env:string, title:string, version?:string):boolean;
  
}