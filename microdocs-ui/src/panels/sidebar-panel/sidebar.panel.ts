/**
 * Created by Reinartz.T on 18-7-2016.
 */
import {Component, HostBinding, Input, Output, EventEmitter} from "@angular/core";
import {ROUTER_DIRECTIVES} from "@angular/router";
import {COMPONENTS} from "@maxxton/components/components";
import {ProjectService} from "../../services/project.service";
import {Observable} from "rxjs/Observable";
import {TreeNode} from 'microdocs-core-ts/dist/domain';
import {DashboardRoute} from "../../routes/dashboard/dashboard";
import {ImportPanel} from "../import-panel/import.panel";

@Component({
  selector: 'sidebar-component',
  templateUrl: 'sidebar.panel.html',
  directives: [ROUTER_DIRECTIVES, COMPONENTS, ImportPanel]
})

export class SidebarComponent {
  private user = {};
  showImportModal = false;
  
  @HostBinding('class.big')
  private showFullSideBar:boolean = true;
  
  
  @Input()
  projects:Observable<TreeNode>;
  
  menu:Object = [];
  
  searchQuery:string = '';
  
  @Input()
  envs:string[];
  
  @Input()
  selectedEnv:string;
  
  node:TreeNode;
  
  @Output('envChange')
  change = new EventEmitter();
  
  ngOnInit() {
    this.projects.subscribe(node => {
      this.node = node;
      this.initMenu()
    });
  }
  
  onEnvVersion(newEnv) {
    this.change.emit(newEnv);
  }
  
  onSearchQueryChange(query) {
    this.searchQuery = query;
    this.initMenu();
  }
  
  private initMenu() {
    var pathPrefix = "projects/";
    var pathPostfix = '';
    if (this.selectedEnv) {
      pathPostfix += '?env=' + this.selectedEnv;
    }
    var menus:Array<any> = [{
      path: '/dashboard',
      pathMatch: 'full',
      component: DashboardRoute,
      name: 'Overview',
      icon: 'home'
    }];
    var filteredNodes = this.filterNodes(this.node, this.searchQuery);
    for (var title in filteredNodes.dependencies) {
      var groupName = filteredNodes.dependencies[title].group;
      if (groupName == undefined) {
        groupName = "default";
      }
      // add group if it doesn't exists
      if (menus.filter(group => group.name == groupName).length == 0) {
        menus.push({name: groupName, icon: 'folder', iconOpen: 'folder_open', inactive: true, children: [], childrenVisible: true});
      }
      // add project
      var problems = filteredNodes.dependencies[title].problems;
      var icon = null;
      var iconColor = 'red';
      if (problems != undefined && problems != null && problems > 0) {
        icon = 'error';
      }
      var groupRoute = menus.filter(group => group.name == groupName)[0];
      groupRoute.children.push({
        path: pathPrefix + groupName + '/' + title,
        name: title,
        postIcon: icon,
        postIconColor: iconColor,
        generateIcon: true
      });
    }
    console.info(menus);
    this.menu = menus;
  }
  
  private filterNodes(node:TreeNode, query:string):TreeNode {
    var newNode = new TreeNode();
    var keywords = query.split(' ');
    for (var title in node.dependencies) {
      var hit = true;
      if (!query || query.trim().length == 0) {
        hit = true;
      } else {
        for (var i = 0; i < keywords.length; i++) {
          if(title.toLowerCase().indexOf(keywords[i].toLowerCase()) == -1) {
            hit = false;
            if (node.dependencies[title]['tags']) {
              node.dependencies[title]['tags'].forEach(tag => {
                if (tag.toLowerCase().indexOf(keywords[i].toLowerCase()) != -1) {
                  hit = true;
                }
              });
            }
          }
        }
      }
      if (hit) {
        newNode.dependencies[title] = node.dependencies[title];
      }
    }
    return newNode;
  }
  
}