/**
 * Sound Sentinel Mobile - Multi-Channel Alert Dispatcher
 * Cloud Webhooks, WhatsApp, Telegram, Haptic Feedback & Siren
 * Afro Vision Media PTY (Ltd)
 */

class MobileDispatcher {
  constructor() {
    this.webhookUrl = localStorage.getItem('ss_webhook_url') || '';
    this.telegramToken = localStorage.getItem('ss_telegram_token') || '';
    this.telegramChatId = localStorage.getItem('ss_telegram_chat_id') || '';
    this.whatsappNumber = localStorage.getItem('ss_whatsapp_number') || '';
    this.hapticsEnabled = localStorage.getItem('ss_haptics_enabled') !== 'false';
    this.soundAlertsEnabled = localStorage.getItem('ss_sound_alerts') !== 'false';

    this.cooldowns = new Map();
    this.cooldownDurationMs = 7000; // 7-second cooldown per event category

    this.audioChime = new Audio('./assets/chime.wav');
  }

  saveConfig(config) {
    if (config.webhookUrl !== undefined) {
      this.webhookUrl = config.webhookUrl.trim();
      localStorage.setItem('ss_webhook_url', this.webhookUrl);
    }
    if (config.telegramToken !== undefined) {
      this.telegramToken = config.telegramToken.trim();
      localStorage.setItem('ss_telegram_token', this.telegramToken);
    }
    if (config.telegramChatId !== undefined) {
      this.telegramChatId = config.telegramChatId.trim();
      localStorage.setItem('ss_telegram_chat_id', this.telegramChatId);
    }
    if (config.whatsappNumber !== undefined) {
      this.whatsappNumber = config.whatsappNumber.trim();
      localStorage.setItem('ss_whatsapp_number', this.whatsappNumber);
    }
    if (config.hapticsEnabled !== undefined) {
      this.hapticsEnabled = config.hapticsEnabled;
      localStorage.setItem('ss_haptics_enabled', this.hapticsEnabled ? 'true' : 'false');
    }
    if (config.soundAlertsEnabled !== undefined) {
      this.soundAlertsEnabled = config.soundAlertsEnabled;
      localStorage.setItem('ss_sound_alerts', this.soundAlertsEnabled ? 'true' : 'false');
    }
  }

  canDispatch(eventItem) {
    const key = eventItem.name;
    const now = Date.now();
    const lastTime = this.cooldowns.get(key) || 0;
    if (now - lastTime < this.cooldownDurationMs) {
      return false;
    }
    this.cooldowns.set(key, now);
    return true;
  }

  async dispatch(eventItem, nodeName = 'Mobile Pod') {
    if (!this.canDispatch(eventItem)) return;

    // 1. Local Haptic Feedback
    if (this.hapticsEnabled && 'vibrate' in navigator) {
      if (eventItem.alertLevel === 'critical') {
        navigator.vibrate([250, 100, 250, 100, 400]);
      } else if (eventItem.alertLevel === 'high') {
        navigator.vibrate([200, 100, 200]);
      } else {
        navigator.vibrate(120);
      }
    }

    // 2. Audible Alert
    if (this.soundAlertsEnabled && (eventItem.alertLevel === 'critical' || eventItem.alertLevel === 'high')) {
      try {
        this.audioChime.currentTime = 0;
        this.audioChime.play().catch(() => {});
      } catch (e) {}
    }

    // 3. Cloud Webhook Dispatch (1 KB JSON Edge Telemetry)
    const payload = {
      system: 'Sound Sentinel Pro Mobile',
      organization: 'Afro Vision Media PTY (Ltd)',
      developer: 'Tanyaradzwa Bvute',
      nodeId: nodeName,
      event: eventItem.name,
      category: eventItem.category,
      alertLevel: eventItem.alertLevel,
      emoji: eventItem.emoji,
      confidence: parseFloat(eventItem.confidence.toFixed(3)),
      timestamp: new Date().toISOString()
    };

    if (this.webhookUrl) {
      try {
        fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch((err) => console.warn('[Webhook error]', err));
      } catch (e) {}
    }

    // 4. Telegram Bot Dispatch
    if (this.telegramToken && this.telegramChatId) {
      const msg = `🚨 *SOUND SENTINEL ALERT*\n\n*Node:* ${nodeName}\n*Event:* ${eventItem.emoji} ${eventItem.name}\n*Category:* ${eventItem.category}\n*Confidence:* ${(eventItem.confidence * 100).toFixed(1)}%\n*Time:* ${new Date().toLocaleTimeString()}\n\n_Afro Vision Media Edge Intelligence_`;
      const tgUrl = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;
      fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.telegramChatId,
          text: msg,
          parse_mode: 'Markdown'
        })
      }).catch((err) => console.warn('[Telegram error]', err));
    }
  }

  getWhatsAppShareUrl(eventItem, nodeName = 'Mobile Pod') {
    const text = encodeURIComponent(
      `🚨 [SOUND SENTINEL ALERT]\nNode: ${nodeName}\nEvent: ${eventItem.emoji || '🔊'} ${eventItem.name}\nConfidence: ${(eventItem.confidence * 100).toFixed(1)}%\nTime: ${new Date().toLocaleTimeString()}\n\nProtected by Afro Vision Media PTY (Ltd)`
    );
    const target = this.whatsappNumber ? this.whatsappNumber.replace(/[^0-9]/g, '') : '';
    return target ? `https://wa.me/${target}?text=${text}` : `https://wa.me/?text=${text}`;
  }
}

window.MobileDispatcher = MobileDispatcher;
