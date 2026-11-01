const resendConfig = require('../config/resend');

const OTP_MINUTES = 5;

const PURPOSE_COPY = {
  register: {
    subject: 'Katavi E-Kilimo: Namba ya uthibitisho wa usajili',
    heading: 'Thibitisha usajili wako',
    intro: 'Karibu Katavi E-Kilimo. Tumia namba hii kuthibitisha usajili wako.',
  },
  login: {
    subject: 'Katavi E-Kilimo: Namba ya uthibitisho wa kuingia',
    heading: 'Namba ya kuingia',
    intro: 'Tumia namba hii kukamilisha kuingia kwenye akaunti yako.',
  },
  reset: {
    subject: 'Katavi E-Kilimo: Namba ya kubadilisha nenosiri',
    heading: 'Badilisha nenosiri',
    intro: 'Tumia namba hii kuthibitisha kubadilisha nenosiri lako.',
  },
  phone: {
    subject: 'Katavi E-Kilimo: Thibitisha namba yako ya simu',
    heading: 'Thibitisha namba ya simu',
    intro: 'Tumia namba hii kuthibitisha namba yako ya simu.',
  },
  '2fa': {
    subject: 'Katavi E-Kilimo: Namba ya 2FA',
    heading: 'Namba ya uthibitisho (2FA)',
    intro: 'Tumia namba hii kukamilisha kuingia kwenye akaunti ya wafanyakazi.',
  },
};

const copyFor = (purpose) => PURPOSE_COPY[purpose] || PURPOSE_COPY.login;

/// Real inboxes only; phone-only accounts get a placeholder address that
/// cannot receive mail.
const isDeliverableEmail = (email) => {
  const value = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  if (value.endsWith('@phone.katavi.tz')) return false;
  return true;
};

const renderOtpEmail = ({ code, purpose = 'login', phone = '', minutes = OTP_MINUTES }) => {
  const copy = copyFor(purpose);
  const safeCode = String(code || '').replace(/[^\d]/g, '');
  const safePhone = String(phone || '').replace(/[^\d+]/g, '');
  const phoneLine = safePhone
    ? `<p style="margin:0 0 8px;font-size:14px;color:#56695D">Namba ya simu: ${safePhone}</p>`
    : '';
  const text = [
    `Katavi E-Kilimo`,
    copy.heading,
    copy.intro,
    `Namba yako ya uthibitisho ni: ${safeCode}`,
    `Namba hii inaisha baada ya dakika ${minutes}.`,
    safePhone ? `Namba ya simu: ${safePhone}` : '',
    'Kama hukuomba namba hii, puuza barua pepe hii.',
  ].filter(Boolean).join('\n');

  const html = `<!doctype html>
<html lang="sw">
  <body style="margin:0;padding:24px;background:#F4F7F5;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid #E1E8E3">
      <div style="background:#17652C;padding:22px 26px">
        <div style="color:#FFFFFF;font-size:19px;font-weight:700">Katavi E-Kilimo</div>
        <div style="color:#CDE7D3;font-size:12.5px;margin-top:3px">Kilimo bora, maisha bora</div>
      </div>
      <div style="padding:26px">
        <h1 style="margin:0 0 10px;font-size:19px;color:#17301F">${copy.heading}</h1>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#3E4F44">${copy.intro}</p>
        <div style="background:#E6F4E3;border:1px solid #CBE4C7;border-radius:14px;padding:18px;text-align:center">
          <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#17652C;font-weight:700">Namba ya uthibitisho</div>
          <div style="margin-top:8px;font-size:34px;letter-spacing:8px;font-weight:800;color:#14301F">${safeCode}</div>
        </div>
        <p style="margin:18px 0 0;font-size:13px;color:#56695D">Namba hii inaisha baada ya dakika ${minutes}.</p>
        ${phoneLine}
        <p style="margin:14px 0 0;font-size:12.5px;line-height:1.5;color:#7A8A80">Kama hukuomba namba hii, puuza barua pepe hii. Usimpe mtu namba yako ya uthibitisho.</p>
      </div>
    </div>
  </body>
</html>`;

  return { subject: copy.subject, html, text };
};

const sendEmail = async ({ to, subject, html, text }) => {
  const recipient = String(to || '').trim().toLowerCase();
  if (!isDeliverableEmail(recipient)) {
    return { success: false, skipped: true, reason: 'invalid_recipient', to: recipient };
  }

  const cfg = resendConfig();
  if (!cfg.configured) {
    // No RESEND_API_KEY — log the message instead of calling Resend.
    console.log(`[EMAIL][MOCK] To ${recipient}: ${subject}`);
    return { mock: true, success: true, to: recipient };
  }

  try {
    const response = await fetch(`${cfg.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.from,
        to: [recipient],
        subject,
        html,
        text,
        ...(cfg.replyTo ? { reply_to: cfg.replyTo } : {}),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = data?.message || `HTTP ${response.status}`;
      console.error('[EMAIL] Resend error:', reason);
      return { success: false, to: recipient, error: reason };
    }
    return { success: true, id: data.id || null, to: recipient };
  } catch (error) {
    console.error('[EMAIL] Error:', error.message);
    return { success: false, to: recipient, error: error.message };
  }
};

const sendOtpEmail = async ({ to, code, purpose = 'login', phone = '', minutes = OTP_MINUTES }) => {
  const { subject, html, text } = renderOtpEmail({ code, purpose, phone, minutes });
  return sendEmail({ to, subject, html, text });
};

module.exports = { isDeliverableEmail, renderOtpEmail, sendEmail, sendOtpEmail };
