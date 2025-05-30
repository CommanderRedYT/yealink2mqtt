# yealink2mqtt

This is a script to sync Yealink phone states to MQTT. This can then also be used to have the Yealink as a read-only
device in Home Assistant.

## Installation

#### Non-Docker

1. CLone the repository
2. Install the requirements with `yarn install`
3. Override the MQTT server with a `.env` file in the working directory.

#### Docker

```yaml
services:
  yealink2mqtt:
    image: ghcr.io/CommanderRedYT/yealink2mqtt:latest
    container_name: yealink2mqtt
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - SERVER_PORT=8080
      - SERVER_HOSTNAME=0.0.0.0
      - SERVER_MQTT_URL=mqtt://test.mosquitto.org:1883
      - SERVER_MQTT_PREFIX=yealink
      - SERVER_REMOTE_IP_ADDRESS=192.168.0.1
```

## Configuration

| Environment Variable       | Description                                                                  |
|----------------------------|------------------------------------------------------------------------------|
| `SERVER_PORT`              | The port on which the webserver listens.                                     |
| `SERVER_HOSTNAME`          | The hostname on which the webserver listens.                                 |
| `SERVER_MQTT_URL`          | The MQTT url string for the MQTT client.                                     |
| `SERVER_MQTT_PREFIX`       | The MQTT topic prefix to be used when publishing.                            |
| `SERVER_REMOTE_IP_ADDRESS` | The IP address under which this server is reachable from the yealink device. |
