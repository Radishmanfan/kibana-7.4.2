/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  Action,
  CONTEXT_MENU_TRIGGER,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { setup } from '../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';

class SamplePanelLink extends Action {
  public readonly type = 'samplePanelLink';

  constructor() {
    super('samplePanelLink');
  }

  public getDisplayName() {
    return 'Sample panel Link';
  }

  public execute() {
    return;
  }

  public getHref = () => {
    return 'https://example.com/kibana/test';
  };
}

const action = new SamplePanelLink();
setup.registerAction(action);
setup.attachAction(CONTEXT_MENU_TRIGGER, action.id);
