import os from 'node:os';
import dotenv from 'dotenv';

dotenv.config();

export const port = parseInt(process.env.SERVER_PORT || '3000', 10);
export const hostname = process.env.SERVER_HOSTNAME || 'localhost';
export const mqttUrl = process.env.SERVER_MQTT_URL || 'mqtt://localhost:1883';
export const mqttPrefix = process.env.SERVER_MQTT_PREFIX || 'yealink';

export const getServerIpAddress = (): string => {
  if (process.env.SERVER_REMOTE_IP_ADDRESS) {
    return process.env.SERVER_REMOTE_IP_ADDRESS;
  }

  const interfaces = os.networkInterfaces();
  // eslint-disable-next-line guard-for-in,no-restricted-syntax
  for (const interfaceName in interfaces) {
    const iface = interfaces[interfaceName];
    if (iface) {
      // eslint-disable-next-line no-restricted-syntax
      for (const alias of iface) {
        if (
          alias.family === 'IPv4' &&
          !alias.internal &&
          alias.address !== '127.0.0.1' &&
          alias.address !== '::1' // Exclude loopback addresses
        ) {
          return alias.address;
        }
      }
    }
  }
  throw new Error('No valid IPv4 address found');
};
