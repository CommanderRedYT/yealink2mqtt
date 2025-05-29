import os from 'node:os';

export const port = parseInt(process.env.PORT || '3000', 10);

export const hostname = process.env.HOSTNAME || 'localhost';

export const getServerIpAddress = (): string => {
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
