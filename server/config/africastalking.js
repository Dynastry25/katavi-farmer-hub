const africastalking = () => {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';
  const shortCode = process.env.AFRICASTALKING_SHORTCODE || '';
  const sandbox = process.env.AFRICASTALKING_ENV !== 'production';

  return {
    configured: Boolean(apiKey),
    apiKey: apiKey || '',
    username,
    shortCode,
    sandbox,
    baseUrl: sandbox ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com',
  };
};

module.exports = africastalking;