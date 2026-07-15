import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { snapshot } from '../services/hardware.js';
import { setLed, ledState } from '../services/gpio.js';
import { num, bool, record } from '../util/validate.js';

export function registerHardwareRoutes(app: Application, _db: Db) {
  app.get('/api/hardware/device', ah((_req, res) => {
    ok(res, snapshot());
  }));

  app.post('/api/hardware/led', ah(async (req, res) => {
    const body = record(req.body ?? {}, 'body');
    const pin = num(body.pin, 'pin', { min: 0, max: 40, integer: true });
    const on = bool(body.on, 'on');
    const result = await setLed(pin, on);
    ok(res, result);
  }));

  // Debug helper that returns the recent LED intents (useful during testing).
  app.get('/api/hardware/leds', ah((_req, res) => {
    ok(res, ledState());
  }));
}
