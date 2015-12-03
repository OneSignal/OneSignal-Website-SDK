import expect from 'chai';
import { apiCall } from '../src/api.js';
import {APP_ID, PLAYER_ID} from './vars.js';

describe('api.js', function() {
  it('should fail an invalid create notification', function () {
    return apiCall('notifications', 'POST', null).should.eventually.be.rejectedWith('Error: Bad Request');
  });

  it('should send a valid create notification', function () {
    // App is on local server
    var params = {
      'app_id': APP_ID,
      'contents': {'en': 'Web SDK unit test.'},
      'include_player_ids': [PLAYER_ID]
    };
    return apiCall('notifications', 'POST', params).should.eventually.be.fulfilled;
  });
});