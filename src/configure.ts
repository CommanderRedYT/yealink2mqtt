import express from 'express';
import bodyParser from 'body-parser';
import { getServerIpAddress, port } from './util';

const configureRouter = express.Router();

configureRouter.use(bodyParser.text());
configureRouter.use(express.static('public'));

export interface ConversionSuccessResponse {
  success: true;
  convertedConfig: string;
}

export interface ConversionErrorResponse {
  success: false;
  error: string;
}

export type ConversionResponse =
  | ConversionSuccessResponse
  | ConversionErrorResponse;

const callQueryString =
  '?display_local=$display_local&display_remote=$display_remote&callerID=$callerID&calledNumber=$calledNumber&call_id=$call_id' as const;

const deviceInfoQueryString = '?mac=$mac&model=$model&ip=$ip' as const;

type ConfigName =
  | 'always_fwd_off'
  | 'always_fwd_on'
  | 'answer_new_incoming_call'
  | 'attended_transfer_call'
  | 'blind_transfer_call'
  | 'busy_fwd_off'
  | 'busy_fwd_on'
  | 'busy_to_idle'
  | 'call_established'
  | 'call_remote_canceled'
  | 'call_terminated'
  | 'call_waiting_off'
  | 'call_waiting_on'
  | 'cancel_callout'
  | 'dnd_off'
  | 'dnd_on'
  | 'forward_incoming_call'
  | 'handfree'
  | 'headset'
  | 'hold'
  | 'idle_to_busy'
  | 'incoming_call'
  | 'ip_change'
  | 'missed_call'
  | 'mute'
  | 'no_answer_fwd_off'
  | 'no_answer_fwd_on'
  | 'off_hook'
  | 'on_hook'
  | 'outgoing_call'
  | 'peripheral_information'
  | 'register_failed'
  | 'registered'
  | 'reject_incoming_call'
  | 'remote_busy'
  | 'setup_autop_finish'
  | 'setup_completed'
  | 'transfer_call'
  | 'transfer_failed'
  | 'transfer_finished'
  | 'unhold'
  | 'unmute'
  | 'unregistered'
  | 'vpn_ip';

const queryStringMap: Record<ConfigName, string> = {
  always_fwd_off: '',
  always_fwd_on: '',
  answer_new_incoming_call: '',
  attended_transfer_call: callQueryString,
  blind_transfer_call: callQueryString,
  busy_fwd_off: '',
  busy_fwd_on: '',
  busy_to_idle: '',
  call_established: callQueryString,
  call_remote_canceled: callQueryString,
  call_terminated: callQueryString,
  call_waiting_off: '',
  call_waiting_on: '',
  cancel_callout: '',
  dnd_off: '',
  dnd_on: '',
  forward_incoming_call: callQueryString,
  handfree: '',
  headset: '',
  hold: '',
  idle_to_busy: '',
  incoming_call: callQueryString,
  ip_change: deviceInfoQueryString,
  missed_call: callQueryString,
  mute: '',
  no_answer_fwd_off: '',
  no_answer_fwd_on: '',
  off_hook: '',
  on_hook: '',
  outgoing_call: callQueryString,
  peripheral_information: '',
  register_failed: deviceInfoQueryString,
  registered: deviceInfoQueryString,
  reject_incoming_call: callQueryString,
  remote_busy: '',
  setup_autop_finish: '',
  setup_completed: deviceInfoQueryString,
  transfer_call: callQueryString,
  transfer_failed: callQueryString,
  transfer_finished: callQueryString,
  unhold: '',
  unmute: '',
  unregistered: deviceInfoQueryString,
  vpn_ip: deviceInfoQueryString,
};

configureRouter.post(
  '/api/convert',
  // @ts-expect-error: Idk why but i dont wanna fix it
  // eslint-disable-next-line consistent-return
  (req, res: express.Response<ConversionResponse>) => {
    const configFile = req.body as string;

    const validConfigRegex = /#!version:(?<version>.*)\n+[#\s]+/gm;

    const match = validConfigRegex.exec(configFile);

    if (!match || !match.groups || !match.groups.version) {
      console.error('Invalid config file format');
      return res
        .status(400)
        .json({ success: false, error: 'Invalid config file format' });
    }

    // regex for matching the action urls
    const actionUrlRegex =
      /^(?<config_name>action_url\..*)\s+=\s+(?<config_value>.*)$/gm;
    const actionUrls: Record<string, string> = {};

    let actionMatch: RegExpExecArray | null;

    // eslint-disable-next-line no-cond-assign
    while ((actionMatch = actionUrlRegex.exec(configFile)) !== null) {
      if (
        actionMatch.groups &&
        actionMatch.groups.config_name &&
        actionMatch.groups.config_value
      ) {
        actionUrls[actionMatch.groups.config_name] =
          actionMatch.groups.config_value;
      }
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const [key] of Object.entries(actionUrls)) {
      const keyName = key.replace('action_url.', '');

      const url = new URL(`http://${getServerIpAddress()}:${port}`);
      url.pathname = `/api/yealink/${keyName}`;

      // check if queryStringMap contains keyName, and if so, use the query string from the map
      if (keyName in queryStringMap) {
        url.search = queryStringMap[keyName as ConfigName];
      }

      actionUrls[key] = url.toString();
    }

    const configFileLines = configFile.split('\n');

    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(actionUrls)) {
      // find the line that contains the key
      const lineIndex = configFileLines.findIndex((line) =>
        line.startsWith(key),
      );

      if (lineIndex !== -1) {
        // replace the line with the new value
        configFileLines[lineIndex] = `${key} = ${value}`;
      } else {
        console.warn(`Key ${key} not found in config file`);
      }
    }

    res.json({
      success: true,
      convertedConfig: configFileLines.join('\n'),
    });
  },
);

export default configureRouter;
