'use strict';

const Homey = require('homey');
const TailscaleAPI = require('../../lib/tailscale-api');

class TailnetDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('TailnetDriver has been initialized');
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
      // Return a single device representing the entire tailnet
      return [{
        name: `Tailnet: ${tailnet}`,
        data: {
          id: `tailnet_${tailnet}`
        },
        store: {
          tailnet: tailnet,
          apiKey: apiKey
        }
      }];
    });
  }

}

module.exports = TailnetDriver;
