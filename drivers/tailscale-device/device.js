'use strict';

const Homey = require('homey');
const TailscaleAPI = require('../../lib/tailscale-api');

class TailscaleDevice extends Homey.Device {

  // Constants for online status detection
  static ONLINE_THRESHOLD_MINUTES = 5;
  static MS_PER_SECOND = 1000;
  static SECONDS_PER_MINUTE = 60;

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

    // Initialize error counter for retry logic
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 3;

    // Set up polling using Homey's interval for proper cleanup
    this.pollInterval = this.homey.setInterval(() => {
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
      this.homey.clearInterval(this.pollInterval);
    }
  }

  /**
   * Determine if a device is online based on lastSeen timestamp
   * A device is considered online if it was seen within the last 5 minutes
   */
  _isDeviceOnline(device) {
    if (!device || !device.lastSeen) {
      // If no lastSeen data, assume offline
      return false;
    }

    try {
      const lastSeenDate = new Date(device.lastSeen);
      const now = new Date();
      const diffMinutes = (now - lastSeenDate) / TailscaleDevice.MS_PER_SECOND / TailscaleDevice.SECONDS_PER_MINUTE;

      // Device is online if seen within the last 5 minutes
      return diffMinutes < TailscaleDevice.ONLINE_THRESHOLD_MINUTES;
    } catch (error) {
      this.error('Error parsing lastSeen timestamp:', error.message);
      return false;
    }
  }

  /**
   * Poll the Tailscale API for device status
   */
  async onPoll() {
    try {
      const device = await this.api.getDevice(this.nodeId);
      
      // Reset error counter on success
      this.consecutiveErrors = 0;
      
      // Make device available if it was unavailable
      if (!this.getAvailable()) {
        await this.setAvailable();
      }
      
      // Update online status
      // Tailscale API doesn't provide an 'online' boolean field
      // Instead, we determine online status using the 'lastSeen' timestamp
      // A device is considered online if lastSeen is within the last 5 minutes
      const wasOnline = this.getCapabilityValue('onoff');
      const isOnline = this._isDeviceOnline(device);
      
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
      this.error('Failed to poll device status:', error.message);
      
      // Increment error counter
      this.consecutiveErrors++;
      
      // Only mark device as unavailable after multiple consecutive failures
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        await this.setUnavailable(this.homey.__('errors.api_error'));
      } else {
        this.error(`Temporary error (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error.message);
      }
    }
  }

}

module.exports = TailscaleDevice;
