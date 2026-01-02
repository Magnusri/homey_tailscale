# Tailscale for Homey

Monitor and manage your Tailscale network devices, users, and connections directly from your Homey.

## Features

- **Device Monitoring**: Track all devices connected to your Tailscale network
- **Online Status**: Real-time monitoring of device online/offline status
- **Flow Integration**: Trigger automations when devices connect or disconnect
- **Device Information**: View device hostnames, IP addresses (IPv4 and IPv6), and node IDs

## Configuration

### Getting Started

1. Get your Tailscale API key from [Tailscale Admin Console](https://login.tailscale.com/admin/settings/keys)
2. Note your tailnet name (usually your organization domain, e.g., `example.com`)
3. In Homey, add a new Tailscale device
4. Enter your tailnet name and API key when prompted
5. Select the devices you want to monitor

### API Key Permissions

Your Tailscale API key should have at least the following permissions:
- Read access to devices
- Read access to users (optional, for user information)

## Flow Cards

### Triggers

- **A device connected**: Triggered when any Tailscale device connects to the network
- **A device disconnected**: Triggered when any Tailscale device disconnects
- **Device online status changed**: Triggered when a specific device's online status changes

### Conditions

- **Device is online**: Check if a specific device is currently online

### Actions

- **Refresh device status**: Manually refresh the status of a specific device

## Device Capabilities

Each Tailscale device in Homey has the following capabilities:

- **Online Status** (onoff): Shows whether the device is currently online
- **Alert** (alarm_generic): Activated when the device goes offline

## Settings

Device settings include:
- Node ID
- Hostname
- IPv4 Address
- IPv6 Address

These settings are read-only and updated automatically.

## Polling

The app polls the Tailscale API every 60 seconds to update device statuses. This ensures near real-time monitoring while being respectful of API rate limits.

## Privacy & Security

- API keys are stored securely in Homey
- All communication with Tailscale uses HTTPS
- No data is sent to third parties

## Support

For issues, feature requests, or contributions, please visit:
https://github.com/Magnusri/homey_tailscale/issues

## License

MIT License - see LICENSE file for details
