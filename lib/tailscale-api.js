'use strict';

const https = require('https');

/**
 * Tailscale API Client
 * Handles communication with the Tailscale API
 */
class TailscaleAPI {
  
  constructor(tailnet, apiKey) {
    this.tailnet = tailnet;
    this.apiKey = apiKey;
    this.baseUrl = 'api.tailscale.com';
  }

  /**
   * Make an API request
   */
  async _request(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: path,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = body ? JSON.parse(body) : {};
              resolve(parsed);
            } catch (e) {
              console.error('Failed to parse API response:', e.message);
              reject(new Error(`Invalid JSON response from API: ${e.message}`));
            }
          } else {
            reject(new Error(`API request failed with status ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * List all devices in the tailnet
   */
  async listDevices() {
    try {
      const response = await this._request(`/api/v2/tailnet/${this.tailnet}/devices`);
      return response.devices || [];
    } catch (error) {
      throw new Error(`Failed to list devices: ${error.message}`);
    }
  }

  /**
   * Get a specific device by nodeId
   */
  async getDevice(nodeId) {
    try {
      const response = await this._request(`/api/v2/device/${nodeId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get device ${nodeId}: ${error.message}`);
    }
  }

  /**
   * Delete a device from the tailnet
   */
  async deleteDevice(nodeId) {
    try {
      await this._request(`/api/v2/device/${nodeId}`, 'DELETE');
      return true;
    } catch (error) {
      throw new Error(`Failed to delete device ${nodeId}: ${error.message}`);
    }
  }

  /**
   * List all users in the tailnet
   */
  async listUsers() {
    try {
      const response = await this._request(`/api/v2/tailnet/${this.tailnet}/users`);
      return response.users || [];
    } catch (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }
  }

  /**
   * Get device routes
   */
  async getDeviceRoutes(nodeId) {
    try {
      const response = await this._request(`/api/v2/device/${nodeId}/routes`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get routes for device ${nodeId}: ${error.message}`);
    }
  }

  /**
   * Validate API credentials
   */
  async validate() {
    try {
      await this.listDevices();
      return true;
    } catch (error) {
      return false;
    }
  }

}

module.exports = TailscaleAPI;
