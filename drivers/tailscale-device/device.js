'use strict';

const Homey = require('homey');
const TailscaleAPI = require('../../lib/tailscale-api');

class TailscaleDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('TailscaleDevice has been initialized');

    // Get stored credentials
    const store = this.getStore();
    this.tailnet = store.tailnet;
    this.apiKey = store.apiKey;
    this.nodeId = this.getData().id;

    // Initialize API client
    this.api = new TailscaleAPI(this.tailnet, this.apiKey);

    // Set up polling
    this.pollInterval = setInterval(() => {
      this.onPoll();
    }, 60000); // Poll every minute

    // Initial poll
    await this.onPoll();
  }

  /**
   * onAdded is called when the user adds the device
   */
  async onAdded() {
    this.log('TailscaleDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TailscaleDevice settings were changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   */
  async onRenamed(name) {
    this.log('TailscaleDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('TailscaleDevice has been deleted');
    
    // Clear polling interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  /**
   * Poll the Tailscale API for device status
   */
  async onPoll() {
    try {
      const device = await this.api.getDevice(this.nodeId);
      
      // Update online status
      const wasOnline = this.getCapabilityValue('onoff');
      const isOnline = device.online || false;
      
      await this.setCapabilityValue('onoff', isOnline);

      // Trigger flow if status changed
      if (wasOnline !== isOnline) {
        const trigger = this.homey.app.deviceOnlineChangedTrigger;
        if (trigger) {
          await trigger.trigger(this, { online: isOnline });
        }

        if (isOnline && !wasOnline) {
          const connectTrigger = this.homey.app.deviceConnectedTrigger;
          if (connectTrigger) {
            await connectTrigger.trigger({
              device_name: this.getName(),
              user: device.user || ''
            });
          }
        } else if (!isOnline && wasOnline) {
          const disconnectTrigger = this.homey.app.deviceDisconnectedTrigger;
          if (disconnectTrigger) {
            await disconnectTrigger.trigger({
              device_name: this.getName(),
              user: device.user || ''
            });
          }
        }
      }

      // Clear alarm if online, set if offline
      await this.setCapabilityValue('alarm_generic', !isOnline);

    } catch (error) {
      this.error('Failed to poll device status:', error);
      await this.setAvailable();
    }
  }

}

module.exports = TailscaleDevice;
