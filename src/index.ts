import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import mqtt from 'mqtt';
import configureRouter, { ConfigName } from './configure';
import { port, hostname, mqttUrl, mqttPrefix } from './util';

const app = express();

const mqttClient = mqtt.connect(mqttUrl, {
  clientId: 'yealink2mqtt',
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
  will: {
    topic: `${mqttPrefix}/script`,
    payload: JSON.stringify({
      script: 'yealink2mqtt',
      status: 'offline',
    }),
    qos: 1,
    retain: true,
  },
});

mqttClient.on('error', (error) => {
  console.error('MQTT connection error:', error);
});

type MqttTopic = string;
type MqttMessage = string | Buffer;

const publishQueue: { topic: MqttTopic; message: MqttMessage }[] = [];

export interface YealinkStatus {
  isRegistered: boolean;
  calling: boolean;
  callType: 'incoming' | 'outgoing' | 'none';
  callPartnerNumber: string | null; // phone number
  callPartnerName: string | null; // name of the caller
  hooked: boolean | null; // true if the phone is off-hook, false if on-hook, null if unknown
  muted: boolean | null; // true if the phone is muted, false if unmuted, null if unknown
  speaker: 'handfree' | 'headset' | null; // 'handfree' for speakerphone, 'headset' for headset, null if unknown
  dnd: boolean | null; // true if Do Not Disturb is enabled, false if disabled, null if unknown
}

const defaultConfig: YealinkStatus = {
  isRegistered: false,
  calling: false,
  callType: 'none',
  callPartnerNumber: null,
  callPartnerName: null,
  hooked: null,
  muted: null,
  speaker: null,
  dnd: null,
};

const yealinkStatus: YealinkStatus = defaultConfig;

mqttClient.on('connect', () => {
  console.log(`Connected to MQTT broker at ${mqttUrl}`);
  mqttClient.publish(
    `${mqttPrefix}/script`,
    JSON.stringify({
      script: 'yealink2mqtt',
      status: 'online',
    }),
    { qos: 1 },
    (error) => {
      if (error) {
        console.error('Failed to publish script status:', error);
      } else {
        console.log('Published script status to MQTT broker');
      }
    },
  );

  publishQueue.push({
    topic: 'status',
    message: JSON.stringify(yealinkStatus),
  });
});

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/api/yealink/:config', (req, res, next) => {
  // log query
  if (
    typeof req.query === 'object' &&
    req.query !== null &&
    Object.keys(req.query).length > 0
  ) {
    const { config } = req.params as { config: ConfigName };

    switch (config) {
      case 'setup_completed':
        Object.assign(yealinkStatus, defaultConfig);
        break;
      case 'unregistered':
        Object.assign(yealinkStatus, defaultConfig);
        yealinkStatus.isRegistered = false;
        break;
      case 'registered':
        yealinkStatus.isRegistered = true;
        break;
      case 'dnd_on':
        yealinkStatus.dnd = true;
        break;
      case 'dnd_off':
        yealinkStatus.dnd = false;
        break;
      case 'mute':
        yealinkStatus.muted = true;
        break;
      case 'unmute':
        yealinkStatus.muted = false;
        break;
      case 'off_hook':
        yealinkStatus.hooked = true;
        break;
      case 'on_hook':
        yealinkStatus.hooked = false;
        break;
      case 'headset':
        yealinkStatus.speaker = 'headset';
        break;
      case 'handfree':
        yealinkStatus.speaker = 'handfree';
        break;
      case 'incoming_call':
        yealinkStatus.callType = 'incoming';
        yealinkStatus.callPartnerNumber = req.query.calledNumber as string;
        yealinkStatus.callPartnerName = req.query.display_remote as string;
        yealinkStatus.calling = true;
        break;
      case 'outgoing_call':
        yealinkStatus.callType = 'outgoing';
        yealinkStatus.callPartnerNumber = req.query.calledNumber as string;
        yealinkStatus.callPartnerName = req.query.display_remote as string;
        yealinkStatus.calling = true;
        break;
      case 'call_established':
        yealinkStatus.calling = true;
        break;
      case 'call_terminated':
        yealinkStatus.calling = false;
        yealinkStatus.callType = 'none';
        yealinkStatus.callPartnerNumber = null;
        yealinkStatus.callPartnerName = null;
        break;
      case 'call_remote_canceled':
        yealinkStatus.calling = false;
        yealinkStatus.callType = 'none';
        yealinkStatus.callPartnerNumber = null;
        yealinkStatus.callPartnerName = null;
        break;
      default:
        console.warn(`Unhandled config: ${config}`);
        break;
    }

    console.log(config, 'query', req.query);

    publishQueue.push({
      topic: `action/${config}`,
      message: JSON.stringify(req.query),
    });
  } else {
    publishQueue.push({
      topic: `action/${req.params.config}`,
      message: JSON.stringify({ triggered: true }),
    });
  }

  publishQueue.push({
    topic: 'status',
    message: JSON.stringify(yealinkStatus),
  });

  next();
});

app.use(configureRouter);

const main = async () => {
  app.listen(port, hostname, () => {
    console.log(`Server is running on http://${hostname}:${port}`);
  });
};

const loopInterval = setInterval(() => {
  if (publishQueue.length > 0) {
    const { topic, message } = publishQueue.shift()!;
    mqttClient.publish(
      `${mqttPrefix}/${topic}`,
      message,
      { qos: 1 },
      (error) => {
        if (error) {
          console.error('Failed to publish message:', error);
        }
      },
    );
  }
}, 1000);

process.on('SIGINT', () => {
  console.log('Received SIGINT. Exiting gracefully...');
  clearInterval(loopInterval);
  mqttClient.publish(
    `${mqttPrefix}/script`,
    JSON.stringify({
      script: 'yealink2mqtt',
      status: 'offline',
    }),
  );
  mqttClient.end(() => {
    console.log('MQTT client disconnected.');
    // eslint-disable-next-line n/no-process-exit
    process.exit(0);
  });
});

main();
