import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import mqtt from 'mqtt';
import dotenv from 'dotenv';
import configureRouter from './configure';
import { port, hostname } from './util';

dotenv.config();

const app = express();

const mqttUrl = process.env.MQTT_URL || 'mqtt://localhost:1883';
const mqttPrefix = process.env.MQTT_PREFIX || 'yealink';

const mqttClient = mqtt.connect(mqttUrl, {
  clientId: 'yealink2mqtt',
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

mqttClient.on('connect', () => {
  console.log(`Connected to MQTT broker at ${mqttUrl}`);
});

mqttClient.on('error', (error) => {
  console.error('MQTT connection error:', error);
});

type MqttTopic = string;
type MqttMessage = string | Buffer;

const publishQueue: { topic: MqttTopic; message: MqttMessage }[] = [];

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
    const { config } = req.params;

    console.log('query', req.query);

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
        } else {
          console.log(`Published message to ${topic}:`, message);
        }
      },
    );
  }
}, 1000);

process.on('SIGINT', () => {
  console.log('Received SIGINT. Exiting gracefully...');
  clearInterval(loopInterval);
  mqttClient.end(() => {
    console.log('MQTT client disconnected.');
    // eslint-disable-next-line n/no-process-exit
    process.exit(0);
  });
});

main();
