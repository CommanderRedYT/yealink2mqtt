# yealink2mqtt

This is a script to sync Yealink phone states to MQTT. This can then also be used to have the Yealink as a read-only
device in Home Assistant.

## Installation

1. CLone the repository
2. Install the requirements with `yarn install`
3. Override the MQTT server with a `.env` file in the working directory.

## Configuration

| Environment Variable       | Description                                                                  |
|----------------------------|------------------------------------------------------------------------------|
| `SERVER_PORT`              | The port on which the webserver listens.                                     |
| `SERVER_HOSTNAME`          | The hostname on which the webserver listens.                                 |
| `SERVER_MQTT_URL`          | The MQTT url string for the MQTT client.                                     |
| `SERVER_MQTT_PREFIX`       | The MQTT topic prefix to be used when publishing.                            |
| `SERVER_REMOTE_IP_ADDRESS` | The IP address under which this server is reachable from the yealink device. |
