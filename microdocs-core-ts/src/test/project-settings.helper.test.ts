/// <reference path="../../typings/index.d.ts" />

import {expect, assert} from 'chai';
import {SchemaHelper} from "../helpers/schema/schema.helper";
import {Project} from "../domain/project.model";
import {ProjectSettingsHelper} from "../helpers/project-settings/project-settings.helper";

describe('#ProjectSettingsHelper: ', () => {

  describe("#resolve(): ", () => {

    it("Test empty settings", () => {
      var project :Project = {};
      var settings = {};

      var result = ProjectSettingsHelper.resolve(project, settings);

      expect(result).to.deep.eq({});
    });

    it("Test static settings", () => {
      var project :Project = {};
      var settings = {test:true};

      var result = ProjectSettingsHelper.resolve(project, settings);

      expect(result).to.deep.eq({test:true});
    });

    it("Test static nested settings", () => {
      var project :Project = {};
      var settings = {obj:{test:true}};

      var result = ProjectSettingsHelper.resolve(project, settings);

      expect(result).to.deep.eq({obj:{test:true}});
    });

    it("Test static merge settings", () => {
      var project :Project = {obj: 'lalala'};
      var settings = {obj:{test:true}};

      var result = ProjectSettingsHelper.resolve(project, settings);

      expect(result).to.deep.eq({obj:{test:true}});
    });

    it("Test static array", () => {
      var project :Project = {array:[]};
      var settings = {array:['item', 'item']};

      var result = ProjectSettingsHelper.resolve(project, settings);

      expect(result).to.deep.eq({array:['item', 'item']});
    });

    it("Test dynamic array", () => {
      var project :Project = {array:[{name:'john'},{name:'alice'}]};
      var settings = {array:{'{i}': {index: '$i'}}};

      var result = ProjectSettingsHelper.resolve(project, settings);

      expect(result).to.deep.eq({array:[{name:'john', index: 0},{name:'alice', index: 1}]});
    });

  });

});