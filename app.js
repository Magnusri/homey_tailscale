'use strict';

const Homey = require('homey');

class TailscaleApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('TailscaleApp has been initialized');

    // Register flow card listeners
    this._registerFlowCards();

    // Store app settings globally
    this.apiSettings = {
      tailnet: null,
      apiKey: null
    };
  }

  /**
   * Register flow card listeners
   */
  _registerFlowCards() {
    // Trigger cards (registered by drivers when needed)
    this.deviceConnectedTrigger = this.homey.flow.getTriggerCard('device_connected');
    this.deviceDisconnectedTrigger = this.homey.flow.getTriggerCard('device_disconnected');
    this.deviceOnlineChangedTrigger = this.homey.flow.getTriggerCard('device_online_changed');
    this.deviceJoinedTailnetTrigger = this.homey.flow.getTriggerCard('device_joined_tailnet');
    this.deviceReconnectedTailnetTrigger = this.homey.flow.getTriggerCard('device_reconnected_tailnet');

    // Condition cards
    const isDeviceOnlineCondition = this.homey.flow.getConditionCard('is_device_online');
    isDeviceOnlineCondition.registerRunListener(async (args) => {
      return args.device.getCapabilityValue('onoff');
    });

    // Action cards
    const refreshDeviceStatusAction = this.homey.flow.getActionCard('refresh_device_status');
    refreshDeviceStatusAction.registerRunListener(async (args) => {
      await args.device.onPoll();
      return true;
    });
  }

  /**
   * Set API settings
   */
  setApiSettings(tailnet, apiKey) {
    this.apiSettings = {
      tailnet,
      apiKey
    };
  }

  /**
   * Get API settings
   */
  getApiSettings() {
    return this.apiSettings;
  }

}

module.exports = TailscaleApp;
