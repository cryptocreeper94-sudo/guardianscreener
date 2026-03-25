/**
 * DarkWave SSO - Node.js Server SDK
 * Use this in your Express/Node.js backend to verify SSO tokens
 * 
 * Install: Copy this file into your project
 * Usage:
 *   const DarkWaveSSO = require('./dw-sso-node');
 *   const sso = new DarkWaveSSO({
 *     apiKey: 'dw_your_api_key',
 *     apiSecret: 'your_api_secret',
 *     baseUrl: 'https://dwsc.io'
 *   });
 */

const crypto = require('crypto');

class DarkWaveSSO {
  constructor(config) {
    if (!config.apiKey) throw new Error('DarkWaveSSO: apiKey is required');
    if (!config.apiSecret) throw new Error('DarkWaveSSO: apiSecret is required');
    
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = (config.baseUrl || 'https://dwsc.io').replace(/\/$/, '');
  }

  _sign(message) {
    return crypto.createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  async verifyToken(token) {
    const timestamp = Date.now().toString();
    const signature = this._sign(token + timestamp);

    const url = `${this.baseUrl}/api/auth/sso/verify?token=${encodeURIComponent(token)}`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-App-Key': this.apiKey,
        'X-App-Signature': signature,
        'X-App-Timestamp': timestamp
      }
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Verification failed (${res.status})`);
    }

    return res.json();
  }

  async getUser(userId) {
    const timestamp = Date.now().toString();
    const signature = this._sign(userId + timestamp);

    const url = `${this.baseUrl}/api/auth/sso/user/${encodeURIComponent(userId)}`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-App-Key': this.apiKey,
        'X-App-Signature': signature,
        'X-App-Timestamp': timestamp
      }
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `User lookup failed (${res.status})`);
    }

    return res.json();
  }

  expressMiddleware() {
    const self = this;
    return async (req, res, next) => {
      const token = req.query.token || req.headers['x-dw-token'];
      if (!token) {
        req.dwUser = null;
        return next();
      }

      try {
        const result = await self.verifyToken(token);
        req.dwUser = result.user;
        next();
      } catch (err) {
        req.dwUser = null;
        next();
      }
    };
  }

  expressCallbackHandler(options = {}) {
    const self = this;
    return async (req, res) => {
      const token = req.query.token;
      if (!token) {
        return res.status(400).json({ error: 'No SSO token provided' });
      }

      try {
        const result = await self.verifyToken(token);
        
        if (req.session) {
          req.session.dwUser = result.user;
        }

        if (options.onSuccess) {
          return options.onSuccess(req, res, result.user);
        }

        res.redirect(options.successRedirect || '/');
      } catch (err) {
        if (options.onError) {
          return options.onError(req, res, err);
        }
        res.redirect(options.failureRedirect || '/login?error=sso_failed');
      }
    };
  }
}

module.exports = DarkWaveSSO;
