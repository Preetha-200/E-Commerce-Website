const currencyRates = {
  USD: 1,
  EUR: 0.85,
  GBP: 0.75,
  INR: 75.0,
  CAD: 1.35 
};

const regionCurrencyMapping = {
  'United States': 'USD',
  'India': 'INR',
  'United Kingdom': 'GBP',
  'Europe': 'EUR',
  'Canada': 'CAD'
};

function getCurrencyFromRegion(region) {
  return regionCurrencyMapping[region] || 'USD'; 
}

function convertCurrency(amount, fromCurrency = 'USD', toCurrency = 'USD') {
  console.log(`Converting amount: ${amount}, from: ${fromCurrency}, to: ${toCurrency}`);

    if (isNaN(amount)) {
        console.error(`Invalid amount: ${amount}`);
        return 0; // Return 0 if the amount is not a number
    }

  if (!currencyRates[fromCurrency] || !currencyRates[toCurrency]) {
    console.error(`Currency rate missing for fromCurrency: ${fromCurrency}, toCurrency: ${toCurrency}`);
    return amount;
  }

  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = currencyRates[fromCurrency];
  const toRate = currencyRates[toCurrency];

  return (amount / fromRate) * toRate;
}

module.exports = { convertCurrency, getCurrencyFromRegion };
