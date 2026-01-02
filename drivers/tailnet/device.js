'use strict';

const Homey = require('homey');
const TailscaleAPI = require('../../lib/tailscale-api');

class TailnetDevice extends Homey.Device {

  /**
   * Threshold in minutes for determining if a device reconnected after being offline.
   * A device is considered to have reconnected if it was offline for more than this duration.
   */
  static RECONNECT_THRESHOLD_MINUTES = 15;

  /**
   * Threshold for determining if a device is online based on lastSeen timestamp.
   * A device is considered online if it was seen within this many minutes.
   */
  static ONLINE_THRESHOLD_MINUTES = 5;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('TailnetDevice has been initialized');

    // Get stored credentials
    const store = this.getStore();
    this.tailnet = store.tailnet;
    this.apiKey = store.apiKey;

    // Initialize API client
    this.api = new TailscaleAPI(this.tailnet, this.apiKey);

    // Initialize tracking structures
    // Map of nodeId -> device info
    this.knownDevices = new Map();
    // Map of nodeId -> last offline timestamp
    this.deviceOfflineTimestamps = new Map();
    // Flag to skip triggering on first poll to avoid false positives
    this.isFirstPoll = true;

    // Initialize error counter for retry logic
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 3;

    // Set up polling using Homey's interval for proper cleanup
    this.pollInterval = this.homey.setInterval(() => {
      this.onPoll().catch(err => {
        this.error('Error during poll interval:', err.message);
      });
    }, 60000); // Poll every minute

    // Initial poll
    await this.onPoll().catch(err => {
      this.error('Error during initial poll:', err.message);
    });
  }

  /**
   * onAdded is called when the user adds the device
   */
  async onAdded() {
    this.log('TailnetDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TailnetDevice settings were changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   */
  async onRenamed(name) {
    this.log('TailnetDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('TailnetDevice has been deleted');
    
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
      
      // Validate that we got a valid date
      if (isNaN(lastSeenDate.getTime())) {
        this.error('Invalid lastSeen timestamp:', device.lastSeen);
        return false;
      }
      
      const now = new Date();
      const diffMinutes = (now - lastSeenDate) / (1000 * 60);

      // Device is online if seen within the last 5 minutes
      return diffMinutes < TailnetDevice.ONLINE_THRESHOLD_MINUTES;
    } catch (error) {
      this.error('Error parsing lastSeen timestamp:', error.message);
      return false;
    }
  }

  /**
   * Poll the Tailscale API for device list and detect changes
   */
  async onPoll() {
    try {
      const devices = await this.api.listDevices();
      
      // Reset error counter on success
      this.consecutiveErrors = 0;
      
      // Make device available if it was unavailable
      if (!this.getAvailable()) {
        await this.setAvailable();
      }
      
      // Process each device in the current list
      for (const device of devices) {
        // The Tailscale API may return either 'nodeId' or 'id' depending on the endpoint
        // We fallback to 'id' for compatibility
        const nodeId = device.nodeId || device.id;
        const deviceName = device.hostname || device.name || nodeId;
        const userName = device.user || '';
        const isOnline = this._isDeviceOnline(device);
        
        // Check if this is a new device we haven't seen before
        if (!this.knownDevices.has(nodeId)) {
          this.log(`New device detected: ${deviceName} (${nodeId})`);
          
          // Trigger new device joined flow (skip on first poll to avoid false positives)
          if (!this.isFirstPoll) {
            try {
              const newDeviceTrigger = this.homey.app.deviceJoinedTailnetTrigger;
              if (newDeviceTrigger) {
                await newDeviceTrigger.trigger({
                  device_name: deviceName,
                  user: userName,
                  node_id: nodeId
                });
              }
            } catch (err) {
              this.error('Failed to trigger device_joined_tailnet:', err.message);
            }
          }
          
          // Add to known devices
          this.knownDevices.set(nodeId, {
            name: deviceName,
            user: userName,
            wasOnline: isOnline,
            lastSeen: device.lastSeen
          });
        } else {
          // Existing device - check for reconnection
          const knownDevice = this.knownDevices.get(nodeId);
          const wasOnline = knownDevice.wasOnline;
          
          // Device came back online
          if (isOnline && !wasOnline) {
            // Check if device was offline for more than 15 minutes
            const offlineTimestamp = this.deviceOfflineTimestamps.get(nodeId);
            
            if (offlineTimestamp) {
              const now = new Date();
              const offlineMinutes = (now - offlineTimestamp) / (1000 * 60);
              
              if (offlineMinutes >= TailnetDevice.RECONNECT_THRESHOLD_MINUTES) {
                this.log(`Device reconnected after ${Math.round(offlineMinutes)} minutes: ${deviceName} (${nodeId})`);
                
                // Trigger device reconnected flow
                try {
                  const reconnectTrigger = this.homey.app.deviceReconnectedTailnetTrigger;
                  if (reconnectTrigger) {
                    await reconnectTrigger.trigger({
                      device_name: deviceName,
                      user: userName,
                      node_id: nodeId,
                      offline_minutes: Math.round(offlineMinutes)
                    });
                  }
                } catch (err) {
                  this.error('Failed to trigger device_reconnected_tailnet:', err.message);
                }
              }
              
              // Clear offline timestamp
              this.deviceOfflineTimestamps.delete(nodeId);
            }
          }
          
          // Device went offline
          if (!isOnline && wasOnline) {
            // Record when device went offline
            this.deviceOfflineTimestamps.set(nodeId, new Date());
            this.log(`Device went offline: ${deviceName} (${nodeId})`);
          }
          
          // Update known device state
          knownDevice.wasOnline = isOnline;
          knownDevice.lastSeen = device.lastSeen;
          knownDevice.name = deviceName;
          knownDevice.user = userName;
        }
      }
      
      // Mark first poll as complete
      if (this.isFirstPoll) {
        this.isFirstPoll = false;
        this.log('Initial device list loaded, monitoring for changes');
      }

    } catch (error) {
      this.error('Failed to poll tailnet devices:', error.message);
      
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

module.exports = TailnetDevice;
