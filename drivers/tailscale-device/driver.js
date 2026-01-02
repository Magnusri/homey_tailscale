'use strict';

const Homey = require('homey');
const TailscaleAPI = require('../../lib/tailscale-api');

class TailscaleDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('TailscaleDriver has been initialized');
  }

  /**
   * onPair is called when a user starts pairing a device
   */
  async onPair(session) {
    let tailnet = '';
    let apiKey = '';
    let api = null;

    session.setHandler('login', async (data) => {
      tailnet = data.username;
      apiKey = data.password;

      // Validate credentials
      api = new TailscaleAPI(tailnet, apiKey);
      const isValid = await api.validate();

      if (!isValid) {
        throw new Error(this.homey.__('pair.invalid_credentials'));
      }

      // Store credentials in app
      this.homey.app.setApiSettings(tailnet, apiKey);

      return true;
    });

    session.setHandler('list_devices', async () => {
      if (!api) {
        api = new TailscaleAPI(tailnet, apiKey);
      }

      const devices = await api.listDevices();

      return devices.map(device => {
        const ipv4 = device.addresses.find(addr => addr.includes('.'));
        const ipv6 = device.addresses.find(addr => addr.includes(':'));

        return {
          name: device.hostname || device.name,
          data: {
            id: device.nodeId || device.id
          },
          store: {
            tailnet: tailnet,
            apiKey: apiKey
          },
          settings: {
            nodeId: device.nodeId || device.id,
            hostname: device.hostname,
            ipv4: ipv4 || '',
            ipv6: ipv6 || ''
          }
        };
      });
    });
  }

}

module.exports = TailscaleDriver;
