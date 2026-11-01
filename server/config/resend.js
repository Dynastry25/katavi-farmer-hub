const resendConfig = () => {
  const apiKey = process.env.RESEND_API_KEY || '';
  const from = process.env.RESEND_FROM || 'Katavi E-Kilimo <onboarding@resend.dev>';
  const replyTo = process.env.RESEND_REPLY_TO || '';

  return {
    configured: Boolean(apiKey),
    apiKey,
    from,
    replyTo,
    baseUrl: 'https://api.resend.com',
  };
};

module.exports = resendConfig;
