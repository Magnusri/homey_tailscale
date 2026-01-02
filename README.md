# Tailscale for Homey

Monitor and manage your Tailscale network devices, users, and connections directly from your Homey smart home hub.

## Features

- **Device Monitoring**: Track all devices connected to your Tailscale network
- **Real-time Status**: Monitor device online/offline status with automatic polling
- **Flow Integration**: Create automations based on device connections and disconnections
- **Device Information**: View hostnames, IP addresses (IPv4/IPv6), and node IDs

## Installation

1. Install the app from the Homey App Store or manually using the Homey CLI
2. Get your Tailscale API key from the [Tailscale Admin Console](https://login.tailscale.com/admin/settings/keys)
3. Add a Tailscale device in Homey
4. Enter your tailnet name and API key during pairing
5. Select the devices you want to monitor

## Configuration

### API Key Requirements

Your Tailscale API key needs:
- Read access to devices
- Read access to users (optional)

### Tailnet Name

Your tailnet name is typically your organization domain (e.g., `example.com`) or your Tailscale account identifier.

## Usage

### Flow Cards

**Triggers:**
- A device connected - Fires when any device connects
- A device disconnected - Fires when any device disconnects
- Device online status changed - Fires when a specific device's status changes

**Conditions:**
- Device is online - Check if a device is currently online

**Actions:**
- Refresh device status - Manually update a device's status

## Development

```bash
# Install dependencies
npm install

# Run the app locally with Homey CLI
homey app run

# Build for production
homey app build
```

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/Magnusri/homey_tailscale/issues) page.

## License

MIT License
