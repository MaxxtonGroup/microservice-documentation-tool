
import {Component, Input} from "@angular/core";

import {Problem} from "microdocs-core-ts/dist/domain";
import {FILTERS} from "@maxxton/components/dist/filters";


@Component({
  selector: 'problem-panel',
  templateUrl: 'problem.panel.html',
  pipes: [FILTERS]
})
export class ProblemPanel{

  @Input()
  problems:Problem[];

}